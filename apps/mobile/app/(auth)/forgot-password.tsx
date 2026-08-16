import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useI18n } from '@/i18n';
import { BrandMark, ErrorText, PrimaryButton } from '@/ui';

export default function ForgotPasswordScreen() {
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
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="email-check-outline" size={42} color="#2563EB" />
              </View>
              <Text style={styles.sentTitle}>{t('fpSent')}</Text>
              <Text style={styles.sentSubtitle}>{t('fpSentDetail')}</Text>
              <Text style={styles.maskedEmail}>{email.trim().toLowerCase()}</Text>
              <PrimaryButton title={t('fpVerify')} onPress={() => router.push({ pathname: '/(auth)/verify-code', params: { email: email.trim().toLowerCase() } })} />
              <Pressable onPress={() => { setSent(false); setError(''); }} style={styles.resendBtn}>
                <Text style={styles.resendText}>{t('fpResend')}</Text>
              </Pressable>
              <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <MaterialCommunityIcons name={isRTL ? 'arrow-right' : 'arrow-left'} size={17} color="#64748B" />
                <Text style={styles.backText}>{t('fpBackToLogin')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="lock-reset" size={42} color="#2563EB" />
            </View>
            <Text style={styles.title}>{t('fpTitle')}</Text>
            <Text style={styles.subtitle}>{t('fpSubtitle')}</Text>
            <View style={[styles.inputWrap, isRTL && styles.rowReverse]}>
              <MaterialCommunityIcons name="email-outline" size={19} color="#94A3B8" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t('authEmail')}
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
              />
            </View>
            {error ? <ErrorText>{error}</ErrorText> : null}
            <PrimaryButton title={t('fpSendCode')} loading={loading} disabled={!email} onPress={() => void submit()} />
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <MaterialCommunityIcons name={isRTL ? 'arrow-right' : 'arrow-left'} size={17} color="#64748B" />
              <Text style={styles.backText}>{t('fpBackToLogin')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  page: { flexGrow: 1, justifyContent: 'center', padding: 14, paddingTop: 72, paddingBottom: 18 },
  card: { width: '100%', maxWidth: 440, alignSelf: 'center', padding: 24, borderWidth: 1, borderColor: '#E8EDF3', borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', gap: 12 },
  iconCircle: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { color: '#111827', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: '#64748B', fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 6 },
  inputWrap: { width: '100%', minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#F8FAFC' },
  rowReverse: { flexDirection: 'row-reverse' },
  input: { flex: 1, minWidth: 0, color: '#111827', fontSize: 14, paddingVertical: 0 },
  sentTitle: { color: '#111827', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  sentSubtitle: { color: '#64748B', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  maskedEmail: { color: '#2563EB', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  resendBtn: { marginTop: 8, padding: 8 },
  resendText: { color: '#2563EB', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, padding: 8 },
  backText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
});
