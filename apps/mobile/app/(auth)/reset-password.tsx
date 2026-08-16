import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { ErrorText, PrimaryButton } from '@/ui';

export default function ResetPasswordScreen() {
  const { email, code } = useLocalSearchParams<{ email: string; code: string }>();
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
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
        <View style={styles.doneContainer}>
          <View style={[styles.doneIconCircle, { backgroundColor: colors.success + '18', borderColor: colors.success + '40' }]}>
            <MaterialCommunityIcons name="check-bold" size={48} color={colors.success} />
          </View>
          <Text style={[styles.doneTitle, { color: colors.text }]}>{t('fpResetDone')}</Text>
          <Text style={[styles.doneSubtitle, { color: colors.muted }]}>{t('fpResetDoneDetail')}</Text>
          <PrimaryButton title={t('fpBackToLogin')} onPress={() => router.replace('/(auth)/login')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.accentSoft }]}>
              <MaterialCommunityIcons name="lock-plus" size={42} color={colors.accent} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{t('fpNewPassword')}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{t('fpNewPasswordHint')}</Text>

            <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }, isRTL && styles.rowReverse]}>
              <MaterialCommunityIcons name="lock-outline" size={19} color={colors.muted} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={t('fpNewPassword')}
                placeholderTextColor={colors.faint}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={[styles.input, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eye}>
                <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.muted} />
              </Pressable>
            </View>

            <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }, isRTL && styles.rowReverse]}>
              <MaterialCommunityIcons name="lock-check-outline" size={19} color={colors.muted} />
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

            {error ? <ErrorText>{error}</ErrorText> : null}
            <PrimaryButton
              title={t('fpReset')}
              loading={loading}
              disabled={!password || !confirm || password.length < 8}
              onPress={() => void submit()}
            />
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
  input: { flex: 1, minWidth: 0, fontSize: 14, paddingVertical: 0 },
  rowReverse: { flexDirection: 'row-reverse' },
  eye: { width: 30, height: 38, alignItems: 'center', justifyContent: 'center' },
  doneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  doneIconCircle: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  doneTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  doneSubtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 28, maxWidth: 300 },
});
