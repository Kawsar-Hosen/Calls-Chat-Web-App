import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useSocket } from '@/socket';
import { useTheme } from '@/theme';
import type { FriendRequest, Group, SocketEvent, User } from '@/types';
import { Avatar, ScreenHeader, SkeletonList } from '@/ui';
import { useI18n } from '@/i18n';

export default function ContactsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const { subscribe } = useSocket();
  const router = useRouter();
  const [friends, setFriends] = useState<User[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!user) return;
    if (!quiet) setLoading(true);
    setError('');
    try {
      const [friendRows, requestRows, groupRows] = await Promise.all([api.friends(), api.friendRequests(user.id), api.myGroups()]);
      setFriends(friendRows); setRequests(requestRows); setGroups(groupRows);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load contacts'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { void load(friends.length > 0); }, [load]));
  useFocusEffect(useCallback(() => subscribe((event: SocketEvent) => {
    if (event.type === 'group.updated' || event.type === 'group.deleted' || event.type === 'group.member.added' || event.type === 'group.member.removed') void load(true);
  }), [load, subscribe]));

  if (!user) return null;

  const openChat = (person: User) => {
    router.push({ pathname: '/contacts/[id]', params: { id: person.id, name: person.displayName, username: person.username } });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={t('contacts')} eyebrow="YOUR NETWORK" right={<View style={[styles.count, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.countText, { color: colors.muted }]}>{friends.length} friends</Text></View>} />
      {loading ? <SkeletonList rows={8} /> : (
        <FlatList
          data={['__services__', ...friends, '__groups__'] as string[]}
          keyExtractor={(item) => String(item)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); void load(true); }} />}
          ListHeaderComponent={<>
            <Pressable onPress={() => router.push('/contacts/search')} style={({ pressed }) => [styles.entry, { backgroundColor: pressed ? colors.elevated : colors.surface, borderColor: colors.border }]}><View style={[styles.entryMark, { backgroundColor: colors.elevated }]}><MaterialCommunityIcons name="magnify" size={19} color={colors.text} /></View><Text style={[styles.entryText, { color: colors.text }]}>Search people</Text><MaterialCommunityIcons name="chevron-right" size={20} color={colors.faint} /></Pressable>
            <Pressable onPress={() => router.push('/contacts/requests')} style={({ pressed }) => [styles.entry, { backgroundColor: pressed ? colors.elevated : colors.surface, borderColor: colors.border }]}><View style={[styles.entryMark, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="account-plus-outline" size={19} color={colors.accent} /></View><Text style={[styles.entryText, { color: colors.text }]}>New Friends</Text>{requests.length > 0 ? <View style={[styles.badge, { backgroundColor: colors.accent }]}><Text style={[styles.badgeText, { color: colors.accentText }]}>{requests.length > 9 ? '9+' : requests.length}</Text></View> : null}<MaterialCommunityIcons name="chevron-right" size={20} color={colors.faint} /></Pressable>
            <Pressable onPress={() => router.push('/contacts/groups')} style={({ pressed }) => [styles.entry, { backgroundColor: pressed ? colors.elevated : colors.surface, borderColor: colors.border }]}><View style={[styles.entryMark, { backgroundColor: colors.elevated }]}><MaterialCommunityIcons name="account-group-outline" size={19} color={colors.text} /></View><Text style={[styles.entryText, { color: colors.text }]}>My Groups</Text>{groups.length > 0 ? <View style={[styles.badge, { backgroundColor: colors.accent }]}><Text style={[styles.badgeText, { color: colors.accentText }]}>{groups.length > 9 ? '9+' : groups.length}</Text></View> : null}<MaterialCommunityIcons name="chevron-right" size={20} color={colors.faint} /></Pressable>
            <Pressable onPress={() => router.push('/contacts/add-group')} style={({ pressed }) => [styles.entry, { backgroundColor: pressed ? colors.elevated : colors.surface, borderColor: colors.border }]}><View style={[styles.entryMark, { backgroundColor: colors.elevated }]}><MaterialCommunityIcons name="account-search-outline" size={19} color={colors.text} /></View><Text style={[styles.entryText, { color: colors.text }]}>Add Group</Text><MaterialCommunityIcons name="chevron-right" size={20} color={colors.faint} /></Pressable>
            <Pressable onPress={() => router.push('/contacts/blacklist')} style={({ pressed }) => [styles.entry, { backgroundColor: pressed ? colors.elevated : colors.surface, borderColor: colors.border }]}><View style={[styles.entryMark, { backgroundColor: colors.elevated }]}><MaterialCommunityIcons name="account-off-outline" size={19} color={colors.text} /></View><Text style={[styles.entryText, { color: colors.text }]}>Blacklist</Text><MaterialCommunityIcons name="chevron-right" size={20} color={colors.faint} /></Pressable>
            {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
          </>}
          renderItem={({ item }) => {
            if (item === '__services__') return null;
            if (item === '__groups__') return (
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>GROUPS · {groups.length}</Text>
            );
            const friend = friends.find((f) => f.id === item);
            if (!friend) return null;
            return (
              <Pressable onPress={() => openChat(friend)} style={({ pressed }) => [styles.friendRow, { backgroundColor: pressed ? colors.elevated : colors.surface, borderBottomColor: colors.border }]}>
                <Avatar name={friend.displayName} online={friend.isOnline} />
                 <View style={styles.rowCopy}><Text numberOfLines={1} style={[styles.friendName, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{friend.remark || friend.displayName}</Text><Text numberOfLines={1} style={[styles.friendHandle, { color: friend.isOnline ? colors.success : colors.muted, textAlign: isRTL ? 'right' : 'left' }]}>{friend.isOnline ? t('online') : `@${friend.username}`}</Text></View>
                <Pressable hitSlop={10} onPress={() => openChat(friend)} style={[styles.chatBtn, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="message-text-outline" size={18} color={colors.accent} /></Pressable>
              </Pressable>
            );
          }}
          ListFooterComponent={groups.length ? <View style={styles.groupsSection}>{groups.map((group) => <Pressable key={group.id} onPress={() => router.push({ pathname: '/groups/[id]', params: { id: group.id } })} style={({ pressed }) => [styles.friendRow, { backgroundColor: pressed ? colors.elevated : colors.surface, borderBottomColor: colors.border }]}>
            <View style={[styles.groupAvatar, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="account-group-outline" size={20} color={colors.accent} /></View>
            <View style={styles.rowCopy}><Text numberOfLines={1} style={[styles.friendName, { color: colors.text }]}>{group.name}</Text><Text numberOfLines={1} style={[styles.friendHandle, { color: colors.muted }]}>{group.memberCount} members · you are {group.myRole}</Text></View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.faint} />
          </Pressable>)}</View> : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, count: { height: 30, paddingHorizontal: 11, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, countText: { fontSize: 11, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, list: { paddingHorizontal: 16, paddingBottom: 20 },
  entry: { minHeight: 56, borderWidth: 1, borderRadius: 8, marginBottom: 9, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, entryMark: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, entryText: { flex: 1, fontSize: 14, fontWeight: '700' },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }, badgeText: { fontSize: 10, fontWeight: '900' },
  error: { fontSize: 12, marginVertical: 6 },
  sectionLabel: { fontSize: 10, fontWeight: '900', marginTop: 16, marginBottom: 6 },
  friendRow: { minHeight: 70, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', gap: 12 }, rowCopy: { flex: 1, minWidth: 0 }, friendName: { fontSize: 15, fontWeight: '800' }, friendHandle: { fontSize: 12, marginTop: 3 },
  chatBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  groupAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' }, groupsSection: { marginTop: 4 },
});
