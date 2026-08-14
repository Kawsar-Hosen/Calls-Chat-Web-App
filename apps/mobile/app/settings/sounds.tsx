import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '@/i18n';
import { setSoundSetting, useSoundSettings } from '@/sound-settings';
import { useTheme } from '@/theme';

export default function SoundsScreen() {
  const { colors } = useTheme();
  const { isRTL, t } = useI18n();
  const settings = useSoundSettings();
  const router = useRouter();
  const alignment = { textAlign: isRTL ? 'right' as const : 'left' as const };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('soundEffects')}</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.accent }]}><MaterialCommunityIcons name="music-note" size={22} color={colors.accentText} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, alignment, { color: colors.text }]}>{t('soundEffects')}</Text>
            <Text style={[styles.heroCopy, alignment, { color: colors.muted }]}>{t('soundEffectsNote')}</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>{t('settings').toUpperCase()}</Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SoundRow icon="account-plus-outline" title={t('requestSound')} description={t('requestSoundDescription')} value={settings.requestSound} onValueChange={(value) => setSoundSetting('requestSound', value)} rtl={isRTL} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SoundRow icon="account-check-outline" title={t('acceptSound')} description={t('acceptSoundDescription')} value={settings.acceptSound} onValueChange={(value) => setSoundSetting('acceptSound', value)} rtl={isRTL} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SoundRow({ icon, title, description, value, onValueChange, rtl }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string; description: string; value: boolean; onValueChange: (value: boolean) => void; rtl: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
      <View style={[styles.rowIcon, { backgroundColor: value ? colors.accentSoft : colors.elevated, borderColor: value ? colors.accent : colors.border }]}><MaterialCommunityIcons name={icon} size={22} color={value ? colors.accent : colors.muted} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowTitle, { color: colors.text, textAlign: rtl ? 'right' : 'left' }]}>{title}</Text>
        <Text style={[styles.rowCopy, { color: colors.muted, textAlign: rtl ? 'right' : 'left' }]}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: colors.accent, false: colors.border }} thumbColor={value ? colors.accentText : colors.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8 },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 16 },
  heroIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 15, fontWeight: '900' },
  heroCopy: { fontSize: 12, marginTop: 5, lineHeight: 18 },
  sectionLabel: { fontSize: 10, fontWeight: '900', marginTop: 25, marginBottom: 9, letterSpacing: 1 },
  card: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, overflow: 'hidden' },
  row: { minHeight: 76, alignItems: 'center', gap: 13, paddingVertical: 12 },
  rowIcon: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '800' },
  rowCopy: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 55 },
});
