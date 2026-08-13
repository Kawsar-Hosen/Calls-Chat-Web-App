import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth';
import { useTheme } from '@/theme';
import { BrandMark, ErrorText, Field, PrimaryButton } from '@/ui';

export default function LoginScreen() {
  const { login } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}><BrandMark /><Text style={[styles.brandName, { color: colors.text }]}>XYTEEE</Text></View>
          <View style={styles.intro}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>WELCOME BACK</Text>
            <Text style={[styles.heading, { color: colors.text }]}>Continue the conversation.</Text>
            <Text style={[styles.subheading, { color: colors.muted }]}>Your people and messages, ready when you are.</Text>
          </View>
          <View style={styles.form}>
            <Field value={email} onChangeText={setEmail} placeholder="Email address" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            <Field value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry autoComplete="current-password" onSubmitEditing={() => void submit()} />
            {error ? <ErrorText>{error}</ErrorText> : null}
            <PrimaryButton title="Sign in" loading={loading} disabled={!email || !password} onPress={() => void submit()} />
          </View>
          <View style={styles.switchRow}><Text style={{ color: colors.muted }}>New here?</Text><Link href="/register" asChild><Pressable><Text style={[styles.link, { color: colors.accent }]}>Create an account</Text></Pressable></Link></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, content: { flexGrow: 1, padding: 24, paddingBottom: 36 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 10 }, brandName: { fontSize: 19, fontWeight: '800' },
  intro: { marginTop: 'auto', paddingTop: 70, maxWidth: 420 }, eyebrow: { fontSize: 11, fontWeight: '900', marginBottom: 10 },
  heading: { fontSize: 38, lineHeight: 43, fontWeight: '700' }, subheading: { fontSize: 16, lineHeight: 24, marginTop: 13 },
  form: { gap: 14, marginTop: 34 }, switchRow: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginTop: 24 }, link: { fontWeight: '800' },
});
