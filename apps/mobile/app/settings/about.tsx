import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { ScreenHeader } from '@/ui';

export default function AboutScreen() {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const direction = { flexDirection: isRTL ? 'row-reverse' as const : 'row' as const };
  const alignment = { textAlign: isRTL ? 'right' as const : 'left' as const };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title="About" back />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.logoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.logoWrap, { backgroundColor: colors.accentSoft }]}>
            <MaterialCommunityIcons name="cellphone-message" size={36} color={colors.accent} />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>XYTEEE</Text>
          <Text style={[styles.version, { color: colors.muted }]}>Version 0.1.0</Text>
        </View>

        <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>LEGAL</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable style={({ pressed }) => [styles.row, direction, { opacity: pressed ? 0.6 : 1 }]}>
            <MaterialCommunityIcons name="file-document-outline" size={20} color={colors.accent} />
            <Text style={[styles.rowText, { color: colors.text }]}>Terms of Service</Text>
            <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={21} color={colors.faint} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable style={({ pressed }) => [styles.row, direction, { opacity: pressed ? 0.6 : 1 }]}>
            <MaterialCommunityIcons name="shield-lock-outline" size={20} color={colors.accent} />
            <Text style={[styles.rowText, { color: colors.text }]}>Privacy Policy</Text>
            <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={21} color={colors.faint} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable style={({ pressed }) => [styles.row, direction, { opacity: pressed ? 0.6 : 1 }]}>
            <MaterialCommunityIcons name="certificate-outline" size={20} color={colors.accent} />
            <Text style={[styles.rowText, { color: colors.text }]}>Open Source Licenses</Text>
            <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={21} color={colors.faint} />
          </Pressable>
        </View>

        <Text style={[styles.copyright, { color: colors.faint }]}>2025 XYTEEE. All rights reserved.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '800', marginTop: 12, marginBottom: 4, paddingHorizontal: 4, letterSpacing: 0.5 },
  logoCard: { borderWidth: 1, borderRadius: 14, padding: 24, alignItems: 'center', gap: 8, marginTop: 8 },
  logoWrap: { width: 68, height: 68, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  appName: { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  version: { fontSize: 13 },
  card: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 14, gap: 12 },
  rowText: { flex: 1, fontSize: 14, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth },
  copyright: { fontSize: 11, textAlign: 'center', marginTop: 20 },
});
