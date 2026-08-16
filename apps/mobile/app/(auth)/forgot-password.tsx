import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { BrandMark, ErrorText, PrimaryButton } from '@/ui';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
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
          <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.iconCircle, { backgroundColor: colors.accentSoft }]}>
                <MaterialCommunityIcons name="email-check-outline" size={42} color={colors.accent} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>{t('fpSent')}</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>{t('fpSentDetail')}</Text>
              <Text style={[styles.maskedEmail, { color: colors.accent }]}>{email.trim().toLowerCase()}</Text>
              <PrimaryButton title={t('fpVerify')} onPress={() => router.push({ pathname: '/(auth)/verify-code', params: { email: email.trim().toLowerCase() } })} />
              <Pressable onPress={() => { setSent(false); setError(''); }} style={styles.resendBtn}>
                <Text style={[styles.resendText, { color: colors.accent }]}>{t('fpResend')}</Text>
              </Pressable>
              <Pressable onPress={() => router.back()} style={[styles.backBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name={isRTL ? 'arrow-right' : 'arrow-left'} size={17} color={colors.muted} />
                <Text style={[styles.backText, { color: colors.muted }]}>{t('fpBackToLogin')}</Text>
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
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.accentSoft }]}>
              <MaterialCommunityIcons name="lock-reset" size={42} color={colors.accent} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{t('fpTitle')}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{t('fpSubtitle')}</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }, isRTL && styles.rowReverse]}>
              <MaterialCommunityIcons name="email-outline" size={19} color={colors.muted} />
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
            {error ? <ErrorText>{error}</ErrorText> : null}
            <PrimaryButton title={t('fpSendCode')} loading={loading} disabled={!email} onPress={() => void submit()} />
            <Pressable onPress={() => router.back()} style={[styles.backBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name={isRTL ? 'arrow-right' : 'arrow-left'} size={17} color={colors.muted} />
              <Text style={[styles.backText, { color: colors.muted }]}>{t('fpBackToLogin')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  page: { flexGrow: 1, justifyContent: 'center', padding: 14, paddingTop: 72, paddingBottom: 18 },
  card: { width: '100%', maxWidth: 440, alignSelf: 'center', padding: 24, borderWidth: 1, borderRadius: 20, alignItems: 'center', gap: 14 },
  iconCircle: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 6 },
  inputWrap: { width: '100%', minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: 12 },
  rowReverse: { flexDirection: 'row-reverse' },
  input: { flex: 1, minWidth: 0, fontSize: 14, paddingVertical: 0 },
  maskedEmail: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  resendBtn: { marginTop: 8, padding: 8 },
  resendText: { fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  backBtn: { alignItems: 'center', gap: 4, marginTop: 10, padding: 8 },
  backText: { fontSize: 13, fontWeight: '600' },
});
