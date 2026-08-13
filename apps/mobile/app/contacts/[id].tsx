import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useTheme } from '@/theme';
import type { User, UserSearchResult } from '@/types';
import { Avatar } from '@/ui';

export default function ContactInfoScreen() {
  const { id, name: initialName, username: initialUsername } = useLocalSearchParams<{ id: string; name?: string; username?: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [person, setPerson] = useState<UserSearchResult>({
    id,
    username: initialUsername ?? '',
    displayName: initialName ?? 'Contact',
    bio: null,
    avatarUrl: null,
    isOnline: false,
    lastSeenAt: null,
    isFriend: false,
    requestStatus: null,
    isBlocked: false,
  });
  const [remark, setRemark] = useState('');
  const [remarkDirty, setRemarkDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [info, friendRows] = await Promise.all([
          api.searchUsers(id).catch(() => []),
          api.friends().catch(() => []),
        ]);
        const match = [...info, ...friendRows].find((item) => item.id === id);
        if (match) {
        const search = info.find((item) => item.id === id);
        setPerson({
          ...match,
          isFriend: search ? search.isFriend : true,
          requestStatus: search ? search.requestStatus : null,
          isBlocked: search?.isBlocked === true,
        });
          setRemark(match.remark ?? '');
        }
      } catch { /* Keep the optimistic person state. */ }
    };
    void load();
  }, [id]);

  const isFriend = person.isFriend === true;

  const openChat = () => {
    router.replace({ pathname: '/chat/[id]', params: { id: person.id, name: person.displayName, username: person.username } });
  };

  const sendRequest = async () => {
    setBusy(true); setError('');
    try { await api.sendFriendRequest(person.id); setPerson((item) => ({ ...item, requestStatus: 'outgoing' })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Request failed'); }
    finally { setBusy(false); }
  };

  const acceptRequest = async () => {
    setBusy(true); setError('');
    try {
      if (!user) return;
      const requests = await api.friendRequests(user.id);
      const pending = requests.find((item) => item.user.id === person.id);
      if (pending) { await api.respondFriendRequest(pending.id, true); setPerson((item) => ({ ...item, isFriend: true, requestStatus: null })); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not accept'); }
    finally { setBusy(false); }
  };

  const removeFriend = () => {
    Alert.alert('Remove friend', `Remove ${person.displayName} from your friends?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void doRemoveFriend() },
    ]);
  };

  const doRemoveFriend = async () => {
    setBusy(true); setError('');
    try { await api.removeFriend(person.id); setPerson((item) => ({ ...item, isFriend: false })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not remove friend'); }
    finally { setBusy(false); }
  };

  const toggleBlock = async () => {
    setBusy(true); setError('');
    try {
      if (person.isBlocked === true) { await api.unblockUser(person.id); setPerson((item) => ({ ...item, isBlocked: false })); }
      else { await api.blockUser(person.id); setPerson((item) => ({ ...item, isBlocked: true, isFriend: false, requestStatus: null })); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Action failed'); }
    finally { setBusy(false); }
  };

  const saveRemark = async () => {
    setBusy(true); setError('');
    try { await api.setFriendRemark(person.id, remark.trim()); setRemarkDirty(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save remark'); }
    finally { setBusy(false); }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Contact Info</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.identity, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Avatar name={person.displayName} size={64} online={person.isOnline} />
          <Text style={[styles.identityName, { color: colors.text }]}>{person.remark || person.displayName}</Text>
          <Text style={[styles.identityHandle, { color: colors.muted }]}>@{person.username}</Text>
          {person.bio ? <Text style={[styles.identityBio, { color: colors.muted }]}>{person.bio}</Text> : null}
          <View style={[styles.statusPill, { backgroundColor: person.isBlocked ? colors.danger : colors.accentSoft, alignSelf: 'flex-start' }]}><Text style={{ color: person.isBlocked ? '#FFFFFF' : colors.accent, fontSize: 11, fontWeight: '800' }}>{person.isBlocked ? 'Blocked' : isFriend ? 'Friend' : person.requestStatus ? person.requestStatus === 'outgoing' ? 'Request sent' : 'Request received' : 'Stranger'}</Text></View>
        </View>

        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

        {!isFriend && person.requestStatus !== 'outgoing' && person.isBlocked !== true ? (
          <Pressable onPress={() => void (person.requestStatus === 'incoming' ? acceptRequest() : sendRequest())} style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.accent, opacity: busy ? 0.5 : pressed ? 0.8 : 1 }]}><MaterialCommunityIcons name="check" size={18} color={colors.accentText} /><Text style={{ color: colors.accentText, fontWeight: '800' }}>{person.requestStatus === 'incoming' ? 'Accept friend request' : 'Add friend'}</Text></Pressable>
        ) : null}
        {person.requestStatus === 'outgoing' ? (
          <View style={[styles.statusRow, { borderColor: colors.border }]}><MaterialCommunityIcons name="clock-outline" size={17} color={colors.muted} /><Text style={{ color: colors.muted, fontWeight: '700' }}>Friend request sent</Text></View>
        ) : null}
        {isFriend ? (
          <Pressable onPress={openChat} style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}><MaterialCommunityIcons name="message-text-outline" size={18} color={colors.accentText} /><Text style={{ color: colors.accentText, fontWeight: '800' }}>Message</Text></Pressable>
        ) : null}
        {isFriend ? (
          <Pressable onPress={() => void sendRequest()} disabled style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.elevated, opacity: 0.5 }]}><MaterialCommunityIcons name="account-plus-outline" size={18} color={colors.muted} /><Text style={{ color: colors.muted, fontWeight: '800' }}>Already friends</Text></Pressable>
        ) : null}

        {isFriend ? (
          <View style={[styles.remarkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>REMARK</Text>
            <TextInput value={remark} onChangeText={(value) => { setRemark(value); setRemarkDirty(true); }} placeholder="Set a remark for this friend" placeholderTextColor={colors.faint} maxLength={80} style={[styles.remarkInput, { color: colors.text }]} />
            {remarkDirty ? <Pressable disabled={busy} onPress={() => void saveRemark()} style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.accent, opacity: busy ? 0.5 : pressed ? 0.8 : 1 }]}><Text style={{ color: colors.accentText, fontWeight: '800', fontSize: 13 }}>{busy ? 'Saving...' : 'Save remark'}</Text></Pressable> : null}
          </View>
        ) : null}

        <Text style={[styles.sectionLabel, { color: colors.muted }]}>ACTIONS</Text>
        {isFriend ? (
          <Pressable onPress={removeFriend} style={({ pressed }) => [styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border, opacity: busy ? 0.5 : pressed ? 0.7 : 1 }]}><MaterialCommunityIcons name="account-remove-outline" size={21} color={colors.danger} /><Text style={{ color: colors.danger, fontWeight: '800' }}>Remove friend</Text></Pressable>
        ) : null}
        <Pressable onPress={() => void toggleBlock()} style={({ pressed }) => [styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border, opacity: busy ? 0.5 : pressed ? 0.7 : 1 }]}><MaterialCommunityIcons name="shield-off-outline" size={21} color={person.isBlocked ? colors.success : colors.danger} /><Text style={{ color: person.isBlocked ? colors.success : colors.danger, fontWeight: '800' }}>{person.isBlocked ? 'Unblock' : 'Block'}</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }, iconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 16, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 32 },
  identity: { borderWidth: 1, borderRadius: 8, padding: 18, alignItems: 'center', gap: 5 }, identityName: { fontSize: 18, fontWeight: '800', marginTop: 6 }, identityHandle: { fontSize: 13 }, identityBio: { fontSize: 12, textAlign: 'center', marginTop: 4 }, statusPill: { borderRadius: 5, paddingHorizontal: 10, paddingVertical: 5, marginTop: 10 },
  error: { fontSize: 13, marginTop: 14 },
  actionBtn: { minHeight: 50, borderRadius: 8, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  statusRow: { minHeight: 50, borderWidth: 1, borderRadius: 8, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  remarkCard: { borderWidth: 1, borderRadius: 8, marginTop: 22, padding: 14 }, sectionLabel: { fontSize: 10, fontWeight: '900', marginTop: 22, marginBottom: 9 }, remarkInput: { minHeight: 44, fontSize: 15 }, saveBtn: { minHeight: 42, borderRadius: 7, marginTop: 6, alignItems: 'center', justifyContent: 'center' },
  settingRow: { minHeight: 56, borderWidth: 1, borderRadius: 8, marginBottom: 9, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
});
