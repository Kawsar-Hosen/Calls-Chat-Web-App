import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { ScreenHeader } from '@/ui';

const FONT_SIZES = [
  { value: 'small', label: 'Small', size: 13 },
  { value: 'default', label: 'Default', size: 15 },
  { value: 'large', label: 'Large', size: 17 },
  { value: 'xlarge', label: 'Extra Large', size: 19 },
];

const ACCENT_COLORS = [
  '#6C5CE7', '#0984E3', '#00B894', '#00CEC9',
  '#FDCB6E', '#E17055', '#D63031', '#E84393',
  '#A29BFE', '#74B9FF', '#55EFC4', '#FFEAA7',
  '#636E72',
];

export default function AppearanceScreen() {
  const { user, updateProfile } = useAuth();
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const [fontSize, setFontSize] = useState(user?.fontSize ?? 'default');
  const [accentColor, setAccentColor] = useState(user?.accentColor ?? colors.accent);
  const [toast, setToast] = useState<string | null>(null);

  const direction = { flexDirection: isRTL ? 'row-reverse' as const : 'row' as const };
  const alignment = { textAlign: isRTL ? 'right' as const : 'left' as const };

  const persist = async (patch: Record<string, unknown>) => {
    try {
      await updateProfile(patch as any);
      setToast('Saved');
      setTimeout(() => setToast(null), 2000);
    } catch {}
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Appearance" back />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>FONT SIZE</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {FONT_SIZES.map((opt) => (
            <Pressable key={opt.value} onPress={() => { setFontSize(opt.value); void persist({ fontSize: opt.value }); }} style={({ pressed }) => [styles.optionRow, direction, { backgroundColor: pressed ? colors.elevated : 'transparent', borderBottomColor: opt.value !== 'xlarge' ? colors.border : 'transparent' }]}>
              <View style={[styles.radio, { borderColor: fontSize === opt.value ? colors.accent : colors.faint, backgroundColor: fontSize === opt.value ? colors.accent : 'transparent' }]}>
                {fontSize === opt.value && <View style={styles.radioDot} />}
              </View>
              <Text style={[{ fontSize: opt.size, fontWeight: '700', color: colors.text }, alignment]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>ACCENT COLOR</Text>
        <View style={[styles.colorGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {ACCENT_COLORS.map((c) => (
            <Pressable key={c} onPress={() => { setAccentColor(c); void persist({ accentColor: c }); }} style={({ pressed }) => [styles.colorDot, { backgroundColor: c, opacity: pressed ? 0.7 : 1, borderColor: accentColor === c ? colors.text : 'transparent', borderWidth: accentColor === c ? 3 : 0 }]}>
              {accentColor === c && <MaterialCommunityIcons name="check" size={16} color="#FFF" />}
            </Pressable>
          ))}
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
  card: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFF' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderRadius: 14, padding: 12, gap: 12 },
  colorDot: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', bottom: 30, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
});
