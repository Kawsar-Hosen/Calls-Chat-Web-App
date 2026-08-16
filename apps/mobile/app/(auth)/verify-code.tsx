import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useI18n } from '@/i18n';
import { BrandMark, ErrorText, PrimaryButton } from '@/ui';

export default function VerifyCodeScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { t, isRTL } = useI18n();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputs = useRef<(TextInput | null)[]>([]);

  const submit = async () => {
    if (code.length !== 6) return;
    setError(''); setLoading(true);
    try {
      await api.verifyResetCode(email ?? '', code);
      router.push({ pathname: '/(auth)/reset-password', params: { email: email ?? '', code } });
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('fpInvalidCode')); }
    finally { setLoading(false); }
  };

  const handleChange = useCallback((text: string, index: number) => {
    const cleaned = text.replace(/\D/g, '').slice(-1);
    const next = [...code.split(''), '', '', '', '', '', ''];
    next[index] = cleaned;
    const newCode = next.join('').slice(0, 6);
    setCode(newCode);
    if (cleaned && index < 5) inputs.current[index + 1]?.focus();
  }, [code]);

  const handleKeyPress = useCallback((e: { nativeEvent: { key: string } }, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }, [code]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="shield-key-outline" size={42} color="#2563EB" />
            </View>
            <Text style={styles.title}>{t('fpVerify')}</Text>
            <Text style={styles.subtitle}>{t('fpSentDetail')}</Text>
            <Text style={styles.emailText}>{email}</Text>

            <View style={styles.codeRow}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <TextInput
                  key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  value={code[i] ?? ''}
                  onChangeText={(t) => handleChange(t, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  style={[styles.codeInput, code[i] ? styles.codeInputFilled : null]}
                />
              ))}
            </View>

            {error ? <ErrorText>{error}</ErrorText> : null}
            <PrimaryButton title={t('fpVerify')} loading={loading} disabled={code.length !== 6} onPress={() => void submit()} />
            <Pressable onPress={() => { setCode(''); setError(''); inputs.current[0]?.focus(); }} style={styles.resendBtn}>
              <Text style={styles.resendText}>{t('fpResend')}</Text>
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
  subtitle: { color: '#64748B', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  emailText: { color: '#2563EB', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  codeRow: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  codeInput: { width: 48, height: 56, borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 12, textAlign: 'center', fontSize: 22, fontWeight: '800', color: '#111827', backgroundColor: '#F8FAFC' },
  codeInputFilled: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  resendBtn: { marginTop: 8, padding: 8 },
  resendText: { color: '#2563EB', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
});
