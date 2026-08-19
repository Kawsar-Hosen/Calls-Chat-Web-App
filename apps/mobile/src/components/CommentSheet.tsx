import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
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
import { useTheme, useFont } from '@/theme';
import { useI18n } from '@/i18n';
import { Avatar } from '@/ui';
import type { PostComment } from '@/types';

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

export function CommentSheet({ visible, postId, onClose, onCommentAdded }: CommentSheetProps) {
  const { colors } = useTheme();
  const { fontFamily } = useFont();
  const { t } = useI18n();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
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
      fetchComments(true);
    }
  }, [visible]);

  const handleSend = useCallback(async () => {
    const trimmed = newComment.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const comment = await api.addComment(postId, trimmed);
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      onCommentAdded?.();
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch {}
    setSending(false);
  }, [newComment, postId, sending, onCommentAdded]);

  const renderComment = useCallback(({ item }: { item: PostComment }) => (
    <View style={styles.commentRow}>
      <Avatar name={item.author.displayName} uri={item.author.avatarUrl} size={32} />
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text style={[styles.commentAuthor, { color: colors.text, fontFamily }]}>{item.author.displayName}</Text>
          <Text style={[styles.commentTime, { color: colors.faint }]}>{timeAgo(item.createdAt)}</Text>
        </View>
        <Text style={[styles.commentContent, { color: colors.text, fontFamily }]}>{item.content}</Text>
        {item.reactionCount && item.reactionCount > 0 ? (
          <View style={[styles.reactionBadge, { backgroundColor: colors.border }]}>
            <Text style={[styles.reactionBadgeText, { color: colors.muted }]}>{item.reactionCount}</Text>
          </View>
        ) : null}
      </View>
    </View>
  ), [colors]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        style={styles.sheet}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>{t('comments')}</Text>
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
            ListEmptyComponent={!loading ? (
              <Text style={[styles.empty, { color: colors.faint }]}>{t('noComments')}</Text>
            ) : null}
            ListFooterComponent={loading ? (
              <Text style={[styles.loading, { color: colors.faint }]}>{t('loading')}</Text>
            ) : null}
            onEndReached={() => { if (cursor) fetchComments(); }}
            onEndReachedThreshold={0.4}
          />

          <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.border, color: colors.text }]}
              placeholder={t('writeComment')}
              placeholderTextColor={colors.faint}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={1000}
            />
            <Pressable
              onPress={handleSend}
              disabled={!newComment.trim() || sending}
              style={[styles.sendBtn, { opacity: newComment.trim() ? 1 : 0.4 }]}
            >
              <MaterialCommunityIcons name="send" size={20} color={colors.accent} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '80%' },
  panel: { flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 17, fontWeight: '700' },
  closeBtn: { padding: 4 },
  listContent: { padding: 16, paddingBottom: 8 },
  commentRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  commentBody: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  commentAuthor: { fontSize: 13, fontWeight: '700' },
  commentTime: { fontSize: 11 },
  commentContent: { fontSize: 14, lineHeight: 20 },
  reactionBadge: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  reactionBadgeText: { fontSize: 11, fontWeight: '600' },
  empty: { textAlign: 'center', fontSize: 14, paddingVertical: 40 },
  loading: { textAlign: 'center', fontSize: 13, paddingVertical: 16 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  sendBtn: { padding: 8 },
});
