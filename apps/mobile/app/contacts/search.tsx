import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useTheme } from '@/theme';
import type { UserSearchResult } from '@/types';
import { Avatar, SkeletonList } from '@/ui';

export default function SearchPeopleScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    setLoading(true); setError('');
    const timer = setTimeout(() => {
      api.searchUsers(query.trim())
        .then(setResults)
        .catch((reason) => setError(reason instanceof Error ? reason.message : 'Search failed'))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const sendRequest = useCallback(async (person: UserSearchResult) => {
    try {
      await api.sendFriendRequest(person.id);
      setResults((items) => items.map((item) => item.id === person.id ? { ...item, requestStatus: 'outgoing' } : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Request failed'); }
  }, []);

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Add Friend</Text>
      </View>
      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MaterialCommunityIcons name="magnify" size={19} color={colors.muted} />
        <TextInput autoFocus value={query} onChangeText={setQuery} placeholder="Enter username or nickname" placeholderTextColor={colors.faint} style={[styles.searchInput, { color: colors.text }]} />
        {query ? <Pressable hitSlop={8} onPress={() => setQuery('')}><MaterialCommunityIcons name="close-circle" size={18} color={colors.faint} /></Pressable> : null}
      </View>
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        {loading ? <SkeletonList rows={5} /> : null}
        {!loading && query.trim().length < 2 ? <Text style={[styles.hint, { color: colors.muted }]}>Enter at least two characters to search for people.</Text> : null}
        {!loading && query.trim().length >= 2 && results.length === 0 ? <Text style={[styles.hint, { color: colors.muted }]}>No people found. Check the spelling and try again.</Text> : null}
        {results.map((person) => (
          <Pressable key={person.id} onPress={() => router.push({ pathname: '/contacts/[id]', params: { id: person.id, name: person.displayName, username: person.username } })} style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.elevated : colors.surface, borderColor: colors.border }]}>
            <Avatar name={person.displayName} size={44} online={person.isOnline} />
            <View style={styles.rowCopy}><Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>{person.displayName}</Text><Text numberOfLines={1} style={[styles.handle, { color: colors.muted }]}>@{person.username}</Text></View>
            {person.isFriend ? <View style={[styles.relation, { backgroundColor: colors.accentSoft }]}><Text style={{ color: colors.accent, fontSize: 11, fontWeight: '800' }}>Friend</Text></View>
              : person.requestStatus ? <View style={[styles.relation, { backgroundColor: colors.elevated }]}><Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800' }}>{person.requestStatus === 'outgoing' ? 'Requested' : 'Received'}</Text></View>
                : person.isBlocked ? <View style={[styles.relation, { backgroundColor: colors.elevated }]}><Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800' }}>Blocked</Text></View>
                  : <Pressable onPress={() => void sendRequest(person)} style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.75 : 1 }]}><MaterialCommunityIcons name="account-plus-outline" size={18} color={colors.accentText} /></Pressable>}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }, iconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  search: { height: 45, marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderRadius: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 9 }, searchInput: { flex: 1, fontSize: 15 },
  list: { padding: 16 }, center: { paddingVertical: 40 }, error: { fontSize: 13, marginBottom: 8 }, hint: { fontSize: 13, textAlign: 'center', marginTop: 32 },
  row: { minHeight: 68, borderWidth: 1, borderRadius: 8, marginBottom: 9, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, rowCopy: { flex: 1, minWidth: 0 }, name: { fontSize: 15, fontWeight: '800' }, handle: { fontSize: 12, marginTop: 3 },
  relation: { borderRadius: 5, paddingHorizontal: 10, paddingVertical: 6 }, addBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
