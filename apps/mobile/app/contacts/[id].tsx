import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';
import type { UserSearchResult } from '@/types';
import { Avatar } from '@/ui';

export default function ContactInfoScreen() {
  const { id, name: initialName, username: initialUsername } = useLocalSearchParams<{ id: string; name?: string; username?: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
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
        const info = await api.getUser(id).catch(() => null);
        const friendRows = await api.friends().catch(() => []);
        const match = info ?? friendRows.find((item) => item.id === id);
        if (match) {
          setPerson({ ...match, isFriend: info ? info.isFriend : true, requestStatus: info ? info.requestStatus : null, isBlocked: info ? info.isBlocked : false });
          setRemark(match.remark ?? '');
        }
      } catch { /* Keep the optimistic person state. */ }
    };
    void load();
  }, [id]);

  const isFriend = person.isFriend === true;

  const openChat = async () => {
    setBusy(true); setError('');
    try {
      const conversationId = await api.startDirectChat(person.id);
      router.replace({ pathname: '/chat/[id]', params: { id: conversationId, name: person.displayName, username: person.username } });
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('unableOpenChat')); setBusy(false); }
  };

  const sendRequest = async () => {
    setBusy(true); setError('');
    try { await api.sendFriendRequest(person.id); setPerson((item) => ({ ...item, requestStatus: 'outgoing' })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('requestFailed')); }
    finally { setBusy(false); }
  };

  const acceptRequest = async () => {
    setBusy(true); setError('');
    try {
      if (!user) return;
      const requests = await api.friendRequests(user.id);
      const pending = requests.find((item) => item.user.id === person.id);
      if (pending) { await api.respondFriendRequest(pending.id, true); setPerson((item) => ({ ...item, isFriend: true, requestStatus: null })); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('couldNotAccept')); }
    finally { setBusy(false); }
  };

  const removeFriend = () => {
    Alert.alert(t('removeFriend'), `${t('removeFriend')} ${person.displayName}?`, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('removeFriend'), style: 'destructive', onPress: () => void doRemoveFriend() },
    ]);
  };

  const doRemoveFriend = async () => {
    setBusy(true); setError('');
    try { await api.removeFriend(person.id); setPerson((item) => ({ ...item, isFriend: false })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('couldNotRemove')); }
    finally { setBusy(false); }
  };

  const toggleBlock = async () => {
    setBusy(true); setError('');
    try {
      if (person.isBlocked === true) { await api.unblockUser(person.id); setPerson((item) => ({ ...item, isBlocked: false })); }
      else { await api.blockUser(person.id); setPerson((item) => ({ ...item, isBlocked: true, isFriend: false, requestStatus: null })); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('actionFailed')); }
    finally { setBusy(false); }
  };

  const saveRemark = async () => {
    setBusy(true); setError('');
    try { await api.setFriendRemark(person.id, remark.trim()); setRemarkDirty(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('couldNotSaveRemark')); }
    finally { setBusy(false); }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('contactInfo')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.identity, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Avatar name={person.displayName} size={64} online={person.isOnline} />
          <Text style={[styles.identityName, { color: colors.text }]}>{person.remark || person.displayName}</Text>
          <Text style={[styles.identityHandle, { color: colors.muted }]}>@{person.username}</Text>
          {(person.phoneCode || person.phone) ? <View style={[styles.phoneRow, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="cellphone" size={13} color={colors.accent} /><Text style={{ color: colors.accent, fontSize: 12, fontWeight: '800' }}>{person.phoneCode}{person.phone}</Text></View> : null}
          {person.bio ? <Text style={[styles.identityBio, { color: colors.muted }]}>{person.bio}</Text> : null}
          <View style={[styles.statusPill, { backgroundColor: person.isBlocked ? colors.danger : colors.accentSoft, alignSelf: 'flex-start' }]}><Text style={{ color: person.isBlocked ? '#FFFFFF' : colors.accent, fontSize: 11, fontWeight: '800' }}>{person.isBlocked ? t('blocked') : isFriend ? t('friend') : person.requestStatus ? person.requestStatus === 'outgoing' ? t('requestSent') : t('requestReceived') : t('stranger')}</Text></View>
        </View>

        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

        {!isFriend && person.requestStatus !== 'outgoing' && person.isBlocked !== true ? (
          <Pressable onPress={() => void (person.requestStatus === 'incoming' ? acceptRequest() : sendRequest())} style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.accent, opacity: busy ? 0.5 : pressed ? 0.8 : 1 }]}><MaterialCommunityIcons name="check" size={18} color={colors.accentText} /><Text style={{ color: colors.accentText, fontWeight: '800' }}>{person.requestStatus === 'incoming' ? t('acceptFriendRequest') : t('addFriend')}</Text></Pressable>
        ) : null}
        {person.requestStatus === 'outgoing' ? (
          <View style={[styles.statusRow, { borderColor: colors.border }]}><MaterialCommunityIcons name="clock-outline" size={17} color={colors.muted} /><Text style={{ color: colors.muted, fontWeight: '700' }}>{t('friendRequestSent')}</Text></View>
        ) : null}
        {person.isBlocked !== true ? (
          <Pressable onPress={() => void openChat()} style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.accent, opacity: busy ? 0.5 : pressed ? 0.8 : 1 }]}><MaterialCommunityIcons name="message-text-outline" size={18} color={colors.accentText} /><Text style={{ color: colors.accentText, fontWeight: '800' }}>{busy ? t('openingChat') : t('message')}</Text></Pressable>
        ) : null}

        {isFriend ? (
          <View style={[styles.remarkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>{t('remark')}</Text>
            <TextInput value={remark} onChangeText={(value) => { setRemark(value); setRemarkDirty(true); }} placeholder={t('remarkPlaceholder')} placeholderTextColor={colors.faint} maxLength={80} style={[styles.remarkInput, { color: colors.text }]} />
            {remarkDirty ? <Pressable disabled={busy} onPress={() => void saveRemark()} style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.accent, opacity: busy ? 0.5 : pressed ? 0.8 : 1 }]}><Text style={{ color: colors.accentText, fontWeight: '800', fontSize: 13 }}>{busy ? t('saving') : t('saveRemark')}</Text></Pressable> : null}
          </View>
        ) : null}

        <Text style={[styles.sectionLabel, { color: colors.muted }]}>{t('actions')}</Text>
        {isFriend ? (
          <Pressable onPress={removeFriend} style={({ pressed }) => [styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border, opacity: busy ? 0.5 : pressed ? 0.7 : 1 }]}><MaterialCommunityIcons name="account-remove-outline" size={21} color={colors.danger} /><Text style={{ color: colors.danger, fontWeight: '800' }}>{t('removeFriend')}</Text></Pressable>
        ) : null}
        <Pressable onPress={() => void toggleBlock()} style={({ pressed }) => [styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border, opacity: busy ? 0.5 : pressed ? 0.7 : 1 }]}><MaterialCommunityIcons name="shield-off-outline" size={21} color={person.isBlocked ? colors.success : colors.danger} /><Text style={{ color: person.isBlocked ? colors.success : colors.danger, fontWeight: '800' }}>{person.isBlocked ? t('unblock') : t('block')}</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }, iconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 16, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 32 },
  identity: { borderWidth: 1, borderRadius: 8, padding: 18, alignItems: 'center', gap: 5 }, identityName: { fontSize: 18, fontWeight: '800', marginTop: 6 }, identityHandle: { fontSize: 13 }, phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 5, paddingHorizontal: 10, paddingVertical: 5, marginTop: 4 }, identityBio: { fontSize: 12, textAlign: 'center', marginTop: 4 }, statusPill: { borderRadius: 5, paddingHorizontal: 10, paddingVertical: 5, marginTop: 10 },
  error: { fontSize: 13, marginTop: 14 },
  actionBtn: { minHeight: 50, borderRadius: 8, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  statusRow: { minHeight: 50, borderWidth: 1, borderRadius: 8, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  remarkCard: { borderWidth: 1, borderRadius: 8, marginTop: 22, padding: 14 }, sectionLabel: { fontSize: 10, fontWeight: '900', marginTop: 22, marginBottom: 9 }, remarkInput: { minHeight: 44, fontSize: 15 }, saveBtn: { minHeight: 42, borderRadius: 7, marginTop: 6, alignItems: 'center', justifyContent: 'center' },
  settingRow: { minHeight: 56, borderWidth: 1, borderRadius: 8, marginBottom: 9, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
});
