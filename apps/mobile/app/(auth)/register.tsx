import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth';
import { useI18n } from '@/i18n';
import { AuthTopBar } from '@/authTopBar';
import { GoogleButton, useGoogleSignIn } from '@/google';
import { BrandMark, ErrorText, PrimaryButton } from '@/ui';

export default function RegisterScreen() {
  const { register, loginWithGoogle } = useAuth();
  const { t, isRTL } = useI18n();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const google = useGoogleSignIn(async (idToken) => { await loginWithGoogle(idToken); });
  const valid = Boolean(displayName.trim() && /^[a-zA-Z0-9_]{3,32}$/.test(username) && email.includes('@') && password.length >= 8 && confirmPassword.length >= 8);

  const submit = async () => {
    if (password !== confirmPassword) { setError(t('authPasswordsMismatch')); return; }
    setError(''); setLoading(true);
    try { await register({ displayName: displayName.trim(), username: username.trim(), email: email.trim(), password }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('authUnableCreate')); }
    finally { setLoading(false); }
  };

  return <SafeAreaView style={styles.safe}>
    <AuthTopBar mode="register" />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={[styles.brand, isRTL && styles.rowReverse]}><BrandMark size={36} /><Text style={styles.brandName}>XYTEEE</Text></View>
          <View style={styles.heading}><Text style={styles.title}>{t('authCreate')}</Text><Text style={styles.subtitle}>{t('authRegisterSubtitle')}</Text></View>
          <View style={styles.form}>
            <AuthField icon="account-outline" value={displayName} onChangeText={setDisplayName} placeholder={t('authFullName')} autoComplete="name" />
            <AuthField icon="at" value={username} onChangeText={setUsername} placeholder={t('authUsername')} autoCapitalize="none" autoCorrect={false} />
            <AuthField icon="email-outline" value={email} onChangeText={setEmail} placeholder={t('authEmail')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            <AuthField icon="lock-outline" value={password} onChangeText={setPassword} placeholder={t('authPasswordMinimum')} secureTextEntry={!showPassword} autoComplete="new-password" right={<Pressable accessibilityLabel={showPassword ? t('authHidePassword') : t('authShowPassword')} onPress={() => setShowPassword((value) => !value)} style={styles.eye}><MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color="#94A3B8" /></Pressable>} />
            <AuthField icon="lock-check-outline" value={confirmPassword} onChangeText={setConfirmPassword} placeholder={t('authConfirmPassword')} secureTextEntry={!showPassword} autoComplete="new-password" onSubmitEditing={() => valid && void submit()} />
            {error ? <ErrorText>{error}</ErrorText> : null}
            <PrimaryButton title={t('authCreateAccount')} loading={loading} disabled={!valid} onPress={() => void submit()} />
          </View>
          <Divider />
          {google.error ? <ErrorText>{google.error}</ErrorText> : null}
          <GoogleButton label={t('authSignupGoogle')} onPress={() => void google.prompt()} busy={google.busy} />
          <View style={[styles.switchRow, isRTL && styles.rowReverse]}><Text style={styles.switchCopy}>{t('authHaveAccount')}</Text><Link href="/login" asChild><Pressable><Text style={styles.linkStrong}>{t('authSignin')}</Text></Pressable></Link></View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

type AuthFieldProps = React.ComponentProps<typeof TextInput> & { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; right?: React.ReactNode };
function AuthField({ icon, right, ...props }: AuthFieldProps) { const { isRTL } = useI18n(); return <View style={[styles.inputWrap, isRTL && styles.rowReverse]}><MaterialCommunityIcons name={icon} size={19} color="#94A3B8" /><TextInput placeholderTextColor="#9CA3AF" {...props} style={[styles.input, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} />{right}</View>; }
function Divider() { const { t } = useI18n(); return <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>{t('authOr')}</Text><View style={styles.line} /></View>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' }, page: { flexGrow: 1, justifyContent: 'center', padding: 14, paddingTop: 72, paddingBottom: 18 }, card: { width: '100%', maxWidth: 440, alignSelf: 'center', padding: 20, borderWidth: 1, borderColor: '#E8EDF3', borderRadius: 18, backgroundColor: '#FFFFFF' }, brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, rowReverse: { flexDirection: 'row-reverse' }, brandName: { color: '#111827', fontSize: 18, fontWeight: '800' }, heading: { marginTop: 20, marginBottom: 18, alignItems: 'center' }, title: { color: '#111827', fontSize: 24, lineHeight: 30, fontWeight: '800', textAlign: 'center' }, subtitle: { color: '#64748B', fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' }, form: { gap: 10 }, inputWrap: { minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#F8FAFC' }, input: { flex: 1, minWidth: 0, color: '#111827', fontSize: 14, paddingVertical: 0 }, eye: { width: 30, height: 38, alignItems: 'center', justifyContent: 'center' }, divider: { marginVertical: 17, flexDirection: 'row', alignItems: 'center', gap: 12 }, line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB' }, or: { color: '#94A3B8', fontSize: 12 }, switchRow: { marginTop: 18, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 6 }, switchCopy: { color: '#64748B', fontSize: 13 }, linkStrong: { color: '#2563EB', fontSize: 13, fontWeight: '800' },
});
