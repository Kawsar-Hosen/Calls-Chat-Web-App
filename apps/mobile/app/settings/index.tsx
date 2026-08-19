import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth, type SavedAccount } from '@/auth';
import { languages, useI18n, type LanguageCode } from '@/i18n';
import { registerForPushNotifications } from '@/notifications';
import { useTheme } from '@/theme';
import { ScreenHeader } from '@/ui';

export default function SettingsScreen() {
  const { user, logout, accounts, switchAccount, removeSavedAccount, setAddingAccount } = useAuth();
  const { colors, dark, setMode } = useTheme();
  const { language, setLanguage, isRTL, t } = useI18n();
  const router = useRouter();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [pushState, setPushState] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<SavedAccount | null>(null);
  const [switchLoading, setSwitchLoading] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<SavedAccount | null>(null);

  useEffect(() => { if (user && pushState === 'idle' && (Platform.OS === 'ios' || Platform.OS === 'android')) void (async () => { const token = await registerForPushNotifications(); if (token) await api.registerDevice(token, Platform.OS); setPushState('ready'); })().catch(() => setPushState('unavailable')); }, [user, pushState]);

  if (!user) return null;

  const enablePush = async () => {
    setPushState('loading');
    const token = await registerForPushNotifications();
    if (token && (Platform.OS === 'ios' || Platform.OS === 'android')) await api.registerDevice(token, Platform.OS);
    setPushState(token ? 'ready' : 'unavailable');
  };

  const currentLanguage = languages.find((item) => item.code === language)!;
  const direction = { flexDirection: isRTL ? 'row-reverse' as const : 'row' as const };
  const alignment = { textAlign: isRTL ? 'right' as const : 'left' as const };

  const handleSwitch = (acc: SavedAccount) => {
    if (acc.id === user.id) return;
    setSwitchTarget(acc);
  };

  const confirmSwitch = async () => {
    if (!switchTarget) return;
    setSwitchLoading(true);
    try { await switchAccount(switchTarget.id); } catch {} finally { setSwitchLoading(false); setSwitchTarget(null); }
  };

  const handleRemoveAccount = (acc: SavedAccount) => {
    setRemoveTarget(acc);
  };

  const otherAccounts = accounts.filter((a) => a.id !== user.id);

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={t('settings')} back />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* ── Profile Card ────────────────────────────────── */}
        <Pressable onPress={() => router.push('/settings/edit-profile')} style={({ pressed }) => [styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
          <View style={[styles.profileAvatarRing, { borderColor: colors.accent }]}> 
            {user.avatarUrl ? <Image source={{ uri: user.avatarUrl }} style={styles.profileAvatar} /> : <View style={[styles.profileAvatarPlaceholder, { backgroundColor: colors.accentSoft }]}><Text style={{ color: colors.accent, fontSize: 22, fontWeight: '900' }}>{user.displayName[0]?.toUpperCase() ?? '?'}</Text></View>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.text }]}>{user.displayName}</Text>
            <Text style={[styles.profileHandle, { color: colors.muted }]}>@{user.username}</Text>
            {user.email ? <Text style={[styles.profileEmail, { color: colors.faint }]}>{user.email}</Text> : null}
          </View>
          <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={22} color={colors.faint} />
        </Pressable>

        {/* ── General ─────────────────────────────────────── */}
        <Text style={[styles.section, alignment, { color: colors.muted }]}>GENERAL</Text>
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingRow icon="bell-outline" title="Notifications" detail={pushState === 'ready' ? 'Enabled' : 'Disabled'} active={pushState === 'ready'} onPress={() => void enablePush()} rtl={isRTL} />
          <SettingRow icon="weather-night" title={t('darkMode')} detail={dark ? 'On' : 'Off'} active={dark} onPress={() => setMode(dark ? 'light' : 'dark')} rtl={isRTL} />
          <SettingRow icon="translate" title={t('language')} detail={`${currentLanguage.flag}  ${currentLanguage.nativeLabel}`} onPress={() => setLanguageOpen(true)} rtl={isRTL} />
          <SettingRow icon="palette-outline" title="Appearance" detail="Font, accent color" onPress={() => router.push('/settings/appearance')} last rtl={isRTL} />
        </View>

        {/* ── Privacy & Account ───────────────────────────── */}
        <Text style={[styles.section, alignment, { color: colors.muted }]}>PRIVACY & ACCOUNT</Text>
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingRow icon="shield-lock-outline" title="Privacy" detail="Who can see your info" onPress={() => router.push('/settings/privacy')} rtl={isRTL} />
          <SettingRow icon="bell-badge-outline" title="Notifications" detail="Manage alerts" onPress={() => router.push('/settings/notifications-settings')} rtl={isRTL} />
          <SettingRow icon="key-outline" title="Account" detail="Password, email" onPress={() => router.push('/settings/account')} rtl={isRTL} />
          <SettingRow icon="account-off-outline" title="Blocked Users" detail="Manage blocked accounts" onPress={() => router.push('/settings/blocked')} rtl={isRTL} />
          <SettingRow icon="database-outline" title="Storage & Cache" detail="Local data" onPress={() => router.push('/settings/storage')} rtl={isRTL} />
          <SettingRow icon="bug-outline" title="Report a Problem" detail="Feedback & bugs" onPress={() => router.push('/settings/report')} rtl={isRTL} />
          <SettingRow icon="information-outline" title="About" detail="App info" onPress={() => router.push('/settings/about')} last rtl={isRTL} />
        </View>

        {/* ── Switch Accounts ─────────────────────────────── */}
        <Text style={[styles.section, alignment, { color: colors.muted }]}>ACCOUNTS</Text>
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>

          {/* Current account */}
          <View style={[styles.accountRow, { borderBottomColor: (otherAccounts.length > 0 ? colors.border : 'transparent') }]}>
            <View style={[styles.accountAvatarRing, { borderColor: colors.success }]}>
              {user.avatarUrl ? <Image source={{ uri: user.avatarUrl }} style={styles.accountAvatar} /> : <View style={[styles.accountAvatarPh, { backgroundColor: colors.accentSoft }]}><Text style={{ color: colors.accent, fontSize: 14, fontWeight: '900' }}>{user.displayName[0]?.toUpperCase() ?? '?'}</Text></View>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.accountName, { color: colors.text }]}>{user.displayName}</Text>
              <Text style={[styles.accountHandle, { color: colors.muted }]}>@{user.username}</Text>
            </View>
            <View style={[styles.activeBadge, { backgroundColor: colors.success + '18' }]}>
              <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
              <Text style={{ color: colors.success, fontSize: 11, fontWeight: '800' }}>Active</Text>
            </View>
          </View>

          {/* Other saved accounts */}
          {otherAccounts.map((acc) => (
            <View key={acc.id} style={[styles.accountRow, { borderBottomColor: colors.border }]}>
              <Pressable onPress={() => handleSwitch(acc)} style={styles.accountPressArea}>
                <View style={[styles.accountAvatarRing, { borderColor: colors.faint }]}>
                  {acc.avatarUrl ? <Image source={{ uri: acc.avatarUrl }} style={styles.accountAvatar} /> : <View style={[styles.accountAvatarPh, { backgroundColor: colors.elevated }]}><Text style={{ color: colors.muted, fontSize: 14, fontWeight: '900' }}>{acc.displayName[0]?.toUpperCase() ?? '?'}</Text></View>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.accountName, { color: colors.text }]}>{acc.displayName}</Text>
                  <Text style={[styles.accountHandle, { color: colors.muted }]}>@{acc.username}</Text>
                </View>
                <MaterialCommunityIcons name="swap-horizontal" size={18} color={colors.accent} />
              </Pressable>
              <Pressable onPress={() => handleRemoveAccount(acc)} hitSlop={8} style={styles.removeBtn}>
                <MaterialCommunityIcons name="close" size={16} color={colors.faint} />
              </Pressable>
            </View>
          ))}

          {/* Add Another Account */}
          <Pressable onPress={() => { setAddingAccount(true); router.push('/login'); }} style={({ pressed }) => [styles.accountRow, { borderBottomColor: 'transparent', opacity: pressed ? 0.6 : 1 }]}>
            <View style={[styles.accountAvatarRing, { borderColor: colors.accent + '40', borderStyle: 'dashed' }]}>
              <View style={[styles.accountAvatarPh, { backgroundColor: colors.accentSoft }]}>
                <MaterialCommunityIcons name="plus" size={18} color={colors.accent} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.accountName, { color: colors.accent }]}>Add Another Account</Text>
              <Text style={[styles.accountHandle, { color: colors.muted }]}>Log in with a different account</Text>
            </View>
            <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={colors.accent} />
          </Pressable>
        </View>

        {/* ── Log Out ─────────────────────────────────────── */}
        <Pressable onPress={() => setLogoutOpen(true)} style={({ pressed }) => [styles.logoutBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}>
          <View style={[styles.logoutIconWrap, { backgroundColor: colors.danger + '12' }]}>
            <MaterialCommunityIcons name="logout" size={20} color={colors.danger} />
          </View>
          <Text style={[styles.logoutText, { color: colors.danger }]}>Log Out</Text>
        </Pressable>

        {/* ── Delete Account ──────────────────────────────── */}
        <Pressable onPress={() => router.push('/settings/delete-account')} style={({ pressed }) => [styles.deleteBtn, { borderColor: colors.danger + '30', opacity: pressed ? 0.6 : 1 }]}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
          <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '700' }}>{t('deleteAccount')}</Text>
        </Pressable>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── Logout Modal ─────────────────────────────────── */}
      <Modal transparent animationType="fade" visible={logoutOpen} onRequestClose={() => setLogoutOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setLogoutOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => undefined}>
            <View style={[styles.modalIcon, { backgroundColor: colors.danger + '15' }]}>
              <MaterialCommunityIcons name="logout-variant" size={28} color={colors.danger} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Log Out?</Text>
            <Text style={[styles.modalDesc, { color: colors.muted }]}>You'll need to log in again to access this account.</Text>
            {otherAccounts.length > 0 ? (
              <View style={[styles.switchHint, { backgroundColor: colors.accentSoft, borderColor: colors.accent + '25' }]}>
                <MaterialCommunityIcons name="information-outline" size={14} color={colors.accent} />
                <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600', flex: 1 }}>You can switch to @{otherAccounts[0]?.username} without logging out.</Text>
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable onPress={() => setLogoutOpen(false)} style={({ pressed }) => [styles.modalCancel, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => { setLogoutOpen(false); void logout(); }} style={({ pressed }) => [styles.modalConfirm, { opacity: pressed ? 0.7 : 1 }]}>
                <MaterialCommunityIcons name="logout" size={16} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: '800' }}>Log Out</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Language Modal ────────────────────────────────── */}
      <Modal transparent animationType="fade" visible={languageOpen} onRequestClose={() => setLanguageOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setLanguageOpen(false)}>
          <Pressable style={[styles.langModal, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => undefined}>
            <View style={[styles.langHeader, direction]}>
              <Text style={[styles.langTitle, alignment, { color: colors.text }]}>{t('chooseLanguage')}</Text>
              <Pressable onPress={() => setLanguageOpen(false)} style={styles.closeBtn}><MaterialCommunityIcons name="close" size={21} color={colors.text} /></Pressable>
            </View>
            {languages.map((item) => (
              <Pressable key={item.code} onPress={() => { setLanguage(item.code as LanguageCode); setLanguageOpen(false); }} style={({ pressed }) => [styles.langRow, direction, { backgroundColor: pressed ? colors.elevated : colors.surface, borderColor: colors.border }]}>
                <Text style={styles.langFlag}>{item.flag}</Text>
                <View style={{ flex: 1 }}><Text style={[styles.langName, alignment, { color: colors.text }]}>{item.label}</Text><Text style={[styles.langNative, alignment, { color: colors.muted }]}>{item.nativeLabel}</Text></View>
                {item.code === language ? <MaterialCommunityIcons name="check" size={20} color={colors.accent} /> : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Switch Account Confirm ────────────────────────── */}
      <Modal transparent animationType="fade" visible={!!switchTarget} onRequestClose={() => setSwitchTarget(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSwitchTarget(null)}>
          <Pressable style={[styles.switchCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => undefined}>
            <View style={[styles.switchIconWrap, { backgroundColor: colors.accentSoft }]}>
              <MaterialCommunityIcons name="swap-horizontal" size={28} color={colors.accent} />
            </View>
            <Text style={[styles.switchTitle, { color: colors.text }]}>Switch Account?</Text>
            <Text style={[styles.switchDesc, { color: colors.muted }]}>Switching to:</Text>
            {switchTarget && (
              <View style={[styles.switchPreview, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                <View style={[styles.switchAvatarRing, { borderColor: colors.accent }]}>
                  {switchTarget.avatarUrl ? <Image source={{ uri: switchTarget.avatarUrl }} style={styles.switchAvatar} /> : <View style={[styles.switchAvatarPh, { backgroundColor: colors.accentSoft }]}><Text style={{ color: colors.accent, fontSize: 18, fontWeight: '900' }}>{switchTarget.displayName[0]?.toUpperCase() ?? '?'}</Text></View>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchName, { color: colors.text }]}>{switchTarget.displayName}</Text>
                  <Text style={[styles.switchHandle, { color: colors.muted }]}>@{switchTarget.username}</Text>
                </View>
              </View>
            )}
            <View style={styles.switchActions}>
              <Pressable onPress={() => setSwitchTarget(null)} style={({ pressed }) => [styles.switchCancel, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void confirmSwitch()} disabled={switchLoading} style={({ pressed }) => [styles.switchConfirm, { opacity: switchLoading ? 0.6 : pressed ? 0.7 : 1 }]}>
                {switchLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: '800' }}>Switch</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Remove Account Confirm ────────────────────────── */}
      <Modal transparent animationType="fade" visible={!!removeTarget} onRequestClose={() => setRemoveTarget(null)}>
        <Pressable style={styles.backdrop} onPress={() => setRemoveTarget(null)}>
          <Pressable style={[styles.switchCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => undefined}>
            <View style={[styles.switchIconWrap, { backgroundColor: colors.danger + '15' }]}>
              <MaterialCommunityIcons name="account-remove-outline" size={28} color={colors.danger} />
            </View>
            <Text style={[styles.switchTitle, { color: colors.text }]}>Remove Account?</Text>
            <Text style={[styles.switchDesc, { color: colors.muted }]}>This will remove the account from this device. You can log in again later.</Text>
            {removeTarget && (
              <View style={[styles.switchPreview, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                <View style={[styles.switchAvatarRing, { borderColor: colors.danger }]}>
                  {removeTarget.avatarUrl ? <Image source={{ uri: removeTarget.avatarUrl }} style={styles.switchAvatar} /> : <View style={[styles.switchAvatarPh, { backgroundColor: colors.danger + '15' }]}><Text style={{ color: colors.danger, fontSize: 18, fontWeight: '900' }}>{removeTarget.displayName[0]?.toUpperCase() ?? '?'}</Text></View>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchName, { color: colors.text }]}>{removeTarget.displayName}</Text>
                  <Text style={[styles.switchHandle, { color: colors.muted }]}>@{removeTarget.username}</Text>
                </View>
              </View>
            )}
            <View style={styles.switchActions}>
              <Pressable onPress={() => setRemoveTarget(null)} style={({ pressed }) => [styles.switchCancel, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => { void removeSavedAccount(removeTarget!.id); setRemoveTarget(null); }} style={({ pressed }) => [styles.removeConfirm, { opacity: pressed ? 0.7 : 1 }]}>
                <MaterialCommunityIcons name="trash-can-outline" size={16} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: '800' }}>Remove</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function SettingRow({ icon, title, detail, active, onPress, last, rtl }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string; detail: string; active?: boolean; onPress: () => void; last?: boolean; rtl: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.settingRow, { flexDirection: rtl ? 'row-reverse' as const : 'row' as const, backgroundColor: pressed ? colors.elevated : 'transparent', borderBottomColor: last ? 'transparent' : colors.border }]}>
      <View style={[styles.settingIcon, { backgroundColor: active ? colors.accent : colors.accentSoft }]}>
        <MaterialCommunityIcons name={icon} size={20} color={active ? colors.accentText : colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingTitle, { color: colors.text, textAlign: rtl ? 'right' as const : 'left' as const }]}>{title}</Text>
        <Text style={[styles.settingCopy, { color: colors.muted, textAlign: rtl ? 'right' as const : 'left' as const }]}>{detail}</Text>
      </View>
      <MaterialCommunityIcons name={rtl ? 'chevron-left' : 'chevron-right'} size={20} color={colors.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },

  /* Profile */
  profileCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 14, gap: 12, marginTop: 4 },
  profileAvatarRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, overflow: 'hidden' },
  profileAvatar: { width: '100%', height: '100%' },
  profileAvatarPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 16, fontWeight: '800' },
  profileHandle: { fontSize: 13, marginTop: 1 },
  profileEmail: { fontSize: 11, marginTop: 2 },

  /* Sections */
  section: { fontSize: 11, fontWeight: '800', marginTop: 16, marginBottom: 6, paddingHorizontal: 4, letterSpacing: 0.5 },
  group: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 12, gap: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingTitle: { fontSize: 14, fontWeight: '700' },
  settingCopy: { fontSize: 11, marginTop: 2 },

  /* Accounts */
  accountRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  accountPressArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  accountAvatarRing: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, overflow: 'hidden' },
  accountAvatar: { width: '100%', height: '100%' },
  accountAvatarPh: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  accountName: { fontSize: 14, fontWeight: '700' },
  accountHandle: { fontSize: 11, marginTop: 1 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeDot: { width: 7, height: 7, borderRadius: 3.5 },
  removeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  /* Buttons */
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 14, paddingVertical: 14, gap: 10, marginTop: 16 },
  logoutIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoutText: { fontSize: 15, fontWeight: '800' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 14, paddingVertical: 12, gap: 8, marginTop: 8 },

  /* Modals */
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'center', padding: 24 },
  modalCard: { borderWidth: 1, borderRadius: 20, padding: 24, alignItems: 'center', maxWidth: 400, width: '100%', alignSelf: 'center' },
  modalIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalDesc: { fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  switchHint: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, padding: 10, gap: 8, width: '100%', marginTop: 14, alignItems: 'flex-start' },
  modalActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 18 },
  modalCancel: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalConfirm: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: '#D94848', alignItems: 'center', justifyContent: 'center', gap: 6, flexDirection: 'row' },

  /* Language */
  langModal: { borderWidth: 1, borderRadius: 16, padding: 14, maxWidth: 440, width: '100%', alignSelf: 'center' },
  langHeader: { minHeight: 40, alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  langTitle: { fontSize: 17, fontWeight: '800', flex: 1 },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  langRow: { minHeight: 56, borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center', gap: 11, paddingHorizontal: 8 },
  langFlag: { fontSize: 24 },
  langName: { fontSize: 14, fontWeight: '700' },
  langNative: { fontSize: 12, marginTop: 2 },

  /* Switch/Remove confirm */
  switchCard: { borderWidth: 1, borderRadius: 20, padding: 24, alignItems: 'center', maxWidth: 380, width: '100%', alignSelf: 'center' },
  switchIconWrap: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  switchTitle: { fontSize: 18, fontWeight: '900' },
  switchDesc: { fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  switchPreview: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', padding: 12, borderRadius: 14, borderWidth: 1, marginTop: 14 },
  switchAvatarRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, overflow: 'hidden' },
  switchAvatar: { width: '100%', height: '100%' },
  switchAvatarPh: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  switchName: { fontSize: 15, fontWeight: '800' },
  switchHandle: { fontSize: 12, marginTop: 1 },
  switchActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 18 },
  switchCancel: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  switchConfirm: { flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: '#1F66FF', alignItems: 'center', justifyContent: 'center' },
  removeConfirm: { flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: '#D94848', alignItems: 'center', justifyContent: 'center', gap: 6, flexDirection: 'row' },
});
