import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { PostCard } from '@/components/PostCard';
import { useI18n } from '@/i18n';
import { useTheme, useFont } from '@/theme';
import type { Post, PostComment } from '@/types';
import { Avatar } from '@/ui';

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

const CommentItem = memo(function CommentItem({ comment, colors, t, onDelete, onReact }: {
  comment: PostComment;
  colors: ReturnType<typeof useTheme>['colors'];
  t: (key: string) => string;
  onDelete: (commentId: string) => void;
  onReact: (commentId: string, emoji: string) => void;
}) {
  const { user } = useAuth();
  const { fontFamily } = useFont();

  return (
    <View style={[styles.commentRow, { borderBottomColor: colors.border }]}>
      <Avatar name={comment.author.displayName} uri={comment.author.avatarUrl} size={36} online={comment.author.isOnline} />
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text style={[styles.commentAuthor, { color: colors.text, fontFamily }]} numberOfLines={1}>{comment.author.displayName}</Text>
          <Text style={[styles.commentTime, { color: colors.faint }]}>{timeAgo(comment.createdAt)}</Text>
        </View>
        {comment.parentId ? (
          <View style={[styles.replyBadge, { backgroundColor: colors.accentSoft }]}>
            <MaterialCommunityIcons name="reply" size={12} color={colors.accent} />
            <Text style={[styles.replyText, { color: colors.accent }]}>{t('comment')}</Text>
          </View>
        ) : null}
        <Text style={[styles.commentContent, { color: colors.text, fontFamily }]}>{comment.content}</Text>
        <View style={styles.commentActions}>
          <View style={styles.reactionRow}>
            {['👍', '❤️', '😂'].map((emoji) => (
              <Pressable key={emoji} onPress={() => onReact(comment.id, emoji)} style={styles.reactionBtn}>
                <Text style={styles.reactionEmoji}>{emoji}</Text>
              </Pressable>
            ))}
            {comment.reactionCount > 0 ? (
              <View style={[styles.reactionCount, { backgroundColor: colors.elevated }]}>
                <Text style={[styles.reactionCountText, { color: colors.muted }]}>{comment.reactionCount}</Text>
              </View>
            ) : null}
          </View>
          {user?.id === comment.author.id ? (
            <Pressable onPress={() => onDelete(comment.id)} style={styles.deleteBtn}>
              <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.danger} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
});

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { fontFamily } = useFont();
  const { t } = useI18n();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const loadingRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (loadingRef.current || !id) return;
    loadingRef.current = true;
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const [postRes, commentsRes] = await Promise.all([
        api.getPost(id),
        api.postComments(id),
      ]);
      setPost(postRes);
      setComments(commentsRes.items);
      setCursor(commentsRes.nextCursor);
    } catch {} finally {
      setLoading(false); setRefreshing(false); loadingRef.current = false;
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || !id) return;
    setLoadingMore(true);
    try {
      const res = await api.postComments(id, cursor);
      setComments((prev) => [...prev, ...res.items]);
      setCursor(res.nextCursor);
    } catch {} finally { setLoadingMore(false); }
  }, [cursor, id, loadingMore]);

  const onRefresh = useCallback(() => { load(true); }, [load]);

  const sendComment = useCallback(async () => {
    if (sending || !commentText.trim() || !id) return;
    setSending(true);
    try {
      const newComment = await api.addComment(id, commentText.trim());
      setComments((prev) => [newComment, ...prev]);
      setPost((prev) => prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev);
      setCommentText('');
    } catch {} finally { setSending(false); }
  }, [sending, commentText, id]);

  const deleteComment = useCallback(async (commentId: string) => {
    if (!id) return;
    Alert.alert(t('deleteComment') || 'Delete comment', t('deleteCommentConfirm') || 'Are you sure?', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('deleteAccount'), style: 'destructive', onPress: async () => {
          try {
            await api.deleteComment(id, commentId);
            setComments((prev) => prev.filter((c) => c.id !== commentId));
            setPost((prev) => prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : prev);
          } catch {}
        },
      },
    ]);
  }, [id, t]);

  const reactComment = useCallback(async (commentId: string, emoji: string) => {
    if (!id) return;
    try {
      const res = await api.reactComment(id, commentId, emoji);
      setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, reactionCount: res.reactionCount } : c));
    } catch {}
  }, [id]);

  const deletePost = useCallback(() => {
    if (!id) return;
    Alert.alert(t('deletePost') || 'Delete post', t('deletePostConfirm') || 'Are you sure?', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('deleteAccount'), style: 'destructive', onPress: async () => {
        try { await api.deletePost(id); router.back(); } catch {}
      }},
    ]);
  }, [id, t, router]);

  const renderComment = useCallback(({ item }: { item: PostComment }) => (
    <CommentItem comment={item} colors={colors} t={t} onDelete={deleteComment} onReact={reactComment} />
  ), [colors, t, deleteComment, reactComment]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('comments')}</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <FlatList
          ref={flatListRef}
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderComment}
          ListHeaderComponent={post ? (
            <>
              <PostCard post={post} onRefresh={onRefresh} />
              {user?.id === post.author.id ? (
                <View style={[styles.ownPostActions, { borderBottomColor: colors.border }]}>
                  <Pressable onPress={() => router.push({ pathname: '/feed/edit' as any, params: { id: post.id, content: post.content ?? '' } })} style={styles.ownAction}>
                    <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.accent} />
                    <Text style={[styles.ownActionText, { color: colors.accent }]}>{t('editProfile')}</Text>
                  </Pressable>
                  <Pressable onPress={deletePost} style={styles.ownAction}>
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
                    <Text style={[styles.ownActionText, { color: colors.danger }]}>{t('deleteAccount')}</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : null}
          ListEmptyComponent={null}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} color={colors.accent} /> : null}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />

        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Avatar name={user?.displayName ?? ''} uri={user?.avatarUrl ?? null} size={34} />
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder={t('whatsOnYourMind')}
            placeholderTextColor={colors.faint}
            multiline
            maxLength={1000}
            style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
          />
          <Pressable
            disabled={sending || !commentText.trim()}
            onPress={() => void sendComment()}
            style={[styles.sendBtn, { backgroundColor: commentText.trim() ? colors.accent : colors.elevated }]}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.accentText} />
            ) : (
              <MaterialCommunityIcons name="send" size={20} color={commentText.trim() ? colors.accentText : colors.faint} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: 12 },
  commentRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  commentBody: { flex: 1, gap: 4 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentAuthor: { fontSize: 13, fontWeight: '700' },
  commentTime: { fontSize: 11 },
  replyBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  replyText: { fontSize: 10, fontWeight: '700' },
  commentContent: { fontSize: 14, lineHeight: 20 },
  commentActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  reactionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reactionBtn: { padding: 2 },
  reactionEmoji: { fontSize: 16 },
  reactionCount: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  reactionCountText: { fontSize: 11, fontWeight: '700' },
  deleteBtn: { padding: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, minHeight: 38, maxHeight: 100, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8, fontSize: 14, lineHeight: 20 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  ownPostActions: { flexDirection: 'row', justifyContent: 'center', gap: 24, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  ownAction: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ownActionText: { fontSize: 13, fontWeight: '700' },
});
