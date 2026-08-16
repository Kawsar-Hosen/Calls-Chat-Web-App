import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { getTokens, mapMessage, WS_URL } from './api';
import { useAuth } from './auth';
import { soundSettings } from './sound-settings';
import { playSound } from './sounds';
import type { SocketEvent } from './types';

type Listener = (event: SocketEvent) => void;
interface SocketContextValue {
  connected: boolean;
  subscribe: (listener: Listener) => () => void;
  send: (payload: Record<string, unknown>) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const listeners = useRef(new Set<Listener>());
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user) return;
    let disposed = false;
    let attempt = 0;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let pingTimer: ReturnType<typeof setInterval> | undefined;

    const emit = (event: SocketEvent) => listeners.current.forEach((listener) => listener(event));
    const connect = async () => {
      if (disposed || AppState.currentState !== 'active') return;
      const tokens = await getTokens();
      if (!tokens || disposed) return;
      socket = new WebSocket(`${WS_URL}?token=${encodeURIComponent(tokens.accessToken)}`);
      socketRef.current = socket;
      socket.onopen = () => {
        attempt = 0;
        setConnected(true);
        emit({ type: 'connected' });
        pingTimer = setInterval(() => socket?.readyState === WebSocket.OPEN && socket.send(JSON.stringify({ type: 'ping' })), 25_000);
      };
      socket.onmessage = (event) => {
        try {
          const raw = JSON.parse(String(event.data)) as Record<string, unknown>;
          const type = String(raw.type);
          if (type === 'message.created' || type === 'message.updated' || type === 'message.deleted' || type === 'reaction.updated') {
            emit({ type: type === 'reaction.updated' ? 'message.updated' : type, message: mapMessage(raw.message as Record<string, unknown>) });
          } else if (type === 'presence.updated') {
            emit({ type, userId: String(raw.user_id), isOnline: raw.is_online === true, lastSeenAt: raw.last_seen_at ? String(raw.last_seen_at) : null });
          } else if (type === 'typing.start' || type === 'typing.stop') {
            emit({ type, conversationId: String(raw.conversation_id), userId: String(raw.user_id) });
          } else if (type === 'group.updated') {
            emit({ type, groupId: String(raw.group_id), group: raw.group ?? undefined });
          } else if (type === 'group.deleted') {
            emit({ type, groupId: String(raw.group_id) });
          } else if (type === 'group.member.removed' || type === 'group.member.added') {
            emit({ type, groupId: String(raw.group_id), userId: String(raw.user_id) });
          } else if (type === 'friend.request.accepted') {
            if (soundSettings().acceptSound) playSound('acceptFriend');
            emit({ type, requesterId: String(raw.requester_id ?? ''), recipientId: String(raw.recipient_id ?? '') });
          } else if (type === 'friend.request.received' || type === 'friend.request.cancelled' || type === 'friend.request.rejected') {
            emit({ type, requesterId: String(raw.requester_id ?? ''), recipientId: String(raw.recipient_id ?? '') });
          } else if (type === 'call.offer' || type === 'call.answer') {
            emit({ type, conversationId: String(raw.conversation_id ?? ''), userId: String(raw.user_id ?? ''), ...(raw.sdp ? { sdp: String(raw.sdp) } : {}), ...(type === 'call.offer' && raw.kind ? { kind: String(raw.kind) as 'audio' | 'video' } : {}) });
          } else if (type === 'call.ice') {
            emit({ type, conversationId: String(raw.conversation_id ?? ''), userId: String(raw.user_id ?? ''), ...(raw.candidate ? { candidate: raw.candidate } : {}) });
          } else if (type === 'call.hangup') {
            emit({ type, conversationId: String(raw.conversation_id ?? ''), userId: String(raw.user_id ?? '') });
          } else if (type === 'call.decline') {
            emit({ type, conversationId: String(raw.conversation_id ?? ''), userId: String(raw.user_id ?? ''), ...(raw.reason ? { reason: String(raw.reason) as 'busy' | 'missed' | 'no-answer' | 'declined' } : {}) });
          } else if (type === 'post.created' || type === 'post.updated') {
            const p: any = raw.post ?? raw;
            emit({ type, post: { id: String(p.id), author: { id: String(p.author?.id ?? ''), username: String(p.author?.username ?? ''), displayName: String(p.author?.display_name ?? ''), bio: p.author?.bio ?? null, avatarUrl: p.author?.avatar_url ?? null, isOnline: p.author?.is_online ?? false, lastSeenAt: p.author?.last_seen_at ?? null }, content: p.content ?? null, visibility: p.visibility ?? 'public', media: (p.media ?? []).map((m: any) => ({ id: String(m.id), url: String(m.url), mimeType: String(m.mime_type), sortOrder: Number(m.sort_order ?? 0) })), reactions: (p.reactions ?? []).map((r: any) => ({ emoji: String(r.emoji), userId: String(r.user_id) })), likeCount: Number(p.like_count ?? 0), commentCount: Number(p.comment_count ?? 0), shareCount: Number(p.share_count ?? 0), myLikeEmoji: p.my_like_emoji ?? null, myBookmarked: p.my_bookmarked === true, myShared: p.my_shared === true, createdAt: String(p.created_at), updatedAt: p.updated_at ? String(p.updated_at) : null } });
          } else if (type === 'post.deleted') {
            emit({ type, postId: String(raw.post_id ?? raw.id ?? '') });
          } else if (type === 'comment.created') {
            const c: any = raw.comment ?? raw;
            emit({ type, postId: String(raw.post_id ?? c.post_id ?? ''), comment: { id: String(c.id), postId: String(c.post_id ?? raw.post_id ?? ''), author: { id: String(c.author?.id ?? ''), username: String(c.author?.username ?? ''), displayName: String(c.author?.display_name ?? ''), bio: c.author?.bio ?? null, avatarUrl: c.author?.avatar_url ?? null, isOnline: c.author?.is_online ?? false, lastSeenAt: c.author?.last_seen_at ?? null }, content: String(c.content ?? ''), parentId: c.parent_id ? String(c.parent_id) : null, reactions: [], reactionCount: Number(c.reaction_count ?? 0), replyCount: Number(c.reply_count ?? 0), createdAt: String(c.created_at) } });
          } else if (type === 'comment.deleted') {
            emit({ type, postId: String(raw.post_id ?? ''), commentId: String(raw.comment_id ?? '') });
          } else if (type === 'reaction.updated') {
            emit({ type, postId: String(raw.post_id ?? ''), userId: String(raw.user_id ?? ''), emoji: String(raw.emoji ?? '👍'), likeCount: Number(raw.like_count ?? 0) });
          } else if (type === 'story.created') {
            const s: any = raw.story ?? raw;
            emit({ type, story: { id: String(s.id), mediaUrl: String(s.media_url), mediaType: s.media_type === 'video' ? 'video' : 'image', content: s.content ?? null, createdAt: String(s.created_at), expiresAt: String(s.expires_at), viewCount: Number(s.view_count ?? 0), myViewed: false } });
          } else if (type === 'story.deleted') {
            emit({ type, storyId: String(raw.story_id ?? raw.id ?? '') });
          }
        } catch {
          // A malformed event should not interrupt the connection.
        }
      };
      socket.onerror = () => socket?.close();
      socket.onclose = () => {
        if (socketRef.current === socket) socketRef.current = null;
        if (pingTimer) clearInterval(pingTimer);
        setConnected(false);
        emit({ type: 'disconnected' });
        if (!disposed) {
          const delay = Math.min(30_000, 1_000 * 2 ** attempt) + Math.random() * 350;
          attempt += 1;
          reconnectTimer = setTimeout(() => void connect(), delay);
        }
      };
    };

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !socket) void connect();
      if (state !== 'active') {
        socket?.close();
        socket = null;
      }
    });
    void connect();
    return () => {
      disposed = true;
      appStateSubscription.remove();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingTimer) clearInterval(pingTimer);
      socket?.close();
      setConnected(false);
    };
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{
      connected,
      subscribe: (listener) => {
        listeners.current.add(listener);
        return () => listeners.current.delete(listener);
      },
      send: (payload) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify(payload));
      },
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const value = useContext(SocketContext);
  if (!value) throw new Error('useSocket must be used inside SocketProvider');
  return value;
}
