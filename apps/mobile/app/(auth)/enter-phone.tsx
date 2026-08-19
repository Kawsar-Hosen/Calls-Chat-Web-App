import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useTheme } from '@/theme';

export default function EnterPhoneScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [phone, setPhone] = useState('+880');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (phone.length < 8) return;
    setError(''); setLoading(true);
    try {
      await api.telegramStart(phone.trim());
      router.push({ pathname: '/(auth)/verify-telegram', params: { phone: phone.trim() } });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not send code'); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.center}>
            <View style={[styles.iconWrap, { backgroundColor: '#2AABEE15' }]}>
              <View style={styles.telegramIconWrap}>
                <MaterialCommunityIcons name="send" size={24} color="#FFFFFF" />
              </View>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Telegram Verification</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Enter your Telegram phone number. We'll send a verification code via Telegram bot.
            </Text>
          </View>

          <View style={[styles.hintBox, { backgroundColor: '#2AABEE10', borderColor: '#2AABEE25' }]}>
            <MaterialCommunityIcons name="information-outline" size={16} color="#2AABEE" />
            <Text style={styles.hintText}>
              Make sure you have started a chat with{'\n'}@xyteee_auth_bot on Telegram first
            </Text>
          </View>

          <View style={styles.form}>
            <View style={[styles.inputWrap, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="phone-outline" size={19} color={colors.faint} />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+880 1XXXXXXXXX"
                placeholderTextColor={colors.faint}
                keyboardType="phone-pad"
                autoComplete="tel"
                style={[styles.input, { color: colors.text }]}
              />
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => void submit()}
              disabled={phone.length < 8 || loading}
              style={({ pressed }) => [styles.btn, { backgroundColor: phone.length < 8 ? colors.border : '#2AABEE', opacity: pressed ? 0.85 : 1 }]}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.btnText}>Send Code</Text>}
            </Pressable>

            <Pressable onPress={() => Linking.openURL('tg://resolve?domain=xyteee_auth_bot')} style={({ pressed }) => [styles.botLink, { opacity: pressed ? 0.6 : 1 }]}>
              <MaterialCommunityIcons name="open-in-new" size={14} color="#2AABEE" />
              <Text style={styles.botLinkText}>Open @xyteee_auth_bot</Text>
            </Pressable>

            <Pressable onPress={() => router.back()} style={styles.backRow}>
              <MaterialCommunityIcons name="arrow-left" size={18} color={colors.muted} />
              <Text style={[styles.backLabel, { color: colors.muted }]}>Back to Login</Text>
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
  center: { alignItems: 'center', gap: 12, marginTop: 40, marginBottom: 20 },
  iconWrap: { width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  telegramIconWrap: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#2AABEE', alignItems: 'center', justifyContent: 'center', marginLeft: 2, marginTop: 1 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 21, paddingHorizontal: 10 },
  hintBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  hintText: { color: '#2AABEE', fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 19 },
  form: { gap: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600', flex: 1 },
  btn: { width: '100%', height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  botLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  botLinkText: { color: '#2AABEE', fontSize: 14, fontWeight: '700' },
  backRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginTop: 8 },
  backLabel: { fontSize: 14, fontWeight: '600' },
});
