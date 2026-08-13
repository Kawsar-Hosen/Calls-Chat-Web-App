import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';
import type { User } from '@/types';
import { Avatar, SkeletonList } from '@/ui';

export default function BlacklistScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try { setItems(await api.blocks()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('unableLoadBlacklist')); }
    finally { setLoading(false); setRefreshing(false); }
  }, [t]);

  useFocusEffect(useCallback(() => { void load(items.length > 0); }, [load]));

  const unblock = async (user: User) => {
    try {
      await api.unblockUser(user.id);
      setItems((current) => current.filter((item) => item.id !== user.id));
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('couldNotUnblock')); }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('blacklist')}</Text>
      </View>
      {loading ? <SkeletonList rows={6} /> : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={items.length ? styles.list : styles.emptyList}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); void load(true); }} />}
          ListEmptyComponent={<View style={styles.empty}><MaterialCommunityIcons name="shield-off-outline" size={40} color={colors.faint} /><Text style={[styles.emptyTitle, { color: colors.text }]}>{error ? t('couldNotLoadBlacklist') : t('blacklistEmpty')}</Text><Text style={[styles.emptyCopy, { color: error ? colors.danger : colors.muted }]}>{error || t('blacklistEmptyCopy')}</Text></View>}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <Avatar name={item.displayName} size={46} />
              <View style={styles.rowCopy}><Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>{item.displayName}</Text><Text numberOfLines={1} style={[styles.handle, { color: colors.muted }]}>@{item.username}</Text></View>
              <Pressable onPress={() => void unblock(item)} style={({ pressed }) => [styles.unblock, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}><Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{t('unblock')}</Text></Pressable>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }, iconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 16, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, list: { paddingHorizontal: 16, paddingTop: 6 }, emptyList: { flexGrow: 1 },
  row: { minHeight: 68, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12 }, rowCopy: { flex: 1, minWidth: 0 }, name: { fontSize: 15, fontWeight: '800' }, handle: { fontSize: 12, marginTop: 3 },
  unblock: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 13, paddingVertical: 8 },
  empty: { flex: 1, minHeight: 360, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }, emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 14 }, emptyCopy: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
