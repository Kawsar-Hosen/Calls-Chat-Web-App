import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import type { Post, SocialLink, UserProfile } from '@/types';
import { Avatar } from '@/ui';
import { PostCard } from '@/components/PostCard';

const SOCIAL_PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: 'instagram' as const, color: '#E1306C' },
  { id: 'twitter', label: 'X / Twitter', icon: 'twitter' as const, color: '#1DA1F2' },
  { id: 'facebook', label: 'Facebook', icon: 'facebook' as const, color: '#1877F2' },
  { id: 'youtube', label: 'YouTube', icon: 'youtube' as const, color: '#FF0000' },
  { id: 'tiktok', label: 'TikTok', icon: 'music-note' as const, color: '#000000' },
  { id: 'snapchat', label: 'Snapchat', icon: 'ghost' as const, color: '#FFFC00' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin' as const, color: '#0A66C2' },
  { id: 'github', label: 'GitHub', icon: 'github' as const, color: '#333333' },
  { id: 'discord', label: 'Discord', icon: 'chat' as const, color: '#5865F2' },
  { id: 'telegram', label: 'Telegram', icon: 'send' as const, color: '#26A5E4' },
  { id: 'twitch', label: 'Twitch', icon: 'twitch' as const, color: '#9146FF' },
  { id: 'pinterest', label: 'Pinterest', icon: 'pinterest' as const, color: '#BD081C' },
  { id: 'spotify', label: 'Spotify', icon: 'spotify' as const, color: '#1DB954' },
];

type Tab = 'posts' | 'about';

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: me } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [tab, setTab] = useState<Tab>('posts');
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const loadProfile = useCallback(async () => {
    if (!id) return;
    try {
      const [p, postPage, sl] = await Promise.all([
        api.getUserProfile(id),
        api.getPublicPosts(id),
        api.getSocialLinks(id).catch(() => []),
      ]);
      setProfile(p);
      setPosts(postPage.items);
      setCursor(postPage.nextCursor);
      setSocialLinks(sl);
    } catch { Alert.alert('Error', 'Failed to load profile'); } finally { setLoading(false); setRefreshing(false); }
  }, [id]);

  useEffect(() => { loadProfile(); }, [id]);

  const onRefresh = useCallback(() => { setRefreshing(true); loadProfile(); }, [loadProfile]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !cursor || tab !== 'posts') return;
    setLoadingMore(true);
    try {
      const page = await api.getPublicPosts(id!, cursor);
      setPosts((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch {} finally { setLoadingMore(false); }
  }, [id, cursor, loadingMore, tab]);

  const toggleFollow = useCallback(async () => {
    const p = profileRef.current;
    if (!p || followLoading) return;
    setFollowLoading(true);
    try {
      const res = await api.toggleFollow(p.user.id);
      setProfile((prev) => prev ? { ...prev, isFollowing: res.following, followerCount: res.followerCount } : prev);
    } catch { Alert.alert('Error', 'Could not update follow'); } finally { setFollowLoading(false); }
  }, [followLoading]);

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
  const accent = u.accentColor || colors.accent;

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
        data={tab === 'posts' ? posts : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            {u.coverUrl ? (
              <Image source={{ uri: u.coverUrl }} style={styles.coverImage} />
            ) : null}

            <View style={styles.profileCard}>
              <View style={[styles.avatarRing, { borderColor: accent }]}>
                <Avatar name={u.displayName} uri={u.avatarUrl} size={80} online={u.isOnline} />
              </View>

              <View style={styles.statsRow}>
                <Pressable style={styles.statItem} onPress={() => router.push({ pathname: '/feed/followers/[id]' as any, params: { id: u.id, tab: 'followers' } })}>
                  <Text style={[styles.statNum, { color: accent }]}>{formatCount(profile.followerCount)}</Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>{t('followers')}</Text>
                </Pressable>
                <Pressable style={styles.statItem} onPress={() => router.push({ pathname: '/feed/followers/[id]' as any, params: { id: u.id, tab: 'following' } })}>
                  <Text style={[styles.statNum, { color: accent }]}>{formatCount(profile.followingCount)}</Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>{t('following')}</Text>
                </Pressable>
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: accent }]}>{formatCount(profile.postCount)}</Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>{t('posts')}</Text>
                </View>
              </View>

              <Text style={[styles.displayName, { color: colors.text }]}>{u.displayName}</Text>
              <Text style={[styles.username, { color: colors.muted }]}>@{u.username}</Text>

              {u.customStatus ? (
                <View style={[styles.statusBadge, { backgroundColor: accent + '18' }]}>
                  <Text style={[styles.statusText, { color: accent }]}>{u.customStatus}</Text>
                </View>
              ) : null}

              {u.bio ? <Text style={[styles.bio, { color: colors.text }]}>{u.bio}</Text> : null}

              <View style={styles.infoRow}>
                {u.location ? (
                  <View style={styles.infoItem}>
                    <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.muted} />
                    <Text numberOfLines={1} style={[styles.infoText, { color: colors.muted }]}>{u.location}</Text>
                  </View>
                ) : null}
                {u.website ? (
                  <View style={styles.infoItem}>
                    <MaterialCommunityIcons name="link-variant" size={14} color={colors.muted} />
                    <Text numberOfLines={1} style={[styles.infoText, { color: accent }]}>{u.website}</Text>
                  </View>
                ) : null}
              </View>

              {!profile.isSelf ? (
                <View style={styles.actionRow}>
                  <Pressable
                    onPress={toggleFollow}
                    disabled={followLoading}
                    style={[styles.followBtn, { backgroundColor: profile.isFollowing ? colors.elevated : accent, borderColor: profile.isFollowing ? colors.border : accent }]}
                  >
                    {followLoading ? (
                      <ActivityIndicator size="small" color={profile.isFollowing ? colors.text : '#FFF'} />
                    ) : (
                      <>
                        <MaterialCommunityIcons name={profile.isFollowing ? 'account-check' : 'account-plus'} size={18} color={profile.isFollowing ? colors.text : '#FFF'} />
                        <Text style={[styles.followBtnText, { color: profile.isFollowing ? colors.text : '#FFF' }]}>
                          {profile.isFollowing ? t('following') : t('follow')}
                        </Text>
                      </>
                    )}
                  </Pressable>
                  <Pressable onPress={() => {}} style={[styles.msgBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <MaterialCommunityIcons name="message-outline" size={18} color={colors.text} />
                  </Pressable>
                </View>
              ) : null}
            </View>

            <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
              {(['posts', 'about'] as Tab[]).map((t2) => (
                <Pressable key={t2} onPress={() => setTab(t2)} style={[styles.tabItem, tab === t2 && { borderBottomColor: accent, borderBottomWidth: 2 }]}>
                  <MaterialCommunityIcons name={t2 === 'posts' ? 'newspaper-variant-outline' : 'information-outline'} size={20} color={tab === t2 ? accent : colors.muted} />
                </Pressable>
              ))}
            </View>

            {tab === 'about' && (
              <View style={styles.aboutSection}>
                {socialLinks.length > 0 ? socialLinks.map((link) => {
                  const platform = SOCIAL_PLATFORMS.find((p) => p.id === link.platform);
                  return (
                    <Pressable key={link.id} onPress={() => Linking.openURL(link.url).catch(() => {})} style={({ pressed }) => [aboutStyles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
                      <View style={[aboutStyles.iconWrap, { backgroundColor: (platform?.color || accent) + '18' }]}>
                        <MaterialCommunityIcons name={platform?.icon || 'link'} size={18} color={platform?.color || accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[aboutStyles.label, { color: colors.muted }]}>{platform?.label || link.platform}</Text>
                        <Text numberOfLines={1} style={[aboutStyles.value, { color: accent }]}>@{link.username}</Text>
                      </View>
                      <MaterialCommunityIcons name="open-in-new" size={14} color={colors.faint} />
                    </Pressable>
                  );
                }) : null}
                <AboutRow icon="calendar" label={t('joined')} value={formatDate((u as any).createdAt || null)} colors={colors} accent={accent} />
                {u.location ? <AboutRow icon="map-marker" label={t('location')} value={u.location} colors={colors} accent={accent} /> : null}
                {u.website ? <AboutRow icon="link" label={t('website')} value={u.website} colors={colors} accent={accent} /> : null}
                {u.dateOfBirth ? <AboutRow icon="cake" label={t('birthday')} value={u.dateOfBirth} colors={colors} accent={accent} /> : null}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={tab === 'posts' ? <View style={styles.empty}><Text style={[styles.emptyText, { color: colors.muted }]}>{t('noPostsYet')}</Text></View> : null}
        ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={accent} style={{ marginVertical: 20 }} /> : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

function AboutRow({ icon, label, value, colors, accent }: { icon: string; label: string; value: string; colors: any; accent: string }) {
  return (
    <View style={[aboutStyles.row, { borderBottomColor: colors.border }]}>
      <View style={[aboutStyles.iconWrap, { backgroundColor: accent + '15' }]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[aboutStyles.label, { color: colors.muted }]}>{label}</Text>
        <Text numberOfLines={2} style={[aboutStyles.value, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const aboutStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 14, fontWeight: '600', marginTop: 2 },
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' },
  headerBtn: { paddingHorizontal: 8, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  coverImage: { width: '100%', height: 140, resizeMode: 'cover' },
  profileCard: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, alignItems: 'center' },
  avatarRing: { width: 86, height: 86, borderRadius: 43, borderWidth: 3, padding: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 14 },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  displayName: { fontSize: 20, fontWeight: '800', marginTop: 14, textAlign: 'center' },
  username: { fontSize: 13, fontWeight: '500', marginTop: 2, textAlign: 'center' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 6 },
  statusText: { fontSize: 13, fontWeight: '600' },
  bio: { fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: 'center', paddingHorizontal: 10 },
  infoRow: { flexDirection: 'row', gap: 16, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 160 },
  infoText: { fontSize: 13, fontWeight: '500', flexShrink: 1 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14, width: '100%', paddingHorizontal: 20 },
  followBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 12, borderWidth: 1 },
  followBtnText: { fontSize: 15, fontWeight: '700' },
  msgBtn: { width: 48, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, marginTop: 12 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  aboutSection: { paddingTop: 8 },
  listContent: { paddingBottom: 40 },
  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 14, fontWeight: '500' },
});
