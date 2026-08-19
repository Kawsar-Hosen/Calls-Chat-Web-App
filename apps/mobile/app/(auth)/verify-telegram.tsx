import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useTheme } from '@/theme';

export default function VerifyTelegramScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const { loginWithTelegram } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const submit = async () => {
    if (code.length !== 6) return;
    setError(''); setLoading(true);
    try {
      await loginWithTelegram(phone ?? '', code);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Invalid code'); }
    finally { setLoading(false); }
  };

  const resend = async () => {
    setResent(false); setError('');
    try { await api.telegramStart(phone ?? ''); setResent(true); } catch { setError('Could not resend'); }
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
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.center}>
            <View style={[styles.iconWrap, { backgroundColor: '#2AABEE15' }]}>
              <MaterialCommunityIcons name="shield-key-outline" size={32} color="#2AABEE" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Enter Code</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              We sent a 6-digit code to you via Telegram
            </Text>
            <View style={[styles.phoneBadge, { backgroundColor: '#2AABEE10', borderColor: '#2AABEE25' }]}>
              <MaterialCommunityIcons name="phone" size={14} color="#2AABEE" />
              <Text style={styles.phoneText}>{phone}</Text>
            </View>
          </View>

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
                style={[styles.codeInput, { backgroundColor: colors.elevated, borderColor: code[i] ? '#2AABEE' : colors.border, color: colors.text }]}
              />
            ))}
          </View>

          {resent ? (
            <Text style={[styles.successText, { color: '#22C55E' }]}>Code resent!</Text>
          ) : null}

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => void submit()}
            disabled={code.length !== 6 || loading}
            style={({ pressed }) => [styles.btn, { backgroundColor: code.length !== 6 ? colors.border : '#2AABEE', opacity: pressed ? 0.85 : 1 }]}
          >
            {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.btnText}>Verify</Text>}
          </Pressable>

          <Pressable onPress={() => void resend()} style={({ pressed }) => [styles.textBtn, { opacity: pressed ? 0.6 : 1 }]}>
            <MaterialCommunityIcons name="refresh" size={16} color="#2AABEE" />
            <Text style={styles.textBtnLabel}>Resend Code</Text>
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.backRow}>
            <MaterialCommunityIcons name="arrow-left" size={18} color={colors.muted} />
            <Text style={[styles.backLabel, { color: colors.muted }]}>Change Number</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 18 },
  center: { alignItems: 'center', gap: 12, marginTop: 40, marginBottom: 24 },
  iconWrap: { width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 21, paddingHorizontal: 10 },
  phoneBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  phoneText: { color: '#2AABEE', fontSize: 14, fontWeight: '700' },
  codeRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
  codeInput: { width: 48, height: 56, borderWidth: 2, borderRadius: 14, textAlign: 'center', fontSize: 22, fontWeight: '800' },
  successText: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 14 },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600', flex: 1 },
  btn: { width: '100%', height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  textBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  textBtnLabel: { color: '#2AABEE', fontSize: 14, fontWeight: '700' },
  backRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginTop: 8 },
  backLabel: { fontSize: 14, fontWeight: '600' },
});
