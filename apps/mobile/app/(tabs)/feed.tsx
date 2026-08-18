import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useSocket } from '@/socket';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import type { Post, StoryGroup } from '@/types';
import { PostCard } from '@/components/PostCard';
import { StoryRing } from '@/components/StoryRing';
import { Skeleton } from '@/ui';

export default function FeedScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [section, setSection] = useState<'friends' | 'public'>('public');
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<StoryGroup[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingRef = useRef(false);

  const load = useCallback(async (isRefresh = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const [feedRes, storyRes] = await Promise.all([
        api.feed(section, undefined, 20),
        api.feedStories(),
      ]);
      setPosts(feedRes.items);
      setCursor(feedRes.nextCursor);
      setStories(storyRes);
    } catch {} finally {
      setLoading(false); setRefreshing(false); loadingRef.current = false;
    }
  }, [section]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.feedStories().then(setStories).catch(() => {});
  }, [section]);

  const { subscribe } = useSocket();

  useEffect(() => {
    return subscribe((event) => {
      if (event.type === 'post.created') {
        setPosts((prev) => {
          if (prev.some((p) => p.id === event.post.id)) return prev;
          return [event.post, ...prev];
        });
      } else if (event.type === 'post.deleted') {
        setPosts((prev) => prev.filter((p) => p.id !== event.postId));
      } else if (event.type === 'post.updated') {
        setPosts((prev) => prev.map((p) => p.id === event.post.id ? event.post : p));
      } else if (event.type === 'reaction.updated') {
        setPosts((prev) => prev.map((p) => {
          if (p.id !== event.postId) return p;
          return { ...p, likeCount: event.likeCount, reactions: [...p.reactions.filter((r) => r.userId !== event.userId), { emoji: event.emoji, userId: event.userId, displayName: '', avatarUrl: null }] };
        }));
      } else if (event.type === 'comment.created') {
        setPosts((prev) => prev.map((p) => p.id === event.postId ? { ...p, commentCount: p.commentCount + 1 } : p));
      } else if (event.type === 'story.created') {
        api.feedStories().then(setStories).catch(() => {});
      }
    });
  }, [subscribe]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.feed(section, cursor, 20);
      setPosts((prev) => [...prev, ...res.items]);
      setCursor(res.nextCursor);
    } catch {} finally { setLoadingMore(false); }
  }, [cursor, section, loadingMore]);

  const onRefresh = useCallback(() => { load(true); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Image source={require('../../assets/header.png')} style={[styles.headerLogo, { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 }]} resizeMode="contain" />
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => router.push('/settings')} style={({ pressed }) => [styles.settingsBtn, { backgroundColor: colors.surface, opacity: pressed ? 0.6 : 1 }]}>
            <MaterialCommunityIcons name="cog-outline" size={22} color={colors.text} />
          </Pressable>
        </View>
        <View style={{ padding: 16 }}>
          <Skeleton width="100%" height={80} radius={12} />
          <View style={{ height: 16 }} />
          <Skeleton width="100%" height={200} radius={16} />
          <View style={{ height: 16 }} />
          <Skeleton width="100%" height={200} radius={16} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Image source={require('../../assets/header.png')} style={[styles.headerLogo, { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 }]} resizeMode="contain" />
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => router.push('/settings')} style={({ pressed }) => [styles.settingsBtn, { backgroundColor: colors.surface, opacity: pressed ? 0.6 : 1 }]}>
            <MaterialCommunityIcons name="cog-outline" size={22} color={colors.text} />
          </Pressable>
        </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} onRefresh={onRefresh} />}
        ListHeaderComponent={() => (
          <>
            <StoryRing stories={stories} />
            <View style={[styles.sectionRow, { borderBottomColor: colors.border }]}>
              {(['public', 'friends'] as const).map((s) => (
                <Pressable key={s} onPress={() => setSection(s)} style={[styles.sectionTab, section === s && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}>
                  <Text style={[styles.sectionLabel, { color: section === s ? colors.accent : colors.muted }]}>{s === 'friends' ? t('friends') : t('explore')}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="newspaper-variant-outline" size={56} color={colors.faint} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>{t('noPostsYet')}</Text>
          </View>
        )}
        ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} color={colors.accent} /> : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        contentContainerStyle={posts.length === 0 ? styles.emptyContainer : undefined}
      />

      <Pressable style={[styles.fab, { backgroundColor: colors.accent }]} onPress={() => router.push('/feed/create' as any)}>
        <MaterialCommunityIcons name="plus" size={28} color={colors.accentText} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { height: 56, paddingHorizontal: 14, paddingBottom: 2, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 220, height: 56 },
  settingsBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  sectionRow: { flexDirection: 'row', borderBottomWidth: 1 },
  sectionTab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  sectionLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '500' },
  emptyContainer: { flexGrow: 1 },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
});
