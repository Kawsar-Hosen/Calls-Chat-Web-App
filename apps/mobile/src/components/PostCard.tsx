import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo, useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import type { Post } from '@/types';
import { Avatar } from '@/ui';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export const PostCard = memo(function PostCard({ post, onRefresh }: { post: Post; onRefresh?: () => void }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [showReactions, setShowReactions] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const toggleReaction = useCallback(async (emoji: string) => {
    try { await api.reactPost(post.id, emoji); onRefresh?.(); } catch {}
  }, [post.id, onRefresh]);

  const toggleBookmark = useCallback(async () => {
    try { await api.bookmarkPost(post.id); onRefresh?.(); } catch {}
  }, [post.id, onRefresh]);

  const toggleShare = useCallback(async () => {
    try { await api.sharePost(post.id); onRefresh?.(); } catch {}
  }, [post.id, onRefresh]);

  const isLong = (post.content?.length ?? 0) > 200;
  const displayContent = isLong && !expanded ? post.content?.slice(0, 200) + '...' : post.content;

  const mediaCount = post.media.length;

  return (
    <Pressable onPress={() => router.push({ pathname: '/feed/[id]' as any, params: { id: post.id } })} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <Avatar name={post.author.displayName} uri={post.author.avatarUrl} size={40} online={post.author.isOnline} />
        <View style={styles.headerInfo}>
          <Text style={[styles.authorName, { color: colors.text }]}>{post.author.displayName}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.time, { color: colors.faint }]}>{timeAgo(post.createdAt)}</Text>
            <Text style={[styles.dot, { color: colors.faint }]}>·</Text>
            <MaterialCommunityIcons name={post.visibility === 'friends' ? 'account-group' : 'earth'} size={12} color={colors.faint} />
          </View>
        </View>
      </View>

      {/* Content */}
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

      {/* Media Grid */}
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

      {/* Reaction summary */}
      {post.likeCount > 0 || post.commentCount > 0 || post.shareCount > 0 ? (
        <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
          <View style={styles.statsLeft}>
            {post.likeCount > 0 ? (
              <View style={styles.reactionBadge}>
                <Text style={{ fontSize: 14 }}>{post.myLikeEmoji || '👍'}</Text>
                <Text style={[styles.statNum, { color: colors.muted }]}>{post.likeCount}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.statsRight}>
            {post.commentCount > 0 ? <Text style={[styles.statText, { color: colors.muted }]}>{post.commentCount} {t('comments')}</Text> : null}
            {post.shareCount > 0 ? <Text style={[styles.statText, { color: colors.muted }]}>{post.shareCount} {t('shares')}</Text> : null}
          </View>
        </View>
      ) : null}

      {/* Action bar */}
      <View style={[styles.actionBar, { borderTopColor: colors.border }]}>
        <Pressable onPress={() => setShowReactions(!showReactions)} style={styles.actionBtn}>
          <MaterialCommunityIcons name={post.myLikeEmoji ? 'heart' : 'heart-outline'} size={22} color={post.myLikeEmoji ? '#EF4444' : colors.muted} />
          <Text style={[styles.actionLabel, { color: post.myLikeEmoji ? '#EF4444' : colors.muted }]}>{t('like')}</Text>
        </Pressable>
        <Pressable onPress={() => router.push({ pathname: '/feed/[id]' as any, params: { id: post.id } })} style={styles.actionBtn}>
          <MaterialCommunityIcons name="comment-outline" size={22} color={colors.muted} />
          <Text style={[styles.actionLabel, { color: colors.muted }]}>{t('comment')}</Text>
        </Pressable>
        <Pressable onPress={toggleShare} style={styles.actionBtn}>
          <MaterialCommunityIcons name={post.myShared ? 'share' : 'share-outline'} size={22} color={post.myShared ? colors.accent : colors.muted} />
          <Text style={[styles.actionLabel, { color: post.myShared ? colors.accent : colors.muted }]}>{t('share')}</Text>
        </Pressable>
        <Pressable onPress={toggleBookmark} style={styles.actionBtn}>
          <MaterialCommunityIcons name={post.myBookmarked ? 'bookmark' : 'bookmark-outline'} size={22} color={post.myBookmarked ? '#F59E0B' : colors.muted} />
          <Text style={[styles.actionLabel, { color: post.myBookmarked ? '#F59E0B' : colors.muted }]}>{t('save')}</Text>
        </Pressable>
      </View>

      {/* Reaction picker */}
      {showReactions ? (
        <View style={[styles.reactionPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {REACTIONS.map((emoji) => (
            <Pressable key={emoji} onPress={() => { toggleReaction(emoji); setShowReactions(false); }} style={styles.reactionBtn}>
              <Text style={styles.reactionEmoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { marginHorizontal: 12, marginTop: 12, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 10, gap: 10 },
  headerInfo: { flex: 1 },
  authorName: { fontSize: 14, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  time: { fontSize: 12 },
  dot: { fontSize: 12 },
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
  reactionBtn: { padding: 4 },
  reactionEmoji: { fontSize: 28 },
});
