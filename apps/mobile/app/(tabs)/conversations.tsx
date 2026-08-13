import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useSocket } from '@/socket';
import { useTheme } from '@/theme';
import type { Conversation, SocketEvent, User } from '@/types';
import { Avatar, ScreenHeader, SkeletonList } from '@/ui';
import { useI18n } from '@/i18n';

function otherMember(conversation: Conversation, currentUser: User) {
  return conversation.members.find((member) => member.id !== currentUser.id) ?? conversation.members[0];
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '';
  const now = new Date();
  return date.toDateString() === now.toDateString()
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ConversationsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const { connected, subscribe } = useSocket();
  const router = useRouter();
  const [items, setItems] = useState<Conversation[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try { setItems(await api.conversations()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load conversations'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { void load(items.length > 0); }, [load]));
  useEffect(() => subscribe((event: SocketEvent) => {
    if (event.type === 'message.created' || event.type === 'message.deleted' || event.type === 'presence.updated' || event.type === 'group.updated' || event.type === 'group.deleted' || event.type === 'group.member.added' || event.type === 'group.member.removed') void load(true);
  }), [load, subscribe]);

  const filtered = useMemo(() => items.filter((item) => {
    if (!user) return false;
    const name = item.kind === 'group' ? item.title ?? item.group?.name ?? 'Group' : otherMember(item, user)?.displayName ?? '';
    return name.toLowerCase().includes(query.trim().toLowerCase());
  }), [items, query, user]);

  if (!user) return null;

  const open = (conversation: Conversation) => {
    const name = conversation.kind === 'group' ? conversation.title ?? conversation.group?.name ?? 'Group' : otherMember(conversation, user)?.displayName ?? 'Conversation';
    const username = conversation.kind === 'group' ? '' : otherMember(conversation, user)?.username ?? '';
    const params: Record<string, string> = { id: conversation.id, name, username };
    if (conversation.group) params.groupId = conversation.group.id;
    router.push({ pathname: '/chat/[id]', params });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={t('messages')} eyebrow="YOUR INBOX" right={<View style={[styles.headerRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable accessibilityLabel="New group" hitSlop={8} onPress={() => router.push('/groups/create')} style={({ pressed }) => [styles.newBtn, { opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="account-multiple-plus-outline" size={23} color={colors.accent} /></Pressable>
        <Pressable accessibilityLabel="Add friend" hitSlop={8} onPress={() => router.push('/contacts/search')} style={({ pressed }) => [styles.newBtn, { opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="account-plus-outline" size={23} color={colors.accent} /></Pressable>
        <View style={[styles.live, { backgroundColor: connected ? colors.accentSoft : colors.elevated }]}><View style={[styles.liveDot, { backgroundColor: connected ? colors.success : colors.faint }]} /><Text style={{ color: connected ? colors.text : colors.muted, fontSize: 11, fontWeight: '700' }}>{connected ? 'Live' : 'Offline'}</Text></View>
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
            const sub = isGroup ? `${item.group?.memberCount ?? item.members.length} members` : otherMember(item, user)?.isOnline ? 'Online now' : `@${otherMember(item, user)?.username ?? ''}`;
            return (
              <Pressable onPress={() => open(item)} style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.elevated : colors.surface, borderBottomColor: colors.border }]}>
                {isGroup ? <View style={[styles.groupAvatar, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="account-group-outline" size={20} color={colors.accent} /></View> : <Avatar name={name} online={otherMember(item, user)?.isOnline ?? false} />}
                <View style={styles.rowCopy}><Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>{name}</Text><Text numberOfLines={1} style={[styles.handle, { color: isGroup ? colors.muted : otherMember(item, user)?.isOnline ? colors.success : colors.muted }]}>{sub}</Text></View>
                <View style={styles.meta}><Text style={[styles.date, { color: colors.faint }]}>{formatDate(item.updatedAt)}</Text>{item.unreadCount ? <View style={[styles.badge, { backgroundColor: colors.accent }]}><Text style={[styles.badgeText, { color: colors.accentText }]}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text></View> : <MaterialCommunityIcons name="chevron-right" size={20} color={colors.faint} />}</View>
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
  live: { height: 30, paddingHorizontal: 10, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }, liveDot: { width: 7, height: 7, borderRadius: 4 },
  search: { height: 43, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderRadius: 7, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 9 }, searchInput: { flex: 1, fontSize: 15 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, list: { paddingHorizontal: 8, paddingBottom: 16 }, emptyList: { flexGrow: 1 },
  row: { minHeight: 76, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, rowCopy: { flex: 1, minWidth: 0, gap: 4 }, name: { fontSize: 15, fontWeight: '800' }, handle: { fontSize: 12 },
  groupAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  meta: { height: 47, alignItems: 'flex-end', justifyContent: 'space-between' }, date: { fontSize: 10 }, badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }, badgeText: { fontSize: 10, fontWeight: '900' },
  empty: { flex: 1, minHeight: 330, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }, emptyMark: { width: 42, height: 32, borderWidth: 1, borderRadius: 7, borderBottomLeftRadius: 2, marginBottom: 18 }, emptyTitle: { fontSize: 16, fontWeight: '800' }, emptyCopy: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 7 },
});
