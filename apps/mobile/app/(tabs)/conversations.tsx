import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useSocket } from '@/socket';
import { useTheme } from '@/theme';
import type { Conversation, SocketEvent, User } from '@/types';
import { Avatar, ScreenHeader, SkeletonList } from '@/ui';
import { useI18n } from '@/i18n';
import { formatConversationDate } from '@/time';
import { useChatMeta } from '@/chat-meta';
import { previewText } from '@/preview';

function otherMember(conversation: Conversation, currentUser: User) {
  return conversation.members.find((member) => member.id !== currentUser.id) ?? conversation.members[0];
}

export default function ConversationsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const { subscribe } = useSocket();
  const router = useRouter();
  const [items, setItems] = useState<Conversation[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [typingMap, setTypingMap] = useState<Map<string, boolean>>(new Map());
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const meta = useChatMeta();

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try { setItems(await api.conversations()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load conversations'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { void load(items.length > 0); }, [load]));
  useEffect(() => subscribe((event: SocketEvent) => {
    if (event.type === 'typing.start' || event.type === 'typing.stop') {
      const conversationId = event.conversationId;
      const existing = typingTimers.current.get(conversationId);
      if (existing) clearTimeout(existing);
      if (event.type === 'typing.stop') {
        typingTimers.current.delete(conversationId);
        setTypingMap((current) => { const next = new Map(current); next.delete(conversationId); return next; });
      } else {
        setTypingMap((current) => { const next = new Map(current); next.set(conversationId, true); return next; });
        typingTimers.current.set(conversationId, setTimeout(() => {
          typingTimers.current.delete(conversationId);
          setTypingMap((current) => { const next = new Map(current); next.delete(conversationId); return next; });
        }, 5000));
      }
      return;
    }
    if (event.type === 'message.created' || event.type === 'message.deleted' || event.type === 'presence.updated' || event.type === 'group.updated' || event.type === 'group.deleted' || event.type === 'group.member.added' || event.type === 'group.member.removed') void load(true);
  }), [load, subscribe]);
  useEffect(() => () => {
    typingTimers.current.forEach((timer) => clearTimeout(timer));
    typingTimers.current.clear();
  }, []);

  const filtered = useMemo(() => items.filter((item) => {
    if (!user) return false;
    const name = item.kind === 'group' ? item.title ?? item.group?.name ?? 'Group' : otherMember(item, user)?.displayName ?? '';
    return name.toLowerCase().includes(query.trim().toLowerCase());
  }), [items, query, user]);

  if (!user) return null;

  const open = (conversation: Conversation) => {
    const name = conversation.kind === 'group' ? conversation.title ?? conversation.group?.name ?? 'Group' : otherMember(conversation, user)?.displayName ?? 'Conversation';
    const username = conversation.kind === 'group' ? '' : otherMember(conversation, user)?.username ?? '';
    const params = { id: conversation.id, name, username, ...(conversation.group ? { groupId: conversation.group.id } : {}) };
    router.push({ pathname: '/chat/[id]', params });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={t('messages')} eyebrow="YOUR INBOX" right={<View style={[styles.headerRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable accessibilityLabel="New group" hitSlop={8} onPress={() => router.push('/groups/create')} style={({ pressed }) => [styles.newBtn, { opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="account-multiple-plus-outline" size={23} color={colors.accent} /></Pressable>
        <Pressable accessibilityLabel="Add friend" hitSlop={8} onPress={() => router.push('/contacts/search')} style={({ pressed }) => [styles.newBtn, { opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="account-plus-outline" size={23} color={colors.accent} /></Pressable>
      </View>} />
      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MaterialCommunityIcons name="magnify" size={19} color={colors.muted} />
        <TextInput value={query} onChangeText={setQuery} placeholder={`${t('search')}…`} placeholderTextColor={colors.faint} style={[styles.searchInput, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]} />
      </View>
      {loading ? <SkeletonList rows={8} /> : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={filtered.length ? styles.list : styles.emptyList}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); void load(true); }} />}
          ListEmptyComponent={<View style={styles.empty}><View style={[styles.emptyMark, { borderColor: colors.border }]} /><Text style={[styles.emptyTitle, { color: colors.text }]}>{error ? 'Could not load messages' : query ? 'No matching conversations' : 'No conversations yet'}</Text><Text style={[styles.emptyCopy, { color: error ? colors.danger : colors.muted }]}>{error || 'Start a direct message or create a group to begin.'}</Text></View>}
          renderItem={({ item }) => {
            const isGroup = item.kind === 'group';
            const name = isGroup ? item.title ?? item.group?.name ?? 'Group' : otherMember(item, user)?.displayName ?? 'Conversation';
            const typing = typingMap.has(item.id);
            const forceUnread = meta.unread[item.id] === true;
            const unread = item.unreadCount || forceUnread;
            const last = item.lastMessage;
            let sub = '';
            if (typing) sub = t('typing');
            else if (last) {
              const preview = previewText(last);
              if (isGroup) {
                const sender = last.senderId === user.id ? 'You' : item.members.find((member) => member.id === last.senderId)?.displayName ?? '';
                sub = sender ? `${sender}: ${preview}` : preview;
              } else {
                sub = last.senderId === user.id ? `You: ${preview}` : preview;
              }
            }
            return (
              <Pressable onPress={() => open(item)} style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.elevated : colors.surface, borderBottomColor: colors.border }]}>
                {isGroup ? <View style={[styles.groupAvatar, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="account-group-outline" size={20} color={colors.accent} /></View> : <Avatar name={name} online={otherMember(item, user)?.isOnline ?? false} />}
                <View style={styles.rowCopy}><View style={styles.nameRow}><Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>{name}</Text>{meta.muted[item.id] ? <MaterialCommunityIcons name="bell-off-outline" size={13} color={colors.muted} /> : null}</View><Text numberOfLines={1} style={[styles.handle, { color: typing ? colors.accent : colors.muted }]}>{sub}</Text></View>
                <View style={styles.meta}><Text style={[styles.date, { color: colors.faint }]}>{formatConversationDate(item.updatedAt)}</Text>{unread ? <View style={[styles.badge, { backgroundColor: colors.accent }]}><Text style={[styles.badgeText, { color: colors.accentText }]}>{item.unreadCount > 99 ? '99+' : item.unreadCount || ''}</Text></View> : <MaterialCommunityIcons name="chevron-right" size={20} color={colors.faint} />}</View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 }, newBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  search: { height: 43, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderRadius: 7, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 9 }, searchInput: { flex: 1, fontSize: 15 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, list: { paddingHorizontal: 8, paddingBottom: 16 }, emptyList: { flexGrow: 1 },
  row: { minHeight: 76, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, rowCopy: { flex: 1, minWidth: 0, gap: 4 }, nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, name: { fontSize: 15, fontWeight: '800' }, handle: { fontSize: 12 },
  groupAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  meta: { height: 47, alignItems: 'flex-end', justifyContent: 'space-between' }, date: { fontSize: 10 }, badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }, badgeText: { fontSize: 10, fontWeight: '900' },
  empty: { flex: 1, minHeight: 330, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }, emptyMark: { width: 42, height: 32, borderWidth: 1, borderRadius: 7, borderBottomLeftRadius: 2, marginBottom: 18 }, emptyTitle: { fontSize: 16, fontWeight: '800' }, emptyCopy: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 7 },
});
