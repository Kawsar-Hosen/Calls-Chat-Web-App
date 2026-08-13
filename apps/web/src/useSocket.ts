import { useEffect, useRef, useState } from 'react';
import { accessToken, mapSocketEvent } from './api';
import type { SocketEvent } from './types';

const WS_URL = (import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/api/v1/ws').replace(/\/$/, '');

export function useSocket(onEvent: (event: SocketEvent) => void) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    let disposed = false;
    let attempt = 0;
    let timer: number | undefined;

    const connect = () => {
      const token = accessToken();
      if (!token || disposed) return;
      const socket = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
      socketRef.current = socket;
      socket.onopen = () => {
        attempt = 0;
        setConnected(true);
      };
      socket.onmessage = (message) => {
        try {
          const event = mapSocketEvent(JSON.parse(String(message.data)) as Record<string, unknown>);
          if (event) callbackRef.current(event);
        } catch {
          // Ignore malformed events and keep the live connection available.
        }
      };
      socket.onclose = () => {
        setConnected(false);
        if (!disposed) {
          const delay = Math.min(30_000, 1_000 * 2 ** attempt) + Math.random() * 400;
          attempt += 1;
          timer = window.setTimeout(connect, delay);
        }
      };
      socket.onerror = () => socket.close();
    };

    connect();
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      socketRef.current?.close();
    };
  }, []);

  const send = (event: object) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const value = event as { type?: string; payload?: Record<string, unknown> };
      const payload = { ...value.payload };
      if ('conversationId' in payload) {
        payload.conversation_id = payload.conversationId;
        delete payload.conversationId;
      }
      socketRef.current.send(JSON.stringify({ type: value.type, ...payload }));
    }
  };

  return { connected, send };
}
