import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useSocket } from '@/socket';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { Avatar, Skeleton } from '@/ui';
import { EmojiText } from '@/emoji';
import { useFont } from '@/theme';
import { PostCard } from '@/components/PostCard';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import type { Post, ProfileMediaItem, SocialLink, StoryHighlight, UserProfile } from '@/types';

type Tab = 'posts' | 'media' | 'likes' | 'about';

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

export default function ProfileScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { user: me } = useAuth();
  const { colors } = useTheme();
  const { fontFamily } = useFont();
  const { connected } = useSocket();
  const { t } = useI18n();
  const router = useRouter();

  const userId = params.id || me?.id || '';
  const isSelf = !params.id || params.id === me?.id;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tab, setTab] = useState<Tab>('posts');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [media, setMedia] = useState<ProfileMediaItem[]>([]);
  const [likes, setLikes] = useState<Post[]>([]);
  const [highlights, setHighlights] = useState<StoryHighlight[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  const scrollY = useRef(new Animated.Value(0)).current;

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const [p, h, sl] = await Promise.all([
        api.getUserProfile(userId),
        api.getUserHighlights(userId).catch(() => ({ items: [], nextCursor: null })),
        api.getSocialLinks(userId).catch(() => []),
      ]);
      setProfile(p);
      setHighlights(h.items);
      setSocialLinks(sl);
    } catch {}
  }, [userId]);

  const loadTab = useCallback(async (tabName: Tab) => {
    if (!userId) return;
    try {
      if (tabName === 'posts') {
        const r = await api.getPublicPosts(userId);
        setPosts(r.items);
      } else if (tabName === 'media') {
        const r = await api.getUserMedia(userId);
        setMedia(r.items);
      } else if (tabName === 'likes') {
        const r = await api.getUserLikes(userId);
        setLikes(r.items);
      }
    } catch {}
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadProfile(), loadTab('posts')]).finally(() => setLoading(false));
  }, [loadProfile, loadTab]);

  useEffect(() => { loadTab(tab); }, [tab, loadTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), loadTab(tab)]);
    setRefreshing(false);
  }, [loadProfile, loadTab, tab]);

  const coverHeight = scrollY.interpolate({ inputRange: [-100, 0], outputRange: [240, 160], extrapolate: 'clamp' });

  if (loading) return <ProfileSkeleton colors={colors} />;
  if (!profile) return null;
  const { user, followerCount, followingCount, postCount, isFollowing, mutualFriendCount, profileViewCount } = profile;
  const accent = user.accentColor || colors.accent;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface + 'CC' }]}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.text} />
          </Pressable>
          {!isSelf && (
            <Pressable style={[styles.backBtn, { backgroundColor: colors.surface + 'CC' }]}>
              <MaterialCommunityIcons name="dots-horizontal" size={22} color={colors.text} />
            </Pressable>
          )}
        </View>

        <Animated.View style={[styles.coverWrap, { height: coverHeight }]}>
          {user.coverUrl ? (
            <Image source={{ uri: user.coverUrl }} style={styles.coverImage} />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: accent + '20' }]}>
              <MaterialCommunityIcons name="image-outline" size={40} color={accent + '60'} />
            </View>
          )}
          <View style={[styles.coverGradient, { backgroundColor: colors.background + '00' }]} />
        </Animated.View>

        <View style={styles.avatarRow}>
          <View style={[styles.avatarRing, { borderColor: accent }]}>
            <Avatar name={user.displayName} uri={user.avatarUrl} size={96} online={isSelf ? connected : user.isOnline} />
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.name, { color: colors.text, fontFamily }]}>{user.displayName}</Text>
            {user.isVerified ? <VerifiedBadge category={user.verifiedCategory} size={20} /> : null}
          </View>
          <Text style={[styles.username, { color: colors.muted, fontFamily }]}>@{user.username}</Text>

          {user.customStatus ? (
            <View style={[styles.statusBadge, { backgroundColor: accent + '18' }]}>
              <Text style={[styles.statusText, { color: accent }]}>{user.customStatus}</Text>
            </View>
          ) : null}

          {user.bio ? (
            <Text style={[styles.bio, { color: colors.text }]}><EmojiText text={user.bio} size={14} /></Text>
          ) : null}

          <View style={styles.infoRow}>
            {user.location ? (
              <View style={styles.infoItem}>
                <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.muted} />
                <Text numberOfLines={1} style={[styles.infoText, { color: colors.muted }]}>{user.location}</Text>
              </View>
            ) : null}
            {user.website ? (
              <View style={styles.infoItem}>
                <MaterialCommunityIcons name="link-variant" size={14} color={colors.muted} />
                <Text numberOfLines={1} style={[styles.infoText, { color: accent }]}>{user.website}</Text>
              </View>
            ) : null}
          </View>

          {isSelf && profileViewCount ? (
            <View style={[styles.viewBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="eye-outline" size={14} color={colors.muted} />
              <Text style={[styles.viewText, { color: colors.muted }]}>{profileViewCount} {t('profileViews')}</Text>
            </View>
          ) : null}

          {!isSelf && mutualFriendCount ? (
            <Text style={[styles.mutualText, { color: colors.muted }]}>{mutualFriendCount} {t('mutualFriends')}</Text>
          ) : null}
        </View>

        <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable style={styles.statItem} onPress={() => router.push({ pathname: '/feed/followers/[id]' as any, params: { id: userId, tab: 'followers' } })}>
            <Text style={[styles.statNum, { color: accent }]}>{followerCount}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>{t('followers')}</Text>
          </Pressable>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <Pressable style={styles.statItem} onPress={() => router.push({ pathname: '/feed/followers/[id]' as any, params: { id: userId, tab: 'following' } })}>
            <Text style={[styles.statNum, { color: accent }]}>{followingCount}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>{t('following')}</Text>
          </Pressable>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: accent }]}>{postCount}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>{t('posts')}</Text>
          </View>
        </View>

        {isSelf ? (
          <Pressable onPress={() => router.push('/settings/edit-profile')} style={({ pressed }) => [styles.actionBtn, { backgroundColor: accent, opacity: pressed ? 0.8 : 1 }]}>
            <MaterialCommunityIcons name="pencil" size={16} color="#FFF" />
            <Text style={styles.actionBtnText}>{t('editProfile')}</Text>
          </Pressable>
        ) : (
          <View style={styles.actionRow}>
            <Pressable onPress={async () => { try { await api.toggleFollow(userId); await loadProfile(); } catch {} }} style={({ pressed }) => [styles.actionBtn, { flex: 1, backgroundColor: isFollowing ? colors.surface : accent, borderWidth: isFollowing ? 1 : 0, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}>
              <MaterialCommunityIcons name={isFollowing ? 'account-check-outline' : 'account-plus-outline'} size={16} color={isFollowing ? colors.text : '#FFF'} />
              <Text style={[styles.actionBtnText, isFollowing && { color: colors.text }]}>{isFollowing ? t('following') : t('follow')}</Text>
            </Pressable>
            <Pressable onPress={() => {}} style={({ pressed }) => [styles.actionBtnSecondary, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}>
              <MaterialCommunityIcons name="message-outline" size={16} color={colors.text} />
            </Pressable>
          </View>
        )}

        {isSelf && !user.isVerified && (
          <Pressable onPress={() => router.push('/settings/verify')} style={({ pressed }) => [styles.verifyBtn, { backgroundColor: '#1F66FF12', borderColor: '#1F66FF30', opacity: pressed ? 0.8 : 1 }]}>
            <MaterialCommunityIcons name="shield-checkmark-outline" size={18} color="#1F66FF" />
            <Text style={[styles.verifyBtnText, { color: '#1F66FF' }]}>Get Verified</Text>
          </Pressable>
        )}

        {highlights.length > 0 ? (
          <View style={styles.highlightsSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.highlightsRow}>
              {highlights.map((h) => (
                <Pressable key={h.id} style={styles.highlightItem}>
                  <View style={[styles.highlightRing, { borderColor: accent }]}>
                    {h.coverUrl ? <Image source={{ uri: h.coverUrl }} style={styles.highlightCover} /> : <View style={[styles.highlightPlaceholder, { backgroundColor: accent + '20' }]}><MaterialCommunityIcons name="star-outline" size={18} color={accent} /></View>}
                  </View>
                  <Text style={[styles.highlightTitle, { color: colors.text }]} numberOfLines={1}>{h.title}</Text>
                </Pressable>
              ))}
              {isSelf ? (
                <Pressable style={styles.highlightItem}>
                  <View style={[styles.highlightRing, { borderColor: colors.border }]}>
                    <View style={[styles.highlightPlaceholder, { backgroundColor: colors.surface }]}>
                      <MaterialCommunityIcons name="plus" size={20} color={colors.muted} />
                    </View>
                  </View>
                  <Text style={[styles.highlightTitle, { color: colors.muted }]}>{t('new')}</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        ) : null}

        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {(['posts', 'media', 'likes', 'about'] as Tab[]).map((t2) => (
            <Pressable key={t2} onPress={() => setTab(t2)} style={[styles.tabItem, tab === t2 && { borderBottomColor: accent, borderBottomWidth: 2 }]}>
              <MaterialCommunityIcons name={tabIcon(t2)} size={20} color={tab === t2 ? accent : colors.muted} />
            </Pressable>
          ))}
        </View>

        {tab === 'posts' && posts.map((p) => <PostCard key={p.id} post={p} onRefresh={onRefresh} />)}
        {tab === 'posts' && posts.length === 0 && <EmptyState icon="newspaper-variant-outline" text={t('noPostsYet')} color={colors.muted} />}

        {tab === 'media' && (
          <View style={styles.mediaGrid}>
            {media.map((m) => (
              <Pressable key={m.id} style={styles.mediaItem}>
                <Image source={{ uri: m.url }} style={styles.mediaImage} />
              </Pressable>
            ))}
          </View>
        )}
        {tab === 'media' && media.length === 0 && <EmptyState icon="image-outline" text={t('noMediaYet')} color={colors.muted} />}

        {tab === 'likes' && likes.map((p) => <PostCard key={p.id} post={p} onRefresh={onRefresh} />)}
        {tab === 'likes' && likes.length === 0 && <EmptyState icon="heart-outline" text={t('noLikesYet')} color={colors.muted} />}

        {tab === 'about' && (
          <View style={styles.aboutSection}>
            {socialLinks.length > 0 ? (
              <View style={styles.socialSection}>
                {socialLinks.map((link) => {
                  const platform = SOCIAL_PLATFORMS.find((p) => p.id === link.platform);
                  return (
                    <Pressable key={link.id} onPress={() => Linking.openURL(link.url).catch(() => {})} style={({ pressed }) => [aboutStyles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
                      <View style={[aboutStyles.iconWrap, { backgroundColor: (platform?.color || accent) + '18' }]}>
                        <MaterialCommunityIcons name={platform?.icon || 'link'} size={18} color={platform?.color || accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[aboutStyles.label, { color: colors.muted }]}>{platform?.label || link.platform}</Text>
                        <Text style={[aboutStyles.value, { color: accent }]} numberOfLines={1}>@{link.username}</Text>
                      </View>
                      <MaterialCommunityIcons name="open-in-new" size={14} color={colors.faint} />
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            <AboutRow icon="calendar" label={t('joined')} value={formatDate(user.createdAt || null)} colors={colors} accent={accent} />
            {user.location ? <AboutRow icon="map-marker" label={t('location')} value={user.location} colors={colors} accent={accent} /> : null}
            {user.website ? <AboutRow icon="link" label={t('website')} value={user.website} colors={colors} accent={accent} /> : null}
            {user.dateOfBirth ? <AboutRow icon="cake" label={t('birthday')} value={user.dateOfBirth} colors={colors} accent={accent} /> : null}
          </View>
        )}

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

function tabIcon(tab: Tab): React.ComponentProps<typeof MaterialCommunityIcons>['name'] {
  if (tab === 'posts') return 'newspaper-variant-outline';
  if (tab === 'media') return 'image-multiple-outline';
  if (tab === 'likes') return 'heart-outline';
  return 'information-outline';
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function AboutRow({ icon, label, value, colors, accent }: { icon: string; label: string; value: string; colors: any; accent: string }) {
  return (
    <View style={[aboutStyles.row, { borderBottomColor: colors.border }]}>
      <View style={[aboutStyles.iconWrap, { backgroundColor: accent + '15' }]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[aboutStyles.label, { color: colors.muted }]}>{label}</Text>
        <Text style={[aboutStyles.value, { color: colors.text }]}>{value}</Text>
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

function EmptyState({ icon, text, color }: { icon: string; text: string; color: string }) {
  return (
    <View style={emptyStyles.wrap}>
      <MaterialCommunityIcons name={icon as any} size={44} color={color + '40'} />
      <Text style={[emptyStyles.text, { color }]}>{text}</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 60, gap: 10 },
  text: { fontSize: 14, fontWeight: '500' },
});

function ProfileSkeleton({ colors }: { colors: any }) {
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={{ padding: 16 }}>
        <Skeleton width="100%" height={160} radius={0} />
        <View style={{ flexDirection: 'row', marginTop: -48, paddingHorizontal: 16 }}>
          <Skeleton width={96} height={96} radius={48} />
        </View>
        <Skeleton width="60%" height={20} radius={4} style={{ marginTop: 16 }} />
        <Skeleton width="40%" height={14} radius={4} style={{ marginTop: 8 }} />
        <Skeleton width="100%" height={14} radius={4} style={{ marginTop: 12 }} />
        <Skeleton width="100%" height={60} radius={12} style={{ marginTop: 16 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { position: 'absolute', top: 8, left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  coverWrap: { overflow: 'hidden' },
  coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  coverGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 40 },
  avatarRow: { alignItems: 'center', marginTop: -52 },
  avatarRing: { width: 102, height: 102, borderRadius: 51, borderWidth: 3 },
  infoSection: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, gap: 4 },
  name: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  username: { fontSize: 14, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  statusText: { fontSize: 13, fontWeight: '600' },
  bio: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 6, paddingHorizontal: 10 },
  infoRow: { flexDirection: 'row', gap: 16, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 160 },
  infoText: { fontSize: 13, fontWeight: '500', flexShrink: 1 },
  viewBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 8, borderWidth: 1 },
  viewText: { fontSize: 12, fontWeight: '500' },
  mutualText: { fontSize: 12, fontWeight: '500', marginTop: 6 },
  statsCard: { flexDirection: 'row', marginHorizontal: 20, marginTop: 14, borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, height: 28 },
  actionBtn: { flexDirection: 'row', marginHorizontal: 20, marginTop: 12, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  actionRow: { flexDirection: 'row', marginHorizontal: 20, marginTop: 12, gap: 10 },
  actionBtnSecondary: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  verifyBtn: { flexDirection: 'row', marginHorizontal: 20, marginTop: 10, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  verifyBtnText: { fontSize: 14, fontWeight: '700' },
  highlightsSection: { marginTop: 16 },
  highlightsRow: { paddingHorizontal: 20, gap: 14 },
  highlightItem: { alignItems: 'center', width: 72 },
  highlightRing: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, padding: 2 },
  highlightCover: { width: 64, height: 64, borderRadius: 32 },
  highlightPlaceholder: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  highlightTitle: { fontSize: 11, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  tabBar: { flexDirection: 'row', marginTop: 16, borderBottomWidth: 1 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 1 },
  mediaItem: { width: '33.33%', aspectRatio: 1, padding: 1 },
  mediaImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  aboutSection: { paddingTop: 8 },
  socialSection: { marginBottom: 8 },
});
