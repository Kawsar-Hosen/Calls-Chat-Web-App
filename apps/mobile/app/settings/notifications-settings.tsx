import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { ScreenHeader } from '@/ui';
import type { NotificationPrefs } from '@/types';

const PREFS: { key: keyof NotificationPrefs; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string; desc: string }[] = [
  { key: 'messages', icon: 'message-text-outline', title: 'Messages', desc: 'New message notifications' },
  { key: 'calls', icon: 'phone-outline', title: 'Calls', desc: 'Incoming call alerts' },
  { key: 'posts', icon: 'post-outline', title: 'Posts', desc: 'New posts from people you follow' },
  { key: 'comments', icon: 'comment-outline', title: 'Comments', desc: 'Comments on your posts' },
  { key: 'reactions', icon: 'emoticon-outline', title: 'Reactions', desc: 'Reactions on your posts & comments' },
  { key: 'follows', icon: 'account-plus-outline', title: 'Follows', desc: 'New follower notifications' },
  { key: 'mentions', icon: 'at', title: 'Mentions', desc: 'When someone mentions you' },
  { key: 'groupActivity', icon: 'account-group-outline', title: 'Groups', desc: 'Group chat activity' },
];

export default function NotificationsSettingsScreen() {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const [prefs, setPrefs] = useState<NotificationPrefs>({ messages: true, calls: true, posts: true, comments: true, reactions: true, follows: true, mentions: true, groupActivity: true });
  const [toast, setToast] = useState<string | null>(null);

  const direction = { flexDirection: isRTL ? 'row-reverse' as const : 'row' as const };
  const alignment = { textAlign: isRTL ? 'right' as const : 'left' as const };

  useEffect(() => { api.getNotificationPrefs().then(setPrefs).catch(() => {}); }, []);

  const toggle = async (key: keyof NotificationPrefs) => {
    const newVal = !prefs[key];
    setPrefs((p) => ({ ...p, [key]: newVal }));
    try {
      await api.updateNotificationPrefs({ [key]: newVal });
      setToast('Saved');
      setTimeout(() => setToast(null), 2000);
    } catch {}
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Notifications" back />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>NOTIFICATION TYPES</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {PREFS.map((p, i) => (
            <Pressable key={p.key} onPress={() => toggle(p.key)} style={({ pressed }) => [styles.row, direction, { backgroundColor: pressed ? colors.elevated : 'transparent', borderBottomColor: i < PREFS.length - 1 ? colors.border : 'transparent' }]}>
              <View style={[styles.rowIcon, { backgroundColor: prefs[p.key] ? colors.accent + '18' : colors.faint + '18' }]}>
                <MaterialCommunityIcons name={p.icon} size={18} color={prefs[p.key] ? colors.accent : colors.faint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, alignment, { color: colors.text }]}>{p.title}</Text>
                <Text style={[styles.rowDesc, alignment, { color: colors.muted }]}>{p.desc}</Text>
              </View>
              <View style={[styles.toggle, { backgroundColor: prefs[p.key] ? colors.accent : colors.border }]}>
                <View style={[styles.toggleDot, { transform: [{ translateX: prefs[p.key] ? 18 : 2 }], backgroundColor: '#FFF' }]} />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      {toast ? <View style={[styles.toast, { backgroundColor: colors.text }]}><Text style={{ color: colors.background, fontSize: 13, fontWeight: '700' }}>{toast}</Text></View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '800', marginTop: 12, marginBottom: 4, paddingHorizontal: 4, letterSpacing: 0.5 },
  card: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowDesc: { fontSize: 11, marginTop: 2 },
  toggle: { width: 40, height: 24, borderRadius: 12, padding: 2, justifyContent: 'center' },
  toggleDot: { width: 20, height: 20, borderRadius: 10 },
  toast: { position: 'absolute', bottom: 30, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
});
