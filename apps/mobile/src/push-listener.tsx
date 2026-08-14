import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { isOnCall } from '@/calls';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export function PushListener() {
  const router = useRouter();

  useEffect(() => {
    const handle = (data: Record<string, unknown> | undefined) => {
      if (data?.type === 'message' && data.conversation_id) {
        router.push({ pathname: '/chat/[id]', params: { id: String(data.conversation_id) } });
      } else if (data?.type === 'call.offer' && data.conversation_id && data.user_id) {
        if (isOnCall()) return;
        router.push({ pathname: '/call', params: { incoming: '1', id: String(data.conversation_id), peerId: String(data.user_id) } });
      } else if (data?.type === 'friend.request.received' || data?.type === 'friend.request.accepted') {
        router.push('/contacts');
      }
    };
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handle(response.notification.request.content.data as Record<string, unknown>);
    });
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handle(response.notification.request.content.data as Record<string, unknown>);
    });
    return () => subscription.remove();
  }, [router]);

  return null;
}
