import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Modal, PanResponder, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '@/api';
import { useTheme } from '@/theme';
import type { AppNotification } from '@/types';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { useNotifications } from '@/NotificationContext';

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

function SwipeableRow({ item, colors, onOpen, onDelete, deleting }: { item: AppNotification; colors: any; onOpen: () => void; onDelete: () => void; deleting: boolean }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);
  const panRef = useRef({ startX: 0 });

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => { panRef.current.startX = 0; },
      onPanResponderMove: (_, g) => {
        const x = Math.min(0, g.dx);
        translateX.setValue(x);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -60) {
          Animated.spring(translateX, { toValue: -80, useNativeDriver: true }).start();
          setOpen(true);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          setOpen(false);
        }
      },
    })
  ).current;

  const close = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    setOpen(false);
  };

  const meta = TYPE_ICONS[item.type] ?? { icon: 'bell-outline', color: colors.muted };

  return (
    <View style={styles.swipeWrap}>
      <View style={[styles.deleteBehind, { backgroundColor: '#EF4444' }]}>
        <Pressable onPress={() => { close(); onDelete(); }} disabled={deleting} style={styles.deleteBehindBtn}>
          {deleting ? <ActivityIndicator size="small" color="#FFF" /> : <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FFFFFF" />}
        </Pressable>
      </View>

      <Animated.View style={[styles.swipeFront, { transform: [{ translateX }], backgroundColor: colors.background }]} {...pan.panHandlers}>
        <Pressable onPress={() => { if (open) close(); else onOpen(); }} delayLongPress={400} onLongPress={() => { Animated.spring(translateX, { toValue: -80, useNativeDriver: true }).start(); setOpen(true); }} style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, backgroundColor: item.isRead ? 'transparent' : colors.accent + '06' }, pressed && { backgroundColor: colors.elevated }]}>
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
      </Animated.View>
    </View>
  );
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { resetCount } = useNotifications();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    resetCount();
  };

  useEffect(() => {
    if (items.length > 0) {
      const unread = items.filter((n) => !n.isRead).length;
      if (unread > 0) void markAllRead();
    }
  }, [items]);

  const handleClear = async () => {
    setClearing(true);
    try {
      await api.clearNotifications();
      setItems([]);
      resetCount();
    } catch {} finally {
      setClearing(false);
      setClearOpen(false);
    }
  };

  const handleDeleteOne = async (id: string) => {
    setDeletingId(id);
    try {
      await api.clearNotifications();
      setItems((prev) => prev.filter((n) => n.id !== id));
    } catch {} finally { setDeletingId(null); }
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
            <Pressable onPress={() => setClearOpen(true)} style={styles.actionBtn}>
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
          renderItem={({ item }) => (
            <SwipeableRow
              item={item}
              colors={colors}
              onOpen={() => handlePress(item)}
              onDelete={() => void handleDeleteOne(item.id)}
              deleting={deletingId === item.id}
            />
          )}
          onEndReached={() => { if (cursor && !loading) void load(false); }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loading ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.accent} /> : null}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} tintColor={colors.accent} />}
        />
      )}

      {/* ── Clear Notifications Sheet ──────────────────── */}
      <Modal transparent visible={clearOpen} animationType="fade" onRequestClose={() => !clearing && setClearOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => !clearing && setClearOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: insets.bottom + 20 }]} onPress={() => undefined}>
            <View style={[styles.handle, { backgroundColor: colors.faint }]} />

            <View style={[styles.sheetIcon, { backgroundColor: colors.danger + '12' }]}>
              <MaterialCommunityIcons name="delete-sweep" size={32} color={colors.danger} />
            </View>

            <Text style={[styles.sheetTitle, { color: colors.text }]}>Clear All Notifications?</Text>
            <Text style={[styles.sheetDesc, { color: colors.muted }]}>
              This will permanently remove all {items.length} notification{items.length !== 1 ? 's' : ''} from your inbox. This action cannot be undone.
            </Text>

            <View style={styles.sheetActions}>
              <Pressable onPress={() => setClearOpen(false)} disabled={clearing} style={({ pressed }) => [styles.cancelBtn, { backgroundColor: colors.elevated, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
                <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void handleClear()} disabled={clearing} style={({ pressed }) => [styles.clearBtn, { opacity: pressed ? 0.8 : 1 }]}>
                {clearing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="delete-sweep" size={18} color="#FFFFFF" />
                    <Text style={styles.clearBtnText}>Clear All</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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

  /* Swipeable row */
  swipeWrap: { overflow: 'hidden' },
  deleteBehind: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, alignItems: 'center', justifyContent: 'center' },
  deleteBehindBtn: { width: 80, height: '100%', alignItems: 'center', justifyContent: 'center' },
  swipeFront: { flex: 1 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  avatarWrap: { position: 'relative' },
  avatar: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  typeBadge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  rowInfo: { flex: 1, gap: 3 },
  rowBody: { fontSize: 14, lineHeight: 19 },
  rowTime: { fontSize: 12, fontWeight: '600' },
  unreadDotSmall: { width: 8, height: 8, borderRadius: 4 },

  /* Clear sheet */
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, paddingHorizontal: 24, paddingTop: 12, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2, marginBottom: 20 },
  sheetIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  sheetDesc: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 24, paddingHorizontal: 8 },
  sheetActions: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  cancelText: { fontSize: 14, fontWeight: '700' },
  clearBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#EF4444', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  clearBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
