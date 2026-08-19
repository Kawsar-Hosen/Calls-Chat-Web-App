import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useSocket } from '@/socket';
import { useTheme, useFont } from '@/theme';
import type { Conversation, Message, SocketEvent, User } from '@/types';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { Avatar, SkeletonList } from '@/ui';
import { useI18n } from '@/i18n';
import { formatConversationDate } from '@/time';
import { useChatMeta } from '@/chat-meta';
import { isEmojiOnly } from '@/emoji';

type InboxFilter = 'all' | 'unread' | 'groups';

const MINI_PALETTE = ['#E9F0FF', '#FFE9E9', '#E9FFF4', '#FFF4E9', '#F0E9FF', '#E9FFF8'] as const;

function otherMember(conversation: Conversation, currentUser: User) {
  return conversation.members.find((member) => member.id !== currentUser.id) ?? conversation.members[0];
}

function initialsOf(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function miniColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return MINI_PALETTE[hash % MINI_PALETTE.length] ?? '#E9F0FF';
}

function previewMeta(message: Message): { icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string } {
  if (message.deletedAt) return { icon: 'trash-can-outline', label: 'Message removed' };
  if (message.attachments.length) {
    const media = message.attachments.find((a) => a.mimeType.startsWith('image/') || a.mimeType.startsWith('video/'));
    if (media) return { icon: media.mimeType.startsWith('video/') ? 'video-outline' : 'image-outline', label: media.mimeType.startsWith('video/') ? 'Video' : 'Photo' };
    if (message.attachments.some((a) => (a.name ?? '').startsWith('GIPHY:'))) return { icon: 'sticker-emoji', label: 'GIF' };
    if (message.attachments.some((a) => a.mimeType.startsWith('audio/'))) return { icon: 'microphone-outline', label: 'Voice message' };
  }
  if (message.content && isEmojiOnly(message.content)) return { label: message.content };
  return { label: message.content || 'Attachment' };
}

export default function ConversationsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { fontFamily } = useFont();
  const { t, isRTL } = useI18n();
  const { subscribe } = useSocket();
  const router = useRouter();
  const [items, setItems] = useState<Conversation[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [typingMap, setTypingMap] = useState<Map<string, boolean>>(new Map());
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const loadedRef = useRef(false);
  const meta = useChatMeta();

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try { setItems(await api.conversations()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load conversations'); }
    finally { loadedRef.current = true; setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { void load(loadedRef.current); }, [load]));
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

  const counts = useMemo(() => {
    let unread = 0; let groups = 0;
    for (const item of items) {
      if (item.kind === 'group') groups += 1;
      const force = meta.unread[item.id] === true;
      if (item.unreadCount > 0 || force) unread += 1;
    }
    return { all: items.length, unread, groups };
  }, [items, meta.unread]);

  const filtered = useMemo(() => items.filter((item) => {
    if (!user) return false;
    if (filter === 'groups' && item.kind !== 'group') return false;
    if (filter === 'unread' && !typingMap.has(item.id)) {
      const force = meta.unread[item.id] === true;
      if (item.unreadCount === 0 && !force) return false;
    }
    if (query.trim()) {
      const name = item.kind === 'group' ? item.title ?? item.group?.name ?? 'Group' : (meta.prefs[item.id]?.nickname || otherMember(item, user)?.displayName) ?? '';
      if (!name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    }
    return true;
  }), [items, query, filter, user, meta.unread, typingMap]);

  if (!user) return null;

  const open = (conversation: Conversation) => {
    const peer = conversation.kind === 'group' ? null : otherMember(conversation, user);
    const name = conversation.kind === 'group' ? conversation.title ?? conversation.group?.name ?? 'Group' : (meta.prefs[conversation.id]?.nickname || peer?.displayName) ?? 'Conversation';
    const username = conversation.kind === 'group' ? '' : peer?.username ?? '';
    const params = { id: conversation.id, name, username, peerId: peer?.id ?? '', avatarUrl: peer?.avatarUrl ?? '', ...(conversation.group ? { groupId: conversation.group.id, groupName: name } : {}) };
    router.push({ pathname: '/chat/[id]', params });
  };

  const pills: { key: InboxFilter; label: string; count: number }[] = [
    { key: 'all', label: t('filterAll'), count: counts.all },
    { key: 'unread', label: t('filterUnread'), count: counts.unread },
    { key: 'groups', label: t('filterGroups'), count: counts.groups },
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.accent, textAlign: isRTL ? 'right' : 'left' }]}>{t('messages').toUpperCase()}</Text>
          <Text style={[styles.headerTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{t('inbox')}</Text>
        </View>
        <View style={[styles.headerRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Pressable accessibilityLabel="New group" hitSlop={8} onPress={() => router.push('/groups/create')} style={({ pressed }) => [styles.newBtn, { backgroundColor: colors.accentSoft, opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="account-multiple-plus-outline" size={21} color={colors.accent} /></Pressable>
          <Pressable accessibilityLabel="Add friend" hitSlop={8} onPress={() => router.push('/contacts/search')} style={({ pressed }) => [styles.newBtn, { backgroundColor: colors.accentSoft, opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="account-plus-outline" size={21} color={colors.accent} /></Pressable>
        </View>
      </View>

      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MaterialCommunityIcons name="magnify" size={19} color={colors.muted} />
        <TextInput value={query} onChangeText={setQuery} placeholder={`${t('search')}…`} placeholderTextColor={colors.faint} style={[styles.searchInput, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]} />
        {query ? <Pressable accessibilityLabel="Clear search" hitSlop={8} onPress={() => setQuery('')} style={[styles.clearSearch, { backgroundColor: colors.elevated }]}><MaterialCommunityIcons name="close" size={13} color={colors.muted} /></Pressable> : null}
      </View>

      <View style={[styles.pills, { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {pills.map((pill) => {
          const active = filter === pill.key;
          return (
            <Pressable key={pill.key} onPress={() => setFilter(pill.key)} style={({ pressed }) => [styles.pill, { backgroundColor: active ? colors.accent : 'transparent', opacity: pressed ? 0.75 : 1 }]}>
              <Text style={[styles.pillText, { color: active ? colors.accentText : colors.muted }]}>{pill.label}</Text>
              {pill.count > 0 ? <View style={[styles.pillCount, { backgroundColor: active ? colors.accentText : colors.elevated }]}><Text style={[styles.pillCountText, { color: active ? colors.accent : colors.muted }]}>{pill.count > 99 ? '99+' : pill.count}</Text></View> : null}
            </Pressable>
          );
        })}
      </View>

      {loading ? <SkeletonList rows={8} /> : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={filtered.length ? styles.list : styles.emptyList}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); void load(true); }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name={error ? 'cloud-alert-outline' : query || filter !== 'all' ? 'text-search' : 'message-outline'} size={30} color={colors.accent} /></View>
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{error ? t('couldNotLoadMessages') : query || filter !== 'all' ? t('emptyInboxSearch') : t('emptyInboxTitle')}</Text>
              <Text style={[styles.emptyCopy, { color: error ? colors.danger : colors.muted }]}>{error || t('emptyInboxCopy')}</Text>
              {!error ? <Pressable onPress={() => router.push('/contacts/search')} style={({ pressed }) => [styles.emptyCta, { backgroundColor: colors.accent, opacity: pressed ? 0.82 : 1 }]}><MaterialCommunityIcons name="message-plus-outline" size={17} color="#FFFFFF" /><Text style={styles.emptyCtaText}>{t('startChatting')}</Text></Pressable> : null}
            </View>
          }
          renderItem={({ item }) => {
            const isGroup = item.kind === 'group';
            const name = isGroup ? item.title ?? item.group?.name ?? 'Group' : (meta.prefs[item.id]?.nickname || otherMember(item, user)?.displayName) ?? 'Conversation';
            const typing = typingMap.has(item.id);
            const forceUnread = meta.unread[item.id] === true;
            const unread = item.unreadCount > 0 || forceUnread;
            const last = item.lastMessage;
            const mine = !!last && last.senderId === user.id;
            const preview = last ? previewMeta(last) : null;
            const senderName = last && isGroup && !mine ? item.members.find((member) => member.id === last.senderId)?.displayName ?? '' : '';

            return (
              <Pressable onPress={() => open(item)} style={({ pressed }) => [styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: unread ? colors.accent + '0D' : colors.surface, borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
                {isGroup ? <GroupAvatar members={item.members} currentUserId={user.id} /> : <View style={styles.avatarWrap}><Avatar name={name} uri={otherMember(item, user)?.avatarUrl ?? null} size={54} online={otherMember(item, user)?.isOnline ?? false} /></View>}
                <View style={styles.rowCopy}>
                  <View style={[styles.nameRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text numberOfLines={1} style={[styles.name, unread && styles.nameUnread, { color: colors.text, textAlign: isRTL ? 'right' : 'left', fontFamily }]}>{name}</Text>
                    {!isGroup && otherMember(item, user)?.isVerified ? <VerifiedBadge category={otherMember(item, user)?.verifiedCategory ?? null} username={otherMember(item, user)?.username ?? ''} displayName={name} verifiedAt={otherMember(item, user)?.verifiedAt ?? null} /> : null}
                    {meta.muted[item.id] ? <MaterialCommunityIcons name="bell-off-outline" size={13} color={colors.faint} /> : null}
                    {isGroup && item.group?.memberCount ? <Text style={[styles.memberCount, { color: colors.faint }]}>{item.group.memberCount} <MaterialCommunityIcons name="account-group-outline" size={11} color={colors.faint} /></Text> : null}
                  </View>
                  <View style={[styles.previewRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {typing ? (
                      <TypingDots color={colors.accent} label={t('typing')} />
                    ) : preview ? (
                      <>
                        {mine ? <MaterialCommunityIcons name={last!.readByCount > 0 ? 'check-all' : 'check'} size={15} color={last!.readByCount > 0 ? colors.accent : colors.faint} /> : null}
                        {mine && isGroup ? <Text style={[styles.previewLabel, { color: colors.accent }]} numberOfLines={1}>{t('you')}</Text> : null}
                        {senderName ? <Text style={[styles.previewLabel, { color: colors.accent }]} numberOfLines={1}>{senderName}</Text> : null}
                        {preview.icon ? <MaterialCommunityIcons name={preview.icon} size={15} color={mine || senderName ? colors.accent : colors.muted} /> : null}
                        <Text numberOfLines={1} style={[styles.preview, { color: unread ? colors.text : colors.muted }]}>{preview.label}</Text>
                      </>
                    ) : <Text style={[styles.preview, { color: colors.faint }]}>…</Text>}
                  </View>
                </View>
                <View style={styles.meta}>
                  <Text style={[styles.date, { color: colors.faint }]}>{formatConversationDate(item.updatedAt)}</Text>
                  {unread ? (
                    <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                      <Text style={[styles.badgeText, { color: colors.accentText }]}>{item.unreadCount > 99 ? '99+' : item.unreadCount || '•'}</Text>
                    </View>
                  ) : (
                    <View style={[styles.dot, { backgroundColor: colors.elevated }]}><MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={15} color={colors.faint} /></View>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function GroupAvatar({ members, currentUserId }: { members: User[]; currentUserId: string }) {
  const { colors } = useTheme();
  const others = members.filter((member) => member.id !== currentUserId).slice(0, 3);
  return (
    <View style={[styles.groupAvatar, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
      {others.length === 0 ? <MaterialCommunityIcons name="account-group-outline" size={26} color={colors.accent} /> : (
        <View style={styles.groupStack}>
          {others.map((member, index) => (
            <View key={member.id} style={[styles.groupMini, { marginLeft: index === 0 ? 0 : -14, borderColor: colors.surface, zIndex: others.length - index }]}>
              {member.avatarUrl ? <Image source={{ uri: member.avatarUrl }} style={styles.groupMiniImg} /> : <Text style={[styles.groupMiniText, { color: '#3A3A4D' }]}>{initialsOf(member.displayName)}</Text>}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function TypingDots({ color, label }: { color: string; label: string }) {
  const dots = useRef([new Animated.Value(0.3), new Animated.Value(0.3), new Animated.Value(0.3)]).current;
  useEffect(() => {
    const loops = dots.map((dot, index) => Animated.loop(Animated.sequence([
      Animated.delay(index * 180),
      Animated.timing(dot, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(dot, { toValue: 0.3, duration: 420, useNativeDriver: true }),
    ])));
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [dots]);
  return (
    <View style={styles.typingDots}>
      {dots.map((dot, index) => (
        <Animated.View key={index} style={[styles.typingDot, { backgroundColor: color, opacity: dot }]} />
      ))}
      <Text style={[styles.typingLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  headerTitle: { fontSize: 24, fontWeight: '900', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  newBtn: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  search: { height: 46, marginHorizontal: 20, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9, marginTop: 4 },
  searchInput: { flex: 1, fontSize: 15 },
  clearSearch: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pills: { flexDirection: 'row', marginHorizontal: 20, marginTop: 12, marginBottom: 6, borderRadius: 14, borderWidth: 1, padding: 4, gap: 4 },
  pill: { flex: 1, minHeight: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', gap: 6, flexDirection: 'row' },
  pillText: { fontSize: 12, fontWeight: '800' },
  pillCount: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  pillCountText: { fontSize: 10, fontWeight: '900' },
  list: { paddingTop: 6, paddingBottom: 20 },
  emptyList: { flexGrow: 1 },
  row: { minHeight: 80, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatarWrap: { width: 56, alignItems: 'center' },
  groupAvatar: { width: 54, height: 54, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  groupStack: { flexDirection: 'row', alignItems: 'center' },
  groupMini: { width: 27, height: 27, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', overflow: 'hidden' },
  groupMiniImg: { width: '100%', height: '100%' },
  groupMiniText: { fontSize: 10, fontWeight: '800' },
  rowCopy: { flex: 1, minWidth: 0, gap: 5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { fontSize: 15, flexShrink: 1 },
  nameUnread: { fontWeight: '900' },
  memberCount: { fontSize: 11, fontWeight: '700' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 20 },
  previewLabel: { fontSize: 13, fontWeight: '800', maxWidth: '45%', flexShrink: 1 },
  preview: { fontSize: 13, flexShrink: 1 },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  typingDot: { width: 6, height: 6, borderRadius: 3 },
  typingLabel: { fontSize: 13, fontWeight: '800', marginLeft: 4 },
  meta: { height: 50, alignItems: 'flex-end', justifyContent: 'space-between' },
  date: { fontSize: 11, fontWeight: '600' },
  badge: { minWidth: 21, height: 21, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { fontSize: 11, fontWeight: '900' },
  dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, minHeight: 360, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIconWrap: { width: 92, height: 92, borderRadius: 46, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '900', textAlign: 'center' },
  emptyCopy: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  emptyCta: { minHeight: 46, borderRadius: 14, paddingHorizontal: 22, marginTop: 22, alignItems: 'center', justifyContent: 'center', gap: 8, flexDirection: 'row' },
  emptyCtaText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
