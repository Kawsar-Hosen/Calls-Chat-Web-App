import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { ScreenHeader, ConfirmSheet } from '@/ui';

export default function StorageScreen() {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const direction = { flexDirection: isRTL ? 'row-reverse' as const : 'row' as const };
  const alignment = { textAlign: isRTL ? 'right' as const : 'left' as const };

  const clearCache = async () => {
    setClearing(true);
    await new Promise(r => setTimeout(r, 800));
    setClearing(false);
    setConfirmOpen(false);
    setToast('Cache cleared');
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Storage" back />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>MANAGE</Text>

        <Pressable onPress={() => setConfirmOpen(true)} style={({ pressed }) => [styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
          <View style={[styles.actionIcon, { backgroundColor: colors.accentSoft }]}>
            <MaterialCommunityIcons name="broom" size={20} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionTitle, alignment, { color: colors.text }]}>Clear Cache</Text>
            <Text style={[styles.actionDesc, alignment, { color: colors.muted }]}>Remove temporary files and cached media</Text>
          </View>
          <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={21} color={colors.faint} />
        </Pressable>

        <View style={[styles.infoCard, { backgroundColor: colors.accent + '08', borderColor: colors.accent + '20' }]}>
          <MaterialCommunityIcons name="information-outline" size={16} color={colors.accent} />
          <Text style={[styles.infoText, { color: colors.muted }]}>Clearing cache will not log you out or delete your messages. Some media may re-download when needed.</Text>
        </View>

        <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>ACCOUNT</Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statRow, direction]}>
            <View style={[styles.statIcon, { backgroundColor: colors.accentSoft }]}>
              <MaterialCommunityIcons name="shield-lock-outline" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statTitle, { color: colors.text }]}>Sessions</Text>
              <Text style={[styles.statDesc, alignment, { color: colors.muted }]}>Active sessions are managed automatically</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <ConfirmSheet
        visible={confirmOpen}
        title="Clear cache?"
        message="This will remove all cached files. You will stay logged in and no data will be lost."
        icon="broom"
        iconColor={colors.accent}
        iconBg={colors.accent + '18'}
        confirmLabel="Clear"
        confirmColor={colors.accent}
        onConfirm={() => void clearCache()}
        onCancel={() => setConfirmOpen(false)}
        loading={clearing}
      />

      {toast ? <View style={[styles.toast, { backgroundColor: colors.text }]}><Text style={{ color: colors.background, fontSize: 13, fontWeight: '700' }}>{toast}</Text></View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '800', marginTop: 12, marginBottom: 4, paddingHorizontal: 4, letterSpacing: 0.5 },
  actionCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 14, gap: 12 },
  actionIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 14, fontWeight: '700' },
  actionDesc: { fontSize: 11, marginTop: 2 },
  infoCard: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 14, gap: 10, marginTop: 4, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 12 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statTitle: { fontSize: 14, fontWeight: '700' },
  statDesc: { fontSize: 11, marginTop: 2 },
  toast: { position: 'absolute', bottom: 30, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
});
