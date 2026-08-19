import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

export default function ResetPasswordScreen() {
  const { email, code } = useLocalSearchParams<{ email: string; code: string }>();
  const { t, isRTL } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (password !== confirm) { setError(t('authPasswordsMismatch')); return; }
    setError(''); setLoading(true);
    try {
      await api.resetPassword(email ?? '', code ?? '', password);
      setDone(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Something went wrong'); }
    finally { setLoading(false); }
  };

  if (done) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.doneWrap}>
          <View style={[styles.doneIcon, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <MaterialCommunityIcons name="check-bold" size={36} color="#16A34A" />
          </View>
          <Text style={[styles.doneTitle, { color: colors.text }]}>{t('fpResetDone')}</Text>
          <Text style={[styles.doneSubtitle, { color: colors.muted }]}>{t('fpResetDoneDetail')}</Text>
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            style={({ pressed }) => [styles.btn, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.btnText}>{t('fpBackToLogin')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.center}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
              <MaterialCommunityIcons name="lock-plus" size={32} color={colors.accent} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{t('fpNewPassword')}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{t('fpNewPasswordHint')}</Text>
          </View>

          <View style={styles.form}>
            <View style={[styles.inputWrap, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="lock-outline" size={19} color={colors.faint} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={t('fpNewPassword')}
                placeholderTextColor={colors.faint}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={[styles.input, { color: colors.text, textAlign: isRTL ? 'right' : 'left', flex: 1 }]}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.faint} />
              </Pressable>
            </View>

            <View style={[styles.inputWrap, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="lock-check-outline" size={19} color={colors.faint} />
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder={t('fpConfirmPassword')}
                placeholderTextColor={colors.faint}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={[styles.input, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
              />
            </View>

            {password.length > 0 && password.length < 8 && (
              <Text style={[styles.hint, { color: colors.danger }]}>At least 8 characters</Text>
            )}

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => void submit()}
              disabled={!password || !confirm || password.length < 8 || loading}
              style={({ pressed }) => [styles.btn, { backgroundColor: !password || !confirm || password.length < 8 ? colors.border : colors.accent, opacity: pressed ? 0.85 : 1 }]}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.btnText}>{t('fpReset')}</Text>}
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
  form: { gap: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  eyeBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 12, fontWeight: '600' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600', flex: 1 },
  btn: { width: '100%', height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  doneIcon: { width: 80, height: 80, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  doneSubtitle: { fontSize: 15, lineHeight: 21, textAlign: 'center', paddingHorizontal: 10 },
});
