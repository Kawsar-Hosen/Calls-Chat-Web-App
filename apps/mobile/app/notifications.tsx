import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '@/api';
import { useTheme } from '@/theme';
import type { AppNotification } from '@/types';
import { VerifiedBadge } from '@/components/VerifiedBadge';

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  reaction: { icon: 'heart', color: '#EF4444' },
  comment: { icon: 'comment-outline', color: '#3B82F6' },
  share: { icon: 'share-variant', color: '#8B5CF6' },
  follow: { icon: 'account-plus', color: '#10B981' },
  mention: { icon: 'at', color: '#F59E0B' },
  message: { icon: 'message-text', color: '#06B6D4' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    try {
      const res = await api.getNotifications(refresh ? undefined : cursor ?? undefined);
      setItems((prev) => refresh ? res.items : [...prev, ...res.items]);
      setCursor(res.nextCursor);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [cursor]);

  useEffect(() => { void load(true); }, []);

  const markAllRead = async () => {
    await api.markNotificationsRead();
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const clearAll = () => {
    Alert.alert('Clear notifications', 'Remove all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => { await api.clearNotifications(); setItems([]); } },
    ]);
  };

  const handlePress = (item: AppNotification) => {
    if (item.targetType === 'post' && item.targetId) {
      router.push({ pathname: '/feed/[id]', params: { id: item.targetId } });
    } else if (item.targetType === 'user' && item.targetId) {
      router.push({ pathname: '/feed/profile/[id]', params: { id: item.targetId } });
    }
  };

  const unread = items.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        <View style={styles.topActions}>
          {unread > 0 ? (
            <Pressable onPress={() => void markAllRead()} style={styles.actionBtn}>
              <MaterialCommunityIcons name="check-all" size={20} color={colors.accent} />
            </Pressable>
          ) : null}
          {items.length > 0 ? (
            <Pressable onPress={clearAll} style={styles.actionBtn}>
              <MaterialCommunityIcons name="delete-outline" size={20} color={colors.danger} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {unread > 0 && (
        <View style={[styles.unreadBanner, { backgroundColor: colors.accent + '12' }]}>
          <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} />
          <Text style={[styles.unreadText, { color: colors.accent }]}>{unread} unread</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.accent} />
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}>
            <MaterialCommunityIcons name="bell-outline" size={36} color={colors.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications yet</Text>
          <Text style={[styles.emptySub, { color: colors.muted }]}>When someone interacts with your posts or follows you, it'll show up here</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const meta = TYPE_ICONS[item.type] ?? { icon: 'bell-outline', color: colors.muted };
            return (
              <Pressable onPress={() => handlePress(item)} style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, backgroundColor: item.isRead ? 'transparent' : colors.accent + '06' }, pressed && { backgroundColor: colors.elevated }]}>
                <View style={styles.avatarWrap}>
                  {item.fromUserAvatar ? (
                    <Image source={{ uri: item.fromUserAvatar }} style={[styles.avatar, { backgroundColor: colors.elevated }]} />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={[styles.avatarText, { color: colors.accent }]}>{(item.fromUserName || '?')[0]}</Text>
                    </View>
                  )}
                  <View style={[styles.typeBadge, { backgroundColor: meta.color }]}>
                    <MaterialCommunityIcons name={meta.icon as any} size={10} color="#FFFFFF" />
                  </View>
                </View>
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowBody, { color: colors.text }]} numberOfLines={2}>
                    <Text style={{ fontWeight: '800' }}>{item.fromUserName ?? 'Someone'}</Text>
                    {item.fromUserIsVerified ? <VerifiedBadge category={item.fromUserVerifiedCategory ?? null} username="" displayName={item.fromUserName ?? 'Someone'} verifiedAt={item.fromUserVerifiedAt ?? null} size={13} /> : null}
                    {' '}{item.body.replace(`${item.fromUserName} `, '').replace(item.fromUserName ?? '', '').trim()}
                  </Text>
                  <Text style={[styles.rowTime, { color: colors.faint }]}>{timeAgo(item.createdAt)}</Text>
                </View>
                {!item.isRead && <View style={[styles.unreadDotSmall, { backgroundColor: colors.accent }]} />}
              </Pressable>
            );
          }}
          onEndReached={() => { if (cursor && !loading) void load(false); }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loading ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.accent} /> : null}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} tintColor={colors.accent} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '800' },
  topActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  unreadBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  unreadText: { fontSize: 12, fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  avatarWrap: { position: 'relative' },
  avatar: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  typeBadge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  rowInfo: { flex: 1, gap: 3 },
  rowBody: { fontSize: 14, lineHeight: 19 },
  rowTime: { fontSize: 12, fontWeight: '600' },
  unreadDotSmall: { width: 8, height: 8, borderRadius: 4 },
});
