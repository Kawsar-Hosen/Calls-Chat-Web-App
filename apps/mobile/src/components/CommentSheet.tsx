import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useTheme, useFont } from '@/theme';
import { useI18n } from '@/i18n';
import { useSocket } from '@/socket';
import { Avatar } from '@/ui';
import { FluentEmoji, EmojiText, isEmojiOnly } from '@/emoji';
import type { PostComment } from '@/types';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { EmojiPicker } from '@/components/EmojiPicker';

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

interface CommentSheetProps {
  visible: boolean;
  postId: string;
  onClose: () => void;
  onCommentAdded?: () => void;
}

interface ReplyTo {
  commentId: string;
  username: string;
}

export function CommentSheet({ visible, postId, onClose, onCommentAdded }: CommentSheetProps) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { fontFamily } = useFont();
  const { t } = useI18n();
  const { subscribe } = useSocket();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const fetchComments = useCallback(async (reset?: boolean) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.postComments(postId, reset ? undefined : cursor ?? undefined);
      setComments(prev => (reset ? res.items : [...prev, ...res.items]));
      setCursor(res.nextCursor ?? null);
    } catch {}
    setLoading(false);
  }, [postId, cursor, loading]);

  useEffect(() => {
    if (visible) {
      setComments([]);
      setCursor(null);
      setNewComment('');
      setReplyTo(null);
      fetchComments(true);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    return subscribe((event) => {
      if (event.type === 'comment.created' && event.postId === postId) {
        setComments(prev => {
          if (prev.some((c) => c.id === event.comment.id)) return prev;
          return [event.comment, ...prev];
        });
      } else if (event.type === 'comment.deleted' && event.postId === postId) {
        setComments(prev => prev.filter((c) => c.id !== event.commentId));
      }
    });
  }, [visible, subscribe, postId]);

  const handleSend = useCallback(async () => {
    const trimmed = newComment.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const comment = await api.addComment(postId, trimmed, replyTo?.commentId);
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      setReplyTo(null);
      onCommentAdded?.();
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch {}
    setSending(false);
  }, [newComment, postId, sending, onCommentAdded, replyTo]);

  const handleEmojiSelect = useCallback((char: string) => {
    setNewComment(prev => prev + char);
    setEmojiPickerVisible(false);
  }, []);

  const handleReact = useCallback(async (commentId: string) => {
    if (!user) return;
    try {
      const res = await api.reactComment(postId, commentId, '👍');
      setComments(prev => prev.map((c) => {
        if (c.id !== commentId) return c;
        const isNowLiked = res.myReaction === '👍';
        let newReactions = c.reactions.filter((r) => r.userId !== user.id || r.emoji !== '👍');
        if (isNowLiked) {
          newReactions = [...newReactions, { emoji: '👍', userId: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl }];
        }
        return { ...c, reactionCount: res.reactionCount, reactions: newReactions };
      }));
    } catch {}
  }, [postId, user]);

  const handleReply = useCallback((comment: PostComment) => {
    setReplyTo({ commentId: comment.id, username: comment.author.displayName });
  }, []);

  const cancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  const renderComment = useCallback(({ item }: { item: PostComment }) => (
    <CommentRow comment={item} colors={colors} fontFamily={fontFamily} user={user} onReact={handleReact} onReply={handleReply} />
  ), [colors, fontFamily, user, handleReact, handleReply]);

  const listHeader = useMemo(() => (
    <View style={styles.listHeader} />
  ), []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        style={styles.sheet}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerDrag} />
            <Text style={[styles.title, { color: colors.text, fontFamily }]}>{t('comments')}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>

          <FlatList
            ref={flatListRef}
            data={comments}
            keyExtractor={item => item.id}
            renderItem={renderComment}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={!loading ? (
              <View style={styles.emptyContainer}>
                <FluentEmoji char="💬" size={48} />
                <Text style={[styles.empty, { color: colors.faint, fontFamily }]}>{t('noComments')}</Text>
              </View>
            ) : null}
            ListFooterComponent={loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : null}
            onEndReached={() => { if (cursor) fetchComments(); }}
            onEndReachedThreshold={0.4}
          />

          {replyTo ? (
            <View style={[styles.replyBar, { backgroundColor: colors.elevated, borderTopColor: colors.border }]}>
              <MaterialCommunityIcons name="reply" size={16} color={colors.accent} />
              <Text style={[styles.replyText, { color: colors.accent, fontFamily }]} numberOfLines={1}>
                {`Replying to @${replyTo.username}`}
              </Text>
              <Pressable onPress={cancelReply} hitSlop={8} style={styles.replyCancelBtn}>
                <MaterialCommunityIcons name="close-circle" size={18} color={colors.faint} />
              </Pressable>
            </View>
          ) : null}

          <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            <Pressable onPress={() => setEmojiPickerVisible(true)} style={styles.emojiBtn}>
              <FluentEmoji char="😊" size={24} />
            </Pressable>
            <TextInput
              style={[styles.input, { backgroundColor: colors.elevated, color: colors.text, fontFamily }]}
              placeholder={replyTo ? `Reply to @${replyTo.username}...` : t('writeComment')}
              placeholderTextColor={colors.faint}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={1000}
            />
            <Pressable
              onPress={handleSend}
              disabled={!newComment.trim() || sending}
              style={[styles.sendBtn, { backgroundColor: newComment.trim() ? colors.accent : colors.elevated }]}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.accentText} />
              ) : (
                <MaterialCommunityIcons
                  name="send"
                  size={18}
                  color={newComment.trim() ? colors.accentText : colors.faint}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <EmojiPicker visible={emojiPickerVisible} onSelect={handleEmojiSelect} onClose={() => setEmojiPickerVisible(false)} />
    </Modal>
  );
}

interface CommentRowProps {
  comment: PostComment;
  colors: ReturnType<typeof useTheme>['colors'];
  fontFamily: string | undefined;
  user: ReturnType<typeof useAuth>['user'];
  onReact: (commentId: string) => void;
  onReply: (comment: PostComment) => void;
}

const CommentRow = memo(function CommentRow({ comment, colors, fontFamily, user, onReact, onReply }: CommentRowProps) {
  const isLiked = useMemo(() => {
    if (!user) return false;
    return comment.reactions.some((r) => r.userId === user.id && r.emoji === '👍');
  }, [comment.reactions, user]);

  const isSticker = useMemo(() => isEmojiOnly(comment.content) && comment.content.length <= 8, [comment.content]);

  return (
    <View style={styles.commentRow}>
      <Avatar name={comment.author.displayName} uri={comment.author.avatarUrl} size={34} online={comment.author.isOnline} />
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <View style={styles.nameRow}>
            <Text style={[styles.commentAuthor, { color: colors.text, fontFamily }]} numberOfLines={1}>
              {comment.author.displayName}
            </Text>
            {comment.author.isVerified ? (
              <VerifiedBadge
                category={comment.author.verifiedCategory ?? null}
                username={comment.author.username}
                displayName={comment.author.displayName}
                verifiedAt={comment.author.verifiedAt ?? null}
              />
            ) : null}
          </View>
          <Text style={[styles.commentTime, { color: colors.faint }]}>{timeAgo(comment.createdAt)}</Text>
        </View>

        {comment.parentId ? (
          <View style={[styles.replyBadge, { backgroundColor: colors.accentSoft }]}>
            <MaterialCommunityIcons name="reply" size={10} color={colors.accent} />
            <Text style={[styles.replyBadgeText, { color: colors.accent, fontFamily }]} numberOfLines={1}>
              reply
            </Text>
          </View>
        ) : null}

        {isSticker ? (
          <View style={styles.stickerContainer}>
            <EmojiText text={comment.content} size={48} />
          </View>
        ) : (
          <Text style={[styles.commentContent, { color: colors.text, fontFamily }]}>{comment.content}</Text>
        )}

        <View style={styles.commentActions}>
          <View style={styles.actionRow}>
            <Pressable onPress={() => onReact(comment.id)} style={[styles.actionBtn, isLiked && styles.actionBtnActive]}>
              <FluentEmoji char="👍" size={16} />
              {comment.reactionCount > 0 ? (
                <Text style={[styles.actionCount, { color: isLiked ? colors.accent : colors.muted, fontFamily }]}>
                  {comment.reactionCount}
                </Text>
              ) : null}
            </Pressable>

            <Pressable onPress={() => onReply(comment)} style={styles.actionBtn}>
              <MaterialCommunityIcons name="reply-outline" size={16} color={colors.muted} />
              <Text style={[styles.actionLabel, { color: colors.muted, fontFamily }]}>Reply</Text>
            </Pressable>
          </View>

          {comment.replyCount > 0 ? (
            <Text style={[styles.replyCountText, { color: colors.faint, fontFamily }]}>
              {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '80%' },
  panel: { flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  header: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerDrag: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '700' },
  closeBtn: { position: 'absolute', right: 16, top: 14, padding: 4 },
  listContent: { paddingBottom: 8 },
  listHeader: { height: 4 },
  commentRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  commentBody: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  commentAuthor: { fontSize: 13, fontWeight: '700' },
  commentTime: { fontSize: 11, marginLeft: 8 },
  replyBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1, marginBottom: 4 },
  replyBadgeText: { fontSize: 10, fontWeight: '600' },
  commentContent: { fontSize: 14, lineHeight: 20 },
  stickerContainer: { paddingVertical: 4 },
  commentActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  actionBtnActive: { opacity: 1 },
  actionCount: { fontSize: 12, fontWeight: '600' },
  actionLabel: { fontSize: 12, fontWeight: '600' },
  replyCountText: { fontSize: 11, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  empty: { fontSize: 14 },
  loadingContainer: { paddingVertical: 20, alignItems: 'center' },
  replyBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 6, borderTopWidth: StyleSheet.hairlineWidth },
  replyText: { flex: 1, fontSize: 13, fontWeight: '600' },
  replyCancelBtn: { padding: 2 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  emojiBtn: { padding: 6 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
