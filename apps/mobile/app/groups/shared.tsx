import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '@/api';
import { useTheme } from '@/theme';
import type { Message } from '@/types';

type Tab = 'media' | 'files' | 'links';

const URL_PATTERN = /https?:\/\/[^\s]+/g;

export default function SharedScreen() {
  const { conversationId, name } = useLocalSearchParams<{ conversationId: string; name?: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('media');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const page = await api.messages(conversationId);
      setMessages(page.items.filter((message) => !message.deletedAt));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load shared items'); }
    finally { setLoading(false); }
  }, [conversationId]);

  useEffect(() => { void load(); }, [load]);

  const images = messages.flatMap((message) => message.attachments.filter((attachment) => attachment.mimeType.startsWith('image/')).map((attachment) => ({ attachment, message })));
  const files = messages.flatMap((message) => message.attachments.filter((attachment) => !attachment.mimeType.startsWith('image/')).map((attachment) => ({ attachment, message })));
  const links = messages.filter((message) => message.content && message.content.match(URL_PATTERN));

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>Shared · {name ?? 'Group'}</Text>
      </View>
      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['media', 'files', 'links'] as const).map((key) => (
          <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && { borderBottomColor: colors.accent }]}>
            <Text style={[styles.tabText, { color: tab === key ? colors.accent : colors.muted }]}>{key === 'media' ? 'Media' : key === 'files' ? 'Files' : 'Links'}</Text>
          </Pressable>
        ))}
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator color={colors.accent} /></View> : error ? <View style={styles.center}><Text style={{ color: colors.danger, fontWeight: '700' }}>{error}</Text></View> : (
        tab === 'media' ? (
          images.length === 0 ? <Empty label="No shared media yet." /> : (
            <FlatList data={images} numColumns={3} keyExtractor={(item) => item.attachment.id} contentContainerStyle={styles.grid} renderItem={({ item }) => (
              <Pressable onPress={() => void Linking.openURL(item.attachment.url).catch(() => undefined)} style={styles.gridItem}>
                <Image source={{ uri: item.attachment.url }} style={styles.thumb} />
              </Pressable>
            )} />
          )
        ) : tab === 'files' ? (
          files.length === 0 ? <Empty label="No shared files yet." /> : (
            <FlatList data={files} keyExtractor={(item) => item.attachment.id} contentContainerStyle={styles.list} renderItem={({ item }) => (
              <Pressable onPress={() => void Linking.openURL(item.attachment.url).catch(() => undefined)} style={[styles.fileRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.fileIcon, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="file-document-outline" size={22} color={colors.accent} /></View>
                <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={[styles.fileName, { color: colors.text }]}>{item.attachment.name}</Text><Text style={[styles.fileMeta, { color: colors.muted }]}>{(item.attachment.size / 1024).toFixed(0)} KB · {item.attachment.mimeType}</Text></View>
                <MaterialCommunityIcons name="open-in-new" size={18} color={colors.muted} />
              </Pressable>
            )} />
          )
        ) : links.length === 0 ? <Empty label="No shared links yet." /> : (
          <FlatList data={links} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} renderItem={({ item }) => {
            const urls = item.content.match(URL_PATTERN) ?? [];
            const target = urls[0] ?? '';
            return (
              <Pressable onPress={() => void Linking.openURL(target).catch(() => undefined)} style={[styles.fileRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.fileIcon, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="link-variant" size={22} color={colors.accent} /></View>
                <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={2} style={[styles.fileName, { color: colors.text }]}>{item.content}</Text></View>
                <MaterialCommunityIcons name="open-in-new" size={18} color={colors.muted} />
              </Pressable>
            );
          }} />
        )
      )}
    </SafeAreaView>
  );
}

function Empty({ label }: { label: string }) {
  const { colors } = useTheme();
  return <View style={styles.center}><Text style={{ color: colors.muted }}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }, iconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth }, tab: { flex: 1, alignItems: 'center', paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: 'transparent' }, tabText: { fontSize: 13, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }, grid: { padding: 6 }, gridItem: { flex: 1 / 3, aspectRatio: 1, padding: 2 }, thumb: { flex: 1, borderRadius: 4 },
  list: { padding: 14, gap: 10 }, fileRow: { borderWidth: 1, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, fileIcon: { width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, fileName: { fontSize: 14, fontWeight: '700' }, fileMeta: { fontSize: 11, marginTop: 3 },
});
