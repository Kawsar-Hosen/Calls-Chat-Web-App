import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useCallController } from '@/call-controller';
import { isOnCall } from '@/calls';
import { useSocket } from '@/socket';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const ANSWER_ACTION = 'call.answer';
const DECLINE_ACTION = 'call.decline';

export function PushListener() {
  const router = useRouter();
  const { send } = useSocket();
  const { startCall } = useCallController();

  useEffect(() => {
    if (Platform.OS === 'android') {
      void Notifications.setNotificationCategoryAsync('call', [
        { identifier: ANSWER_ACTION, buttonTitle: 'Answer' },
        { identifier: DECLINE_ACTION, buttonTitle: 'Decline', options: { opensAppToForeground: false } },
      ]).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const handle = (data: Record<string, unknown> | undefined, actionId?: string, requestId?: string) => {
      if (data?.type === 'message' && data.conversation_id) {
        router.push({ pathname: '/chat/[id]', params: { id: String(data.conversation_id) } });
      } else if (data?.type === 'call.offer' && data.conversation_id && data.user_id) {
        if (actionId === DECLINE_ACTION) {
          try { send({ type: 'call.decline', conversation_id: String(data.conversation_id) }); } catch { /* ignore */ }
          if (requestId) void Notifications.dismissNotificationAsync(requestId).catch(() => undefined);
          return;
        }
        if (isOnCall()) return;
        const kind = data.kind === 'video' ? 'video' : 'audio';
        startCall({
          type: kind,
          incoming: true,
          conversationId: String(data.conversation_id),
          peerId: String(data.user_id),
        });
      } else if (data?.type === 'friend.request.received' || data?.type === 'friend.request.accepted') {
        router.push('/contacts');
      }
    };
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handle(response.notification.request.content.data as Record<string, unknown>, response.actionIdentifier, response.notification.request.identifier);
    });
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handle(response.notification.request.content.data as Record<string, unknown>, response.actionIdentifier, response.notification.request.identifier);
    });
    return () => subscription.remove();
  }, [router, send, startCall]);

  return null;
}
