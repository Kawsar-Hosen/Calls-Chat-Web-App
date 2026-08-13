import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useTheme } from '@/theme';
import type { Group } from '@/types';
import { SkeletonList } from '@/ui';

export default function MyGroupsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try { setItems(await api.myGroups()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load groups'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { void load(items.length > 0); }, [load]));

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Groups</Text>
        <Pressable onPress={() => router.push('/groups/create')} style={({ pressed }) => [styles.newBtn, { opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="account-multiple-plus-outline" size={22} color={colors.accent} /></Pressable>
      </View>
      {loading ? <SkeletonList rows={6} /> : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={items.length ? styles.list : styles.emptyList}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); void load(true); }} />}
          ListEmptyComponent={<View style={styles.empty}><MaterialCommunityIcons name="account-group-outline" size={40} color={colors.faint} /><Text style={[styles.emptyTitle, { color: colors.text }]}>{error ? 'Could not load groups' : 'No groups yet'}</Text><Text style={[styles.emptyCopy, { color: error ? colors.danger : colors.muted }]}>{error || 'Create a group to start chatting with several friends at once.'}</Text>{!error ? <Pressable onPress={() => router.push('/groups/create')} style={({ pressed }) => [styles.createBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}><Text style={{ color: colors.accentText, fontWeight: '800', fontSize: 14 }}>Create group</Text></Pressable> : null}</View>}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push({ pathname: '/groups/[id]', params: { id: item.id } })} style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.elevated : colors.surface, borderBottomColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="account-group-outline" size={20} color={colors.accent} /></View>
              <View style={styles.rowCopy}>
                <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                <Text numberOfLines={1} style={[styles.handle, { color: colors.muted }]}>{item.memberCount} members · you are {item.myRole}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.faint} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }, iconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 16, fontWeight: '800', flex: 1 }, newBtn: { width: 40, height: 42, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, list: { paddingHorizontal: 16, paddingTop: 6 }, emptyList: { flexGrow: 1 },
  row: { minHeight: 70, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12 }, avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' }, rowCopy: { flex: 1, minWidth: 0 }, name: { fontSize: 15, fontWeight: '800' }, handle: { fontSize: 12, marginTop: 3 },
  empty: { flex: 1, minHeight: 360, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }, emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 14 }, emptyCopy: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 20 }, createBtn: { marginTop: 18, borderRadius: 8, paddingHorizontal: 22, paddingVertical: 12 },
});
