import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import type { Post } from '@/types';
import { Avatar } from '@/ui';
import { CommentSheet } from '@/components/CommentSheet';
import { ShareSheet } from '@/components/ShareSheet';
import { playSound } from '@/sounds';
import { FluentEmoji } from '@/emoji';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function AnimatedReaction({ emoji, onDone }: { emoji: string; onDone: () => void }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1.6, friction: 3, tension: 140, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -10, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(400),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDone());
  }, []);

  return (
    <Animated.View style={[styles.floatingEmoji, { transform: [{ scale }, { translateY }], opacity }]}>
      <FluentEmoji char={emoji} size={40} />
    </Animated.View>
  );
}

export const PostCard = memo(function PostCard({ post, onRefresh }: { post: Post; onRefresh?: () => void }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [showReactions, setShowReactions] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<{ id: number; emoji: string }[]>([]);
  const floatIdRef = useRef(0);
  const [localOverrides, setLocalOverrides] = useState<{ myLikeEmoji?: string | null; likeCount?: number; myBookmarked?: boolean; myShared?: boolean; shareCount?: number }>({});
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  const effectiveMyLike = localOverrides.myLikeEmoji !== undefined ? localOverrides.myLikeEmoji : post.myLikeEmoji;
  const effectiveLikeCount = localOverrides.likeCount !== undefined ? localOverrides.likeCount : post.likeCount;
  const effectiveBookmarked = localOverrides.myBookmarked !== undefined ? localOverrides.myBookmarked : post.myBookmarked;
  const effectiveShared = localOverrides.myShared !== undefined ? localOverrides.myShared : post.myShared;
  const effectiveShareCount = localOverrides.shareCount !== undefined ? localOverrides.shareCount : post.shareCount;

  const toggleReaction = useCallback(async (emoji: string) => {
    const prev = effectiveMyLike;
    const newEmoji = prev === emoji ? null : emoji;
    const delta = prev ? (newEmoji ? 0 : -1) : (newEmoji ? 1 : 0);
    setLocalOverrides((o) => ({ ...o, myLikeEmoji: newEmoji, likeCount: post.likeCount + delta }));
    playSound('react');
    const id = ++floatIdRef.current;
    setFloatingReactions((prev) => [...prev, { id, emoji }]);
    try { await api.reactPost(post.id, emoji); } catch { onRefresh?.(); }
  }, [post.id, post.likeCount, effectiveMyLike, onRefresh]);

  const toggleBookmark = useCallback(async () => {
    const newVal = !effectiveBookmarked;
    setLocalOverrides((o) => ({ ...o, myBookmarked: newVal }));
    try { await api.bookmarkPost(post.id); } catch { onRefresh?.(); }
  }, [post.id, effectiveBookmarked, onRefresh]);

  const toggleShare = useCallback(async () => {
    if (effectiveShared) return;
    setLocalOverrides((o) => ({ ...o, myShared: true, shareCount: post.shareCount + 1 }));
    try { await api.sharePost(post.id); } catch { onRefresh?.(); }
  }, [post.id, post.shareCount, effectiveShared, onRefresh]);

  const removeFloat = useCallback((id: number) => {
    setFloatingReactions((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const toggleFollow = useCallback(async () => {
    if (followLoading || post.author.id === user?.id) return;
    const prev = isFollowing;
    setIsFollowing(prev === null ? true : !prev);
    setFollowLoading(true);
    try {
      const res = await api.toggleFollow(post.author.id);
      setIsFollowing(res.following);
    } catch { setIsFollowing(prev); } finally { setFollowLoading(false); }
  }, [post.author.id, user?.id, isFollowing, followLoading]);

  const isLong = (post.content?.length ?? 0) > 200;
  const displayContent = isLong && !expanded ? post.content?.slice(0, 200) + '...' : post.content;

  const mediaCount = post.media.length;

  return (
    <>
    <Pressable onPress={() => router.push({ pathname: '/feed/[id]' as any, params: { id: post.id } })} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.push({ pathname: '/feed/profile/[id]' as any, params: { id: post.author.id } })} style={styles.avatarPress}>
          <Avatar name={post.author.displayName} uri={post.author.avatarUrl} size={40} online={post.author.isOnline} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Pressable onPress={() => router.push({ pathname: '/feed/profile/[id]' as any, params: { id: post.author.id } })}>
            <Text style={[styles.authorName, { color: colors.text }]}>{post.author.displayName}</Text>
          </Pressable>
          <View style={styles.metaRow}>
            <Text style={[styles.time, { color: colors.faint }]}>{timeAgo(post.createdAt)}</Text>
            <Text style={[styles.dot, { color: colors.faint }]}>·</Text>
            <MaterialCommunityIcons name={post.visibility === 'friends' ? 'account-group' : 'earth'} size={12} color={colors.faint} />
          </View>
        </View>
        {post.author.id !== user?.id ? (
          <Pressable onPress={toggleFollow} disabled={followLoading} style={[styles.followBtnSmall, { backgroundColor: isFollowing ? colors.elevated : colors.accentSoft, borderColor: isFollowing ? colors.border : colors.accent }]}>
            <Text style={[styles.followBtnSmallText, { color: isFollowing ? colors.muted : colors.accent }]}>
              {isFollowing ? t('following') : t('follow')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {displayContent ? (
        <View style={styles.contentWrap}>
          <Text style={[styles.content, { color: colors.text }]}>{displayContent}</Text>
          {isLong ? (
            <Pressable onPress={() => setExpanded(!expanded)}>
              <Text style={[styles.seeMore, { color: colors.accent }]}>{expanded ? t('seeLess') : t('seeMore')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {mediaCount > 0 ? (
        <View style={[styles.mediaGrid, mediaCount === 1 && styles.mediaSingle]}>
          {post.media.slice(0, 4).map((m, i) => (
            <Image key={m.id} source={{ uri: m.url }} style={[
              styles.mediaImg,
              mediaCount === 1 ? styles.mediaFull : styles.mediaHalf,
              mediaCount > 2 && i === 0 && styles.mediaTopLeft,
              mediaCount > 2 && i === 1 && styles.mediaTopRight,
              mediaCount > 2 && i === 2 && styles.mediaBotLeft,
              mediaCount > 3 && i === 3 && styles.mediaBotRight,
            ]} resizeMode="cover" />
          ))}
        </View>
      ) : null}

      {effectiveLikeCount > 0 || post.commentCount > 0 || effectiveShareCount > 0 ? (
        <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
          <View style={styles.statsLeft}>
            {effectiveLikeCount > 0 ? (
              <View style={styles.reactionBadge}>
                <FluentEmoji char={effectiveMyLike || '👍'} size={16} />
                <Text style={[styles.statNum, { color: colors.muted }]}>{effectiveLikeCount}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.statsRight}>
            {post.commentCount > 0 ? <Text style={[styles.statText, { color: colors.muted }]}>{post.commentCount} {t('comments')}</Text> : null}
            {effectiveShareCount > 0 ? <Text style={[styles.statText, { color: colors.muted }]}>{effectiveShareCount} {t('shares')}</Text> : null}
          </View>
        </View>
      ) : null}

      <View style={[styles.actionBar, { borderTopColor: colors.border }]}>
        <Pressable onPress={() => setShowReactions(!showReactions)} style={styles.actionBtn}>
          <MaterialCommunityIcons name={effectiveMyLike ? 'heart' : 'heart-outline'} size={22} color={effectiveMyLike ? '#EF4444' : colors.muted} />
          <Text style={[styles.actionLabel, { color: effectiveMyLike ? '#EF4444' : colors.muted }]}>{t('like')}</Text>
        </Pressable>
        <Pressable onPress={() => setShowComments(true)} style={styles.actionBtn}>
          <MaterialCommunityIcons name="comment-outline" size={22} color={colors.muted} />
          <Text style={[styles.actionLabel, { color: colors.muted }]}>{t('comment')}</Text>
        </Pressable>
        <Pressable onPress={() => setShowShare(true)} style={styles.actionBtn}>
          <MaterialCommunityIcons name={effectiveShared ? 'share' : 'share-outline'} size={22} color={effectiveShared ? colors.accent : colors.muted} />
          <Text style={[styles.actionLabel, { color: effectiveShared ? colors.accent : colors.muted }]}>{t('share')}</Text>
        </Pressable>
        <Pressable onPress={toggleBookmark} style={styles.actionBtn}>
          <MaterialCommunityIcons name={effectiveBookmarked ? 'bookmark' : 'bookmark-outline'} size={22} color={effectiveBookmarked ? '#F59E0B' : colors.muted} />
          <Text style={[styles.actionLabel, { color: effectiveBookmarked ? '#F59E0B' : colors.muted }]}>{t('save')}</Text>
        </Pressable>
      </View>

      {showReactions ? (
        <View style={[styles.reactionPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {REACTIONS.map((emoji) => (
            <Pressable key={emoji} onPress={() => { toggleReaction(emoji); setShowReactions(false); }} style={styles.reactionBtn}>
              <FluentEmoji char={emoji} size={32} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {floatingReactions.length > 0 ? (
        <View style={styles.floatingContainer} pointerEvents="none">
          {floatingReactions.map((fr) => (
            <AnimatedReaction key={fr.id} emoji={fr.emoji} onDone={() => removeFloat(fr.id)} />
          ))}
        </View>
      ) : null}
    </Pressable>
    <CommentSheet visible={showComments} postId={post.id} onClose={() => setShowComments(false)} {...(onRefresh ? { onCommentAdded: onRefresh } : {})} />
    <ShareSheet visible={showShare} postId={post.id} shareCount={effectiveShareCount} myShared={effectiveShared} onClose={() => setShowShare(false)} {...(onRefresh ? { onShared: onRefresh } : {})} />
    </>
  );
});

const styles = StyleSheet.create({
  card: { marginHorizontal: 12, marginTop: 12, borderRadius: 16, borderWidth: 1, overflow: 'visible' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 10, gap: 10 },
  avatarPress: { marginRight: -4 },
  headerInfo: { flex: 1 },
  authorName: { fontSize: 14, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  time: { fontSize: 12 },
  dot: { fontSize: 12 },
  followBtnSmall: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  followBtnSmallText: { fontSize: 12, fontWeight: '700' },
  contentWrap: { paddingHorizontal: 14, paddingBottom: 10 },
  content: { fontSize: 14, lineHeight: 20 },
  seeMore: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  mediaSingle: { paddingHorizontal: 0 },
  mediaImg: { backgroundColor: '#E5E7EB' },
  mediaFull: { width: '100%', height: 240 },
  mediaHalf: { width: '50%', height: 160 },
  mediaTopLeft: { borderBottomLeftRadius: 0 },
  mediaTopRight: { borderBottomRightRadius: 0 },
  mediaBotLeft: { borderTopLeftRadius: 0 },
  mediaBotRight: { borderTopRightRadius: 0 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  statsLeft: { flexDirection: 'row', alignItems: 'center' },
  reactionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statNum: { fontSize: 12, fontWeight: '600' },
  statsRight: { flexDirection: 'row', gap: 12 },
  statText: { fontSize: 12, fontWeight: '500' },
  actionBar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  actionLabel: { fontSize: 12, fontWeight: '600' },
  reactionPicker: { flexDirection: 'row', justifyContent: 'center', gap: 8, padding: 10, borderTopWidth: StyleSheet.hairlineWidth },
  reactionBtn: { padding: 6, borderRadius: 20 },
  floatingContainer: { position: 'absolute', bottom: 60, right: 20, width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  floatingEmoji: { position: 'absolute' },
});
