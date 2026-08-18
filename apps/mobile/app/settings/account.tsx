import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { ScreenHeader } from '@/ui';

export default function AccountScreen() {
  const { user, updateProfile } = useAuth();
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const [section, setSection] = useState<'main' | 'password' | 'email'>('main');

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailPass, setEmailPass] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const direction = { flexDirection: isRTL ? 'row-reverse' as const : 'row' as const };
  const alignment = { textAlign: isRTL ? 'right' as const : 'left' as const };

  const doChangePassword = async () => {
    if (!currentPass || !newPass || newPass !== confirmPass) return;
    setSaving(true);
    try {
      await api.changePassword(currentPass, newPass);
      setToast('Password changed');
      setTimeout(() => { setToast(null); setSection('main'); setCurrentPass(''); setNewPass(''); setConfirmPass(''); }, 1500);
    } catch (e: any) {
      setToast(e?.message || 'Failed');
      setTimeout(() => setToast(null), 2500);
    }
    setSaving(false);
  };

  const doChangeEmail = async () => {
    if (!emailPass || !newEmail) return;
    setSaving(true);
    try {
      await api.changeEmail(emailPass, newEmail);
      await updateProfile({ email: newEmail });
      setToast('Email changed');
      setTimeout(() => { setToast(null); setSection('main'); setEmailPass(''); setNewEmail(''); }, 1500);
    } catch (e: any) {
      setToast(e?.message || 'Failed');
      setTimeout(() => setToast(null), 2500);
    }
    setSaving(false);
  };

  const SubHeader = ({ title }: { title: string }) => (
    <View style={[styles.subHeader, direction, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <Pressable onPress={() => setSection('main')} style={styles.backBtn}>
        <MaterialCommunityIcons name={isRTL ? 'chevron-right' : 'chevron-left'} size={26} color={colors.text} />
      </Pressable>
      <Text style={[styles.subTitle, { color: colors.text }]}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  if (section === 'password') {
    return (
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
        <SubHeader title="Change Password" />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>CURRENT PASSWORD</Text>
          <TextInput value={currentPass} onChangeText={setCurrentPass} secureTextEntry placeholder="Current password" placeholderTextColor={colors.faint} style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} />
          <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>NEW PASSWORD</Text>
          <TextInput value={newPass} onChangeText={setNewPass} secureTextEntry placeholder="New password" placeholderTextColor={colors.faint} style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} />
          <TextInput value={confirmPass} onChangeText={setConfirmPass} secureTextEntry placeholder="Confirm new password" placeholderTextColor={colors.faint} style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} />
          <Pressable onPress={() => void doChangePassword()} disabled={saving || !currentPass || !newPass || newPass !== confirmPass} style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.accent, opacity: pressed || saving ? 0.6 : 1 }]}>
            <Text style={{ color: '#FFF', fontWeight: '800' }}>{saving ? 'Saving...' : 'Change Password'}</Text>
          </Pressable>
        </ScrollView>
        {toast ? <View style={[styles.toast, { backgroundColor: colors.text }]}><Text style={{ color: colors.background, fontSize: 13, fontWeight: '700' }}>{toast}</Text></View> : null}
      </SafeAreaView>
    );
  }

  if (section === 'email') {
    return (
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
        <SubHeader title="Change Email" />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>CURRENT EMAIL</Text>
          <Text style={[styles.info, { color: colors.muted }]}>{user?.email}</Text>
          <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>PASSWORD</Text>
          <TextInput value={emailPass} onChangeText={setEmailPass} secureTextEntry placeholder="Your password" placeholderTextColor={colors.faint} style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} />
          <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>NEW EMAIL</Text>
          <TextInput value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" keyboardType="email-address" placeholder="New email address" placeholderTextColor={colors.faint} style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} />
          <Pressable onPress={() => void doChangeEmail()} disabled={saving || !emailPass || !newEmail} style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.accent, opacity: pressed || saving ? 0.6 : 1 }]}>
            <Text style={{ color: '#FFF', fontWeight: '800' }}>{saving ? 'Saving...' : 'Change Email'}</Text>
          </Pressable>
        </ScrollView>
        {toast ? <View style={[styles.toast, { backgroundColor: colors.text }]}><Text style={{ color: colors.background, fontSize: 13, fontWeight: '700' }}>{toast}</Text></View> : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Account" back />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>CREDENTIALS</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable onPress={() => setSection('password')} style={({ pressed }) => [styles.row, direction, { backgroundColor: pressed ? colors.elevated : 'transparent' }]}>
            <MaterialCommunityIcons name="lock-outline" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}><Text style={[styles.rowTitle, alignment, { color: colors.text }]}>Change Password</Text><Text style={[styles.rowDesc, alignment, { color: colors.muted }]}>Update your account password</Text></View>
            <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={21} color={colors.faint} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable onPress={() => setSection('email')} style={({ pressed }) => [styles.row, direction, { backgroundColor: pressed ? colors.elevated : 'transparent' }]}>
            <MaterialCommunityIcons name="email-outline" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}><Text style={[styles.rowTitle, alignment, { color: colors.text }]}>Change Email</Text><Text style={[styles.rowDesc, alignment, { color: colors.muted }]}>{user?.email}</Text></View>
            <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={21} color={colors.faint} />
          </Pressable>
        </View>
      </ScrollView>
      {toast ? <View style={[styles.toast, { backgroundColor: colors.text }]}><Text style={{ color: colors.background, fontSize: 13, fontWeight: '700' }}>{toast}</Text></View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '800', marginTop: 12, marginBottom: 4, paddingHorizontal: 4, letterSpacing: 0.5 },
  info: { fontSize: 14, paddingHorizontal: 4, marginBottom: 4 },
  card: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 14, gap: 12 },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowDesc: { fontSize: 11, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 14, marginBottom: 8 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  toast: { position: 'absolute', bottom: 30, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  subHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  subTitle: { fontSize: 17, fontWeight: '800', flex: 1, textAlign: 'center' },
});
