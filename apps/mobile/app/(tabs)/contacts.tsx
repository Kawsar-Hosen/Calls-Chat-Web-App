import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useSocket } from '@/socket';
import { useTheme, useFont } from '@/theme';
import type { FriendRequest, Group, SocketEvent, User } from '@/types';
import { Avatar, ScreenHeader, SkeletonList } from '@/ui';
import { useI18n } from '@/i18n';

export default function ContactsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { fontFamily } = useFont();
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
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('unableLoadContacts')); }
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

  const services = [
    { key: 'search', icon: 'magnify' as const, label: t('searchPeople'), to: '/contacts/search' as const, accent: false },
    { key: 'requests', icon: 'account-plus-outline' as const, label: t('newFriends'), to: '/contacts/requests' as const, accent: true, badge: requests.length },
    { key: 'groups', icon: 'account-group-outline' as const, label: t('myGroups'), to: '/contacts/groups' as const, accent: false, badge: groups.length },
    { key: 'addGroup', icon: 'account-search-outline' as const, label: t('addGroup'), to: '/contacts/add-group' as const, accent: false },
    { key: 'blacklist', icon: 'account-off-outline' as const, label: t('blacklist'), to: '/contacts/blacklist' as const, accent: false },
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={t('contacts')} eyebrow={t('yourNetwork')} right={<Pressable onPress={() => router.push('/contacts/friends')} style={({ pressed }) => [styles.count, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}><Text style={[styles.countText, { color: colors.accent }]}>{friends.length} {t('friendsLabel')}</Text></Pressable>} />
      {loading ? <SkeletonList rows={8} /> : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); void load(true); }} />}
          ListHeaderComponent={<>
            <View style={styles.services}>
              {services.map((service) => (
                <Pressable key={service.key} onPress={() => router.push(service.to)} style={({ pressed }) => [styles.entry, { backgroundColor: pressed ? colors.elevated : colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.entryMark, { backgroundColor: service.accent ? colors.accent : colors.elevated }]}><MaterialCommunityIcons name={service.icon} size={19} color={service.accent ? colors.accentText : colors.text} /></View>
                  <Text style={[styles.entryText, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{service.label}</Text>
                  {(service.badge ?? 0) > 0 ? <View style={[styles.badge, { backgroundColor: colors.accent }]}><Text style={[styles.badgeText, { color: colors.accentText }]}>{service.badge! > 9 ? '9+' : service.badge}</Text></View> : null}
                  <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={21} color={colors.faint} />
                </Pressable>
              ))}
            </View>
            {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>{t('friendsLabel')} · {friends.length}</Text>
          </>}
          renderItem={({ item: friend }) => (
            <Pressable onPress={() => openChat(friend)} style={({ pressed }) => [styles.friendCard, { backgroundColor: pressed ? colors.elevated : colors.surface, borderColor: colors.border }]}>
              <Avatar name={friend.displayName} uri={friend.avatarUrl ?? null} online={friend.isOnline} />
              <View style={styles.rowCopy}><Text numberOfLines={1} style={[styles.friendName, { color: colors.text, textAlign: isRTL ? 'right' : 'left', fontFamily }]}>{friend.remark || friend.displayName}</Text><Text numberOfLines={1} style={[styles.friendHandle, { color: friend.isOnline ? colors.success : colors.muted, textAlign: isRTL ? 'right' : 'left' }]}>{friend.isOnline ? t('online') : `@${friend.username}`}</Text></View>
              <Pressable hitSlop={10} onPress={() => openChat(friend)} style={[styles.chatBtn, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="message-text-outline" size={18} color={colors.accent} /></Pressable>
            </Pressable>
          )}
          ListFooterComponent={groups.length ? <>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>{t('groupsLabel')} · {groups.length}</Text>
            <View style={styles.groupsSection}>{groups.map((group) => <Pressable key={group.id} onPress={() => router.push({ pathname: '/groups/[id]', params: { id: group.id } })} style={({ pressed }) => [styles.friendCard, { backgroundColor: pressed ? colors.elevated : colors.surface, borderColor: colors.border }]}>
              <View style={[styles.groupAvatar, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="account-group-outline" size={20} color={colors.accent} /></View>
              <View style={styles.rowCopy}><Text numberOfLines={1} style={[styles.friendName, { color: colors.text }]}>{group.name}</Text><Text numberOfLines={1} style={[styles.friendHandle, { color: colors.muted }]}>{group.memberCount} {t('members')} · {t('youAre')} {group.myRole}</Text></View>
              <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={colors.faint} />
            </Pressable>)}</View>
          </> : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, count: { height: 30, paddingHorizontal: 11, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, countText: { fontSize: 11, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, list: { paddingHorizontal: 16, paddingBottom: 20 },
  services: { gap: 9 },
  entry: { minHeight: 60, borderWidth: 1, borderRadius: 16, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 13 }, entryMark: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, entryText: { flex: 1, fontSize: 14, fontWeight: '800' },
  badge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }, badgeText: { fontSize: 11, fontWeight: '900' },
  error: { fontSize: 12, marginVertical: 8 },
  sectionLabel: { fontSize: 10, fontWeight: '900', marginTop: 20, marginBottom: 9, letterSpacing: 1, textTransform: 'uppercase' },
  friendCard: { minHeight: 72, borderWidth: 1, borderRadius: 16, paddingHorizontal: 13, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 12 }, rowCopy: { flex: 1, minWidth: 0 }, friendName: { fontSize: 15, fontWeight: '800' }, friendHandle: { fontSize: 12, marginTop: 3 },
  chatBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  groupAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' }, groupsSection: { marginTop: 2 },
});
