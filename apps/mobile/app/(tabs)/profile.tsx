import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, prepareAvatarImage } from '@/api';
import { useAuth } from '@/auth';
import { languages, useI18n, type LanguageCode } from '@/i18n';
import { registerForPushNotifications } from '@/notifications';
import { useSocket } from '@/socket';
import { useTheme } from '@/theme';
import { Avatar, ErrorText, Field, PrimaryButton, ScreenHeader } from '@/ui';

export default function SettingsScreen() {
  const { user, logout, updateProfile, uploadAvatar } = useAuth();
  const { colors, dark, setMode } = useTheme();
  const { connected } = useSocket();
  const { language, setLanguage, isRTL, t } = useI18n();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [languageOpen, setLanguageOpen] = useState(false);
  const [pushState, setPushState] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');

  useEffect(() => { if (user) { setDisplayName(user.displayName); setUsername(user.username); setBio(user.bio ?? ''); } }, [user]);
  if (!user) return null;

  const save = async () => {
    setSaving(true); setError('');
    try { await updateProfile({ displayName: displayName.trim(), username: username.trim(), bio: bio.trim() }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save profile'); }
    finally { setSaving(false); }
  };

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Photo permission is required to upload a profile picture.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.82 });
    if (result.canceled || !result.assets[0]?.uri) return;
    setUploading(true); setProgress(0); setError(''); setStatus('');
    try {
      const resizedUri = await prepareAvatarImage(result.assets[0].uri);
      await uploadAvatar(resizedUri, (pct) => setProgress(pct));
      setStatus('Photo updated');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to upload photo'); }
    finally { setUploading(false); }
  };

  const enablePush = async () => {
    setPushState('loading');
    const token = await registerForPushNotifications();
    if (token && (Platform.OS === 'ios' || Platform.OS === 'android')) await api.registerDevice(token, Platform.OS);
    setPushState(token ? 'ready' : 'unavailable');
  };

  const currentLanguage = languages.find((item) => item.code === language)!;
  const direction = { flexDirection: isRTL ? 'row-reverse' as const : 'row' as const };
  const alignment = { textAlign: isRTL ? 'right' as const : 'left' as const };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenHeader title={t('settings')} eyebrow={t('account')} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.identity, direction, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable accessibilityLabel={t('uploadPhoto')} onPress={() => void choosePhoto()} style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}>
              <Avatar name={user.displayName} uri={user.avatarUrl} size={88} online={connected} />
              <View style={[styles.camera, { backgroundColor: colors.accent, borderColor: colors.surface }]}><MaterialCommunityIcons name={uploading ? 'progress-clock' : 'camera'} size={15} color={colors.accentText} /></View>
            </Pressable>
            <View style={{ flex: 1 }}><Text style={[styles.identityName, alignment, { color: colors.text }]}>{user.displayName}</Text><Text style={[styles.identityEmail, alignment, { color: colors.muted }]}>{user.email}</Text></View>
            <View style={[styles.status, { backgroundColor: connected ? colors.accentSoft : colors.elevated }]}><Text style={{ color: connected ? colors.success : colors.muted, fontSize: 10, fontWeight: '800' }}>{connected ? t('connected').toUpperCase() : t('offline').toUpperCase()}</Text></View>
          </View>

          {(uploading || status) ? <View style={[styles.uploadStatus, direction]}><MaterialCommunityIcons name={uploading ? 'progress-upload' : 'check-circle'} size={16} color={uploading ? colors.accent : colors.success} /><Text style={{ color: uploading ? colors.accent : colors.success, fontSize: 12, fontWeight: '800' }}>{uploading ? `Uploading… ${progress}%` : status}</Text></View> : null}

          <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>{t('settings').toUpperCase()}</Text>
          <SettingRow icon="bell-outline" title={t('notification')} detail={pushState === 'ready' ? 'Enabled' : pushState === 'loading' ? 'Requesting permission...' : pushState === 'unavailable' ? 'Unavailable' : 'Push messages and alerts'} active={pushState === 'ready'} onPress={() => void enablePush()} rtl={isRTL} />
          <SettingRow icon="weather-night" title={t('darkMode')} detail={dark ? 'On' : 'Off'} active={dark} onPress={() => setMode(dark ? 'light' : 'dark')} rtl={isRTL} />
          <SettingRow icon="translate" title={t('language')} detail={`${currentLanguage.label} — ${currentLanguage.nativeLabel}`} onPress={() => setLanguageOpen(true)} rtl={isRTL} />
          <SettingRow icon="account-edit-outline" title={t('editProfile')} detail={t('uploadPhoto')} onPress={() => void choosePhoto()} rtl={isRTL} />

          <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>{t('profile').toUpperCase()}</Text>
          <View style={styles.form}>
            <Field value={displayName} onChangeText={setDisplayName} placeholder="Display name" textAlign={isRTL ? 'right' : 'left'} />
            <Field value={username} onChangeText={setUsername} placeholder="Username" autoCapitalize="none" autoCorrect={false} textAlign={isRTL ? 'right' : 'left'} />
            <Field value={bio} onChangeText={setBio} placeholder="A short bio" multiline maxLength={500} textAlign={isRTL ? 'right' : 'left'} style={{ minHeight: 88, paddingTop: 14, textAlignVertical: 'top' }} />
            {error ? <ErrorText>{error}</ErrorText> : null}
            <PrimaryButton title={t('saveChanges')} icon="check" loading={saving} disabled={!displayName.trim() || !/^[a-zA-Z0-9_]{3,32}$/.test(username)} onPress={() => void save()} />
          </View>

          <Pressable onPress={() => void logout()} style={({ pressed }) => [styles.logout, direction, { borderColor: colors.border, opacity: pressed ? 0.55 : 1 }]}><MaterialCommunityIcons name="logout" size={20} color={colors.danger} /><Text style={{ color: colors.danger, fontWeight: '800' }}>{t('signOut')}</Text></Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal transparent animationType="fade" visible={languageOpen} onRequestClose={() => setLanguageOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setLanguageOpen(false)}>
          <Pressable style={[styles.languageModal, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => undefined}>
            <View style={[styles.modalHeader, direction]}><Text style={[styles.modalTitle, alignment, { color: colors.text }]}>{t('chooseLanguage')}</Text><Pressable accessibilityLabel="Close" onPress={() => setLanguageOpen(false)} style={styles.closeButton}><MaterialCommunityIcons name="close" size={21} color={colors.text} /></Pressable></View>
            {languages.map((item) => <Pressable key={item.code} onPress={() => { setLanguage(item.code as LanguageCode); setLanguageOpen(false); }} style={({ pressed }) => [styles.languageRow, direction, { backgroundColor: pressed ? colors.elevated : colors.surface, borderColor: colors.border }]}><View style={[styles.languageIcon, { backgroundColor: item.code === language ? colors.accentSoft : colors.elevated }]}><MaterialCommunityIcons name="translate" size={18} color={item.code === language ? colors.accent : colors.muted} /></View><View style={{ flex: 1 }}><Text style={[styles.languageName, alignment, { color: colors.text }]}>{item.label}</Text><Text style={[styles.languageNative, alignment, { color: colors.muted }]}>{item.nativeLabel}</Text></View>{item.code === language ? <MaterialCommunityIcons name="check" size={20} color={colors.accent} /> : null}</Pressable>)}
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
  safe: { flex: 1 }, content: { paddingHorizontal: 16, paddingBottom: 32 }, identity: { minHeight: 122, borderWidth: 1, borderRadius: 8, padding: 16, alignItems: 'center', gap: 15 }, camera: { position: 'absolute', right: -1, bottom: -1, width: 28, height: 28, borderRadius: 14, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },   identityName: { fontSize: 18, fontWeight: '800' }, identityEmail: { fontSize: 12, marginTop: 4 }, status: { borderRadius: 5, paddingHorizontal: 8, paddingVertical: 5 }, uploadStatus: { marginTop: 9, alignItems: 'center', gap: 7 },
  sectionLabel: { fontSize: 10, fontWeight: '900', marginTop: 25, marginBottom: 9 }, form: { gap: 11 }, settingRow: { minHeight: 70, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 8, alignItems: 'center', gap: 11 }, settingIcon: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }, settingTitle: { fontSize: 14, fontWeight: '800' }, settingCopy: { fontSize: 11, marginTop: 3 },
  logout: { minHeight: 50, borderWidth: 1, borderRadius: 7, marginTop: 26, alignItems: 'center', justifyContent: 'center', gap: 8 }, backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'center', padding: 20 }, languageModal: { borderWidth: 1, borderRadius: 8, padding: 14, maxWidth: 480, width: '100%', alignSelf: 'center' }, modalHeader: { minHeight: 44, alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }, modalTitle: { fontSize: 17, fontWeight: '800', flex: 1 }, closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }, languageRow: { minHeight: 60, borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center', gap: 11, paddingHorizontal: 6 }, languageIcon: { width: 34, height: 34, borderRadius: 7, alignItems: 'center', justifyContent: 'center' }, languageName: { fontSize: 14, fontWeight: '800' }, languageNative: { fontSize: 12, marginTop: 2 },
});
