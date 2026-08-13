import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth';
import { useTheme } from '@/theme';
import { BrandMark, ErrorText, Field, PrimaryButton } from '@/ui';

export default function RegisterScreen() {
  const { register } = useAuth();
  const { colors } = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const valid = displayName.trim() && /^[a-zA-Z0-9_]{3,32}$/.test(username) && email.includes('@') && password.length >= 8;

  const submit = async () => {
    setError(''); setLoading(true);
    try { await register({ displayName: displayName.trim(), username: username.trim(), email: email.trim(), password }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create account'); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}><BrandMark size={36} /><Text style={[styles.brandName, { color: colors.text }]}>XYTEEE</Text></View>
          <Text style={[styles.heading, { color: colors.text }]}>Make room for better conversation.</Text>
          <Text style={[styles.subheading, { color: colors.muted }]}>Start with a few details. You can refine your profile later.</Text>
          <View style={styles.form}>
            <Field value={displayName} onChangeText={setDisplayName} placeholder="Display name" autoComplete="name" />
            <Field value={username} onChangeText={setUsername} placeholder="Username" autoCapitalize="none" autoCorrect={false} />
            <Field value={email} onChangeText={setEmail} placeholder="Email address" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            <Field value={password} onChangeText={setPassword} placeholder="Password, 8 characters minimum" secureTextEntry autoComplete="new-password" onSubmitEditing={() => valid && void submit()} />
            {error ? <ErrorText>{error}</ErrorText> : null}
            <PrimaryButton title="Create account" loading={loading} disabled={!valid} onPress={() => void submit()} />
          </View>
          <View style={styles.switchRow}><Text style={{ color: colors.muted }}>Already have an account?</Text><Link href="/login" asChild><Pressable><Text style={[styles.link, { color: colors.accent }]}>Sign in</Text></Pressable></Link></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, content: { flexGrow: 1, padding: 24, paddingBottom: 36 }, brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  brandName: { fontSize: 18, fontWeight: '800' }, heading: { fontSize: 34, lineHeight: 40, fontWeight: '700', marginTop: 44, maxWidth: 440 },
  subheading: { fontSize: 15, lineHeight: 23, marginTop: 12 }, form: { gap: 12, marginTop: 28 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 7, marginTop: 22 }, link: { fontWeight: '800' },
});
