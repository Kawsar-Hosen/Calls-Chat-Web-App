import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { ScreenHeader } from '@/ui';

const REPORT_TYPES = [
  { value: 'bug', label: 'Bug Report', icon: 'bug-outline' },
  { value: 'feature', label: 'Feature Request', icon: 'lightbulb-outline' },
  { value: 'feedback', label: 'General Feedback', icon: 'comment-text-outline' },
  { value: 'other', label: 'Other', icon: 'dots-horizontal' },
];

export default function ReportScreen() {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const [type, setType] = useState('bug');
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const direction = { flexDirection: isRTL ? 'row-reverse' as const : 'row' as const };
  const alignment = { textAlign: isRTL ? 'right' as const : 'left' as const };

  const submit = async () => {
    if (!reason.trim()) return;
    setSaving(true);
    try {
      await api.submitReport(type, null, reason.trim(), details.trim() || undefined);
      setSent(true);
    } catch {
      setToast('Failed to send');
      setTimeout(() => setToast(null), 2000);
    }
    setSaving(false);
  };

  if (sent) {
    return (
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Report" back />
        <View style={styles.center}>
          <MaterialCommunityIcons name="check-circle-outline" size={64} color={colors.accent} />
          <Text style={[styles.sentTitle, { color: colors.text }]}>Thanks!</Text>
          <Text style={[styles.sentDesc, { color: colors.muted }]}>Your report has been submitted. We'll review it soon.</Text>
          <Pressable onPress={() => setSent(false)} style={[styles.sentBtn, { backgroundColor: colors.accent }]}>
            <Text style={{ color: '#FFF', fontWeight: '800' }}>Submit Another</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Report a Problem" back />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>TYPE</Text>
        <View style={[styles.typeGrid, { flexDirection: isRTL ? 'row-reverse' as const : 'row' as const, backgroundColor: colors.surface, borderColor: colors.border }]}>
          {REPORT_TYPES.map((t) => (
            <Pressable key={t.value} onPress={() => setType(t.value)} style={({ pressed }) => [styles.typeChip, { backgroundColor: type === t.value ? colors.accent : 'transparent', borderColor: type === t.value ? colors.accent : colors.border, opacity: pressed ? 0.7 : 1 }]}>
              <MaterialCommunityIcons name={t.icon as any} size={16} color={type === t.value ? '#FFF' : colors.text} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: type === t.value ? '#FFF' : colors.text }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>SUBJECT *</Text>
        <TextInput value={reason} onChangeText={setReason} placeholder="Brief description" placeholderTextColor={colors.faint} style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} />

        <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>DETAILS</Text>
        <TextInput value={details} onChangeText={setDetails} multiline numberOfLines={5} textAlignVertical="top" placeholder="More details (optional)" placeholderTextColor={colors.faint} style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} />

        <Pressable onPress={() => void submit()} disabled={saving || !reason.trim()} style={({ pressed }) => [styles.submitBtn, { backgroundColor: colors.accent, opacity: pressed || saving ? 0.6 : 1 }]}>
          <Text style={{ color: '#FFF', fontWeight: '800' }}>{saving ? 'Sending...' : 'Submit Report'}</Text>
        </Pressable>
      </ScrollView>
      {toast ? <View style={[styles.toast, { backgroundColor: colors.text }]}><Text style={{ color: colors.background, fontSize: 13, fontWeight: '700' }}>{toast}</Text></View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '800', marginTop: 12, marginBottom: 4, paddingHorizontal: 4, letterSpacing: 0.5 },
  typeGrid: { flexWrap: 'wrap', borderWidth: 1, borderRadius: 14, padding: 10, gap: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 14 },
  textArea: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 14, minHeight: 120 },
  submitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  sentTitle: { fontSize: 22, fontWeight: '900' },
  sentDesc: { fontSize: 14, textAlign: 'center' },
  sentBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 12 },
  toast: { position: 'absolute', bottom: 30, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
});
