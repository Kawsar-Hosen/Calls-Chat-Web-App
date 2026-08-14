import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useI18n } from '@/i18n';
import { soundSettings } from '@/sound-settings';
import { playSound } from '@/sounds';
import { useSocket } from '@/socket';
import { useTheme } from '@/theme';
import type { FriendRequest } from '@/types';
import { Avatar, SkeletonList } from '@/ui';

export default function FriendRequestsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const { subscribe } = useSocket();
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
    catch (reason) { setError(reason instanceof Error ? reason.message : t('unableLoadRequests')); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user, t]);

  useFocusEffect(useCallback(() => { void load(items.length > 0); }, [load]));

  useEffect(() => {
    if (!user) return;
    return subscribe((event) => {
      if (event.type === 'friend.request.received' || event.type === 'friend.request.cancelled' || event.type === 'friend.request.accepted' || event.type === 'friend.request.rejected') {
        void load(true);
      }
    });
  }, [subscribe, user, load]);

  const respond = async (request: FriendRequest, accept: boolean) => {
    try {
      await api.respondFriendRequest(request.id, accept);
      if (accept && soundSettings().acceptSound) playSound('acceptFriend');
      setItems((current) => current.filter((item) => item.id !== request.id));
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('couldNotRespond')); }
  };

  const cancel = async (request: FriendRequest) => {
    try {
      await api.cancelFriendRequest(request.id);
      setItems((current) => current.filter((item) => item.id !== request.id));
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('couldNotCancel')); }
  };

  if (!user) return null;
  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('newFriends')}</Text>
      </View>
      {loading ? <SkeletonList rows={6} /> : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={items.length ? styles.list : styles.emptyList}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); void load(true); }} />}
          ListEmptyComponent={<View style={styles.empty}><View style={[styles.emptyIcon, { backgroundColor: colors.elevated }]}><MaterialCommunityIcons name="account-check-outline" size={34} color={colors.muted} /></View><Text style={[styles.emptyTitle, { color: colors.text }]}>{error ? t('couldNotLoadRequests') : t('noFriendRequests')}</Text><Text style={[styles.emptyCopy, { color: error ? colors.danger : colors.muted }]}>{error || t('emptyRequests')}</Text></View>}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Avatar name={item.user.displayName} uri={item.user.avatarUrl ?? null} size={48} online={item.user.isOnline} />
              <View style={styles.rowCopy}>
                <Text numberOfLines={1} style={[styles.name, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{item.user.displayName}</Text>
                <Text numberOfLines={1} style={[styles.handle, { color: colors.muted, textAlign: isRTL ? 'right' : 'left' }]}>@{item.user.username}</Text>
                <View style={[styles.direction, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}><MaterialCommunityIcons name={item.direction === 'incoming' ? 'arrow-down-circle' : 'arrow-up-circle'} size={12} color={item.direction === 'incoming' ? colors.accent : colors.muted} /><Text style={[styles.directionText, { color: item.direction === 'incoming' ? colors.accent : colors.muted }]}>{item.direction === 'incoming' ? t('wantsToAddYou') : t('requestSentShort')}</Text></View>
              </View>
              {item.direction === 'incoming' ? (
                <View style={styles.actions}>
                  <Pressable onPress={() => void respond(item, true)} style={({ pressed }) => [styles.accept, { backgroundColor: colors.accent, opacity: pressed ? 0.75 : 1 }]}><MaterialCommunityIcons name="check" size={20} color={colors.accentText} /></Pressable>
                  <Pressable onPress={() => void respond(item, false)} style={({ pressed }) => [styles.reject, { backgroundColor: colors.elevated, opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="close" size={20} color={colors.danger} /></Pressable>
                </View>
              ) : (
                <Pressable onPress={() => void cancel(item)} style={({ pressed }) => [styles.cancel, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}><Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800' }}>{t('cancel')}</Text></Pressable>
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
  row: { minHeight: 76, borderWidth: 1, borderRadius: 16, marginBottom: 10, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 12 }, rowCopy: { flex: 1, minWidth: 0 }, name: { fontSize: 15, fontWeight: '800' }, handle: { fontSize: 12, marginTop: 2 },
  direction: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }, directionText: { fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8 }, accept: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, reject: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, cancel: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9 },
  empty: { flex: 1, minHeight: 360, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }, emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 14 }, emptyCopy: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
