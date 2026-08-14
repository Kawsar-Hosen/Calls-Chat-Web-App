import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';
import type { User } from '@/types';
import { Avatar, SkeletonList } from '@/ui';

export default function FriendsScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const router = useRouter();
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try { setItems(await api.friends()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('couldNotLoadFriends')); }
    finally { setLoading(false); setRefreshing(false); }
  }, [t]);

  useFocusEffect(useCallback(() => { void load(items.length > 0); }, [load]));

  const openProfile = (friend: User) => {
    router.push({ pathname: '/contacts/[id]', params: { id: friend.id, name: friend.displayName, username: friend.username } });
  };

  const openChat = async (friend: User) => {
    setBusyId(friend.id);
    try {
      const conversationId = await api.startDirectChat(friend.id);
      router.push({ pathname: '/chat/[id]', params: { id: conversationId, name: friend.displayName, username: friend.username, peerId: friend.id, avatarUrl: friend.avatarUrl ?? '' } });
    } catch {
      setError(t('unableOpenChat'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('friends')}</Text>
        <View style={[styles.count, { backgroundColor: colors.accentSoft }]}><Text style={[styles.countText, { color: colors.accent }]}>{items.length}</Text></View>
      </View>
      {loading ? <SkeletonList rows={6} /> : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={items.length ? styles.list : styles.emptyList}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); void load(true); }} />}
          ListEmptyComponent={<View style={styles.empty}><View style={[styles.emptyIcon, { backgroundColor: colors.elevated }]}><MaterialCommunityIcons name="account-group-outline" size={34} color={colors.muted} /></View><Text style={[styles.emptyTitle, { color: colors.text }]}>{error ? t('couldNotLoadFriends') : t('noFriends')}</Text><Text style={[styles.emptyCopy, { color: error ? colors.danger : colors.muted }]}>{error || ''}</Text></View>}
          renderItem={({ item }) => (
            <Pressable onPress={() => openProfile(item)} style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.elevated : colors.surface, borderColor: colors.border }]}>
              <Avatar name={item.displayName} uri={item.avatarUrl ?? null} online={item.isOnline} size={48} />
              <View style={styles.rowCopy}><Text numberOfLines={1} style={[styles.name, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{item.remark || item.displayName}</Text><Text numberOfLines={1} style={[styles.handle, { color: item.isOnline ? colors.success : colors.muted, textAlign: isRTL ? 'right' : 'left' }]}>{item.isOnline ? t('online') : `@${item.username}`}</Text></View>
              <Pressable hitSlop={10} disabled={busyId === item.id} onPress={() => void openChat(item)} style={({ pressed }) => [styles.chatBtn, { backgroundColor: colors.accent, opacity: busyId === item.id ? 0.5 : pressed ? 0.75 : 1 }]}><MaterialCommunityIcons name="message-text-outline" size={18} color={colors.accentText} /></Pressable>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }, iconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 16, fontWeight: '800', flex: 1 }, count: { minWidth: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  countText: { fontSize: 12, fontWeight: '900' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, list: { paddingHorizontal: 16, paddingTop: 10 }, emptyList: { flexGrow: 1 },
  row: { minHeight: 74, borderWidth: 1, borderRadius: 16, marginBottom: 10, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 12 }, rowCopy: { flex: 1, minWidth: 0 }, name: { fontSize: 15, fontWeight: '800' }, handle: { fontSize: 12, marginTop: 3 },
  chatBtn: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, minHeight: 360, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }, emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 14 }, emptyCopy: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
