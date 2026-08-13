import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useTheme } from '@/theme';
import type { Group } from '@/types';
import { SkeletonList } from '@/ui';

export default function AddGroupScreen() {
  const { colors } = useTheme();
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
        .catch((reason) => setError(reason instanceof Error ? reason.message : 'Search failed'))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const join = async (group: Group) => {
    try {
      await api.applyToGroup(group.id);
      setResults((items) => items.map((item) => item.id === group.id ? { ...item, myRole: item.myRole } : item));
      setError('Application sent. An admin will review your request.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not apply'); }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Add Group</Text>
      </View>
      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MaterialCommunityIcons name="magnify" size={19} color={colors.muted} />
        <TextInput autoFocus value={query} onChangeText={setQuery} placeholder="Enter group name" placeholderTextColor={colors.faint} style={[styles.searchInput, { color: colors.text }]} />
        {query ? <Pressable hitSlop={8} onPress={() => setQuery('')}><MaterialCommunityIcons name="close-circle" size={18} color={colors.faint} /></Pressable> : null}
      </View>
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {error ? <Text style={[styles.error, { color: error.includes('Application') ? colors.success : colors.danger }]}>{error}</Text> : null}
        {loading ? <SkeletonList rows={5} /> : null}
        {!loading && query.trim().length < 2 ? <Text style={[styles.hint, { color: colors.muted }]}>Enter at least two characters to search for groups.</Text> : null}
        {!loading && query.trim().length >= 2 && results.length === 0 ? <Text style={[styles.hint, { color: colors.muted }]}>No groups found. Try a different name.</Text> : null}
        {results.map((group) => (
          <View key={group.id} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.groupAvatar, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="account-group-outline" size={20} color={colors.accent} /></View>
            <View style={styles.rowCopy}>
              <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>{group.name}</Text>
              <Text numberOfLines={1} style={[styles.handle, { color: colors.muted }]}>{group.memberCount} members</Text>
              {group.description ? <Text numberOfLines={2} style={[styles.desc, { color: colors.faint }]}>{group.description}</Text> : null}
            </View>
            {group.myRole !== 'member' ? (
              <Pressable onPress={() => void join(group)} style={({ pressed }) => [styles.joinBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.75 : 1 }]}><Text style={{ color: colors.accentText, fontSize: 12, fontWeight: '800' }}>Join</Text></Pressable>
            ) : (
              <View style={[styles.relation, { backgroundColor: colors.accentSoft }]}><Text style={{ color: colors.accent, fontSize: 11, fontWeight: '800' }}>Member</Text></View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }, iconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  search: { height: 45, marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderRadius: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 9 }, searchInput: { flex: 1, fontSize: 15 },
  list: { padding: 16 }, center: { paddingVertical: 40 }, error: { fontSize: 13, marginBottom: 8 }, hint: { fontSize: 13, textAlign: 'center', marginTop: 32 },
  row: { minHeight: 72, borderWidth: 1, borderRadius: 8, marginBottom: 9, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, groupAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, rowCopy: { flex: 1, minWidth: 0 }, name: { fontSize: 15, fontWeight: '800' }, handle: { fontSize: 12, marginTop: 3 }, desc: { fontSize: 11, marginTop: 4 },
  joinBtn: { borderRadius: 6, paddingHorizontal: 14, paddingVertical: 8 }, relation: { borderRadius: 5, paddingHorizontal: 10, paddingVertical: 6 },
});
