import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useTheme, useFont } from '@/theme';
import { useI18n } from '@/i18n';
import type { Post } from '@/types';
import { Avatar } from '@/ui';
import { CommentSheet } from '@/components/CommentSheet';
import { ShareSheet } from '@/components/ShareSheet';
import { ReactionSheet } from '@/components/ReactionSheet';
import { playSound } from '@/sounds';
import { FluentEmoji } from '@/emoji';
import { VerifiedBadge } from '@/components/VerifiedBadge';

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
  const { fontFamily } = useFont();
  const { t } = useI18n();
  const router = useRouter();
  const [showReactions, setShowReactions] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showReactionsDetail, setShowReactionsDetail] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<{ id: number; emoji: string }[]>([]);
  const floatIdRef = useRef(0);
  const [localOverrides, setLocalOverrides] = useState<{ myLikeEmoji?: string | null; likeCount?: number; myBookmarked?: boolean; myShared?: boolean; shareCount?: number }>({});
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);

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

  const topEmojis = (() => {
    const counts: Record<string, number> = {};
    for (const r of post.reactions) { counts[r.emoji] = (counts[r.emoji] ?? 0) + 1; }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  })();

  return (
    <>
    <Pressable onPress={() => router.push({ pathname: '/feed/[id]' as any, params: { id: post.id } })} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.push({ pathname: '/feed/profile/[id]' as any, params: { id: post.author.id } })} style={styles.avatarPress}>
          <Avatar name={post.author.displayName} uri={post.author.avatarUrl} size={40} online={post.author.isOnline} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Pressable onPress={() => router.push({ pathname: '/feed/profile/[id]' as any, params: { id: post.author.id } })} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.authorName, { color: colors.text, fontFamily }]}>{post.author.displayName}</Text>
            {post.author.isVerified ? <VerifiedBadge category={post.author.verifiedCategory ?? null} username={post.author.username} displayName={post.author.displayName} verifiedAt={post.author.verifiedAt ?? null} /> : null}
          </Pressable>
          <View style={styles.metaRow}>
            <Text style={[styles.time, { color: colors.faint }]}>{timeAgo(post.createdAt)}</Text>
            <Text style={[styles.dot, { color: colors.faint }]}>·</Text>
            <MaterialCommunityIcons name={post.visibility === 'friends' ? 'account-group' : 'earth'} size={12} color={colors.faint} />
            {post.author.id !== user?.id ? (
              <Pressable onPress={toggleFollow} disabled={followLoading} style={[styles.followBtnInline, { backgroundColor: isFollowing ? colors.elevated : colors.accentSoft, borderColor: isFollowing ? colors.border : colors.accent }]}>
                <Text style={[styles.followBtnInlineText, { color: isFollowing ? colors.muted : colors.accent }]}>
                  {isFollowing ? t('following') : t('follow')}
                </Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => setMenuOpen(true)} style={styles.headerBtn}>
              <MaterialCommunityIcons name="dots-vertical" size={20} color={colors.faint} />
            </Pressable>
          </View>
        </View>
      </View>

      {displayContent ? (
        <View style={styles.contentWrap}>
          <Text style={[styles.content, { color: colors.text, fontFamily }]}>{displayContent}</Text>
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
            <Pressable key={m.id} onPress={() => setViewerImage(m.url)}>
              <Image source={{ uri: m.url }} style={[
                styles.mediaImg,
                mediaCount === 1 ? styles.mediaFull : styles.mediaHalf,
                mediaCount > 2 && i === 0 && styles.mediaTopLeft,
                mediaCount > 2 && i === 1 && styles.mediaTopRight,
                mediaCount > 2 && i === 2 && styles.mediaBotLeft,
                mediaCount > 3 && i === 3 && styles.mediaBotRight,
              ]} resizeMode="cover" />
            </Pressable>
          ))}
        </View>
      ) : null}

      {topEmojis.length > 0 || post.commentCount > 0 || effectiveShareCount > 0 ? (
        <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
          <Pressable style={styles.statsLeft} onPress={() => { if (post.reactions.length > 0) setShowReactionsDetail(true); }}>
            {topEmojis.map(([emoji]) => (
              <View key={emoji} style={styles.reactionBadge}>
                <FluentEmoji char={emoji} size={18} />
              </View>
            ))}
          </Pressable>
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
    <ReactionSheet visible={showReactionsDetail} reactions={post.reactions} onClose={() => setShowReactionsDetail(false)} />
    <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={() => setMenuOpen(false)}>
      <Pressable style={menuStyles.backdrop} onPress={() => setMenuOpen(false)}>
        <Pressable style={[menuStyles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => undefined}>
          <View style={[menuStyles.handle, { backgroundColor: colors.faint }]} />
          {post.author.id === user?.id ? (
            <>
              <Pressable style={menuStyles.item} onPress={() => { setMenuOpen(false); router.push({ pathname: '/feed/edit' as any, params: { id: post.id } }); }}>
                <MaterialCommunityIcons name="pencil" size={20} color={colors.text} />
                <Text style={[menuStyles.itemText, { color: colors.text }]}>Edit Post</Text>
              </Pressable>
              <Pressable style={menuStyles.item} onPress={() => { setMenuOpen(false); }}>
                <MaterialCommunityIcons name="delete" size={20} color="#EF4444" />
                <Text style={[menuStyles.itemText, { color: '#EF4444' }]}>Delete Post</Text>
              </Pressable>
              <Pressable style={menuStyles.item} onPress={async () => { setMenuOpen(false); await Clipboard.setStringAsync(`https://xyteee.com/post/${post.id}`); }}>
                <MaterialCommunityIcons name="link" size={20} color={colors.text} />
                <Text style={[menuStyles.itemText, { color: colors.text }]}>Copy Link</Text>
              </Pressable>
              <Pressable style={menuStyles.item} onPress={() => setMenuOpen(false)}>
                <MaterialCommunityIcons name="comment-off-outline" size={20} color={colors.text} />
                <Text style={[menuStyles.itemText, { color: colors.text }]}>Turn Off Comments</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={menuStyles.item} onPress={() => { setMenuOpen(false); toggleBookmark(); }}>
                <MaterialCommunityIcons name="bookmark-outline" size={20} color={colors.text} />
                <Text style={[menuStyles.itemText, { color: colors.text }]}>Save Post</Text>
              </Pressable>
              <Pressable style={menuStyles.item} onPress={() => { setMenuOpen(false); setShowShare(true); }}>
                <MaterialCommunityIcons name="share-variant" size={20} color={colors.text} />
                <Text style={[menuStyles.itemText, { color: colors.text }]}>Share Post</Text>
              </Pressable>
              <Pressable style={menuStyles.item} onPress={async () => { setMenuOpen(false); await Clipboard.setStringAsync(`https://xyteee.com/post/${post.id}`); }}>
                <MaterialCommunityIcons name="link" size={20} color={colors.text} />
                <Text style={[menuStyles.itemText, { color: colors.text }]}>Copy Link</Text>
              </Pressable>
              <Pressable style={menuStyles.item} onPress={() => setMenuOpen(false)}>
                <MaterialCommunityIcons name="eye-off-outline" size={20} color={colors.text} />
                <Text style={[menuStyles.itemText, { color: colors.text }]}>Hide Post</Text>
              </Pressable>
              <Pressable style={menuStyles.item} onPress={() => { setMenuOpen(false); router.push('/settings/report' as any); }}>
                <MaterialCommunityIcons name="flag-outline" size={20} color={colors.text} />
                <Text style={[menuStyles.itemText, { color: colors.text }]}>Report Post</Text>
              </Pressable>
              <Pressable style={menuStyles.item} onPress={() => setMenuOpen(false)}>
                <MaterialCommunityIcons name="volume-off" size={20} color={colors.text} />
                <Text style={[menuStyles.itemText, { color: colors.text }]}>Mute @{post.author.username}</Text>
              </Pressable>
              <Pressable style={menuStyles.item} onPress={() => setMenuOpen(false)}>
                <MaterialCommunityIcons name="block-helper" size={20} color="#EF4444" />
                <Text style={[menuStyles.itemText, { color: '#EF4444' }]}>Block @{post.author.username}</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
    <Modal visible={!!viewerImage} animationType="fade" onRequestClose={() => setViewerImage(null)}>
      <Pressable style={imageViewerStyles.container} onPress={() => setViewerImage(null)}>
        <Pressable style={imageViewerStyles.closeBtn} onPress={() => setViewerImage(null)}>
          <MaterialCommunityIcons name="close" size={28} color="#FFF" />
        </Pressable>
        {viewerImage ? <Image source={{ uri: viewerImage }} style={imageViewerStyles.image} resizeMode="contain" /> : null}
      </Pressable>
    </Modal>
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
  followBtnInline: { marginLeft: 8 },
  followBtnInlineText: { fontSize: 13, fontWeight: '700' },
  headerBtn: { marginLeft: 'auto', padding: 4 },
  contentWrap: { paddingHorizontal: 14, paddingBottom: 10 },
  content: { fontSize: 14, lineHeight: 20 },
  seeMore: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  mediaSingle: { paddingHorizontal: 0 },
  mediaImg: { backgroundColor: '#E5E7EB' },
  mediaFull: { width: '100%', aspectRatio: 4/3, maxHeight: 300 },
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

const menuStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingBottom: 36, maxHeight: '70%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },
  itemText: { fontSize: 15, fontWeight: '500', flex: 1 },
});

const imageViewerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
  image: { width: '100%', height: '100%' },
});
