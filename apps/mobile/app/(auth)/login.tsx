import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth';
import { useI18n } from '@/i18n';
import { useGoogleSignIn } from '@/google';
import { useFacebookSignIn } from '@/facebook';
import { useTheme } from '@/theme';

function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
      <Path d="M5.3 14.7l7.4 5.4C14.3 16.2 18.8 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 15.4 2 8.1 7.3 5.3 14.7z" fill="#FF3D00"/>
      <Path d="M24 46c5.4 0 10.3-1.8 14.1-5l-6.5-5.5C29.5 37.1 26.9 38 24 38c-6 0-11.1-4-12.8-9.5l-7.3 5.6C7 41.2 14.9 46 24 46z" fill="#4CAF50"/>
      <Path d="M44.5 20H24v8.5h11.8c-1 3.2-3 5.8-5.6 7.5l6.5 5.5c3.8-3.5 7.3-9.5 7.3-17.5 0-1.3-.2-2.7-.5-4z" fill="#1976D2"/>
    </Svg>
  );
}

function FacebookLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12z" fill="#1877F2"/>
    </Svg>
  );
}

function TelegramLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Circle cx={24} cy={24} r={24} fill="#2AABEE"/>
      <Path d="M10.6 23.4c5.2-2.3 8.7-3.8 10.4-4.5 4.8-1.8 5.8-2.1 6.5-2.1.2 0 .5 0 .7.3.2.2.2.4.2.6 0 .1 0 .4-.1.6-.3 3.5-1.5 12-2.1 15.9-.3 1.7-.8 2.2-1.4 2.3-1.2.1-2.2-.8-3.4-1.6-1.8-1.2-2.8-1.9-4.5-3.1-2-1.3-.7-2 .4-3.2.3-.3 5.2-4.8 5.3-5.2 0-.1 0-.2-.1-.3-.1-.1-.2-.1-.3 0-.2 0-2.9 1.8-8.2 5.4-.8.5-1.5.8-2.1.8-.7 0-2-.4-3-1.1-1.1-.8-1.6-1.6-1.5-2.5.1-.5.6-.9 1.4-1.4z" fill="#FFFFFF"/>
    </Svg>
  );
}

export default function LoginScreen() {
  const { login, loginWithGoogle, loginWithFacebook, addingAccount, setAddingAccount } = useAuth();
  const { t, isRTL } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const google = useGoogleSignIn(async (idToken) => { await loginWithGoogle(idToken); });
  const facebook = useFacebookSignIn(async (accessToken) => { await loginWithFacebook(accessToken); });

  const submit = async () => {
    setError(''); setLoading(true);
    try { await login(email.trim(), password); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('authUnableSignin')); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {addingAccount ? (
        <Pressable onPress={() => { setAddingAccount(false); router.back(); }} style={styles.backRow}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={colors.accent} />
          <Text style={[styles.backText, { color: colors.accent }]}>Back to Settings</Text>
        </Pressable>
      ) : null}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <View style={styles.topSection}>
            <View style={styles.logoWrap}>
              <View style={[styles.logoCircle, { backgroundColor: colors.accent + '10' }]}>
                <MaterialCommunityIcons name="chat" size={32} color={colors.accent} />
              </View>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{t('authWelcome')}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{t('authLoginSubtitle')}</Text>
          </View>

          <View style={styles.formSection}>
            <View style={[styles.inputGroup, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="email-outline" size={19} color={colors.faint} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t('authEmail')}
                placeholderTextColor={colors.faint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={[styles.input, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
              />
            </View>

            <View style={[styles.inputGroup, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="lock-outline" size={19} color={colors.faint} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={t('authPassword')}
                placeholderTextColor={colors.faint}
                secureTextEntry={!showPassword}
                autoComplete="current-password"
                onSubmitEditing={() => void submit()}
                style={[styles.input, { color: colors.text, textAlign: isRTL ? 'right' : 'left', flex: 1 }]}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.faint} />
              </Pressable>
            </View>

            <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={[styles.forgotRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={[styles.forgotText, { color: colors.accent }]}>{t('authForgotPassword')}</Text>
            </Pressable>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => void submit()}
              disabled={!email || !password || loading}
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: (!email || !password) ? colors.border : colors.accent, opacity: pressed ? 0.85 : 1 }
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.btnText}>{t('authContinue')}</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerOr, { color: colors.faint }]}>{t('authOr')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <Pressable
            onPress={() => void google.prompt()}
            disabled={google.busy}
            style={({ pressed }) => [styles.socialBtn, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
          >
            {google.busy ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <>
                <GoogleLogo />
                <Text style={[styles.socialBtnText, { color: colors.text }]}>{t('authContinueGoogle')}</Text>
              </>
            )}
          </Pressable>
          {google.error ? <Text style={[styles.googleError, { color: '#DC2626' }]}>{google.error}</Text> : null}

          <Pressable
            onPress={() => void facebook.prompt()}
            disabled={facebook.busy}
            style={({ pressed }) => [styles.socialBtn, { borderColor: '#1877F220', backgroundColor: '#1877F208' }, pressed && { opacity: 0.7 }]}
          >
            {facebook.busy ? (
              <ActivityIndicator size="small" color="#1877F2" />
            ) : (
              <>
                <FacebookLogo />
                <Text style={[styles.socialBtnText, { color: '#1877F2' }]}>Continue with Facebook</Text>
              </>
            )}
          </Pressable>
          {facebook.error ? <Text style={[styles.googleError, { color: '#DC2626' }]}>{facebook.error}</Text> : null}

          <Pressable
            onPress={() => router.push('/(auth)/enter-phone')}
            style={({ pressed }) => [styles.socialBtn, { borderColor: '#2AABEE20', backgroundColor: '#2AABEE08' }, pressed && { opacity: 0.7 }]}
          >
            <TelegramLogo />
            <Text style={[styles.socialBtnText, { color: '#2AABEE' }]}>Continue with Telegram</Text>
          </Pressable>
        </View>

        <View style={[styles.bottomRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.bottomText, { color: colors.muted }]}>{t('authNoAccount')}</Text>
          <Link href="/register" asChild>
            <Pressable>
              <Text style={[styles.bottomLink, { color: colors.accent }]}>{t('authSignup')}</Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10 },
  backText: { fontSize: 14, fontWeight: '700' },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 24 },
  topSection: { alignItems: 'center', gap: 12 },
  logoWrap: { marginBottom: 8 },
  logoCircle: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
  formSection: { gap: 14 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  eyeBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  forgotRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  forgotText: { fontSize: 13, fontWeight: '600' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600', flex: 1 },
  btn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerOr: { fontSize: 12, fontWeight: '600' },
  socialBtn: { height: 52, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  socialBtnText: { fontSize: 15, fontWeight: '700' },
  googleError: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: -4 },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 18, borderTopWidth: StyleSheet.hairlineWidth },
  bottomText: { fontSize: 14 },
  bottomLink: { fontSize: 14, fontWeight: '800' },
});
