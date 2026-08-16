import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { ErrorText, PrimaryButton } from '@/ui';

export default function VerifyCodeScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { colors } = useTheme();
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.accentSoft }]}>
              <MaterialCommunityIcons name="shield-key-outline" size={42} color={colors.accent} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{t('fpVerify')}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{t('fpSentDetail')}</Text>
            <Text style={[styles.emailText, { color: colors.accent }]}>{email}</Text>

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
                  style={[styles.codeInput, { color: colors.text, backgroundColor: colors.background, borderColor: code[i] ? colors.accent : colors.border }]}
                />
              ))}
            </View>

            {error ? <ErrorText>{error}</ErrorText> : null}
            <PrimaryButton title={t('fpVerify')} loading={loading} disabled={code.length !== 6} onPress={() => void submit()} />
            <Pressable onPress={() => { setCode(''); setError(''); inputs.current[0]?.focus(); }} style={styles.resendBtn}>
              <Text style={[styles.resendText, { color: colors.accent }]}>{t('fpResend')}</Text>
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
  subtitle: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  emailText: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  codeRow: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  codeInput: { width: 48, height: 56, borderWidth: 2, borderRadius: 12, textAlign: 'center', fontSize: 22, fontWeight: '800' },
  resendBtn: { marginTop: 8, padding: 8 },
  resendText: { fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
});
