import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';
import { ErrorText } from '@/ui';

export default function DeleteAccountScreen() {
  const { logout } = useAuth();
  const { colors } = useTheme();
  const { isRTL, t } = useI18n();
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const alignment = { textAlign: isRTL ? 'right' as const : 'left' as const };
  const direction = { flexDirection: isRTL ? 'row-reverse' as const : 'row' as const };

  const sendCode = async () => {
    if (!password) { setError(t('authPassword')); return; }
    setSending(true); setError('');
    try {
      const result = await api.requestAccountDeletion(password);
      setMaskedEmail(result.email_masked);
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('couldNotRequestDeletion'));
    } finally {
      setSending(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true); setError('');
    try {
      await api.deleteAccount(password, code.trim());
      await logout();
      router.replace('/');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('couldNotDeleteAccount'));
      setDeleting(false);
    }
  };

  const confirmDelete = () => {
    if (!password || code.trim().length !== 6) { setError(t('verificationCode')); return; }
    Alert.alert(t('deleteAccountWarningTitle'), t('deleteAccountWarningCopy'), [
      { text: 'Cancel', style: 'cancel' },
      { text: t('permanentlyDelete'), style: 'destructive', onPress: () => void doDelete() },
    ]);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('deleteAccount')}</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.hero, { backgroundColor: colors.danger + '14', borderColor: colors.danger }]}>
            <View style={[styles.heroIcon, { backgroundColor: colors.danger }]}><MaterialCommunityIcons name="shield-alert-outline" size={22} color="#FFFFFF" /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, alignment, { color: colors.text }]}>{t('deleteAccountWarningTitle')}</Text>
              <Text style={[styles.heroCopy, alignment, { color: colors.muted }]}>{t('deleteAccountWarningCopy')}</Text>
            </View>
          </View>

          <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>{t('account').toUpperCase()}</Text>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <LoseRow icon="message-text-outline" label={t('loseMessages')} rtl={isRTL} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <LoseRow icon="account-group-outline" label={t('loseFriends')} rtl={isRTL} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <LoseRow icon="image-multiple-outline" label={t('loseMedia')} rtl={isRTL} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <LoseRow icon="account-cog-outline" label={t('loseProfile')} rtl={isRTL} />
          </View>

          {!sent ? (
            <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formTitle, alignment, { color: colors.text }]}>{t('deleteAccountEnterPassword')}</Text>
              <Field value={password} onChangeText={setPassword} placeholder={t('authPassword')} secureTextEntry autoCapitalize="none" rtl={isRTL} />
              <Pressable onPress={() => void sendCode()} disabled={sending} style={({ pressed }) => [styles.sendBtn, { backgroundColor: colors.accent, opacity: sending ? 0.55 : pressed ? 0.82 : 1 }]}>
                <Text style={styles.sendBtnText}>{sending ? '…' : t('sendVerificationCode')}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.sentBanner, direction, { backgroundColor: colors.success + '14', borderColor: colors.success }]}>
                <MaterialCommunityIcons name="email-check-outline" size={20} color={colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sentTitle, alignment, { color: colors.text }]}>{t('codeSentTo')}</Text>
                  <Text style={[styles.sentCopy, alignment, { color: colors.muted }]}>{maskedEmail} · {t('codeSentToDetail')}</Text>
                </View>
              </View>
              <Field value={code} onChangeText={(text) => setCode(text.replace(/\D/g, ''))} placeholder={t('verificationCode')} keyboardType="number-pad" maxLength={6} rtl={isRTL} />
              <Text style={[styles.codeHint, alignment, { color: colors.muted }]}>{t('codeFromEmail')}</Text>
              <Field value={password} onChangeText={setPassword} placeholder={t('authPassword')} secureTextEntry autoCapitalize="none" rtl={isRTL} />
              <Pressable onPress={confirmDelete} disabled={deleting} style={({ pressed }) => [styles.deleteBtn, { backgroundColor: colors.danger, opacity: deleting ? 0.55 : pressed ? 0.82 : 1 }]}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FFFFFF" />
                <Text style={styles.deleteBtnText}>{deleting ? '…' : t('permanentlyDelete')}</Text>
              </Pressable>
            </View>
          )}

          {error ? <ErrorText>{error}</ErrorText> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LoseRow({ icon, label, rtl }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; rtl: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.loseRow, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
      <View style={[styles.loseIcon, { backgroundColor: colors.danger + '14' }]}><MaterialCommunityIcons name={icon} size={20} color={colors.danger} /></View>
      <Text style={[styles.loseLabel, { color: colors.text, textAlign: rtl ? 'right' : 'left' }]}>{label}</Text>
      <MaterialCommunityIcons name="close" size={16} color={colors.faint} />
    </View>
  );
}

function Field({ rtl, ...props }: React.ComponentProps<typeof TextInput> & { rtl: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }, rtl ? { flexDirection: 'row-reverse' } : null]}>
      <TextInput placeholderTextColor={colors.faint} {...props} style={[styles.input, { color: colors.text, textAlign: rtl ? 'right' : 'left' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  iconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', flex: 1, textAlign: 'center' },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 6 },
  heroIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 15, fontWeight: '900' },
  heroCopy: { fontSize: 12, marginTop: 5, lineHeight: 18 },
  sectionLabel: { fontSize: 10, fontWeight: '900', marginTop: 10, marginBottom: -2, letterSpacing: 1 },
  card: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 55 },
  loseRow: { minHeight: 58, alignItems: 'center', gap: 13, paddingVertical: 10 },
  loseIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  loseLabel: { flex: 1, fontSize: 14, fontWeight: '700' },
  formCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  formTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  inputWrap: { minHeight: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' },
  input: { flex: 1, minHeight: 48, fontSize: 15, paddingVertical: 0 },
  sendBtn: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  sendBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  sentBanner: { borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 11 },
  sentTitle: { fontSize: 13, fontWeight: '800' },
  sentCopy: { fontSize: 11, marginTop: 2, lineHeight: 16 },
  codeHint: { fontSize: 11, marginTop: -6, lineHeight: 16 },
  deleteBtn: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 7, flexDirection: 'row', marginTop: 2 },
  deleteBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
});
