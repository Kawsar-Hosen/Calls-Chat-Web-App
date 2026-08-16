import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useI18n } from '@/i18n';
import { BrandMark, ErrorText, PrimaryButton } from '@/ui';

export default function ResetPasswordScreen() {
  const { email, code } = useLocalSearchParams<{ email: string; code: string }>();
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
      <SafeAreaView style={styles.safe}>
        <View style={styles.doneContainer}>
          <View style={styles.doneIconCircle}>
            <MaterialCommunityIcons name="check-bold" size={48} color="#16A34A" />
          </View>
          <Text style={styles.doneTitle}>{t('fpResetDone')}</Text>
          <Text style={styles.doneSubtitle}>{t('fpResetDoneDetail')}</Text>
          <PrimaryButton title={t('fpBackToLogin')} onPress={() => router.replace('/(auth)/login')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="lock-plus" size={42} color="#2563EB" />
            </View>
            <Text style={styles.title}>{t('fpNewPassword')}</Text>
            <Text style={styles.subtitle}>{t('fpNewPasswordHint')}</Text>

            <View style={[styles.inputWrap, isRTL && styles.rowReverse]}>
              <MaterialCommunityIcons name="lock-outline" size={19} color="#94A3B8" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={t('fpNewPassword')}
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eye}>
                <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color="#94A3B8" />
              </Pressable>
            </View>

            <View style={[styles.inputWrap, isRTL && styles.rowReverse]}>
              <MaterialCommunityIcons name="lock-check-outline" size={19} color="#94A3B8" />
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder={t('fpConfirmPassword')}
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
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
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  page: { flexGrow: 1, justifyContent: 'center', padding: 14, paddingTop: 72, paddingBottom: 18 },
  card: { width: '100%', maxWidth: 440, alignSelf: 'center', padding: 24, borderWidth: 1, borderColor: '#E8EDF3', borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', gap: 12 },
  iconCircle: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { color: '#111827', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: '#64748B', fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 6 },
  inputWrap: { width: '100%', minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#F8FAFC' },
  input: { flex: 1, minWidth: 0, color: '#111827', fontSize: 14, paddingVertical: 0 },
  rowReverse: { flexDirection: 'row-reverse' },
  eye: { width: 30, height: 38, alignItems: 'center', justifyContent: 'center' },
  doneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F8FAFC' },
  doneIconCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#F0FDF4', borderWidth: 3, borderColor: '#BBF7D0', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  doneTitle: { color: '#111827', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  doneSubtitle: { color: '#64748B', fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 28, maxWidth: 300 },
});
