import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/auth';

export default function AuthLayout() {
  const { user } = useAuth();
  if (user) return <Redirect href="/conversations" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
