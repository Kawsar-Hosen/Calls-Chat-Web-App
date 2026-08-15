import * as Device from 'expo-device';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import { api } from './api';

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;
  if (isRunningInExpoGo()) return null;

  try {
    const Notifications = await import('expo-notifications');

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 180, 120, 180],
      });
      await Notifications.setNotificationChannelAsync('calls', {
        name: 'Calls',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 120, 250],
      });
    }

    const current = await Notifications.getPermissionsAsync();
    const permission = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
    if (permission.status !== 'granted') return null;

    const token = await Notifications.getDevicePushTokenAsync();
    return token.data as string;
  } catch {
    return null;
  }
}

export async function registerDeviceToken(): Promise<void> {
  const token = await registerForPushNotifications();
  if (!token) return;
  try {
    await api.registerDevice(token, Platform.OS === 'android' ? 'android' : 'ios');
  } catch {
    // token registration is best-effort; retried on next launch
  }
}
