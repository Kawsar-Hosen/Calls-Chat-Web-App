import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

export default function ForgotPasswordScreen() {
  const { t, isRTL } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      await api.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (reason) {
      if (reason instanceof Error && reason.message.includes('503')) {
        setError(t('fpEmailNotFound'));
        setSent(true);
      } else {
        setError(reason instanceof Error ? reason.message : 'Something went wrong');
      }
    } finally { setLoading(false); }
  };

  if (sent) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.center}>
              <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
                <MaterialCommunityIcons name="email-check-outline" size={32} color={colors.accent} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>{t('fpSent')}</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>{t('fpSentDetail')}</Text>
              <View style={[styles.emailBadge, { backgroundColor: colors.accentSoft, borderColor: colors.accent + '30' }]}>
                <MaterialCommunityIcons name="email-outline" size={16} color={colors.accent} />
                <Text style={[styles.emailText, { color: colors.accent }]}>{email.trim().toLowerCase()}</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={() => router.push({ pathname: '/(auth)/verify-code', params: { email: email.trim().toLowerCase() } })}
                style={({ pressed }) => [styles.btn, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={styles.btnText}>{t('fpVerify')}</Text>
              </Pressable>

              <Pressable onPress={() => { setSent(false); setError(''); }} style={styles.textBtn}>
                <MaterialCommunityIcons name="refresh" size={16} color={colors.accent} />
                <Text style={[styles.textBtnLabel, { color: colors.accent }]}>{t('fpResend')}</Text>
              </Pressable>

              <Pressable onPress={() => router.back()} style={styles.backRow}>
                <MaterialCommunityIcons name="arrow-left" size={18} color={colors.muted} />
                <Text style={[styles.backLabel, { color: colors.muted }]}>{t('fpBackToLogin')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.center}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
              <MaterialCommunityIcons name="lock-reset" size={32} color={colors.accent} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{t('fpTitle')}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{t('fpSubtitle')}</Text>
          </View>

          <View style={styles.form}>
            <View style={[styles.inputWrap, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
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

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => void submit()}
              disabled={!email || loading}
              style={({ pressed }) => [styles.btn, { backgroundColor: !email ? colors.border : colors.accent, opacity: pressed ? 0.85 : 1 }]}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.btnText}>{t('fpSendCode')}</Text>}
            </Pressable>

            <Pressable onPress={() => router.back()} style={styles.backRow}>
              <MaterialCommunityIcons name="arrow-left" size={18} color={colors.muted} />
              <Text style={[styles.backLabel, { color: colors.muted }]}>{t('fpBackToLogin')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 18 },
  center: { alignItems: 'center', gap: 12, marginTop: 40, marginBottom: 28 },
  iconWrap: { width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 21, paddingHorizontal: 10 },
  emailBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  emailText: { fontSize: 14, fontWeight: '700' },
  form: { gap: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600', flex: 1 },
  actions: { gap: 12, alignItems: 'center' },
  btn: { width: '100%', height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  textBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  textBtnLabel: { fontSize: 14, fontWeight: '700' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, marginTop: 8 },
  backLabel: { fontSize: 14, fontWeight: '600' },
});
