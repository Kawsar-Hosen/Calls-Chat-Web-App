import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  Bell,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  ImageUp,
  LogOut,
  MessageCircle,
  MessageSquarePlus,
  Moon,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Reply,
  Search,
  Send,
  Settings,
  Languages,
  Shield,
  ShieldCheck,
  SmilePlus,
  Sun,
  Trash2,
  Unlock,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { api, resolveAssetUrl } from './api';
import { useAuth } from './auth';
import { Avatar, conversationName, conversationPeer, DeliveryIcon, EmptyState, GroupAvatar, SkeletonChat, SkeletonList, timeLabel } from './components';
import type { Attachment, Conversation, FriendRequest, Group, Message, SocketEvent, User } from './types';
import { useSocket } from './useSocket';
import { languages, useLocale, type LanguageCode } from './i18n';

type View = 'messages' | 'contacts' | 'settings';
type Modal =
  | { kind: 'profile' }
  | { kind: 'new-message' }
  | { kind: 'create-group' }
  | { kind: 'friend-requests' }
  | { kind: 'groups' }
  | { kind: 'blacklist' }
  | { kind: 'add-group' }
  | { kind: 'contact'; user: User }
  | { kind: 'group'; groupId: string }
  | null;

function IconButton({ label, children, onClick, className = '', disabled = false }: { label: string; children: ReactNode; onClick?: () => void; className?: string; disabled?: boolean }) {
  return <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick} disabled={disabled}>{children}</button>;
}

function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      if (mode === 'login') await login(String(data.get('email')), String(data.get('password')));
      else await register({
        displayName: String(data.get('displayName')),
        username: String(data.get('username')),
        email: String(data.get('email')),
        password: String(data.get('password')),
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to continue');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <span className="mobile-brand"><MessageCircle /> XYTEEE</span>
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p>{mode === 'login' ? 'Sign in to continue your conversations.' : 'Start a quieter way to stay connected.'}</p>
          <div className="auth-tabs" role="tablist">
            <button role="tab" aria-selected={mode === 'login'} onClick={() => setMode('login')}>Sign in</button>
            <button role="tab" aria-selected={mode === 'register'} onClick={() => setMode('register')}>Register</button>
          </div>
          <form onSubmit={submit} className="auth-form">
            {mode === 'register' && <div className="field-row"><label>Display name<input name="displayName" autoComplete="name" required /></label><label>Username<input name="username" autoComplete="username" pattern="[a-zA-Z0-9_.-]+" required /></label></div>}
            <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
            <label>Password<input name="password" type="password" minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>
            {error && <div className="inline-error" role="alert">{error}</div>}
            <button className="primary-button auth-submit" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
          </form>
        </div>
      </section>
    </main>
  );
}

function App() {
  const { user, loading } = useAuth();
  if (loading) return <main className="boot-screen"><span className="brand-symbol"><MessageCircle /></span><span className="skeleton skeleton-line skeleton-boot-line" /></main>;
  if (!user) return <AuthScreen />;
  return <Routes><Route path="/" element={<Navigate to="/messages" replace />} /><Route path="/messages" element={<MessagingApp />} /><Route path="/messages/:conversationId" element={<MessagingApp />} /><Route path="*" element={<Navigate to="/messages" replace />} /></Routes>;
}

function groupPatch(group: Group): Partial<Conversation> {
  return {
    kind: 'group',
    title: group.name,
    group: {
      id: group.id,
      name: group.name,
      ...(group.description != null ? { description: group.description } : {}),
      ...(group.avatarUrl != null ? { avatarUrl: group.avatarUrl } : {}),
      ownerId: group.ownerId,
      myRole: group.myRole,
      memberCount: group.memberCount,
    },
    participants: group.members.map((member) => member.user),
  };
}

function MessagingApp() {
  const { user, logout } = useAuth();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [view, setView] = useState<View>('messages');
  const [modal, setModal] = useState<Modal>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('xyteee.theme') as 'dark' | 'light') ?? 'light');
  const { t, rtl } = useLocale();

  const active = conversations.find((item) => item.id === conversationId);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('xyteee.theme', theme);
  }, [theme]);

  const refreshConversations = () => api.conversations().then(setConversations).catch((reason) => setError(reason.message));

  useEffect(() => {
    api.conversations().then(setConversations).catch((reason) => setError(reason.message)).finally(() => setLoadingConversations(false));
  }, []);

  useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    setLoadingMessages(true);
    api.messages(conversationId).then((page) => {
      setMessages(page.items);
      setNextCursor(page.nextCursor);
      setConversations((items) => items.map((item) => item.id === conversationId ? { ...item, unreadCount: 0 } : item));
      const latest = page.items.at(-1);
      if (latest) void api.markRead(conversationId, latest.id);
    }).catch((reason) => setError(reason.message)).finally(() => setLoadingMessages(false));
  }, [conversationId]);

  function handleSocket(event: SocketEvent) {
    if (event.type === 'message.created') {
      const message = event.payload;
      if (message.conversationId === conversationId) {
        setMessages((items) => items.some((item) => item.id === message.id) ? items : [...items, message]);
        void api.markRead(message.conversationId, message.id);
      }
      setConversations((items) => items.map((item) => item.id === message.conversationId ? { ...item, lastMessage: message, updatedAt: message.createdAt, unreadCount: message.conversationId === conversationId || message.sender.id === user!.id ? 0 : item.unreadCount + 1 } : item).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)));
    } else if (event.type === 'message.updated' || event.type === 'reaction.updated') {
      setMessages((items) => items.map((item) => item.id === event.payload.id ? event.payload : item));
    } else if (event.type === 'message.deleted') {
      setMessages((items) => items.map((item) => item.id === event.payload.messageId ? { ...item, body: '', deletedAt: new Date().toISOString(), attachments: [] } : item));
    } else if (event.type === 'typing.started' || event.type === 'typing.stopped') {
      setConversations((items) => items.map((item) => item.id !== event.payload.conversationId ? item : { ...item, typingUserIds: event.type === 'typing.started' ? [...new Set([...(item.typingUserIds ?? []), event.payload.userId])] : (item.typingUserIds ?? []).filter((id) => id !== event.payload.userId) }));
    } else if (event.type === 'presence.updated') {
      setConversations((items) => items.map((item) => ({ ...item, participants: item.participants.map((participant) => participant.id === event.payload.userId ? { ...participant, presence: event.payload.presence, ...(event.payload.lastSeen ? { lastSeen: event.payload.lastSeen } : {}) } : participant) })));
    } else if (event.type === 'message.delivery') {
      setMessages((items) => items.map((item) => item.id === event.payload.messageId ? { ...item, delivery: event.payload.delivery } : item));
    } else if (event.type === 'conversation.updated') {
      setConversations((items) => items.some((item) => item.id === event.payload.id) ? items.map((item) => item.id === event.payload.id ? event.payload : item) : [event.payload, ...items]);
    } else if (event.type === 'group.updated') {
      const patch = groupPatch(event.payload);
      setConversations((items) => items.some((item) => item.id === event.payload.conversationId) ? items.map((item) => item.id === event.payload.conversationId ? { ...item, ...patch } : item) : [{ ...patch, id: event.payload.conversationId, unreadCount: 0, updatedAt: event.payload.updatedAt } as Conversation, ...items]);
    } else if (event.type === 'group.deleted') {
      setConversations((items) => items.filter((item) => item.id !== event.payload.conversationId));
    } else if (event.type === 'group.member.removed') {
      if (event.payload.userId === user!.id) {
        setConversations((items) => items.filter((item) => item.id !== event.payload.conversationId));
        if (conversationId === event.payload.conversationId) navigate('/messages');
      } else {
        void refreshConversations();
      }
    } else if (event.type === 'group.member.added') {
      if (event.payload.userId === user!.id) void refreshConversations();
      else void refreshConversations();
    }
  }

  const socket = useSocket(handleSocket);

  const filtered = conversations.filter((conversation) => {
    const text = `${conversationName(conversation, user!.id)} ${conversation.lastMessage?.body ?? ''}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  async function createConversation(person: User) {
    try {
      const existing = conversations.find((item) => item.kind === 'direct' && item.participants.some((participant) => participant.id === person.id));
      const conversation = existing ?? await api.createConversation([person.id]);
      if (!existing) setConversations((items) => [conversation, ...items]);
      setModal(null);
      setView('messages');
      navigate(`/messages/${conversation.id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not start conversation'); }
  }

  async function openChat(conversationIdValue: string) {
    setView('messages');
    navigate(`/messages/${conversationIdValue}`);
  }

  return (
    <main className={`app-shell ${view === 'settings' ? 'settings-mode' : ''}`}>
       <NavRail view={view} setView={(next) => { setView(next); navigate('/messages'); }} user={user!} onLogout={logout} unread={conversations.reduce((sum, item) => sum + item.unreadCount, 0)} />
       <aside className={`conversation-panel ${conversationId ? 'mobile-hidden' : ''} ${view === 'settings' ? 'settings-panel' : ''}`}>
         <header className="panel-heading"><div><h1>{view === 'messages' ? t('messages') : view === 'contacts' ? t('contacts') : t('settings')}</h1></div>{view === 'messages' ? <IconButton label="New message" className="new-message" onClick={() => setModal({ kind: 'new-message' })}><MessageSquarePlus /></IconButton> : view === 'contacts' ? <IconButton label="Add friend" className="new-message" onClick={() => setModal({ kind: 'new-message' })}><UserPlus /></IconButton> : null}</header>
        {view === 'messages' ? <>
          <label className="search-field"><Search /><span className="sr-only">Search conversations</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" /></label>
          <div className="conversation-list">
            {loadingConversations ? <SkeletonList rows={7} /> : filtered.length === 0 ? <EmptyState title={query ? 'No matches' : 'No conversations yet'} detail={query ? 'Try another name or phrase.' : 'Start a new message to connect.'} /> : filtered.map((conversation) => <ConversationRow key={conversation.id} conversation={conversation} currentUserId={user!.id} selected={conversation.id === conversationId} onClick={() => navigate(`/messages/${conversation.id}`)} />)}
          </div>
         </> : view === 'contacts' ? <ContactsView me={user!.id} onMessage={createConversation} onOpenContact={(person) => setModal({ kind: 'contact', user: person })} onOpenRequests={() => setModal({ kind: 'friend-requests' })} onOpenGroups={() => setModal({ kind: 'groups' })} onOpenBlacklist={() => setModal({ kind: 'blacklist' })} onOpenGroup={(groupId) => setModal({ kind: 'group', groupId })} onAddGroup={() => setModal({ kind: 'add-group' })} onError={setError} /> : <SettingsView theme={theme} setTheme={setTheme} onEditProfile={() => setModal({ kind: 'profile' })} onLogout={logout} />}
         <div className="mobile-nav" style={{ direction: rtl ? 'rtl' : 'ltr' }}><button className={view === 'messages' ? 'active' : ''} onClick={() => setView('messages')}><MessageCircle />{t('messages')}</button><button className={view === 'contacts' ? 'active' : ''} onClick={() => setView('contacts')}><Users />{t('contacts')}</button><button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}><Settings />{t('settings')}</button></div>
      </aside>
       <section className={`chat-panel ${!conversationId && view !== 'settings' ? 'mobile-hidden' : ''}`}>
        {error && <div className="toast" role="alert"><span>{error}</span><button aria-label="Dismiss" onClick={() => setError('')}><X /></button></div>}
         {view === 'settings' ? <div className="settings-desktop"><SettingsView theme={theme} setTheme={setTheme} onEditProfile={() => setModal({ kind: 'profile' })} onLogout={logout} /></div> : active ? <Chat conversation={active} messages={messages} setMessages={setMessages} loading={loadingMessages} nextCursor={nextCursor} setNextCursor={setNextCursor} currentUser={user!} connected={socket.connected} socketSend={socket.send} onBack={() => navigate('/messages')} onError={setError} onOpenSettings={() => { const peer = conversationPeer(active, user!.id); if (active.kind === 'group' && active.group) { setModal({ kind: 'group', groupId: active.group.id }); } else if (peer) { setModal({ kind: 'contact', user: peer }); } }} /> : <WelcomePane onNew={() => setModal({ kind: 'new-message' })} />}
      </section>
      {modal?.kind === 'profile' && <ProfileModal onClose={() => setModal(null)} />}
      {modal?.kind === 'new-message' && <NewMessageModal onClose={() => setModal(null)} onChoose={createConversation} onOpenContact={(person) => setModal({ kind: 'contact', user: person })} />}
      {modal?.kind === 'create-group' && <CreateGroupModal me={user!.id} onClose={() => setModal(null)} onCreated={(groupId) => { setModal(null); openChat(groupId); }} onError={setError} />}
      {modal?.kind === 'friend-requests' && <FriendRequestsModal me={user!.id} onClose={() => setModal(null)} onMessage={createConversation} />}
      {modal?.kind === 'groups' && <GroupsModal onClose={() => setModal(null)} onOpen={(groupId) => setModal({ kind: 'group', groupId })} onCreate={() => setModal({ kind: 'create-group' })} />}
      {modal?.kind === 'blacklist' && <BlacklistModal onClose={() => setModal(null)} />}
      {modal?.kind === 'add-group' && <AddGroupModal onClose={() => setModal(null)} onError={setError} onJoin={(groupId) => setModal({ kind: 'group', groupId })} />}
      {modal?.kind === 'contact' && <ContactModal user={modal.user} me={user!.id} onClose={() => setModal(null)} onMessage={createConversation} onError={setError} />}
      {modal?.kind === 'group' && <GroupModal groupId={modal.groupId} me={user!.id} onClose={() => setModal(null)} onOpenMember={(person) => setModal({ kind: 'contact', user: person })} onError={setError} />}
    </main>
  );
}

function NavRail({ view, setView, user, onLogout, unread }: { view: View; setView: (view: View) => void; user: User; onLogout: () => void; unread: number }) {
  return <nav className="nav-rail" aria-label="Primary navigation">
    <span className="rail-brand" title="XYTEEE"><MessageCircle /></span>
    <div className="rail-main">
       <button className={view === 'messages' ? 'active' : ''} onClick={() => setView('messages')} title="Messages"><MessageCircle />{unread > 0 && <span className="rail-badge">{unread > 9 ? '9+' : unread}</span>}</button>
       <button className={view === 'contacts' ? 'active' : ''} onClick={() => setView('contacts')} title="Contacts"><Users /></button>
       <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')} title="Settings"><Settings /></button>
    </div>
    <div className="rail-bottom">
       <Avatar user={user} size="sm" />
      <IconButton label="Log out" onClick={onLogout}><LogOut /></IconButton>
    </div>
  </nav>;
}

function ConversationRow({ conversation, currentUserId, selected, onClick }: { conversation: Conversation; currentUserId: string; selected: boolean; onClick: () => void }) {
  const peer = conversationPeer(conversation, currentUserId);
  const typing = (conversation.typingUserIds ?? []).some((id) => id !== currentUserId);
  return <button className={`conversation-row ${selected ? 'selected' : ''}`} onClick={onClick}>
    {conversation.kind === 'group' ? <GroupAvatar name={conversation.title ?? conversation.group?.name ?? 'Group'} url={conversation.group?.avatarUrl} /> : <Avatar user={peer} />}
    <span className="conversation-copy"><span className="conversation-name">{conversationName(conversation, currentUserId)}</span><span className={typing ? 'typing-text' : ''}>{typing ? 'typing...' : conversation.lastMessage?.deletedAt ? 'Message removed' : conversation.lastMessage?.body || 'Start the conversation'}</span></span>
    <span className="conversation-meta"><time>{timeLabel(conversation.updatedAt)}</time>{conversation.unreadCount > 0 && <span className="unread-badge">{conversation.unreadCount}</span>}</span>
  </button>;
}

function WelcomePane({ onNew }: { onNew: () => void }) {
  return <div className="welcome-pane"><div className="welcome-mark"><MessageCircle /></div><h2>Your conversations live here</h2><p>Choose a thread from the left, or start a new one.</p><button className="primary-button" onClick={onNew}><Plus />New message</button></div>;
}

function Chat({ conversation, messages, setMessages, loading, nextCursor, setNextCursor, currentUser, connected, socketSend, onBack, onError, onOpenSettings }: { conversation: Conversation; messages: Message[]; setMessages: React.Dispatch<React.SetStateAction<Message[]>>; loading: boolean; nextCursor: string | null; setNextCursor: (cursor: string | null) => void; currentUser: User; connected: boolean; socketSend: (event: object) => void; onBack: () => void; onError: (error: string) => void; onOpenSettings: () => void }) {
  const peer = conversationPeer(conversation, currentUser.id);
  const isGroup = conversation.kind === 'group';
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [messageQuery, setMessageQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'instant' }); }, [conversation.id, loading]);

  async function loadOlder() {
    if (!nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await api.messages(conversation.id, nextCursor);
      setMessages((items) => [...page.items, ...items]);
      setNextCursor(page.nextCursor);
    } catch (reason) { onError(reason instanceof Error ? reason.message : 'Could not load messages'); }
    finally { setLoadingOlder(false); }
  }

  async function search(event: FormEvent) {
    event.preventDefault();
    try { setSearchResults(await api.searchMessages(messageQuery, conversation.id)); }
    catch (reason) { onError(reason instanceof Error ? reason.message : 'Search failed'); }
  }

  const subtitle = isGroup
    ? `${conversation.group?.memberCount ?? conversation.participants.length} members`
    : peer?.presence === 'online' ? 'Online' : peer?.lastSeen ? `Last seen ${timeLabel(peer.lastSeen)}` : connected ? 'Offline' : 'Reconnecting...';

  return <>
    <header className="chat-header">
      <IconButton label="Back to conversations" className="mobile-back" onClick={onBack}><ChevronLeft /></IconButton>
      {isGroup ? <GroupAvatar name={conversation.title ?? 'Group'} url={conversation.group?.avatarUrl} /> : <Avatar user={peer} />}
      <div className="chat-identity"><h2>{conversationName(conversation, currentUser.id)}</h2><span className={peer?.presence === 'online' ? 'is-online' : ''}>{subtitle}</span></div>
      <div className="chat-actions"><IconButton label="Search messages" onClick={() => setSearchOpen(!searchOpen)}><Search /></IconButton><IconButton label="Conversation options" onClick={onOpenSettings}><MoreHorizontal /></IconButton></div>
    </header>
    {searchOpen && <form className="message-search" onSubmit={search}><Search /><input autoFocus value={messageQuery} onChange={(event) => setMessageQuery(event.target.value)} placeholder="Search this conversation" aria-label="Search this conversation" /><button>Search</button><IconButton label="Close search" onClick={() => { setSearchOpen(false); setSearchResults([]); }}><X /></IconButton></form>}
    {searchResults.length > 0 && <div className="search-results"><span>{searchResults.length} result{searchResults.length === 1 ? '' : 's'}</span>{searchResults.slice(0, 4).map((result) => <button key={result.id}>{result.sender.displayName}: {result.body}</button>)}</div>}
    <div className="message-scroller">
      {nextCursor && <button className="load-older" onClick={loadOlder} disabled={loadingOlder}>{loadingOlder ? 'Loading...' : 'Load earlier messages'}</button>}
      {loading ? <SkeletonChat /> : messages.length === 0 ? <EmptyState title={isGroup ? `Say hello to ${conversation.title ?? 'the group'}` : `Say hello to ${peer?.displayName ?? 'the group'}`} detail="This is the beginning of your conversation." /> : <MessageList messages={messages} currentUser={currentUser} isGroup={isGroup} onReply={setReplyTo} onEdit={(message) => { setEditing(message); setReplyTo(null); }} onDelete={async (message) => { try { await api.deleteMessage(message.id); setMessages((items) => items.map((item) => item.id === message.id ? { ...item, body: '', deletedAt: new Date().toISOString(), attachments: [] } : item)); } catch (reason) { onError(reason instanceof Error ? reason.message : 'Delete failed'); } }} onReact={async (message, emoji) => { try { const updated = await api.react(message.id, emoji); setMessages((items) => items.map((item) => item.id === message.id ? updated : item)); } catch (reason) { onError(reason instanceof Error ? reason.message : 'Reaction failed'); } }} />}
      <div ref={bottomRef} />
    </div>
    <Composer conversationId={conversation.id} currentUser={currentUser} replyTo={replyTo} editing={editing} clearContext={() => { setReplyTo(null); setEditing(null); }} onMessage={(message) => { setMessages((items) => [...items, message]); requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })); }} onEdit={(message) => setMessages((items) => items.map((item) => item.id === message.id ? message : item))} socketSend={socketSend} onError={onError} />
  </>;
}

function MessageList({ messages, currentUser, isGroup, onReply, onEdit, onDelete, onReact }: { messages: Message[]; currentUser: User; isGroup: boolean; onReply: (message: Message) => void; onEdit: (message: Message) => void; onDelete: (message: Message) => void; onReact: (message: Message, emoji: string) => void }) {
  return <div className="message-list">{messages.map((message, index) => {
    const mine = message.sender.id === currentUser.id;
    const previous = messages[index - 1];
    const grouped = previous?.sender.id === message.sender.id && Date.parse(message.createdAt) - Date.parse(previous.createdAt) < 300_000;
    return <article key={message.id} className={`message ${mine ? 'mine' : ''} ${grouped ? 'grouped' : ''}`}>
      {!mine && !grouped && <Avatar user={message.sender} size="sm" />}
      <div className="message-content">
        {!mine && !grouped && <span className="message-author">{isGroup ? message.sender.displayName : message.sender.displayName}</span>}
        <div className={`bubble ${message.deletedAt ? 'deleted' : ''}`}>
          {message.replyTo && <div className="reply-preview"><Reply /> <span>{message.replyTo.sender.displayName}</span>{message.replyTo.body}</div>}
          {message.deletedAt ? <em>Message removed</em> : <>{message.body && <p>{message.body}</p>}{message.attachments.map((attachment) => <a className="attachment" href={attachment.url} target="_blank" rel="noreferrer" key={attachment.id}><FileText /><span>{attachment.name}<small>{formatSize(attachment.size)}</small></span></a>)}</>}
        </div>
        {!message.deletedAt && message.reactions.length > 0 && <div className="reactions">{message.reactions.map((reaction) => <button className={reaction.reacted ? 'reacted' : ''} key={reaction.emoji} onClick={() => onReact(message, reaction.emoji)}>{reaction.emoji} {reaction.count}</button>)}</div>}
        <div className="message-status"><time>{timeLabel(message.createdAt)}</time>{message.updatedAt && <span>edited</span>}{mine && <DeliveryIcon state={message.delivery} />}</div>
      </div>
      {!message.deletedAt && <div className="message-tools"><IconButton label="Reply" onClick={() => onReply(message)}><Reply /></IconButton><IconButton label="React" onClick={() => onReact(message, '❤️')}><SmilePlus /></IconButton>{mine && <><IconButton label="Edit" onClick={() => onEdit(message)}><Pencil /></IconButton><IconButton label="Delete" onClick={() => onDelete(message)}><Trash2 /></IconButton></>}</div>}
    </article>;
  })}</div>;
}

function Composer({ conversationId, currentUser, replyTo, editing, clearContext, onMessage, onEdit, socketSend, onError }: { conversationId: string; currentUser: User; replyTo: Message | null; editing: Message | null; clearContext: () => void; onMessage: (message: Message) => void; onEdit: (message: Message) => void; socketSend: (event: object) => void; onError: (error: string) => void }) {
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const typingTimer = useRef<number | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setBody(editing?.body ?? ''); }, [editing]);

  function updateBody(value: string) {
    setBody(value);
    socketSend({ type: 'typing.start', payload: { conversationId } });
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => socketSend({ type: 'typing.stop', payload: { conversationId } }), 1_800);
  }

  async function uploadFile(file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { onError('Attachments must be 5 MB or smaller'); return; }
    const allowed = ['image/', 'application/pdf', 'text/plain'];
    if (!allowed.some((type) => file.type.startsWith(type))) { onError('This file type is not supported'); return; }
    setUploading(true);
    try {
      const attachment = await api.upload(file);
      setAttachments((items) => [...items, attachment]);
    }
    catch (reason) { onError(reason instanceof Error ? reason.message : 'Upload failed'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if ((!text && attachments.length === 0) || sending) return;
    setSending(true);
    socketSend({ type: 'typing.stop', payload: { conversationId } });
    try {
      if (editing) {
        onEdit(await api.editMessage(editing.id, text));
      } else {
        onMessage(await api.sendMessage(conversationId, text, replyTo?.id, attachments.map((item) => item.id)));
      }
      setBody(''); setAttachments([]); clearContext();
    } catch (reason) { onError(reason instanceof Error ? reason.message : 'Message could not be sent'); }
    finally { setSending(false); }
  }

  return <div className="composer-wrap">
    {(replyTo || editing) && <div className="composer-context"><span>{editing ? <Pencil /> : <Reply />}<span><strong>{editing ? 'Editing message' : `Replying to ${replyTo?.sender.displayName}`}</strong><small>{editing?.body ?? replyTo?.body}</small></span></span><IconButton label="Cancel" onClick={clearContext}><X /></IconButton></div>}
    {attachments.length > 0 && <div className="pending-attachments">{attachments.map((attachment) => <span key={attachment.id}><FileText />{attachment.name}<button aria-label={`Remove ${attachment.name}`} onClick={() => setAttachments((items) => items.filter((item) => item.id !== attachment.id))}><X /></button></span>)}</div>}
    <form className="composer" onSubmit={submit}>
      <input ref={fileRef} hidden type="file" onChange={(event) => void uploadFile(event.target.files?.[0])} accept="image/*,.pdf,.txt" />
      <IconButton label="Add attachment" disabled={uploading} onClick={() => fileRef.current?.click()}><Paperclip /></IconButton>
      <label><span className="sr-only">Message</span><textarea rows={1} value={body} onChange={(event) => updateBody(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Message" /></label>
      <button className="send-button" aria-label={editing ? 'Save edit' : 'Send message'} disabled={sending || (!body.trim() && attachments.length === 0)}>{editing ? <Check /> : <Send />}</button>
    </form>
  </div>;
}

function ContactsView({ me, onMessage, onOpenContact, onOpenRequests, onOpenGroups, onOpenBlacklist, onOpenGroup, onAddGroup, onError }: { me: string; onMessage: (user: User) => void; onOpenContact: (user: User) => void; onOpenRequests: () => void; onOpenGroups: () => void; onOpenBlacklist: () => void; onOpenGroup: (groupId: string) => void; onAddGroup: () => void; onError: (error: string) => void }) {
  const [friends, setFriends] = useState<User[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.friends(me), api.friendRequests(me), api.myGroups()])
      .then(([friendRows, requestRows, groupRows]) => {
        setFriends(friendRows);
        setRequests(requestRows);
        setGroups(groupRows);
      })
      .catch((reason) => onError(reason.message))
      .finally(() => setLoading(false));
  }, [me]);

  if (loading) return <SkeletonList rows={8} />;
  return <div className="contacts-section">
    <div className="section-label">Search</div>
    <div className="contacts-entry" onClick={() => onOpenContact({ id: '', username: '', displayName: 'Search people' })}><span className="contacts-entry-mark"><Search /></span><span>Search people</span><ChevronRight className="chevron" /></div>
    <div className="section-label">Services</div>
    <div className="contacts-entry" onClick={onOpenRequests}><span className="contacts-entry-mark"><UserPlus /></span><span>New Friends</span>{requests.length > 0 && <span className="contacts-entry-badge">{requests.length > 9 ? '9+' : requests.length}</span>}<ChevronRight className="chevron" /></div>
    <div className="contacts-entry" onClick={onOpenGroups}><span className="contacts-entry-mark"><Users /></span><span>My Groups</span>{groups.length > 0 && <span className="contacts-entry-badge">{groups.length > 9 ? '9+' : groups.length}</span>}<ChevronRight className="chevron" /></div>
    <div className="contacts-entry" onClick={onAddGroup}><span className="contacts-entry-mark"><Search /></span><span>Add Group</span><ChevronRight className="chevron" /></div>
    <div className="contacts-entry" onClick={onOpenBlacklist}><span className="contacts-entry-mark"><Ban /></span><span>Blacklist</span><ChevronRight className="chevron" /></div>
    <div className="section-label">Friends · {friends.length}</div>
    {friends.length === 0 ? <EmptyState title="No friends yet" detail="Use search to find people and add friends." /> : <div className="people-list">{friends.map((friend) => <div className="person-row" key={friend.id}><button className="person-select" onClick={() => onOpenContact(friend)}><Avatar user={friend} /><span className="person-select"><strong>{friend.remark || friend.displayName}</strong><small>@{friend.username}</small></span></button><IconButton label={`Message ${friend.displayName}`} onClick={() => onMessage(friend)}><MessageCircle /></IconButton></div>)}</div>}
    {groups.length > 0 && <div className="section-label">Groups</div>}
    {groups.length > 0 && <div className="people-list">{groups.map((group) => <div className="person-row" key={group.id}><button className="person-select" onClick={() => onOpenGroup(group.id)}><GroupAvatar name={group.name} url={group.avatarUrl} /><span className="person-select"><strong>{group.name}</strong><small>{group.memberCount} members</small></span></button><IconButton label="Open group" onClick={() => onOpenGroup(group.id)}><ChevronRight /></IconButton></div>)}</div>}
  </div>;
}

function NewMessageModal({ onClose, onChoose, onOpenContact }: { onClose: () => void; onChoose: (user: User) => void; onOpenContact: (user: User) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const timer = window.setTimeout(() => { setLoading(true); api.searchUsers(query.trim()).then(setResults).catch((reason) => setError(reason.message)).finally(() => setLoading(false)); }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  async function sendRequest(person: User) {
    try {
      await api.sendFriendRequest(person.id);
      setResults((items) => items.map((item) => item.id === person.id ? { ...item, requestStatus: 'outgoing' } : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Request failed'); }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="new-message-title"><header><div><h2 id="new-message-title">Add Friend</h2></div><IconButton label="Close" onClick={onClose}><X /></IconButton></header><label className="search-field"><Search /><span className="sr-only">Search people</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter username or nickname" /></label><div className="modal-body">{error ? <div className="inline-error">{error}</div> : loading ? <SkeletonList rows={5} /> : query.length < 2 ? <EmptyState title="Find someone" detail="Enter at least two characters to search." /> : results.length === 0 ? <EmptyState title="No people found" detail="Check the spelling and try again." /> : results.map((person) => <div className="person-row" key={person.id}><Avatar user={person} /><button className="person-select" onClick={() => onOpenContact(person)}><strong>{person.displayName}</strong><small>@{person.username}</small></button>{person.isFriend ? <span className="relationship"><UserCheck />Friend</span> : person.requestStatus ? <span className="relationship">{person.requestStatus === 'outgoing' ? 'Requested' : 'Request received'}</span> : person.isBlocked ? <span className="relationship"><Ban />Blocked</span> : <IconButton label={`Send friend request to ${person.displayName}`} onClick={() => void sendRequest(person)}><UserPlus /></IconButton>}</div>)}</div></section></div>;
}

function CreateGroupModal({ me, onClose, onCreated, onError }: { me: string; onClose: () => void; onCreated: (groupId: string) => void; onError: (error: string) => void }) {
  const [friends, setFriends] = useState<User[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.friends(me).then(setFriends).catch((reason) => onError(reason.message)).finally(() => setLoading(false)); }, [me]);

  function toggle(id: string) {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const group = await api.createGroup(name.trim(), description.trim(), [...selected]);
      onCreated(group.conversationId);
    } catch (reason) { onError(reason instanceof Error ? reason.message : 'Could not create group'); }
    finally { setBusy(false); }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="create-group-title"><header><div><h2 id="create-group-title">Create Group</h2></div><IconButton label="Close" onClick={onClose}><X /></IconButton></header><form onSubmit={submit} className="profile-form">
    <label>Group name<input name="name" className="settings-input" value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} placeholder="e.g. Design Team" /></label>
    <label>Description<textarea name="description" className="settings-input" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="What is this group about?" /></label>
    <div><strong style={{ fontSize: 13 }}>Members · {selected.size}</strong>{loading ? <SkeletonList rows={6} avatar={false} /> : <div className="member-grid">{friends.map((friend) => <button type="button" className={`member-tile ${selected.has(friend.id) ? 'selected' : ''}`} style={{ background: selected.has(friend.id) ? 'var(--primary-soft)' : 'transparent', borderColor: selected.has(friend.id) ? 'var(--primary)' : 'var(--line)' }} key={friend.id} onClick={() => toggle(friend.id)}><Avatar user={friend} size="sm" /><strong>{friend.displayName}</strong><small>@{friend.username}</small></button>)}</div>}</div>
    <div className="modal-footer"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy || !name.trim()}>{busy ? 'Creating...' : 'Create group'}</button></div>
  </form></section></div>;
}

function SettingsView({ theme, setTheme, onEditProfile, onLogout }: { theme: 'dark' | 'light'; setTheme: (theme: 'dark' | 'light') => void; onEditProfile: () => void; onLogout: () => void }) {
  const { user } = useAuth();
  const { language, setLanguage, rtl, t } = useLocale();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => typeof Notification !== 'undefined' && Notification.permission === 'granted');
  const currentLanguage = languages.find(([code]) => code === language) ?? languages[1];
  async function requestNotifications() {
    if (typeof Notification === 'undefined') return;
    setNotifications((await Notification.requestPermission()) === 'granted');
  }
  return <section className="settings-view" dir={rtl ? 'rtl' : 'ltr'}>
    <div className="settings-profile"><Avatar user={user ?? undefined} size="lg" /><span><strong>{user?.displayName}</strong><small>{user?.email}</small></span><span className="role-pill">{t('account')}</span></div>
    <div className="settings-group">
      <div className="section-label">{t('settings').toUpperCase()}</div>
      <button className="settings-row" onClick={() => void requestNotifications()}><span className={`settings-icon ${notifications ? 'active' : ''}`}><Bell /></span><span><strong>{t('notification')}</strong><small>{notifications ? 'Enabled' : 'Browser alerts and messages'}</small></span><ChevronRight /></button>
      <button className="settings-row" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><span className={`settings-icon ${theme === 'dark' ? 'active' : ''}`}><Moon /></span><span><strong>{t('darkMode')}</strong><small>{theme === 'dark' ? 'On' : 'Off'}</small></span><ChevronRight /></button>
      <button className="settings-row" onClick={() => setLanguageOpen(!languageOpen)}><span className="settings-icon"><Languages /></span><span><strong>{t('language')}</strong><small>{currentLanguage[1]} — {currentLanguage[2]}</small></span><ChevronRight /></button>
      {languageOpen && <div className="language-menu">{languages.map(([code, label, native]) => <button className={code === language ? 'selected' : ''} key={code} onClick={() => { setLanguage(code as LanguageCode); setLanguageOpen(false); }}><Languages /><span><strong>{label}</strong><small>{native}</small></span>{code === language && <Check />}</button>)}</div>}
      <button className="settings-row" onClick={onEditProfile}><span className="settings-icon"><UserRound /></span><span><strong>{t('editProfile')}</strong><small>{t('uploadPhoto')}</small></span><ChevronRight /></button>
    </div>
    <button className="settings-signout" onClick={onLogout}><LogOut />{t('signOut')}</button>
  </section>;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read the image'));
    img.src = src;
  });
}

async function resizeAvatarImage(file: File): Promise<File> {
  const MAX = 1024;
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const { width, height } = img;
    const side = Math.min(width, height);
    const sx = (width - side) / 2;
    const sy = (height - side) / 2;
    const out = Math.min(side, MAX);
    const canvas = document.createElement('canvas');
    canvas.width = out;
    canvas.height = out;
    canvas.getContext('2d')?.drawImage(img, sx, sy, side, side, 0, 0, out, out);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return file;
    return new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user, updateUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  async function uploadAvatar(file?: File) {
    if (!file) return;
    setUploading(true); setProgress(0); setError(''); setStatus('');
    try {
      const resized = await resizeAvatarImage(file);
      const url = await api.uploadAvatar(resized, (pct) => setProgress(pct));
      setAvatarUrl(url);
      await updateUser({ avatarUrl: url });
      setStatus('Photo updated');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Photo upload failed'); }
    finally { setUploading(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    try { await updateUser({ displayName: String(data.get('displayName')), username: String(data.get('username')), bio: String(data.get('bio')), avatarUrl: String(data.get('avatarUrl')) || null }); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Profile could not be saved'); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title"><header><div><h2 id="profile-title">My Profile</h2></div><IconButton label="Close" onClick={onClose}><X /></IconButton></header><form onSubmit={submit} className="profile-form"><div className="profile-preview"><Avatar user={user ? { ...user, avatarUrl: resolveAssetUrl(avatarUrl) ?? null } : undefined} size="lg" /><span><strong>{user?.displayName}</strong><small>@{user?.username}</small></span><label className={`secondary-button photo-upload${uploading ? ' disabled' : ''}`} aria-busy={uploading}><ImageUp />{uploading ? `Uploading… ${progress}%` : 'Upload photo'}<input hidden type="file" accept="image/*" disabled={uploading} onChange={(event) => void uploadAvatar(event.target.files?.[0])} /></label></div>{status && <div className="inline-success"><Check />{status}</div>}<label>Display name<input name="displayName" defaultValue={user?.displayName} required /></label><label>Username<input name="username" defaultValue={user?.username} required /></label><input name="avatarUrl" type="hidden" value={avatarUrl} /><label>Bio<textarea name="bio" rows={3} maxLength={160} defaultValue={user?.bio ?? ''} placeholder="A little about you" /></label>{error && <div className="inline-error">{error}</div>}<div className="modal-footer"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy || uploading}>{busy ? 'Saving...' : 'Save changes'}</button></div></form></section></div>;
}

function ContactModal({ user, me, onClose, onMessage, onError }: { user: User; me: string; onClose: () => void; onMessage: (user: User) => void; onError: (error: string) => void }) {
  const [person, setPerson] = useState<User>(user);
  const [busy, setBusy] = useState(false);
  const [remark, setRemark] = useState(user.remark ?? '');
  const [remarkDirty, setRemarkDirty] = useState(false);

  async function saveRemark() {
    setBusy(true);
    try {
      const updated = await api.setFriendRemark(person.id, remark.trim());
      setPerson((item) => ({ ...item, remark: updated.remark ?? null }));
      setRemarkDirty(false);
    } catch (reason) { onError(reason instanceof Error ? reason.message : 'Could not save remark'); }
    finally { setBusy(false); }
  }

  async function addFriend() {
    setBusy(true);
    try { await api.sendFriendRequest(person.id); setPerson((item) => ({ ...item, requestStatus: 'outgoing' })); }
    catch (reason) { onError(reason instanceof Error ? reason.message : 'Request failed'); }
    finally { setBusy(false); }
  }
  async function removeFriend() {
    setBusy(true);
    try { await api.removeFriend(person.id); setPerson((item) => ({ ...item, isFriend: false })); }
    catch (reason) { onError(reason instanceof Error ? reason.message : 'Could not remove friend'); }
    finally { setBusy(false); }
  }
  async function toggleBlock() {
    setBusy(true);
    try {
      if (person.isBlocked) { await api.unblockUser(person.id); setPerson((item) => ({ ...item, isBlocked: false })); }
      else { await api.blockUser(person.id); setPerson((item) => ({ ...item, isBlocked: true, isFriend: false, requestStatus: null })); }
    }
    catch (reason) { onError(reason instanceof Error ? reason.message : 'Action failed'); }
    finally { setBusy(false); }
  }

  if (!person.id) return null;
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="contact-title"><header><div><h2 id="contact-title">Contact Info</h2></div><IconButton label="Close" onClick={onClose}><X /></IconButton></header>
    <div className="contact-hero"><Avatar user={person} size="lg" /><h2>{person.displayName}</h2><small>@{person.username}</small>{person.bio && <p>{person.bio}</p>}<span className="role-pill" style={{ background: person.isBlocked ? 'color-mix(in srgb, var(--danger) 12%, transparent)' : 'var(--primary-soft)', color: person.isBlocked ? 'var(--danger)' : 'var(--primary)' }}>{person.isBlocked ? 'Blocked' : person.isFriend ? 'Friend' : person.requestStatus ? person.requestStatus === 'outgoing' ? 'Request sent' : 'Request received' : 'Stranger'}</span></div>
    <div className="contact-actions">
      {person.isFriend && <button className="primary-button" onClick={() => { onClose(); onMessage(person); }}><MessageCircle />Message</button>}
      {!person.isFriend && !person.requestStatus && !person.isBlocked && <button className="primary-button" disabled={busy} onClick={addFriend}><UserPlus />Add Friend</button>}
      {person.requestStatus === 'incoming' && !person.isFriend && <button className="primary-button" disabled={busy} onClick={async () => { const requests = await api.friendRequests(me); const pending = requests.find((item) => item.user.id === person.id); if (pending) { await api.respondFriendRequest(pending.id, true); setPerson((item) => ({ ...item, isFriend: true, requestStatus: null })); } }}><UserCheck />Accept</button>}
      {person.requestStatus === 'outgoing' && <button className="secondary-button" disabled disabled-title="Request pending">Request sent</button>}
      {person.isFriend && <button className="secondary-button" disabled={busy} onClick={removeFriend}><Trash2 />Remove</button>}
      <button className={person.isBlocked ? 'secondary-button' : 'danger-button'} disabled={busy} onClick={toggleBlock}>{person.isBlocked ? <><Unlock />Unblock</> : <><Ban />Block</>}</button>
    </div>
    {person.isFriend && <form className="profile-form" onSubmit={(event) => { event.preventDefault(); if (remarkDirty) void saveRemark(); }}><label>Remark<input className="settings-input" value={remark} onChange={(event) => { setRemark(event.target.value); setRemarkDirty(true); }} maxLength={80} placeholder="Set a remark for this friend" /></label>{remarkDirty && <button className="primary-button" disabled={busy}>{busy ? 'Saving...' : 'Save remark'}</button>}</form>}
  </section></div>;
}

function FriendRequestsModal({ me, onClose, onMessage }: { me: string; onClose: () => void; onMessage: (user: User) => void }) {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { api.friendRequests(me).then(setRequests).catch((reason) => setError(reason.message)).finally(() => setLoading(false)); }, [me]);

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="requests-title"><header><div><h2 id="requests-title">New Friends</h2></div><IconButton label="Close" onClick={onClose}><X /></IconButton></header><div className="modal-body">{error ? <div className="inline-error">{error}</div> : loading ? <SkeletonList rows={5} /> : requests.length === 0 ? <EmptyState title="No requests" detail="Friend requests will appear here." /> : requests.map((request) => <div className="person-row" key={request.id}><Avatar user={request.user} /><span><strong>{request.user.displayName}</strong><small>{request.direction === 'incoming' ? 'Wants to connect' : 'Request sent'}</small></span>{request.direction === 'incoming' ? <><IconButton label="Accept request" onClick={async () => { await api.respondFriendRequest(request.id, true); setRequests((items) => items.filter((item) => item.id !== request.id)); }}><UserCheck /></IconButton><IconButton label="Decline request" onClick={async () => { await api.respondFriendRequest(request.id, false); setRequests((items) => items.filter((item) => item.id !== request.id)); }}><X /></IconButton></> : <><IconButton label="Cancel request" onClick={async () => { await api.cancelFriendRequest(request.id); setRequests((items) => items.filter((item) => item.id !== request.id)); }}><X /></IconButton><IconButton label="Message" onClick={() => onMessage(request.user)}><MessageCircle /></IconButton></>}</div>)}</div></section></div>;
}

function GroupsModal({ onClose, onOpen, onCreate }: { onClose: () => void; onOpen: (groupId: string) => void; onCreate: () => void }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { api.myGroups().then(setGroups).catch((reason) => setError(reason.message)).finally(() => setLoading(false)); }, []);

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="groups-title"><header><div><h2 id="groups-title">My Groups</h2></div><button className="primary-button" onClick={onCreate}><Plus />Create</button><IconButton label="Close" onClick={onClose}><X /></IconButton></header><div className="modal-body">{error ? <div className="inline-error">{error}</div> : loading ? <SkeletonList rows={5} /> : groups.length === 0 ? <EmptyState title="No groups yet" detail="Create a group to chat together." /> : groups.map((group) => <div className="person-row" key={group.id}><button className="person-select" onClick={() => onOpen(group.id)}><GroupAvatar name={group.name} url={group.avatarUrl} /><span className="person-select"><strong>{group.name}</strong><small>{group.memberCount} members · {group.myRole}</small></span></button><IconButton label="Open group" onClick={() => onOpen(group.id)}><ChevronRight /></IconButton></div>)}</div></section></div>;
}

function AddGroupModal({ onClose, onJoin, onError }: { onClose: () => void; onJoin: (groupId: string) => void; onError: (error: string) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const timer = window.setTimeout(() => { setLoading(true); api.searchGroups(query.trim()).then(setResults).catch((reason) => setError(reason.message)).finally(() => setLoading(false)); }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  async function join(group: Group) {
    try {
      await api.applyToGroup(group.id);
      onJoin(group.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not apply'); }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="add-group-title"><header><div><h2 id="add-group-title">Add Group</h2></div><IconButton label="Close" onClick={onClose}><X /></IconButton></header><label className="search-field"><Search /><span className="sr-only">Search groups</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter group name" /></label><div className="modal-body">{error ? <div className="inline-error">{error}</div> : loading ? <SkeletonList rows={5} /> : query.length < 2 ? <EmptyState title="Find a group" detail="Enter at least two characters to search." /> : results.length === 0 ? <EmptyState title="No groups found" detail="Try a different name." /> : results.map((group) => <div className="person-row" key={group.id}><button className="person-select" onClick={() => onJoin(group.id)}><GroupAvatar name={group.name} url={group.avatarUrl} /><span className="person-select"><strong>{group.name}</strong><small>{group.memberCount} members</small></span></button>{group.myRole !== 'member' ? <button className="secondary-button" onClick={() => void join(group)}><UserPlus />Join</button> : <span className="relationship"><UserCheck />Member</span>}</div>)}</div></section></div>;
}

function BlacklistModal({ onClose }: { onClose: () => void }) {
  const [blocks, setBlocks] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { api.blocks().then(setBlocks).catch((reason) => setError(reason.message)).finally(() => setLoading(false)); }, []);

  async function unblock(userId: string) {
    try { await api.unblockUser(userId); setBlocks((items) => items.filter((item) => item.id !== userId)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not unblock'); }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="blacklist-title"><header><div><h2 id="blacklist-title">Blacklist</h2></div><IconButton label="Close" onClick={onClose}><X /></IconButton></header><div className="modal-body">{error ? <div className="inline-error">{error}</div> : loading ? <SkeletonList rows={5} /> : blocks.length === 0 ? <EmptyState title="Blacklist is empty" detail="Blocked users will appear here." /> : blocks.map((person) => <div className="person-row" key={person.id}><Avatar user={person} /><span><strong>{person.displayName}</strong><small>@{person.username}</small></span><button className="secondary-button" onClick={() => void unblock(person.id)}><Unlock />Unblock</button></div>)}</div></section></div>;
}

function GroupModal({ groupId, me, onClose, onOpenMember, onError }: { groupId: string; me: string; onClose: () => void; onOpenMember: (user: User) => void; onError: (error: string) => void }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [applications, setApplications] = useState<{ id: string; applicant: User; createdAt: string }[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [friends, setFriends] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.group(groupId).then((value) => { setGroup(value); setName(value.name); setDescription(value.description ?? ''); }).catch((reason) => onError(reason.message)).finally(() => setLoading(false));
    api.groupApplications(groupId).then((rows) => setApplications(rows.map((row) => ({ id: row.id, applicant: row.applicant, createdAt: row.createdAt })))).catch(() => undefined);
  }, [groupId]);

  const isAdmin = group && (group.myRole === 'owner' || group.myRole === 'admin');

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    if (!group || busy) return;
    setBusy(true);
    try { setGroup(await api.updateGroup(group.id, { name: name.trim(), description: description.trim() })); setEditing(false); }
    catch (reason) { onError(reason instanceof Error ? reason.message : 'Could not save'); }
    finally { setBusy(false); }
  }

  async function addMembers(userIds: string[]) {
    if (!group || busy) return;
    setBusy(true);
    try { setGroup(await api.addGroupMembers(group.id, userIds)); setAddOpen(false); }
    catch (reason) { onError(reason instanceof Error ? reason.message : 'Could not add members'); }
    finally { setBusy(false); }
  }

  async function removeMember(userId: string) {
    if (!group || busy) return;
    setBusy(true);
    try { setGroup(await api.removeGroupMember(group.id, userId)); }
    catch (reason) { onError(reason instanceof Error ? reason.message : 'Could not remove member'); }
    finally { setBusy(false); }
  }

  async function changeRole(userId: string, role: 'admin' | 'member') {
    if (!group || busy) return;
    setBusy(true);
    try { setGroup(await api.changeGroupMemberRole(group.id, userId, role)); }
    catch (reason) { onError(reason instanceof Error ? reason.message : 'Could not change role'); }
    finally { setBusy(false); }
  }

  async function leave() {
    if (!group || busy) return;
    setBusy(true);
    try { await api.removeGroupMember(group.id, me); onClose(); }
    catch (reason) { onError(reason instanceof Error ? reason.message : 'Could not leave'); }
    finally { setBusy(false); }
  }

  async function destroy() {
    if (!group || busy || !window.confirm(`Delete group "${group.name}"? This cannot be undone.`)) return;
    setBusy(true);
    try { await api.deleteGroup(group.id); onClose(); }
    catch (reason) { onError(reason instanceof Error ? reason.message : 'Could not delete group'); }
    finally { setBusy(false); }
  }

  async function handleApplication(applicationId: string, accept: boolean) {
    if (!group || busy) return;
    setBusy(true);
    try {
      await api.respondGroupApplication(group.id, applicationId, accept);
      setApplications((items) => items.filter((item) => item.id !== applicationId));
      if (accept) setGroup(await api.group(group.id));
    }
    catch (reason) { onError(reason instanceof Error ? reason.message : 'Action failed'); }
    finally { setBusy(false); }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="group-title"><header><div><h2 id="group-title">{loading ? 'Group' : group?.name ?? 'Group'}</h2></div><IconButton label="Close" onClick={onClose}><X /></IconButton></header>
    {error && <div className="inline-error" style={{ margin: 12 }}>{error}</div>}
    {loading ? <div className="modal-body"><SkeletonList rows={5} /></div> : group && <>
      <div className="contact-hero"><GroupAvatar name={group.name} url={group.avatarUrl} size="lg" /><h2>{group.name}</h2><small>{group.memberCount} members · {group.myRole}</small>{group.description && <p>{group.description}</p>}</div>
      <div className="contact-actions">{isAdmin && <button className="primary-button" onClick={() => setAddOpen(true)}><UserPlus />Add members</button>}{isAdmin && <button className="secondary-button" onClick={() => { setFriends([]); setEditing(true); }}><Pencil />Edit info</button>}{group.myRole === 'owner' ? <button className="danger-button" disabled={busy} onClick={destroy}><Trash2 />Delete group</button> : <button className="secondary-button" disabled={busy} onClick={leave}>Leave group</button>}</div>
      {editing && <form onSubmit={saveSettings} className="profile-form" style={{ borderBottom: '1px solid var(--line)' }}><label>Group name<input className="settings-input" value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} /></label><label>Description<textarea className="settings-input" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} /></label><div className="modal-footer"><button type="button" className="secondary-button" onClick={() => setEditing(false)}>Cancel</button><button className="primary-button" disabled={busy}>Save</button></div></form>}
      {applications.length > 0 && <div style={{ padding: '0 14px' }}><div className="section-label">Join requests · {applications.length}</div>{applications.map((application) => <div className="person-row" key={application.id}><Avatar user={application.applicant} /><span><strong>{application.applicant.displayName}</strong><small>wants to join</small></span><IconButton label="Accept" onClick={() => void handleApplication(application.id, true)}><UserCheck /></IconButton><IconButton label="Reject" onClick={() => void handleApplication(application.id, false)}><X /></IconButton></div>)}</div>}
      {addOpen && <AddMembersPicker friends={friends} setFriends={setFriends} groupId={group.id} me={me} onAdd={addMembers} onCancel={() => setAddOpen(false)} onError={setError} />}
      <div style={{ padding: '0 14px 16px' }}><div className="section-label">Members · {group.memberCount}</div><div className="member-grid">{group.members.map((member) => <div className="member-tile" key={member.user.id}><button type="button" style={{ border: 0, background: 'transparent', display: 'contents' }} onClick={() => onOpenMember(member.user)}><Avatar user={member.user} size="sm" /><strong>{member.user.displayName}</strong></button><small>@{member.user.username}</small><span className={`role-pill ${member.role}`}>{member.role}</span>{group.myRole === 'owner' && member.role !== 'owner' && <button onClick={() => void changeRole(member.user.id, member.role === 'admin' ? 'member' : 'admin')}>{member.role === 'admin' ? 'Remove admin' : 'Make admin'}</button>}{isAdmin && member.user.id !== me && member.role !== 'owner' && <button onClick={() => void removeMember(member.user.id)}>Remove</button>}</div>)}</div></div>
    </>}
  </section></div>;
}

function AddMembersPicker({ friends, setFriends, groupId, me, onAdd, onCancel, onError }: { friends: User[]; setFriends: (users: User[]) => void; groupId: string; me: string; onAdd: (userIds: string[]) => void; onCancel: () => void; onError: (error: string) => void }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setFriends([]); return; }
    const timer = window.setTimeout(() => { setLoading(true); api.searchUsers(query.trim()).then((rows) => setFriends(rows.filter((person) => person.id !== me && !person.isBlocked))).catch((reason) => onError(reason.message)).finally(() => setLoading(false)); }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  function toggle(id: string) {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  return <div style={{ padding: '0 14px 8px', borderBottom: '1px solid var(--line)' }}>
    <div className="section-label">Add members</div>
    <label className="search-field"><Search /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people to add" /></label>
    {loading ? <SkeletonList rows={4} /> : friends.slice(0, 8).map((person) => <div className="person-row" key={person.id}><Avatar user={person} /><span className="person-select"><strong>{person.displayName}</strong><small>@{person.username}</small></span><button className="secondary-button" onClick={() => toggle(person.id)}>{selected.has(person.id) ? <><Check />Added</> : 'Add'}</button></div>)}
    <div className="modal-footer"><button className="secondary-button" onClick={onCancel}>Cancel</button><button className="primary-button" disabled={selected.size === 0} onClick={() => onAdd([...selected])}>Add {selected.size} member{selected.size === 1 ? '' : 's'}</button></div>
  </div>;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default App;
