import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
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
  FileType,
  Eye,
  EyeOff,
  ImageUp,
  Images,
  LogOut,
  MessageCircle,
  MessageSquarePlus,
  Mic,
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
  LockKeyhole,
  Mail,
  Shield,
  ShieldCheck,
  SmilePlus,
  Sun,
  Trash2,
  Play,
  Pause,
  Volume2,
  VolumeX,
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
import { EmojiText, encodeEmoji, emojiList, FluentEmoji, REACTION_CHOICES } from './emoji';
import type { Attachment, Conversation, FriendRequest, Group, Message, SocketEvent, User } from './types';
import { useSocket } from './useSocket';
import { languages, useLocale, type LanguageCode } from './i18n';
import { giphyItems, mediaRecents, rememberMedia, type GiphyItem, type GiphyKind } from './giphy';

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
  const { t, rtl, language, setLanguage } = useLocale();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [voiceOn, setVoiceOn] = useState(() => localStorage.getItem('xyteee.voice') === '1');
  const [langOpen, setLangOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  const speechLang: Record<LanguageCode, string> = { bn: 'bn-BD', en: 'en-US', id: 'id-ID', hi: 'hi-IN', ar: 'ar-SA', es: 'es-ES', pt: 'pt-BR' };
  const [voicesTick, setVoicesTick] = useState(0);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const load = () => { window.speechSynthesis.getVoices(); setVoicesTick((value) => value + 1); };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  function pickVoice(target: string) {
    const voices = window.speechSynthesis.getVoices();
    const prefix = target.split('-')[0]?.toLowerCase() ?? target.toLowerCase();
    return voices.find((voice) => voice.lang.toLowerCase() === target.toLowerCase())
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix));
  }

  function speakGuide() {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const target = speechLang[language] ?? 'en-US';
    const utterance = new SpeechSynthesisUtterance(t(mode === 'login' ? 'authVoiceLoginGuide' : 'authVoiceRegisterGuide'));
    utterance.lang = target;
    const voice = pickVoice(target);
    if (voice) utterance.voice = voice;
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    if (voiceOn) speakGuide();
    else window.speechSynthesis.cancel();
    return () => window.speechSynthesis.cancel();
  }, [voiceOn, language, mode, voicesTick]);

  useEffect(() => {
    if (!langOpen) return;
    function onPointerDown(event: MouseEvent) { if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) setLangOpen(false); }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [langOpen]);

  function toggleVoice() {
    const next = !voiceOn;
    setVoiceOn(next);
    localStorage.setItem('xyteee.voice', next ? '1' : '0');
  }

  function changeMode(next: 'login' | 'register') {
    setMode(next);
    setError('');
    setShowPassword(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      if (mode === 'login') await login(String(data.get('email')), String(data.get('password')));
      else {
        const password = String(data.get('password'));
        if (password !== String(data.get('confirmPassword'))) throw new Error(t('authPasswordsMismatch'));
        await register({
          displayName: String(data.get('displayName')),
          username: String(data.get('username')),
          email: String(data.get('email')),
          password,
        });
      }
    } catch (reason) {
      if (reason instanceof Error && reason.message === 'Invalid email or password') setError(t('authInvalidCredentials'));
      else if (reason instanceof Error && reason.message === 'Email or username already exists') setError(t('authAccountExists'));
      else setError(reason instanceof Error ? reason.message : t('authUnableContinue'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="auth-tools" ref={toolsRef}>
        <div className="auth-tool">
          <button type="button" className="auth-tool-btn" aria-label={t('chooseLanguage')} title={t('chooseLanguage')} onClick={() => setLangOpen((value) => !value)}><Languages /></button>
          {langOpen && <div className="lang-menu" role="menu" aria-label={t('chooseLanguage')}>
            {languages.map(([code, , native]) => {
              const active = code === language;
              return <button type="button" key={code} role="menuitemradio" aria-checked={active} className={active ? 'active' : ''} onClick={() => { setLanguage(code); setLangOpen(false); }}>{native}{active ? <Check /> : null}</button>;
            })}
          </div>}
        </div>
        <button type="button" className={`auth-tool-btn${voiceOn ? ' on' : ''}`} aria-label={voiceOn ? t('authVoiceStop') : t('authVoiceStart')} title={voiceOn ? t('authVoiceStop') : t('authVoiceStart')} onClick={toggleVoice}>{voiceOn ? <Volume2 /> : <VolumeX />}</button>
      </div>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-brand"><span><MessageCircle /></span><strong>XYTEEE</strong></div>
          <div className="auth-heading"><h1>{mode === 'login' ? t('authWelcome') : t('authCreate')}</h1><p>{mode === 'login' ? t('authLoginSubtitle') : t('authRegisterSubtitle')}</p></div>
          <form onSubmit={submit} className="auth-form">
            {mode === 'register' && <><label>{t('authFullName')}<div className="auth-input"><UserRound /><input name="displayName" autoComplete="name" placeholder={t('authNamePlaceholder')} required /></div></label><label>{t('authUsername')}<div className="auth-input"><UserCheck /><input name="username" autoComplete="username" placeholder={t('authUsernamePlaceholder')} pattern="[a-zA-Z0-9_]{3,32}" required /></div></label></>}
            <label>{t('authEmail')}<div className="auth-input"><Mail /><input name="email" type="email" autoComplete="email" placeholder={t('authEmailPlaceholder')} required /></div></label>
            <label>{t('authPassword')}<div className="auth-input"><LockKeyhole /><input name="password" type={showPassword ? 'text' : 'password'} minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'login' ? t('authPasswordPlaceholder') : t('authPasswordMinimum')} required /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t('authHidePassword') : t('authShowPassword')}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
            {mode === 'register' && <label>{t('authConfirmPassword')}<div className="auth-input"><LockKeyhole /><input name="confirmPassword" type={showPassword ? 'text' : 'password'} minLength={8} autoComplete="new-password" placeholder={t('authRepeatPassword')} required /></div></label>}
            {mode === 'login' && <button type="button" className="forgot-link" onClick={() => setError(t('authRecoveryUnavailable'))}>{t('authForgotPassword')}</button>}
            {error && <div className="inline-error" role="alert">{error}</div>}
            <button className="primary-button auth-submit" disabled={busy}>{busy ? t('authPleaseWait') : mode === 'login' ? t('authContinue') : t('authCreateAccount')}</button>
          </form>
          <div className="auth-divider"><span>{t('authOr')}</span></div>
          <button type="button" className="google-button" onClick={() => setError(t('authGoogleUnavailable'))}><span className="google-mark">G</span>{mode === 'login' ? t('authContinueGoogle') : t('authSignupGoogle')}</button>
          <p className="auth-switch">{mode === 'login' ? t('authNoAccount') : t('authHaveAccount')} <button type="button" onClick={() => changeMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? t('authSignup') : t('authSignin')}</button></p>
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
    {searchResults.length > 0 && <div className="search-results"><span>{searchResults.length} result{searchResults.length === 1 ? '' : 's'}</span>{searchResults.slice(0, 4).map((result) => <button key={result.id}>{result.sender.displayName}: <EmojiText text={result.body} size={13} /></button>)}</div>}
    <div className="message-scroller">
      {nextCursor && <button className="load-older" onClick={loadOlder} disabled={loadingOlder}>{loadingOlder ? 'Loading...' : 'Load earlier messages'}</button>}
      {loading ? <SkeletonChat /> : messages.length === 0 ? <EmptyState title={isGroup ? `Say hello to ${conversation.title ?? 'the group'}` : `Say hello to ${peer?.displayName ?? 'the group'}`} detail="This is the beginning of your conversation." /> : <MessageList messages={messages} currentUser={currentUser} isGroup={isGroup} onReply={setReplyTo} onEdit={(message) => { setEditing(message); setReplyTo(null); }} onDelete={async (message) => { try { await api.deleteMessage(message.id); setMessages((items) => items.map((item) => item.id === message.id ? { ...item, body: '', deletedAt: new Date().toISOString(), attachments: [] } : item)); } catch (reason) { onError(reason instanceof Error ? reason.message : 'Delete failed'); } }} onReact={async (message, emoji) => { try { const updated = await api.react(message.id, emoji); setMessages((items) => items.map((item) => item.id === message.id ? updated : item)); } catch (reason) { onError(reason instanceof Error ? reason.message : 'Reaction failed'); } }} />}
      <div ref={bottomRef} />
    </div>
    <Composer conversationId={conversation.id} currentUser={currentUser} replyTo={replyTo} editing={editing} clearContext={() => { setReplyTo(null); setEditing(null); }} onMessage={(message) => { setMessages((items) => [...items, message]); requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })); }} onEdit={(message) => setMessages((items) => items.map((item) => item.id === message.id ? message : item))} socketSend={socketSend} onError={onError} />
  </>;
}

function MessageList({ messages, currentUser, isGroup, onReply, onEdit, onDelete, onReact }: { messages: Message[]; currentUser: User; isGroup: boolean; onReply: (message: Message) => void; onEdit: (message: Message) => void; onDelete: (message: Message) => void; onReact: (message: Message, emoji: string) => void }) {
  const [viewer, setViewer] = useState<Attachment | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  useEffect(() => {
    if (!viewer) return;
    function close(event: KeyboardEvent) { if (event.key === 'Escape') setViewer(null); }
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [viewer]);
  return <div className="message-list">{messages.map((message, index) => {
    const mine = message.sender.id === currentUser.id;
    const previous = messages[index - 1];
    const grouped = previous?.sender.id === message.sender.id && Date.parse(message.createdAt) - Date.parse(previous.createdAt) < 300_000;
    const giphy = message.attachments.some((item) => (item.name ?? '').startsWith('GIPHY:'));
    const sticker = message.attachments.some((item) => (item.name ?? '').startsWith('GIPHY:sticker'));
    return <article key={message.id} className={`message ${mine ? 'mine' : ''} ${grouped ? 'grouped' : ''}`}>
      {!mine && !grouped && <Avatar user={message.sender} size="sm" />}
      <div className="message-content">
        {!mine && !grouped && <span className="message-author">{isGroup ? message.sender.displayName : message.sender.displayName}</span>}
        <div className={`bubble ${message.deletedAt ? 'deleted' : ''} ${giphy ? 'giphy' : ''} ${sticker ? 'sticker' : ''}`}>
          {message.replyTo && <div className="reply-preview"><Reply /> <span>{message.replyTo.sender.displayName}</span><EmojiText text={message.replyTo.body} size={13} /></div>}
          {message.deletedAt ? <em>Message removed</em> : <>{message.body && <p><EmojiText text={message.body} size={20} /></p>}<MessageAttachments attachments={message.attachments} onOpen={setViewer} /></>}
        </div>
        {!message.deletedAt && message.reactions.length > 0 && <div className="reactions">{message.reactions.map((reaction) => <button className={reaction.reacted ? 'reacted' : ''} key={reaction.emoji} onClick={() => onReact(message, reaction.emoji)}><FluentEmoji char={reaction.emoji} size={15} /> {reaction.count}</button>)}</div>}
        <div className="message-status"><time>{timeLabel(message.createdAt)}</time>{message.updatedAt && <span>edited</span>}{mine && <DeliveryIcon state={message.delivery} />}</div>
      </div>
      {!message.deletedAt && <div className="message-tools"><IconButton label="Reply" onClick={() => onReply(message)}><Reply /></IconButton><div className="reaction-picker-wrap"><IconButton label="React" onClick={() => setPicking(picking === message.id ? null : message.id)}><SmilePlus /></IconButton>{picking === message.id && <div className="reaction-picker">{REACTION_CHOICES.map((choice) => <button type="button" key={choice} onClick={() => { onReact(message, choice); setPicking(null); }}><FluentEmoji char={choice} size={22} /></button>)}</div>}</div>{mine && <><IconButton label="Edit" onClick={() => onEdit(message)}><Pencil /></IconButton><IconButton label="Delete" onClick={() => onDelete(message)}><Trash2 /></IconButton></>}</div>}
    </article>;
  })}{viewer && <MediaViewer attachment={viewer} onClose={() => setViewer(null)} />}</div>;
}

function MessageAttachments({ attachments, onOpen }: { attachments: Attachment[]; onOpen: (attachment: Attachment) => void }) {
  const images = attachments.filter((item) => item.mimeType.startsWith('image/'));
  const videos = attachments.filter((item) => item.mimeType.startsWith('video/'));
  const audio = attachments.filter((item) => item.mimeType.startsWith('audio/'));
  const files = attachments.filter((item) => !item.mimeType.startsWith('image/') && !item.mimeType.startsWith('video/') && !item.mimeType.startsWith('audio/'));
  const visibleImages = images.slice(0, 4);
  if (attachments.length === 0) return null;
  return <div className="message-attachments">
    {images.length > 0 && <div className={`media-grid media-grid-${Math.min(images.length, 4)}`}>
      {visibleImages.map((attachment, index) => <button type="button" className="media-tile" key={attachment.id} onClick={() => onOpen(attachment)} aria-label={`View ${attachment.name}`}>
        <img src={attachment.url} alt={attachment.name} loading="lazy" />
        {index === 3 && images.length > 4 && <span className="media-more">+{images.length - 4}</span>}
      </button>)}
    </div>}
    {videos.map((attachment) => <button type="button" className="video-card" key={attachment.id} onClick={() => onOpen(attachment)} aria-label={`Play ${attachment.name}`}>
      <video src={attachment.url} preload="metadata" muted />
      <span className="video-play"><Play fill="currentColor" /></span>
      <span className="video-name">{attachment.name}</span>
    </button>)}
    {audio.map((attachment) => <VoicePlayer key={attachment.id} src={attachment.url} />)}
    {files.map((attachment) => <a className="file-card" href={attachment.url} target="_blank" rel="noreferrer" key={attachment.id}>
      <span className="file-icon">{attachment.mimeType === 'application/pdf' ? <FileType /> : <FileText />}</span>
      <span className="file-copy"><strong>{attachment.name}</strong><small>{fileTypeLabel(attachment)} · {formatSize(attachment.size)}</small></span>
      <ArrowDown />
    </a>)}
  </div>;
}

function VoicePlayer({ src, compact = false }: { src: string; compact?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const shownTime = playing || position > 0 ? position : duration;
  return <div className={`voice-player${compact ? ' compact' : ''}`}>
    <audio ref={audioRef} src={src} preload="metadata" onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)} onEnded={() => { setPlaying(false); setPosition(0); }} />
    <button type="button" aria-label={playing ? 'Pause voice message' : 'Play voice message'} onClick={() => { const audio = audioRef.current; if (!audio) return; if (playing) audio.pause(); else void audio.play(); setPlaying(!playing); }}>{playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</button>
    <input aria-label="Voice message progress" type="range" min="0" max={duration || 1} step="0.01" value={Math.min(position, duration || 1)} onChange={(event) => { const next = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = next; setPosition(next); }} />
    <time>{formatDuration(shownTime)}</time>
  </div>;
}

function MediaViewer({ attachment, onClose }: { attachment: Attachment; onClose: () => void }) {
  const video = attachment.mimeType.startsWith('video/');
  return <div className="media-viewer" role="dialog" aria-modal="true" aria-label={attachment.name} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="media-viewer-bar"><span>{attachment.name}</span><IconButton label="Close viewer" onClick={onClose}><X /></IconButton></div>
    <div className="media-viewer-content">{video ? <video src={attachment.url} controls autoPlay playsInline /> : <img src={attachment.url} alt={attachment.name} />}</div>
  </div>;
}

function Composer({ conversationId, currentUser, replyTo, editing, clearContext, onMessage, onEdit, socketSend, onError }: { conversationId: string; currentUser: User; replyTo: Message | null; editing: Message | null; clearContext: () => void; onMessage: (message: Message) => void; onEdit: (message: Message) => void; socketSend: (event: object) => void; onError: (error: string) => void }) {
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const typingTimer = useRef<number | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | undefined>(undefined);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voicePreview, setVoicePreview] = useState<{ file: File; url: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => { setBody(editing?.body ?? ''); }, [editing]);
  useEffect(() => () => { window.clearInterval(recordingTimerRef.current); recorderStreamRef.current?.getTracks().forEach((track) => track.stop()); if (voicePreview) URL.revokeObjectURL(voicePreview.url); }, [voicePreview]);

  function updateBody(value: string) {
    setBody(value);
    socketSend({ type: 'typing.start', payload: { conversationId } });
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => socketSend({ type: 'typing.stop', payload: { conversationId } }), 1_800);
  }

  async function uploadFile(file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { onError('Attachments must be 5 MB or smaller'); return; }
    const allowed = ['image/', 'audio/', 'application/pdf', 'text/plain'];
    if (!allowed.some((type) => file.type.startsWith(type))) { onError('This file type is not supported'); return; }
    setUploading(true);
    try {
      const attachment = await api.upload(file);
      setAttachments((items) => [...items, attachment]);
    }
    catch (reason) { onError(reason instanceof Error ? reason.message : 'Upload failed'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { onError('Voice recording is not supported by this browser'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      recorderRef.current = recorder; recorderStreamRef.current = stream; recorderChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) recorderChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop()); recorderStreamRef.current = null;
        const type = recorder.mimeType || 'audio/webm';
        const blob = new Blob(recorderChunksRef.current, { type });
        if (blob.size) {
          const extension = type.includes('ogg') ? 'ogg' : 'webm';
          const file = new File([blob], `voice-${Date.now()}.${extension}`, { type });
          setVoicePreview((current) => { if (current) URL.revokeObjectURL(current.url); return { file, url: URL.createObjectURL(blob) }; });
        }
      };
      recorder.start(); setRecording(true); setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    } catch (reason) { onError(reason instanceof Error ? reason.message : 'Microphone access failed'); }
  }

  function stopRecording(cancel = false) {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    if (cancel) recorder.onstop = () => recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
    recorder.stop(); recorderRef.current = null; setRecording(false); window.clearInterval(recordingTimerRef.current);
    if (cancel) { recorderChunksRef.current = []; setRecordingSeconds(0); }
  }

  function cancelPreview() {
    setVoicePreview((current) => { if (current) URL.revokeObjectURL(current.url); return null; });
    setRecordingSeconds(0);
  }

  async function sendVoice() {
    if (!voicePreview || sending) return;
    setSending(true);
    try {
      const attachment = await api.upload(voicePreview.file);
      onMessage(await api.sendMessage(conversationId, '', replyTo?.id, [attachment.id]));
      cancelPreview(); clearContext();
    } catch (reason) { onError(reason instanceof Error ? reason.message : 'Voice message could not be sent'); }
    finally { setSending(false); }
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
    {recording && <div className="voice-recording"><span><i />Recording</span><time>{formatDuration(recordingSeconds)}</time><button type="button" onClick={() => stopRecording(true)}>Cancel</button><button type="button" className="voice-stop" onClick={() => stopRecording()}>Stop</button></div>}
    {voicePreview && <div className="voice-preview"><span>Preview</span><VoicePlayer src={voicePreview.url} compact /><button type="button" onClick={cancelPreview}>Cancel</button><button type="button" className="voice-send" disabled={sending} onClick={() => void sendVoice()}>{sending ? 'Sending…' : 'Send'}</button></div>}
    <form className="composer" onSubmit={submit}>
      <input ref={fileRef} hidden type="file" onChange={(event) => void uploadFile(event.target.files?.[0])} accept="image/*,.pdf,.txt" />
      <IconButton label="Add attachment" disabled={uploading} onClick={() => fileRef.current?.click()}><Paperclip /></IconButton>
      {!editing && <IconButton label="Emoji, GIF, or sticker" onClick={() => setPickerOpen((value) => !value)}><Images /></IconButton>}
      <label><span className="sr-only">Message</span><textarea rows={1} value={body} onChange={(event) => updateBody(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Message" /></label>
      {!editing && !voicePreview && <IconButton label={recording ? 'Stop recording' : 'Record voice message'} disabled={sending} onClick={() => recording ? stopRecording() : void startRecording()}><Mic /></IconButton>}
      <button className="send-button" aria-label={editing ? 'Save edit' : 'Send message'} disabled={sending || (!body.trim() && attachments.length === 0)}>{editing ? <Check /> : <Send />}</button>
    </form>
    {pickerOpen && <MediaPicker onClose={() => setPickerOpen(false)} onEmoji={async (emoji) => { rememberMedia({ type: 'emoji', value: emoji }); setPickerOpen(false); try { onMessage(await api.sendMessage(conversationId, emoji, replyTo?.id)); clearContext(); } catch (reason) { onError(reason instanceof Error ? reason.message : 'Message could not be sent'); } }} onMedia={async (item) => { rememberMedia({ ...item, type: item.kind }); setPickerOpen(false); try { const attachment = await api.giphy({ id: item.id, kind: item.kind, title: item.title, url: item.url }); onMessage(await api.sendMessage(conversationId, '', replyTo?.id, [attachment.id])); clearContext(); } catch (reason) { onError(reason instanceof Error ? reason.message : 'Media could not be sent'); } }} />}
  </div>;
}

function MediaPicker({ onClose, onEmoji, onMedia }: { onClose: () => void; onEmoji: (emoji: string) => void; onMedia: (item: GiphyItem) => void }) {
  const [tab, setTab] = useState<'emoji' | GiphyKind>('emoji');
  const [emojiMode, setEmojiMode] = useState<'all' | 'fluent' | 'telegram'>('all');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<GiphyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const recents = mediaRecents().filter((item) => item.type === tab);
  useEffect(() => {
    if (tab === 'emoji') return;
    const timer = window.setTimeout(() => { setLoading(true); setError(''); giphyItems(tab, query).then(setItems).catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load media')).finally(() => setLoading(false)); }, query ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [tab, query]);
  const emojiCells = useMemo(() => emojiList(emojiMode, query).map((emoji) => encodeEmoji(emoji.char, emoji.family)), [emojiMode, query]);
  return <div className="media-picker-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="media-picker" role="dialog" aria-label="Emoji, GIF, and sticker picker">
    <header><nav>{(['emoji','gif','sticker'] as const).map((name) => <button key={name} className={tab === name ? 'active' : ''} onClick={() => { setTab(name); setQuery(''); }}>{name === 'emoji' ? 'Emoji' : name === 'gif' ? 'GIF' : 'Sticker'}</button>)}</nav><button className="picker-close" aria-label="Close" onClick={onClose}><X /></button></header>
    <div className="media-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === 'emoji' ? 'Search emoji, GIFs and Stickers' : `Search ${tab === 'gif' ? 'GIFs' : 'Stickers'}`} /></div>
    {tab === 'emoji' && <div className="emoji-family-tabs">{(['all', 'fluent', 'telegram'] as const).map((mode) => <button key={mode} className={emojiMode === mode ? 'active' : ''} onClick={() => setEmojiMode(mode)}>{mode === 'all' ? 'All' : mode === 'fluent' ? 'Fluent' : 'Telegram'}</button>)}</div>}
    <div className="picker-scroll">
      {recents.length > 0 && <><h4>Recent</h4><div className={tab === 'emoji' ? 'emoji-grid' : 'giphy-grid'}>{recents.map((item) => item.type === 'emoji' ? <button key={item.value} onClick={() => onEmoji(item.value)}><EmojiText text={item.value} size={26} /></button> : <button key={item.id} onClick={() => onMedia(item)}><img src={item.previewUrl} alt={item.title} /></button>)}</div></>}
      <h4>{tab === 'emoji' ? `Emoji · ${emojiMode === 'all' ? 'All' : emojiMode === 'fluent' ? 'Fluent' : 'Telegram'}${query ? ` · ${emojiCells.length}` : ''}` : query ? 'Results' : 'Trending'}</h4>
      {tab === 'emoji' ? <div className="emoji-grid">{emojiCells.map((value) => <button key={value} onClick={() => onEmoji(value)}><EmojiText text={value} size={26} /></button>)}</div> : loading ? <div className="giphy-grid picker-loading">{Array.from({ length: 12 }).map((_, i) => <i key={i} />)}</div> : error ? <div className="picker-state"><strong>Could not load GIPHY</strong><span>{error}. Emoji is still available.</span></div> : items.length ? <div className="giphy-grid">{items.map((item) => <button key={item.id} onClick={() => onMedia(item)} style={{ aspectRatio: `${item.width}/${item.height}` }}><img src={item.previewUrl} alt={item.title} loading="lazy" /></button>)}</div> : <div className="picker-state">No results found.</div>}
    </div>
  </section></div>;
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

function formatDuration(value: number) {
  const seconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function fileTypeLabel(attachment: Attachment) {
  if (attachment.mimeType === 'application/pdf') return 'PDF document';
  if (attachment.mimeType === 'text/plain') return 'Text document';
  const extension = attachment.name.split('.').pop();
  return extension && extension !== attachment.name ? `${extension.toUpperCase()} file` : 'Document';
}

export default App;
