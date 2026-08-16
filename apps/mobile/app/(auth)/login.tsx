import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth';
import { useI18n } from '@/i18n';
import { AuthTopBar } from '@/authTopBar';
import { GoogleButton, useGoogleSignIn } from '@/google';
import { BrandMark, ErrorText, PrimaryButton } from '@/ui';

export default function LoginScreen() {
  const { login, loginWithGoogle } = useAuth();
  const { t, isRTL } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const google = useGoogleSignIn(async (idToken) => { await loginWithGoogle(idToken); });

  const submit = async () => {
    setError(''); setLoading(true);
    try { await login(email.trim(), password); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('authUnableSignin')); }
    finally { setLoading(false); }
  };

  return <SafeAreaView style={styles.safe}>
    <AuthTopBar mode="login" />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={[styles.brand, isRTL && styles.rowReverse]}><BrandMark size={36} /><Text style={styles.brandName}>XYTEEE</Text></View>
          <View style={styles.heading}><Text style={styles.title}>{t('authWelcome')}</Text><Text style={styles.subtitle}>{t('authLoginSubtitle')}</Text></View>
          <View style={styles.form}>
            <AuthField icon="email-outline" value={email} onChangeText={setEmail} placeholder={t('authEmail')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            <AuthField icon="lock-outline" value={password} onChangeText={setPassword} placeholder={t('authPassword')} secureTextEntry={!showPassword} autoComplete="current-password" onSubmitEditing={() => void submit()} right={<Pressable accessibilityLabel={showPassword ? t('authHidePassword') : t('authShowPassword')} onPress={() => setShowPassword((value) => !value)} style={styles.eye}><MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color="#94A3B8" /></Pressable>} />
            <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={[styles.forgot, isRTL && styles.forgotRTL]}><Text style={styles.link}>{t('authForgotPassword')}</Text></Pressable>
            {error ? <ErrorText>{error}</ErrorText> : null}
            <PrimaryButton title={t('authContinue')} loading={loading} disabled={!email || !password} onPress={() => void submit()} />
          </View>
          <Divider />
          {google.error ? <ErrorText>{google.error}</ErrorText> : null}
          <GoogleButton label={t('authContinueGoogle')} onPress={() => void google.prompt()} busy={google.busy} />
          <View style={[styles.switchRow, isRTL && styles.rowReverse]}><Text style={styles.switchCopy}>{t('authNoAccount')}</Text><Link href="/register" asChild><Pressable><Text style={styles.linkStrong}>{t('authSignup')}</Text></Pressable></Link></View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

type AuthFieldProps = React.ComponentProps<typeof TextInput> & { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; right?: React.ReactNode };
function AuthField({ icon, right, ...props }: AuthFieldProps) {
  const { isRTL } = useI18n();
  return <View style={[styles.inputWrap, isRTL && styles.rowReverse]}><MaterialCommunityIcons name={icon} size={19} color="#94A3B8" /><TextInput placeholderTextColor="#9CA3AF" {...props} style={[styles.input, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} />{right}</View>;
}

function Divider() { const { t } = useI18n(); return <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>{t('authOr')}</Text><View style={styles.line} /></View>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' }, page: { flexGrow: 1, justifyContent: 'center', padding: 14, paddingTop: 72, paddingBottom: 18 }, card: { width: '100%', maxWidth: 440, alignSelf: 'center', padding: 20, borderWidth: 1, borderColor: '#E8EDF3', borderRadius: 18, backgroundColor: '#FFFFFF' }, brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, rowReverse: { flexDirection: 'row-reverse' }, brandName: { color: '#111827', fontSize: 18, fontWeight: '800' }, heading: { marginTop: 20, marginBottom: 18, alignItems: 'center' }, title: { color: '#111827', fontSize: 24, lineHeight: 30, fontWeight: '800', textAlign: 'center' }, subtitle: { color: '#64748B', fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' }, form: { gap: 11 }, inputWrap: { minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#F8FAFC' }, input: { flex: 1, minWidth: 0, color: '#111827', fontSize: 14, paddingVertical: 0 }, eye: { width: 30, height: 38, alignItems: 'center', justifyContent: 'center' }, forgot: { alignSelf: 'flex-end', marginTop: -3 }, forgotRTL: { alignSelf: 'flex-start' }, link: { color: '#2563EB', fontSize: 12, fontWeight: '700' }, divider: { marginVertical: 17, flexDirection: 'row', alignItems: 'center', gap: 12 }, line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB' }, or: { color: '#94A3B8', fontSize: 12 }, switchRow: { marginTop: 18, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 6 }, switchCopy: { color: '#64748B', fontSize: 13 }, linkStrong: { color: '#2563EB', fontSize: 13, fontWeight: '800' },
});
