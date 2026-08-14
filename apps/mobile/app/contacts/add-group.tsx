import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';
import type { Group } from '@/types';
import { SkeletonList } from '@/ui';

export default function AddGroupScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    setLoading(true); setError('');
    const timer = setTimeout(() => {
      api.searchGroups(query.trim())
        .then(setResults)
        .catch((reason) => setError(reason instanceof Error ? reason.message : t('searchFailed')))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, t]);

  const join = async (group: Group) => {
    try {
      await api.applyToGroup(group.id);
      setResults((items) => items.map((item) => item.id === group.id ? { ...item, myRole: item.myRole } : item));
      setError(t('applicationSent'));
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('couldNotApply')); }
  };

  const success = error.includes('Application') || error.includes('পাঠানো') || error.includes('terkirim') || error.includes('भेजा') || error.includes('تم إرسال') || error.includes('enviada') || error.includes('enviado');

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('addGroup')}</Text>
      </View>
      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MaterialCommunityIcons name="magnify" size={19} color={colors.muted} />
        <TextInput autoFocus value={query} onChangeText={setQuery} placeholder={t('enterGroupName')} placeholderTextColor={colors.faint} style={[styles.searchInput, { color: colors.text }]} />
        {query ? <Pressable hitSlop={8} onPress={() => setQuery('')} style={[styles.clearBtn, { backgroundColor: colors.elevated }]}><MaterialCommunityIcons name="close" size={14} color={colors.muted} /></Pressable> : null}
      </View>
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {error ? <View style={[styles.banner, { backgroundColor: success ? colors.success + '1A' : colors.danger + '1A' }]}><MaterialCommunityIcons name={success ? 'check-circle-outline' : 'alert-circle-outline'} size={17} color={success ? colors.success : colors.danger} /><Text style={{ color: success ? colors.success : colors.danger, fontSize: 13, fontWeight: '700' }}>{error}</Text></View> : null}
        {loading ? <SkeletonList rows={5} /> : null}
        {!loading && query.trim().length < 2 ? <View style={styles.hintState}><View style={[styles.hintIcon, { backgroundColor: colors.elevated }]}><MaterialCommunityIcons name="magnify" size={30} color={colors.muted} /></View><Text style={[styles.hint, { color: colors.muted }]}>{t('searchGroupsHint')}</Text></View> : null}
        {!loading && query.trim().length >= 2 && results.length === 0 ? <View style={styles.hintState}><View style={[styles.hintIcon, { backgroundColor: colors.elevated }]}><MaterialCommunityIcons name="account-group-outline" size={30} color={colors.muted} /></View><Text style={[styles.hint, { color: colors.muted }]}>{t('noGroupsFound')}</Text></View> : null}
        {results.map((group) => (
          <View key={group.id} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.groupAvatar, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="account-group-outline" size={21} color={colors.accent} /></View>
            <View style={styles.rowCopy}>
              <Text numberOfLines={1} style={[styles.name, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{group.name}</Text>
              <Text numberOfLines={1} style={[styles.handle, { color: colors.muted, textAlign: isRTL ? 'right' : 'left' }]}>{group.memberCount} {t('members')}</Text>
              {group.description ? <Text numberOfLines={2} style={[styles.desc, { color: colors.faint, textAlign: isRTL ? 'right' : 'left' }]}>{group.description}</Text> : null}
            </View>
            {group.myRole !== 'member' ? (
              <Pressable onPress={() => void join(group)} style={({ pressed }) => [styles.joinBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.75 : 1 }]}><Text style={{ color: colors.accentText, fontSize: 12, fontWeight: '800' }}>{t('join')}</Text></Pressable>
            ) : (
              <View style={[styles.relation, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="check" size={12} color={colors.accent} /><Text style={{ color: colors.accent, fontSize: 11, fontWeight: '800' }}>{t('member')}</Text></View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }, iconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  search: { height: 48, marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9 }, searchInput: { flex: 1, fontSize: 15 }, clearBtn: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 40 }, banner: { borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }, hintState: { alignItems: 'center', paddingTop: 48, gap: 12 }, hintIcon: { width: 60, height: 60, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }, hint: { fontSize: 13, textAlign: 'center' },
  row: { minHeight: 76, borderWidth: 1, borderRadius: 16, marginBottom: 10, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 12 }, groupAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' }, rowCopy: { flex: 1, minWidth: 0 }, name: { fontSize: 15, fontWeight: '800' }, handle: { fontSize: 12, marginTop: 3 }, desc: { fontSize: 11, marginTop: 4, lineHeight: 16 },
  joinBtn: { borderRadius: 20, paddingHorizontal: 18, paddingVertical: 9 }, relation: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 4 },
});
