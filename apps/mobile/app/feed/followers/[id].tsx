import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import type { FollowUser } from '@/types';
import { Avatar } from '@/ui';

const FollowItem = memo(function FollowItem({ item, onNavigate }: { item: FollowUser; onNavigate: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onNavigate} style={({ pressed }) => [styles.item, { backgroundColor: pressed ? colors.elevated : colors.surface, borderColor: colors.border }]}>
      <Avatar name={item.displayName} uri={item.avatarUrl} size={44} online={item.isOnline} />
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{item.displayName}</Text>
        <Text style={[styles.itemUsername, { color: colors.muted }]} numberOfLines={1}>@{item.username}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.faint} />
    </Pressable>
  );
});

export default function FollowersScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab: string }>();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [items, setItems] = useState<FollowUser[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const isFollowers = tab === 'followers';

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const page = isFollowers ? await api.getFollowers(id) : await api.getFollowing(id);
      setItems(page.items);
      setCursor(page.nextCursor);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [id, isFollowers]);

  useEffect(() => { load(); }, [id, tab]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !cursor || !id) return;
    setLoadingMore(true);
    try {
      const page = isFollowers ? await api.getFollowers(id, cursor) : await api.getFollowing(id, cursor);
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch {} finally { setLoadingMore(false); }
  }, [id, cursor, isFollowers, loadingMore]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{isFollowers ? t('followers') : t('following')}</Text>
        <View style={styles.headerBtn} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FollowItem item={item} onNavigate={() => router.push({ pathname: '/feed/profile/[id]' as any, params: { id: item.id } })} />
        )}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name={isFollowers ? 'account-group' : 'account-heart'} size={48} color={colors.faint} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>{isFollowers ? t('noFollowersYet') : t('notFollowingAnyone')}</Text>
          </View>
        ) : null}
        ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 20 }} /> : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' },
  headerBtn: { paddingHorizontal: 8, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 12, marginTop: 8, borderRadius: 12, borderWidth: 1, gap: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700' },
  itemUsername: { fontSize: 12, marginTop: 2 },
  listContent: { paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '500' },
});
