import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'react-native';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useTheme } from '@/theme';
import type { SearchResult, UserSearchResult } from '@/types';
import { VerifiedBadge } from '@/components/VerifiedBadge';

type Tab = 'people' | 'posts';

export default function SearchScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('people');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const doSearch = async (q: string) => {
    if (q.length < 1) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await api.searchAll(q);
      setResults(res);
    } catch {} finally { setLoading(false); }
  };

  const people = results?.users ?? [];
  const posts = results?.posts ?? [];
  const displayed = tab === 'people' ? people : posts;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <View style={[styles.searchWrap, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="magnify" size={19} color={colors.faint} />
          <TextInput
            value={query}
            onChangeText={(t) => { setQuery(t); void doSearch(t); }}
            placeholder="Search people, posts..."
            placeholderTextColor={colors.faint}
            autoFocus
            returnKeyType="search"
            style={[styles.searchInput, { color: colors.text }]}
          />
          {query ? (
            <Pressable onPress={() => { setQuery(''); setResults(null); }} style={styles.clearBtn}>
              <MaterialCommunityIcons name="close-circle" size={17} color={colors.faint} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {(['people', 'posts'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}>
            <Text style={[styles.tabLabel, { color: tab === t ? colors.accent : colors.muted, fontWeight: tab === t ? '800' : '600' }]}>{t === 'people' ? `People (${people.length})` : `Posts (${posts.length})`}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      ) : !query ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="magnify" size={48} color={colors.faint} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>Search for people or posts</Text>
        </View>
      ) : displayed.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="text-search" size={48} color={colors.faint} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>No results found</Text>
        </View>
      ) : tab === 'people' ? (
        <FlatList
          data={people}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PeopleRow item={item} colors={colors} router={router} />}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostRow item={item} colors={colors} router={router} />}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}
    </SafeAreaView>
  );
}

function PeopleRow({ item, colors, router }: { item: UserSearchResult; colors: any; router: any }) {
  return (
    <Pressable onPress={() => router.push({ pathname: '/feed/profile/[id]', params: { id: item.id } })} style={({ pressed }) => [styles.row, { borderBottomColor: colors.border }, pressed && { backgroundColor: colors.elevated }]}>
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} style={[styles.avatar, { backgroundColor: colors.elevated }]} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={[styles.avatarText, { color: colors.accent }]}>{(item.displayName || '?')[0]}</Text>
        </View>
      )}
      <View style={styles.rowInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>{item.displayName}</Text>
          {item.isVerified ? <VerifiedBadge category={item.verifiedCategory ?? null} username={item.username} displayName={item.displayName} verifiedAt={item.verifiedAt ?? null} /> : null}
        </View>
        <Text style={[styles.rowSub, { color: colors.muted }]} numberOfLines={1}>@{item.username}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.faint} />
    </Pressable>
  );
}

function PostRow({ item, colors, router }: { item: { id: string; body: string; authorId: string; createdAt: string }; colors: any; router: any }) {
  return (
    <Pressable onPress={() => router.push({ pathname: '/feed/[id]', params: { id: item.id } })} style={({ pressed }) => [styles.row, { borderBottomColor: colors.border }, pressed && { backgroundColor: colors.elevated }]}>
      <View style={[styles.postIcon, { backgroundColor: colors.accentSoft }]}>
        <MaterialCommunityIcons name="post-outline" size={18} color={colors.accent} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={2}>{item.body}</Text>
        <Text style={[styles.rowSub, { color: colors.muted }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  clearBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tabBtn: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabLabel: { fontSize: 13 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  rowInfo: { flex: 1, gap: 2 },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowSub: { fontSize: 13 },
  postIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
