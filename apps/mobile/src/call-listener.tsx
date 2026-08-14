import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useSocket } from '@/socket';
import { isOnCall, storePendingOffer } from '@/calls';

export function CallListener() {
  const { subscribe } = useSocket();
  const router = useRouter();
  const handled = useRef(new Set<string>());

  useEffect(() => {
    return subscribe((event) => {
      if (event.type !== 'call.offer') return;
      const key = `${event.conversationId}:${event.userId}:${(event.sdp ?? '').slice(0, 32)}`;
      if (handled.current.has(key)) return;
      handled.current.add(key);
      if (isOnCall()) return;
      if (!event.sdp) return;
      storePendingOffer({ conversationId: event.conversationId, callerId: event.userId, sdp: event.sdp });
      router.push({ pathname: '/call', params: { incoming: '1', id: event.conversationId, peerId: event.userId } });
    });
  }, [subscribe, router]);

  return null;
}
