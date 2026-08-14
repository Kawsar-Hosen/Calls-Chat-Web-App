import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { formatPhone } from '@/countries';
import { languages, useI18n, type LanguageCode } from '@/i18n';
import { registerForPushNotifications } from '@/notifications';
import { useSocket } from '@/socket';
import { useTheme } from '@/theme';
import { Avatar, ScreenHeader } from '@/ui';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { colors, dark, setMode } = useTheme();
  const { connected } = useSocket();
  const { language, setLanguage, isRTL, t } = useI18n();
  const router = useRouter();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [pushState, setPushState] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');

  useEffect(() => { if (user && pushState === 'idle' && (Platform.OS === 'ios' || Platform.OS === 'android')) void (async () => { const token = await registerForPushNotifications(); if (token) await api.registerDevice(token, Platform.OS); setPushState('ready'); })().catch(() => setPushState('unavailable')); }, [user, pushState]);
  if (!user) return null;

  const enablePush = async () => {
    setPushState('loading');
    const token = await registerForPushNotifications();
    if (token && (Platform.OS === 'ios' || Platform.OS === 'android')) await api.registerDevice(token, Platform.OS);
    setPushState(token ? 'ready' : 'unavailable');
  };

  const currentLanguage = languages.find((item) => item.code === language)!;
  const phoneLabel = formatPhone(user.phoneCode, user.phone);
  const direction = { flexDirection: isRTL ? 'row-reverse' as const : 'row' as const };
  const alignment = { textAlign: isRTL ? 'right' as const : 'left' as const };

  const openEditProfile = () => router.push('/settings/edit-profile');

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={t('settings')} eyebrow={t('account')} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={openEditProfile} style={({ pressed }) => [styles.identity, direction, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
          <Avatar name={user.displayName} uri={user.avatarUrl} size={88} online={connected} />
          <View style={{ flex: 1 }}><Text style={[styles.identityName, alignment, { color: colors.text }]}>{user.displayName}</Text><Text style={[styles.identityEmail, alignment, { color: colors.muted }]}>{user.email}</Text>{phoneLabel ? <Text style={[styles.identityPhone, alignment, { color: colors.muted }]}>{phoneLabel}</Text> : null}<Text style={[styles.editHint, alignment, { color: colors.accent }]}><MaterialCommunityIcons name="pencil" size={11} color={colors.accent} /> {t('editProfile')}</Text></View>
        </Pressable>

        <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>{t('settings').toUpperCase()}</Text>
        <SettingRow icon="bell-outline" title={t('notification')} detail={pushState === 'ready' ? 'Enabled' : pushState === 'loading' ? 'Requesting permission...' : pushState === 'unavailable' ? 'Unavailable' : 'Push messages and alerts'} active={pushState === 'ready'} onPress={() => void enablePush()} rtl={isRTL} />
        <SettingRow icon="weather-night" title={t('darkMode')} detail={dark ? 'On' : 'Off'} active={dark} onPress={() => setMode(dark ? 'light' : 'dark')} rtl={isRTL} />
        <SettingRow icon="music-note-outline" title={t('soundEffects')} detail={t('requestSound')} onPress={() => router.push('/settings/sounds')} rtl={isRTL} />
        <SettingRow icon="translate" title={t('language')} detail={`${currentLanguage.flag}  ${currentLanguage.nativeLabel}`} onPress={() => setLanguageOpen(true)} rtl={isRTL} />
        <SettingRow icon="account-edit-outline" title={t('editProfile')} detail={user.email ?? '@' + user.username} onPress={openEditProfile} rtl={isRTL} />

        <Pressable onPress={() => setLogoutOpen(true)} style={({ pressed }) => [styles.logout, direction, { borderColor: colors.border, opacity: pressed ? 0.55 : 1 }]}><MaterialCommunityIcons name="logout" size={20} color={colors.danger} /><Text style={{ color: colors.danger, fontWeight: '800' }}>{t('signOut')}</Text></Pressable>

        <Pressable onPress={() => router.push('/settings/delete-account')} style={({ pressed }) => [styles.deleteAccount, direction, { backgroundColor: colors.surface, borderColor: colors.danger, opacity: pressed ? 0.55 : 1 }]}><View style={[styles.deleteIcon, { backgroundColor: colors.danger + '14' }]}><MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.danger} /></View><View style={{ flex: 1 }}><Text style={[styles.deleteTitle, alignment, { color: colors.danger }]}>{t('deleteAccount')}</Text><Text style={[styles.deleteCopy, alignment, { color: colors.muted }]}>{t('deleteAccountSubtitle')}</Text></View><MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={21} color={colors.danger} /></Pressable>
      </ScrollView>

      <Modal transparent animationType="fade" visible={logoutOpen} onRequestClose={() => setLogoutOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setLogoutOpen(false)}>
          <Pressable style={[styles.logoutModal, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => undefined}>
            <View style={[styles.logoutIcon, { backgroundColor: colors.danger + '1A' }]}><MaterialCommunityIcons name="logout-variant" size={28} color={colors.danger} /></View>
            <Text style={[styles.logoutTitle, alignment, { color: colors.text }]}>{t('signOut')}?</Text>
            <Text style={[styles.logoutCopy, alignment, { color: colors.muted }]}>You'll need to sign in again to keep chatting.</Text>
            <View style={[styles.logoutActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Pressable onPress={() => setLogoutOpen(false)} style={({ pressed }) => [styles.cancelBtn, { borderColor: colors.border, backgroundColor: pressed ? colors.elevated : colors.surface }]}><Text style={{ color: colors.text, fontWeight: '800' }}>Cancel</Text></Pressable>
              <Pressable onPress={() => { setLogoutOpen(false); void logout(); }} style={({ pressed }) => [styles.confirmBtn, { backgroundColor: colors.danger, opacity: pressed ? 0.7 : 1 }]}><MaterialCommunityIcons name="logout" size={17} color="#FFFFFF" /><Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{t('signOut')}</Text></Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent animationType="fade" visible={languageOpen} onRequestClose={() => setLanguageOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setLanguageOpen(false)}>
          <Pressable style={[styles.languageModal, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => undefined}>
            <View style={[styles.modalHeader, direction]}><Text style={[styles.modalTitle, alignment, { color: colors.text }]}>{t('chooseLanguage')}</Text><Pressable accessibilityLabel="Close" onPress={() => setLanguageOpen(false)} style={styles.closeButton}><MaterialCommunityIcons name="close" size={21} color={colors.text} /></Pressable></View>
            {languages.map((item) => <Pressable key={item.code} onPress={() => { setLanguage(item.code as LanguageCode); setLanguageOpen(false); }} style={({ pressed }) => [styles.languageRow, direction, { backgroundColor: pressed ? colors.elevated : colors.surface, borderColor: colors.border }]}><Text style={styles.flagIcon}>{item.flag}</Text><View style={{ flex: 1 }}><Text style={[styles.languageName, alignment, { color: colors.text }]}>{item.label}</Text><Text style={[styles.languageNative, alignment, { color: colors.muted }]}>{item.nativeLabel}</Text></View>{item.code === language ? <MaterialCommunityIcons name="check" size={20} color={colors.accent} /> : null}</Pressable>)}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function SettingRow({ icon, title, detail, active, onPress, rtl }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string; detail: string; active?: boolean; onPress: () => void; rtl: boolean }) {
  const { colors } = useTheme();
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.settingRow, { flexDirection: rtl ? 'row-reverse' : 'row', backgroundColor: pressed ? colors.elevated : colors.surface, borderColor: colors.border }]}><View style={[styles.settingIcon, { backgroundColor: active ? colors.accent : colors.accentSoft }]}><MaterialCommunityIcons name={icon} size={21} color={active ? colors.accentText : colors.accent} /></View><View style={{ flex: 1 }}><Text style={[styles.settingTitle, { color: colors.text, textAlign: rtl ? 'right' : 'left' }]}>{title}</Text><Text style={[styles.settingCopy, { color: colors.muted, textAlign: rtl ? 'right' : 'left' }]}>{detail}</Text></View><MaterialCommunityIcons name={rtl ? 'chevron-left' : 'chevron-right'} size={21} color={colors.faint} /></Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, content: { paddingHorizontal: 16, paddingBottom: 32 }, identity: { minHeight: 122, borderWidth: 1, borderRadius: 8, padding: 16, alignItems: 'center', gap: 15 }, identityName: { fontSize: 18, fontWeight: '800' }, identityEmail: { fontSize: 12, marginTop: 4 }, identityPhone: { fontSize: 12, marginTop: 2 }, editHint: { fontSize: 12, fontWeight: '800', marginTop: 8 },
  sectionLabel: { fontSize: 10, fontWeight: '900', marginTop: 25, marginBottom: 9 }, settingRow: { minHeight: 70, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 8, alignItems: 'center', gap: 11 }, settingIcon: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }, settingTitle: { fontSize: 14, fontWeight: '800' }, settingCopy: { fontSize: 11, marginTop: 3 },
  logout: { minHeight: 50, borderWidth: 1, borderRadius: 7, marginTop: 26, alignItems: 'center', justifyContent: 'center', gap: 8 }, backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'center', padding: 24 }, logoutModal: { borderWidth: 1, borderRadius: 16, padding: 20, alignItems: 'center', maxWidth: 420, width: '100%', alignSelf: 'center' }, logoutIcon: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }, logoutTitle: { fontSize: 18, fontWeight: '900' }, logoutCopy: { fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 19 }, logoutActions: { flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' }, cancelBtn: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, confirmBtn: { flex: 1, minHeight: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 6, flexDirection: 'row' }, deleteAccount: { minHeight: 70, borderWidth: 1, borderRadius: 16, marginTop: 10, paddingHorizontal: 12, alignItems: 'center', gap: 11 }, deleteIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }, deleteTitle: { fontSize: 14, fontWeight: '800', marginTop: 3 }, deleteCopy: { fontSize: 11, marginTop: 2, lineHeight: 15 }, languageModal: { borderWidth: 1, borderRadius: 8, padding: 14, maxWidth: 480, width: '100%', alignSelf: 'center' }, modalHeader: { minHeight: 44, alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }, modalTitle: { fontSize: 17, fontWeight: '800', flex: 1 }, closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }, languageRow: { minHeight: 60, borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center', gap: 11, paddingHorizontal: 6 }, flagIcon: { fontSize: 26 }, languageName: { fontSize: 14, fontWeight: '800' }, languageNative: { fontSize: 12, marginTop: 2 },
});
