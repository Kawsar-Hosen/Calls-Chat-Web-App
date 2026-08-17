import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import type { Post, UserProfile } from '@/types';
import { Avatar } from '@/ui';
import { PostCard } from '@/components/PostCard';

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: me } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!id) return;
    try {
      const [p, postPage] = await Promise.all([api.getUserProfile(id), api.getPublicPosts(id)]);
      setProfile(p);
      setPosts(postPage.items);
      setCursor(postPage.nextCursor);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [id]);

  useEffect(() => { loadProfile(); }, [id]);

  const onRefresh = useCallback(() => { setRefreshing(true); loadProfile(); }, [loadProfile]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !cursor) return;
    setLoadingMore(true);
    try {
      const page = await api.getPublicPosts(id!, cursor);
      setPosts((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch {} finally { setLoadingMore(false); }
  }, [id, cursor, loadingMore]);

  const toggleFollow = useCallback(async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    try {
      const res = await api.toggleFollow(profile.user.id);
      setProfile((prev) => prev ? { ...prev, isFollowing: res.following, followerCount: res.followerCount } : prev);
    } catch {} finally { setFollowLoading(false); }
  }, [profile, followLoading]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.center}><Text style={{ color: colors.muted }}>{t('loading')}</Text></View>
      </SafeAreaView>
    );
  }

  const u = profile.user;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{u.displayName}</Text>
        <View style={styles.headerBtn} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={styles.profileCard}>
            <View style={styles.avatarRow}>
              <Avatar name={u.displayName} uri={u.avatarUrl} size={80} online={u.isOnline} />
              <View style={styles.statsRow}>
                <Pressable style={styles.statItem} onPress={() => router.push({ pathname: '/feed/followers/[id]' as any, params: { id: u.id, tab: 'followers' } })}>
                  <Text style={[styles.statNum, { color: colors.text }]}>{formatCount(profile.followerCount)}</Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>{t('followers')}</Text>
                </Pressable>
                <Pressable style={styles.statItem} onPress={() => router.push({ pathname: '/feed/followers/[id]' as any, params: { id: u.id, tab: 'following' } })}>
                  <Text style={[styles.statNum, { color: colors.text }]}>{formatCount(profile.followingCount)}</Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>{t('following')}</Text>
                </Pressable>
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: colors.text }]}>{formatCount(profile.postCount)}</Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>{t('posts')}</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.displayName, { color: colors.text }]}>{u.displayName}</Text>
            <Text style={[styles.username, { color: colors.muted }]}>@{u.username}</Text>
            {u.bio ? <Text style={[styles.bio, { color: colors.text }]}>{u.bio}</Text> : null}

            {!profile.isSelf ? (
              <Pressable
                onPress={toggleFollow}
                disabled={followLoading}
                style={[styles.followBtn, { backgroundColor: profile.isFollowing ? colors.elevated : colors.accent, borderColor: profile.isFollowing ? colors.border : colors.accent }]}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color={profile.isFollowing ? colors.text : colors.accentText} />
                ) : (
                  <>
                    <MaterialCommunityIcons name={profile.isFollowing ? 'account-check' : 'account-plus'} size={18} color={profile.isFollowing ? colors.text : colors.accentText} />
                    <Text style={[styles.followBtnText, { color: profile.isFollowing ? colors.text : colors.accentText }]}>
                      {profile.isFollowing ? t('following') : t('follow')}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>
        }
        ListEmptyComponent={<View style={styles.empty}><Text style={[styles.emptyText, { color: colors.muted }]}>{t('noPostsYet')}</Text></View>}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' },
  headerBtn: { paddingHorizontal: 8, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  profileCard: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  displayName: { fontSize: 20, fontWeight: '800', marginTop: 14 },
  username: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  bio: { fontSize: 14, lineHeight: 20, marginTop: 8 },
  followBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 22, borderWidth: 1, marginTop: 16 },
  followBtnText: { fontSize: 15, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, marginTop: 16 },
  listContent: { paddingBottom: 40 },
  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 14, fontWeight: '500' },
});
