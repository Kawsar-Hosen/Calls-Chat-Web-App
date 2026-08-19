import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useI18n } from '@/i18n';
import { soundSettings } from '@/sound-settings';
import { playSound } from '@/sounds';
import { useTheme } from '@/theme';
import type { UserSearchResult } from '@/types';
import { Avatar } from '@/ui';
import { EmojiText } from '@/emoji';

export default function ContactInfoScreen() {
  const { id, name: initialName, username: initialUsername } = useLocalSearchParams<{ id: string; name?: string; username?: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
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
      router.replace({ pathname: '/chat/[id]', params: { id: conversationId, name: person.displayName, username: person.username, peerId: person.id, avatarUrl: person.avatarUrl ?? '' } });
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('unableOpenChat')); setBusy(false); }
  };

  const sendRequest = async () => {
    setBusy(true); setError('');
    try { await api.sendFriendRequest(person.id); if (soundSettings().requestSound) playSound('friendRequest'); setPerson((item) => ({ ...item, requestStatus: 'outgoing' })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('requestFailed')); }
    finally { setBusy(false); }
  };

  const cancelRequest = async () => {
    if (!person.requestId) return;
    setBusy(true); setError('');
    try { await api.cancelFriendRequest(person.requestId); setPerson((item) => ({ ...item, requestStatus: null, requestId: null })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('couldNotCancel')); }
    finally { setBusy(false); }
  };

  const acceptRequest = async () => {
    setBusy(true); setError('');
    try {
      if (!user) return;
      const requests = await api.friendRequests(user.id);
      const pending = requests.find((item) => item.user.id === person.id);
      if (pending) { await api.respondFriendRequest(pending.id, true); if (soundSettings().acceptSound) playSound('acceptFriend'); setPerson((item) => ({ ...item, isFriend: true, requestStatus: null })); }
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

  const alignment = { textAlign: isRTL ? 'right' as const : 'left' as const };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('contactInfo')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.identity, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatarRing, { borderColor: person.isOnline ? colors.success : colors.border }]}><Avatar name={person.displayName} uri={person.avatarUrl ?? null} size={70} online={person.isOnline} /></View>
          <Text style={[styles.identityName, { color: colors.text }]}>{person.remark || person.displayName}</Text>
          <Text style={[styles.identityHandle, { color: colors.muted }]}>@{person.username}</Text>
          {(person.phoneCode || person.phone) ? <View style={[styles.phoneRow, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="cellphone" size={13} color={colors.accent} /><Text style={{ color: colors.accent, fontSize: 12, fontWeight: '800' }}>{person.phoneCode}{person.phone}</Text></View> : null}
          {person.bio ? <Text style={[styles.identityBio, { color: colors.muted }]}><EmojiText text={person.bio} size={12} /></Text> : null}
          <View style={[styles.statusPill, { backgroundColor: person.isBlocked ? colors.danger : colors.accentSoft }]}><MaterialCommunityIcons name={person.isBlocked ? 'shield-off-outline' : isFriend ? 'account-heart-outline' : 'account-outline'} size={12} color={person.isBlocked ? '#FFFFFF' : colors.accent} /><Text style={{ color: person.isBlocked ? '#FFFFFF' : colors.accent, fontSize: 11, fontWeight: '800' }}>{person.isBlocked ? t('blocked') : isFriend ? t('friend') : person.requestStatus ? person.requestStatus === 'outgoing' ? t('requestSent') : t('requestReceived') : t('stranger')}</Text></View>
        </View>

        {error ? <Text style={[styles.error, { color: colors.danger, textAlign: isRTL ? 'right' : 'left' }]}>{error}</Text> : null}

        {!isFriend && person.requestStatus !== 'outgoing' && person.isBlocked !== true ? (
          <Pressable onPress={() => void (person.requestStatus === 'incoming' ? acceptRequest() : sendRequest())} style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.accent, opacity: busy ? 0.5 : pressed ? 0.8 : 1 }]}><MaterialCommunityIcons name={person.requestStatus === 'incoming' ? 'account-check-outline' : 'account-plus-outline'} size={19} color={colors.accentText} /><Text style={{ color: colors.accentText, fontWeight: '800' }}>{person.requestStatus === 'incoming' ? t('acceptFriendRequest') : t('addFriend')}</Text></Pressable>
        ) : null}
        {person.requestStatus === 'outgoing' ? (
          <Pressable onPress={() => void cancelRequest()} style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.elevated, opacity: busy ? 0.5 : pressed ? 0.8 : 1 }]}><MaterialCommunityIcons name="close" size={19} color={colors.text} /><Text style={{ color: colors.text, fontWeight: '800' }}>{t('cancelRequest')}</Text></Pressable>
        ) : null}
        {person.isBlocked !== true ? (
          <Pressable onPress={() => void openChat()} style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.accent, opacity: busy ? 0.5 : pressed ? 0.8 : 1 }]}><MaterialCommunityIcons name="message-text-outline" size={19} color={colors.accentText} /><Text style={{ color: colors.accentText, fontWeight: '800' }}>{busy ? t('openingChat') : t('message')}</Text></Pressable>
        ) : null}

        {isFriend ? (
          <View style={[styles.remarkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>{t('remark')}</Text>
            <View style={[styles.remarkInputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}><MaterialCommunityIcons name="note-text-outline" size={17} color={colors.faint} /><TextInput value={remark} onChangeText={(value) => { setRemark(value); setRemarkDirty(true); }} placeholder={t('remarkPlaceholder')} placeholderTextColor={colors.faint} maxLength={80} style={[styles.remarkInput, { color: colors.text }]} /></View>
            {remarkDirty ? <Pressable disabled={busy} onPress={() => void saveRemark()} style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.accent, opacity: busy ? 0.5 : pressed ? 0.8 : 1 }]}><Text style={{ color: colors.accentText, fontWeight: '800', fontSize: 13 }}>{busy ? t('saving') : t('saveRemark')}</Text></Pressable> : null}
          </View>
        ) : null}

        <Text style={[styles.sectionLabel, { color: colors.muted }]}>{t('actions')}</Text>
        {isFriend ? (
          <Pressable onPress={removeFriend} style={({ pressed }) => [styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border, opacity: busy ? 0.5 : pressed ? 0.7 : 1 }]}><View style={[styles.settingIcon, { backgroundColor: colors.danger + '1A' }]}><MaterialCommunityIcons name="account-remove-outline" size={20} color={colors.danger} /></View><Text style={{ color: colors.danger, fontWeight: '800' }}>{t('removeFriend')}</Text></Pressable>
        ) : null}
        <Pressable onPress={() => void toggleBlock()} style={({ pressed }) => [styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border, opacity: busy ? 0.5 : pressed ? 0.7 : 1 }]}><View style={[styles.settingIcon, { backgroundColor: person.isBlocked ? colors.success + '1A' : colors.danger + '1A' }]}><MaterialCommunityIcons name="shield-off-outline" size={20} color={person.isBlocked ? colors.success : colors.danger} /></View><Text style={{ color: person.isBlocked ? colors.success : colors.danger, fontWeight: '800' }}>{person.isBlocked ? t('unblock') : t('block')}</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }, iconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 16, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 32 },
  identity: { borderWidth: 1, borderRadius: 20, padding: 22, alignItems: 'center', gap: 5 }, avatarRing: { borderWidth: 2, borderRadius: 37 }, identityName: { fontSize: 19, fontWeight: '900', marginTop: 6 }, identityHandle: { fontSize: 13 }, phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginTop: 5 }, identityBio: { fontSize: 12, textAlign: 'center', marginTop: 5, lineHeight: 18 }, statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginTop: 12 },
  error: { fontSize: 13, marginTop: 14 },
  actionBtn: { minHeight: 52, borderRadius: 14, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  remarkCard: { borderWidth: 1, borderRadius: 16, marginTop: 22, padding: 14 }, sectionLabel: { fontSize: 10, fontWeight: '900', marginTop: 22, marginBottom: 9, letterSpacing: 1, textTransform: 'uppercase' }, remarkInputWrap: { minHeight: 46, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 }, remarkInput: { flex: 1, fontSize: 15 }, saveBtn: { minHeight: 44, borderRadius: 12, marginTop: 8, alignItems: 'center', justifyContent: 'center' },
  settingRow: { minHeight: 58, borderWidth: 1, borderRadius: 14, marginBottom: 10, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 12 }, settingIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
