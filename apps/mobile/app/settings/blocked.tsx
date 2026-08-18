import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { ScreenHeader, Avatar, ConfirmSheet } from '@/ui';
import type { User } from '@/types';

export default function BlockedUsersScreen() {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockTarget, setUnblockTarget] = useState<User | null>(null);

  const direction = { flexDirection: isRTL ? 'row-reverse' as const : 'row' as const };
  const alignment = { textAlign: isRTL ? 'right' as const : 'left' as const };

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.request<User[]>('/blocks');
      setUsers(data as unknown as User[]);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const doUnblock = async (userId: string) => {
    try {
      await api.request<void>(`/blocks/${userId}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setUnblockTarget(null);
    } catch {}
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Blocked Users" back />
      {loading ? (
        <View style={styles.center}><Text style={{ color: colors.muted }}>Loading...</Text></View>
      ) : users.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="account-off-outline" size={48} color={colors.faint} />
          <Text style={[styles.empty, { color: colors.muted }]}>No blocked users</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {users.map((u) => (
            <View key={u.id} style={[styles.userRow, direction, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Avatar uri={u.avatarUrl} name={u.displayName} size={42} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, alignment, { color: colors.text }]}>{u.displayName}</Text>
                <Text style={[styles.userHandle, alignment, { color: colors.muted }]}>@{u.username}</Text>
              </View>
              <Pressable onPress={() => setUnblockTarget(u)} style={({ pressed }) => [styles.unblockBtn, { borderColor: colors.danger, opacity: pressed ? 0.6 : 1 }]}>
                <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '700' }}>Unblock</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
      <ConfirmSheet
        visible={!!unblockTarget}
        title={`Unblock ${unblockTarget?.displayName ?? ''}?`}
        message="They will be able to message you and see your posts again."
        icon="account-check-outline"
        iconColor={colors.accent}
        iconBg={colors.accentSoft}
        confirmLabel="Unblock"
        confirmColor={colors.accent}
        onConfirm={() => unblockTarget && doUnblock(unblockTarget.id)}
        onCancel={() => setUnblockTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  empty: { fontSize: 14 },
  userRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 12, gap: 12 },
  userName: { fontSize: 14, fontWeight: '700' },
  userHandle: { fontSize: 12, marginTop: 2 },
  unblockBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
});
