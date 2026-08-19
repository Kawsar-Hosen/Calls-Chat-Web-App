import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/auth';

export default function AuthLayout() {
  const { user, addingAccount } = useAuth();
  if (user && !addingAccount) return <Redirect href="/conversations" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
