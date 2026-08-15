import { useEffect, useRef } from 'react';
import { useSocket } from '@/socket';
import { useCallController } from '@/call-controller';
import { isOnCall, storePendingOffer } from '@/calls';

export function CallListener() {
  const { subscribe, send } = useSocket();
  const { startCall } = useCallController();
  const handled = useRef(new Set<string>());

  useEffect(() => {
    return subscribe((event) => {
      if (event.type !== 'call.offer') return;
      const key = `${event.conversationId}:${event.userId}:${(event.sdp ?? '').slice(0, 32)}`;
      if (handled.current.has(key)) return;
      handled.current.add(key);
      if (isOnCall()) {
        try { send({ type: 'call.decline', conversation_id: event.conversationId, reason: 'busy' }); } catch { /* ignore */ }
        return;
      }
      if (!event.sdp) return;
      storePendingOffer({ conversationId: event.conversationId, callerId: event.userId, sdp: event.sdp, kind: event.kind ?? 'audio' });
      startCall({
        type: event.kind ?? 'audio',
        incoming: true,
        conversationId: event.conversationId,
        peerId: event.userId,
      });
    });
  }, [subscribe, startCall, send]);

  return null;
}
