import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/auth';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';

export default function TabsLayout() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  if (!user) return <Redirect href="/login" />;
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.muted,
       tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 68, paddingTop: 7, paddingBottom: 9 },
       tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
     }}>
       <Tabs.Screen name="feed" options={{ title: t('feed'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home-outline" size={size} color={color} /> }} />
       <Tabs.Screen name="conversations" options={{ title: t('messages'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="message-text-outline" size={size} color={color} /> }} />
       <Tabs.Screen name="contacts" options={{ title: t('contacts'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-group-outline" size={size} color={color} /> }} />
       <Tabs.Screen name="profile" options={{ title: t('profile'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-circle-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}
