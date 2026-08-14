import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { setChatPrefs, setConversationMuted, useChatMeta } from '@/chat-meta';
import { useI18n } from '@/i18n';
import { NOTIF_SOUNDS, POP_SOUNDS, playNotificationSound, playSendSound } from '@/sounds';
import { useTheme } from '@/theme';
import { Avatar } from '@/ui';

export default function ChatSettingsScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string; username?: string; groupId?: string; groupName?: string; peerId?: string; avatarUrl?: string }>();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const meta = useChatMeta();
  const isGroup = !!params.groupId;
  const conversationId = params.id;
  const [nickname, setNickname] = useState(meta.prefs[conversationId]?.nickname ?? '');
  const [nickOpen, setNickOpen] = useState(false);
  const [nickBusy, setNickBusy] = useState(false);
  const [muted, setMuted] = useState(meta.muted[conversationId] === true);
  const [blocking, setBlocking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [soundOpen, setSoundOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  const saveNickname = () => {
    setChatPrefs(conversationId, { nickname: nickname.trim() || null });
    setNickOpen(false);
    showToast(t('savedToYourView'));
  };

  const toggleMute = (value: boolean) => {
    setMuted(value);
    setConversationMuted(conversationId, value);
  };

  const confirmBlock = () => {
    if (!params.peerId) return;
    Alert.alert(t('blockTitle'), t('blockCopy'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('blockUser'), style: 'destructive', onPress: () => void doBlock() },
    ]);
  };

  const doBlock = async () => {
    if (!params.peerId || blocking) return;
    setBlocking(true);
    try {
      await api.blockUser(params.peerId);
      showToast(t('blocked'));
      setTimeout(() => router.back(), 800);
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : t('actionFailed'));
    } finally {
      setBlocking(false);
    }
  };

  const displayName = params.name ?? (isGroup ? params.groupName : '') ?? '';

  const sendSound = meta.prefs[conversationId]?.sendSound ?? 'default';
  const soundEnabled = sendSound !== 'none';
  const sendSoundLabel = !soundEnabled ? t('soundOff') : sendSound === 'default' ? t('defaultSound') : (POP_SOUNDS.find((s) => s.id === sendSound)?.label ?? t('defaultSound'));

  const setSound = (value: string) => {
    setChatPrefs(conversationId, { sendSound: value });
    playSendSound(value);
  };

  const notifSound = meta.prefs[conversationId]?.notifSound ?? 'default';
  const notifEnabled = notifSound !== 'none';
  const notifSoundLabel = !notifEnabled ? t('soundOff') : notifSound === 'default' ? t('defaultSound') : (NOTIF_SOUNDS.find((s) => s.id === notifSound)?.label ?? t('defaultSound'));
  const soundRowValue = notifEnabled ? `${sendSoundLabel} · ${notifSoundLabel}` : sendSoundLabel;

  const setNotifSound = (value: string) => {
    setChatPrefs(conversationId, { notifSound: value });
    playNotificationSound(value);
  };

  const rows = [
    ...(isGroup ? [] : [
      { key: 'profile', icon: 'account-outline' as const, label: t('profile'), value: params.username ? `@${params.username}` : '', onPress: () => { if (params.peerId) router.push({ pathname: '/contacts/[id]', params: { id: params.peerId, name: displayName, username: params.username ?? '' } }); } },
      { key: 'nickname', icon: 'pencil-outline' as const, label: t('setNickname'), value: meta.prefs[conversationId]?.nickname || '', onPress: () => setNickOpen(true) },
      { key: 'group', icon: 'account-plus-outline' as const, label: t('createGroupWith'), value: '', onPress: () => { if (params.peerId) router.push({ pathname: '/groups/create', params: { preselect: params.peerId } }); } },
    ]),
    ...(isGroup ? [] : [{ key: 'search', icon: 'magnify' as const, label: t('search'), value: '', onPress: () => router.dismissTo({ pathname: '/chat/[id]', params: { id: conversationId, name: displayName, username: params.username ?? '', peerId: params.peerId ?? '', avatarUrl: params.avatarUrl ?? '', autoSearch: '1' } }) }]),
    { key: 'media', icon: 'image-multiple-outline' as const, label: t('mediaFilesLinks'), value: '', onPress: () => router.push({ pathname: '/chat/media', params: { id: conversationId, name: displayName, groupId: params.groupId ?? '', peerId: params.peerId ?? '' } }) },
    { key: 'customize', icon: 'palette-outline' as const, label: t('customizeChat'), value: '', onPress: () => router.push({ pathname: '/chat/customize', params: { id: conversationId, groupId: params.groupId ?? '', name: displayName } }) },
    { key: 'sound', icon: 'music-note-outline' as const, label: t('messageSound'), value: sendSoundLabel, onPress: () => setSoundOpen(true) },
    ...(isGroup ? [{ key: 'info', icon: 'account-group-outline' as const, label: t('groupInfo'), value: '', onPress: () => { if (params.groupId) router.push({ pathname: '/groups/[id]', params: { id: params.groupId } }); } }] : []),
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{t('chatSettings')}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {isGroup ? <View style={[styles.heroGroupIcon, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="account-group-outline" size={34} color={colors.accent} /></View> : <Avatar name={displayName} uri={params.avatarUrl ? params.avatarUrl : null} size={64} />}
          <Text style={[styles.heroName, { color: colors.text }]} numberOfLines={1}>{displayName}</Text>
          {!isGroup ? <Text style={[styles.heroSub, { color: colors.muted }]} numberOfLines={1}>{params.username ? `@${params.username}` : ' '}</Text> : null}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.muted }]}>{t('chatSettings').toUpperCase()}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {rows.map((row, index) => (
            <Pressable key={row.key} onPress={row.onPress} style={({ pressed }) => [styles.row, index < rows.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }, pressed && { opacity: 0.6 }]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name={row.icon} size={20} color={colors.accent} /></View>
              <Text style={[styles.rowText, { color: colors.text }]} numberOfLines={1}>{row.label}</Text>
              {row.value ? <Text style={[styles.rowValue, { color: colors.muted }]} numberOfLines={1}>{row.value}</Text> : null}
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.faint} />
            </Pressable>
          ))}
          <View style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name={muted ? 'bell-off-outline' : 'bell-outline'} size={20} color={colors.accent} /></View>
            <Text style={[styles.rowText, { color: colors.text }]}>{t('muteNotifications')}</Text>
            <Switch value={muted} onValueChange={toggleMute} trackColor={{ true: colors.accent, false: colors.border }} thumbColor={muted ? colors.accentText : colors.text} />
          </View>
          {isGroup ? <View style={[styles.row, { opacity: 0.75 }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="bell-outline" size={20} color={colors.accent} /></View>
            <Text style={[styles.rowText, { color: colors.text }]}>{t('notificationsOn')}</Text>
          </View> : null}
        </View>

        {!isGroup ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>{t('actions').toUpperCase()}</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Pressable onPress={confirmBlock} disabled={blocking} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
                <View style={[styles.rowIcon, { backgroundColor: '#EF44441F' }]}><MaterialCommunityIcons name="block-helper" size={20} color="#EF4444" /></View>
                <Text style={[styles.rowText, { color: colors.danger }]}>{t('blockUser')}</Text>
                {blocking ? <ActivityIndicator size="small" color={colors.danger} /> : null}
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>

      <Modal visible={nickOpen} transparent animationType="fade" onRequestClose={() => setNickOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setNickOpen(false)}>
          <Pressable onPress={() => undefined} style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.elevated }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('setNickname')}</Text>
            <Text style={[styles.modalHint, { color: colors.muted }]}>{t('nicknameHint')}</Text>
            <TextInput value={nickname} onChangeText={setNickname} placeholder={t('nickname')} placeholderTextColor={colors.faint} autoFocus maxLength={60} style={[styles.modalInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]} />
            <Pressable disabled={nickBusy} onPress={saveNickname} style={({ pressed }) => [styles.modalBtn, { backgroundColor: colors.accent, opacity: nickBusy ? 0.6 : pressed ? 0.8 : 1 }]}>{nickBusy ? <ActivityIndicator color={colors.accentText} /> : <Text style={[styles.modalBtnText, { color: colors.accentText }]}>{t('saveRemark')}</Text>}</Pressable>
            <Pressable onPress={() => setNickOpen(false)} style={({ pressed }) => [styles.modalGhost, { opacity: pressed ? 0.6 : 1 }]}><Text style={{ color: colors.muted, fontWeight: '700' }}>{t('cancel')}</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={soundOpen} transparent animationType="slide" onRequestClose={() => setSoundOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSoundOpen(false)}>
          <Pressable onPress={() => undefined} style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.elevated }]} />
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('messageSound')}</Text>
              <Text style={[styles.sheetHint, { color: colors.muted }]}>{t('messageSoundDesc')}</Text>

              <View style={[styles.switchRow, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <View style={[styles.rowIcon, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name={soundEnabled ? 'music-note' : 'music-off'} size={20} color={colors.accent} /></View>
                <Text style={[styles.rowText, { color: colors.text }]}>{t('soundEffects')}</Text>
                <Switch value={soundEnabled} onValueChange={(v) => setSound(v ? (sendSound === 'none' ? 'default' : sendSound) : 'none')} trackColor={{ true: colors.accent, false: colors.border }} thumbColor={soundEnabled ? colors.accentText : colors.text} />
              </View>

              <View style={[styles.chipWrap, { opacity: soundEnabled ? 1 : 0.45 }]}>
                <Pressable disabled={!soundEnabled} onPress={() => setSound('default')} style={[styles.soundChip, sendSound === 'default' && { borderColor: colors.accent, borderWidth: 2 }]}>
                  <View style={[styles.soundChipCircle, { backgroundColor: sendSound === 'default' ? colors.accent : colors.accentSoft }]}>
                    <MaterialCommunityIcons name={sendSound === 'default' ? 'check' : 'volume-medium'} size={20} color={sendSound === 'default' ? colors.accentText : colors.accent} />
                  </View>
                  <Text style={[styles.soundChipLabel, { color: sendSound === 'default' ? colors.accent : colors.muted }]}>{t('defaultSound')}</Text>
                </Pressable>
                {POP_SOUNDS.map((s) => (
                  <Pressable key={s.id} disabled={!soundEnabled} onPress={() => setSound(s.id)} style={[styles.soundChip, sendSound === s.id && { borderColor: colors.accent, borderWidth: 2 }]}>
                    <View style={[styles.soundChipCircle, { backgroundColor: sendSound === s.id ? colors.accent : colors.accentSoft }]}>
                      <MaterialCommunityIcons name={sendSound === s.id ? 'check' : 'music-note'} size={20} color={sendSound === s.id ? colors.accentText : colors.accent} />
                    </View>
                    <Text style={[styles.soundChipLabel, { color: sendSound === s.id ? colors.accent : colors.muted }]}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={[styles.sheetDivider, { backgroundColor: colors.border }]} />
              <Text style={[styles.sheetSection, { color: colors.text }]}>{t('notificationSound')}</Text>
              <Text style={[styles.sheetHint, { color: colors.muted }]}>{t('incomingMessageSoundDesc')}</Text>

              <View style={[styles.switchRow, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <View style={[styles.rowIcon, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name={notifEnabled ? 'bell-ring-outline' : 'bell-off-outline'} size={20} color={colors.accent} /></View>
                <Text style={[styles.rowText, { color: colors.text }]}>{t('soundEffects')}</Text>
                <Switch value={notifEnabled} onValueChange={(v) => setNotifSound(v ? (notifSound === 'none' ? 'default' : notifSound) : 'none')} trackColor={{ true: colors.accent, false: colors.border }} thumbColor={notifEnabled ? colors.accentText : colors.text} />
              </View>

              <View style={[styles.chipWrap, { opacity: notifEnabled ? 1 : 0.45 }]}>
                <Pressable disabled={!notifEnabled} onPress={() => setNotifSound('default')} style={[styles.soundChip, notifSound === 'default' && { borderColor: colors.accent, borderWidth: 2 }]}>
                  <View style={[styles.soundChipCircle, { backgroundColor: notifSound === 'default' ? colors.accent : colors.accentSoft }]}>
                    <MaterialCommunityIcons name={notifSound === 'default' ? 'check' : 'volume-medium'} size={20} color={notifSound === 'default' ? colors.accentText : colors.accent} />
                  </View>
                  <Text style={[styles.soundChipLabel, { color: notifSound === 'default' ? colors.accent : colors.muted }]}>{t('defaultSound')}</Text>
                </Pressable>
                {NOTIF_SOUNDS.map((s) => (
                  <Pressable key={s.id} disabled={!notifEnabled} onPress={() => setNotifSound(s.id)} style={[styles.soundChip, notifSound === s.id && { borderColor: colors.accent, borderWidth: 2 }]}>
                    <View style={[styles.soundChipCircle, { backgroundColor: notifSound === s.id ? colors.accent : colors.accentSoft }]}>
                      <MaterialCommunityIcons name={notifSound === s.id ? 'check' : 'bell-ring'} size={20} color={notifSound === s.id ? colors.accentText : colors.accent} />
                    </View>
                    <Text style={[styles.soundChipLabel, { color: notifSound === s.id ? colors.accent : colors.muted }]}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable onPress={() => setSoundOpen(false)} style={[styles.sheetBtn, { backgroundColor: colors.accent }]}><Text style={[styles.sheetBtnText, { color: colors.accentText }]}>{t('done')}</Text></Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {toast ? <View style={[styles.toast, { backgroundColor: colors.text }]}><Text style={{ color: colors.background, fontSize: 13, fontWeight: '700' }}>{toast}</Text></View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }, iconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  heroCard: { alignItems: 'center', paddingVertical: 26, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, marginBottom: 4 }, heroGroupIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' }, heroName: { fontSize: 18, fontWeight: '900', marginTop: 12 }, heroSub: { fontSize: 13, marginTop: 3 },
  sectionLabel: { fontSize: 10, fontWeight: '900', marginTop: 22, marginBottom: 9, letterSpacing: 0.5 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 }, rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, rowText: { flex: 1, fontSize: 15, fontWeight: '600' }, rowValue: { fontSize: 13, maxWidth: 120 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.5)', alignItems: 'center', justifyContent: 'center', padding: 28 }, modalCard: { width: '100%', maxWidth: 420, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 20 }, modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 }, modalTitle: { fontSize: 17, fontWeight: '800' }, modalHint: { fontSize: 12, marginTop: 4, marginBottom: 14 }, modalInput: { minHeight: 48, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, fontSize: 15 }, modalBtn: { minHeight: 50, borderRadius: 14, marginTop: 16, alignItems: 'center', justifyContent: 'center' }, modalBtnText: { fontWeight: '800', fontSize: 15 }, modalGhost: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'flex-end' }, sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 30, maxHeight: '88%' }, sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }, sheetTitle: { fontSize: 18, fontWeight: '900' }, sheetHint: { fontSize: 13, marginTop: 4, marginBottom: 6 }, switchRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 2 },
  sheetDivider: { height: StyleSheet.hairlineWidth, marginTop: 18 }, sheetSection: { fontSize: 15, fontWeight: '800', marginTop: 18 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 14 }, soundChip: { width: 84, alignItems: 'center', gap: 6, borderRadius: 16, borderWidth: 1, borderColor: 'transparent', paddingVertical: 8 }, soundChipCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' }, soundChipLabel: { fontSize: 12, fontWeight: '700' }, sheetBtn: { minHeight: 50, borderRadius: 14, marginTop: 6, alignItems: 'center', justifyContent: 'center' }, sheetBtnText: { fontWeight: '800', fontSize: 15 },
  toast: { position: 'absolute', bottom: 30, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, maxWidth: '85%' },
});
