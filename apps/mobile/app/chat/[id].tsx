import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useSocket } from '@/socket';
import { useTheme } from '@/theme';
import type { Message, SocketEvent, User } from '@/types';
import { Avatar, SkeletonChat } from '@/ui';
import { useI18n } from '@/i18n';

function time(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string; username?: string; groupId?: string; groupName?: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const { connected, subscribe } = useSocket();
  const router = useRouter();
  const listRef = useRef<FlatList<Message>>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<Map<string, User>>(new Map());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searching, setSearching] = useState(false);

  const isGroup = params.groupId != null;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [page, memberRows] = await Promise.all([
        api.messages(params.id),
        isGroup && params.groupId ? api.group(params.groupId) : Promise.resolve(null),
      ]);
      setMessages(page.items);
      if (memberRows) setMembers(new Map(memberRows.members.map((member) => [member.user.id, member.user])));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load messages'); }
    finally { setLoading(false); }
  }, [params.id, params.groupId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => subscribe((event: SocketEvent) => {
    if (!('message' in event) || event.message.conversationId !== params.id) return;
    setMessages((current) => {
      if (event.type === 'message.deleted') return current.map((item) => item.id === event.message.id ? event.message : item);
      const index = current.findIndex((item) => item.id === event.message.id);
      if (index < 0) return [...current, event.message];
      return current.map((item) => item.id === event.message.id ? event.message : item);
    });
  }), [params.id, subscribe]);

  const send = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setDraft(''); setSending(true); setError('');
    try {
      const message = await api.sendMessage(params.id, content);
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
    } catch (reason) {
      setDraft(content);
      setError(reason instanceof Error ? reason.message : 'Message could not be sent');
    } finally { setSending(false); }
  };

  useEffect(() => {
    if (!searchOpen || searchQuery.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const timer = setTimeout(() => {
      api.searchMessages(searchQuery.trim(), params.id)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchOpen, params.id]);

  const jumpTo = (message: Message) => {
    setMessages([...messages, message]);
    setSearchOpen(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  if (!user) return <Redirect href="/login" />;
  const name = isGroup ? params.groupName ?? params.name ?? 'Group' : params.name ?? 'Conversation';
  const memberName = (senderId: string) => members.get(senderId)?.displayName ?? (senderId === user.id ? 'You' : '');
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
          <Pressable disabled={!isGroup} onPress={() => params.groupId ? router.push({ pathname: '/groups/[id]', params: { id: params.groupId } }) : undefined} style={[styles.titleBtn]}>
            {isGroup ? <View style={[styles.groupAvatar, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="account-group-outline" size={18} color={colors.accent} /></View> : <Avatar name={name} size={39} online={connected} />}
            <View style={styles.identity}><Text numberOfLines={1} style={[styles.headerName, { color: colors.text }]}>{name}</Text><Text style={[styles.presence, { color: isGroup ? colors.muted : connected ? colors.success : colors.muted }]}>{isGroup ? `Tap for group details · ${members.size} members` : connected ? 'Connected' : 'Reconnecting...'}</Text></View>
          </Pressable>
          <Pressable accessibilityLabel="Search messages" hitSlop={10} onPress={() => setSearchOpen((value) => !value)} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name={searchOpen ? 'close' : 'magnify'} size={23} color={colors.text} /></Pressable>
        </View>
        {searchOpen ? (
          <View style={[styles.searchOverlay, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="magnify" size={18} color={colors.muted} />
              <TextInput autoFocus value={searchQuery} onChangeText={setSearchQuery} placeholder={`${t('search')}…`} placeholderTextColor={colors.faint} style={[styles.searchInput, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]} />
              {searchQuery ? <Pressable hitSlop={8} onPress={() => setSearchQuery('')}><MaterialCommunityIcons name="close-circle" size={18} color={colors.faint} /></Pressable> : null}
            </View>
            <FlatList
              style={{ flex: 1 }} contentContainerStyle={styles.searchList} keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={[styles.searchHint, { color: colors.muted }]}>{searching ? 'Searching…' : searchQuery.trim().length < 2 ? 'Type at least two characters to search.' : 'No messages found.'}</Text>}
              data={searchResults} keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable onPress={() => jumpTo(item)} style={({ pressed }) => [styles.searchResult, { backgroundColor: pressed ? colors.elevated : colors.surface }]}>
                  <MaterialCommunityIcons name="message-outline" size={17} color={colors.accent} />
                  <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={2} style={[styles.searchResultText, { color: colors.text }]}>{item.deletedAt ? 'Message removed' : item.content}</Text><Text style={[styles.searchResultMeta, { color: colors.faint }]}>{memberName(item.senderId) || name} · {time(item.createdAt)}</Text></View>
                  <MaterialCommunityIcons name="arrow-down" size={16} color={colors.faint} />
                </Pressable>
              )}
            />
          </View>
        ) : null}
        {loading ? <SkeletonChat /> : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={messages.length ? styles.messages : styles.emptyList}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={<View style={styles.empty}><Text style={[styles.emptyTitle, { color: colors.text }]}>Start the conversation</Text><Text style={[styles.emptyCopy, { color: error ? colors.danger : colors.muted }]}>{error || 'Send a message to begin.'}</Text></View>}
            renderItem={({ item, index }) => {
              const mine = item.senderId === user.id;
              const previous = messages[index - 1];
              const grouped = previous?.senderId === item.senderId;
              return (
                <View style={[styles.messageRow, mine && styles.mine, grouped && styles.grouped]}>
                  {!mine && !grouped ? <Avatar name={memberName(item.senderId) || name} size={30} /> : !mine ? <View style={{ width: 30 }} /> : null}
                  <View style={[styles.bubbleWrap, mine && styles.bubbleMine]}>
                    {!mine && isGroup && !grouped ? <Text style={[styles.sender, { color: colors.accent }]}>{memberName(item.senderId) || 'Unknown'}</Text> : null}
                     <View style={[styles.bubble, { backgroundColor: mine ? colors.accent : colors.surface, borderColor: mine ? colors.accent : colors.border }]}><Text style={[styles.messageText, { color: item.deletedAt ? colors.faint : mine ? colors.accentText : colors.text, fontStyle: item.deletedAt ? 'italic' : 'normal', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{item.deletedAt ? 'Message removed' : item.content}</Text></View>
                    <Text style={[styles.time, { color: colors.faint }]}>{time(item.createdAt)}{item.editedAt ? '  edited' : ''}</Text>
                  </View>
                </View>
              );
            }}
          />
        )}
        {error && messages.length ? <Text style={[styles.inlineError, { color: colors.danger }]}>{error}</Text> : null}
        <View style={[styles.composerOuter, { backgroundColor: colors.background }]}>
          <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput value={draft} onChangeText={setDraft} placeholder="Write a message" placeholderTextColor={colors.faint} multiline maxLength={10000} style={[styles.input, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} />
            <Pressable accessibilityLabel="Send message" disabled={!draft.trim() || sending} onPress={() => void send()} style={({ pressed }) => [styles.send, { backgroundColor: colors.accent, opacity: !draft.trim() || sending ? 0.45 : pressed ? 0.75 : 1 }]}>{sending ? <ActivityIndicator size="small" color={colors.accentText} /> : <MaterialCommunityIcons name="send" size={19} color={colors.accentText} />}</Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { height: 67, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }, iconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' }, titleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }, identity: { flex: 1, minWidth: 0 }, headerName: { fontSize: 15, fontWeight: '800' }, presence: { fontSize: 11, marginTop: 2 }, groupAvatar: { width: 39, height: 39, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, messages: { padding: 16, paddingBottom: 10 }, emptyList: { flexGrow: 1 }, empty: { flex: 1, minHeight: 330, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { fontSize: 17, fontWeight: '800' }, emptyCopy: { marginTop: 7, fontSize: 13 },
  messageRow: { maxWidth: '88%', flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 14 }, mine: { alignSelf: 'flex-end', flexDirection: 'row-reverse' }, grouped: { marginTop: -9 }, bubbleWrap: { alignItems: 'flex-start', minWidth: 45, maxWidth: '100%' }, bubbleMine: { alignItems: 'flex-end' }, sender: { fontSize: 11, fontWeight: '700', marginBottom: 3, paddingHorizontal: 2 }, bubble: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 7, borderBottomLeftRadius: 2, paddingHorizontal: 12, paddingVertical: 9 }, messageText: { fontSize: 15, lineHeight: 21 }, time: { fontSize: 9, marginTop: 4, paddingHorizontal: 2 },
  inlineError: { textAlign: 'center', fontSize: 12, paddingHorizontal: 16, paddingTop: 6 }, composerOuter: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10 }, composer: { minHeight: 53, maxHeight: 132, borderWidth: 1, borderRadius: 7, paddingLeft: 13, paddingRight: 6, paddingVertical: 5, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }, input: { flex: 1, minHeight: 41, maxHeight: 116, paddingTop: 10, paddingBottom: 8, fontSize: 16, lineHeight: 21 }, send: { width: 41, height: 41, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  searchOverlay: { maxHeight: 320, borderBottomWidth: StyleSheet.hairlineWidth }, searchBar: { height: 42, marginHorizontal: 12, marginVertical: 10, borderWidth: 1, borderRadius: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, gap: 8 }, searchInput: { flex: 1, fontSize: 15 }, searchList: { paddingHorizontal: 10, paddingBottom: 12 }, searchHint: { textAlign: 'center', fontSize: 13, paddingVertical: 26 }, searchResult: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 7, paddingHorizontal: 11, paddingVertical: 9, marginBottom: 6 }, searchResultText: { fontSize: 14, lineHeight: 19 }, searchResultMeta: { fontSize: 11, marginTop: 3 },
});
