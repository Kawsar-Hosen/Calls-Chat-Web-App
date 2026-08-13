import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useTheme } from '@/theme';
import type { FriendRequest } from '@/types';
import { Avatar, SkeletonList } from '@/ui';

export default function FriendRequestsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!user) return;
    if (!quiet) setLoading(true);
    setError('');
    try { setItems(await api.friendRequests(user.id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load requests'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { void load(items.length > 0); }, [load]));

  const respond = async (request: FriendRequest, accept: boolean) => {
    try {
      await api.respondFriendRequest(request.id, accept);
      setItems((current) => current.filter((item) => item.id !== request.id));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not respond'); }
  };

  const cancel = async (request: FriendRequest) => {
    try {
      await api.cancelFriendRequest(request.id);
      setItems((current) => current.filter((item) => item.id !== request.id));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not cancel'); }
  };

  if (!user) return null;
  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>New Friends</Text>
      </View>
      {loading ? <SkeletonList rows={6} /> : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={items.length ? styles.list : styles.emptyList}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); void load(true); }} />}
          ListEmptyComponent={<View style={styles.empty}><MaterialCommunityIcons name="account-check-outline" size={40} color={colors.faint} /><Text style={[styles.emptyTitle, { color: colors.text }]}>{error ? 'Could not load requests' : 'No friend requests'}</Text><Text style={[styles.emptyCopy, { color: error ? colors.danger : colors.muted }]}>{error || 'Requests you send and receive will appear here.'}</Text></View>}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Avatar name={item.user.displayName} size={46} online={item.user.isOnline} />
              <View style={styles.rowCopy}>
                <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>{item.user.displayName}</Text>
                <Text numberOfLines={1} style={[styles.handle, { color: colors.muted }]}>@{item.user.username} · {item.direction === 'incoming' ? 'wants to add you' : 'request sent'}</Text>
              </View>
              {item.direction === 'incoming' ? (
                <View style={styles.actions}>
                  <Pressable onPress={() => void respond(item, true)} style={({ pressed }) => [styles.accept, { backgroundColor: colors.accent, opacity: pressed ? 0.75 : 1 }]}><MaterialCommunityIcons name="check" size={18} color={colors.accentText} /></Pressable>
                  <Pressable onPress={() => void respond(item, false)} style={({ pressed }) => [styles.reject, { backgroundColor: colors.elevated, opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="close" size={18} color={colors.muted} /></Pressable>
                </View>
              ) : (
                <Pressable onPress={() => void cancel(item)} style={({ pressed }) => [styles.cancel, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}><Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>Cancel</Text></Pressable>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }, iconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 16, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, list: { padding: 16 }, emptyList: { flexGrow: 1 },
  row: { minHeight: 70, borderWidth: 1, borderRadius: 8, marginBottom: 9, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, rowCopy: { flex: 1, minWidth: 0 }, name: { fontSize: 15, fontWeight: '800' }, handle: { fontSize: 12, marginTop: 3 },
  actions: { flexDirection: 'row', gap: 7 }, accept: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, reject: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, cancel: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  empty: { flex: 1, minHeight: 360, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }, emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 14 }, emptyCopy: { fontSize: 13, textAlign: 'center', marginTop: 6 },
});
