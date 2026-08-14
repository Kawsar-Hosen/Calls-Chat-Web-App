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
            emit({ type, conversationId: String(raw.conversation_id ?? ''), userId: String(raw.user_id ?? ''), ...(raw.sdp ? { sdp: String(raw.sdp) } : {}) });
          } else if (type === 'call.ice') {
            emit({ type, conversationId: String(raw.conversation_id ?? ''), userId: String(raw.user_id ?? ''), ...(raw.candidate ? { candidate: raw.candidate } : {}) });
          } else if (type === 'call.hangup' || type === 'call.decline') {
            emit({ type, conversationId: String(raw.conversation_id ?? ''), userId: String(raw.user_id ?? '') });
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
