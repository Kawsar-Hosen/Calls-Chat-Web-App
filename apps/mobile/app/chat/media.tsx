import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Linking, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';
import type { Attachment, Message } from '@/types';

type Tab = 'media' | 'files' | 'links';

export default function ChatMediaScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('media');
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ items: Attachment[]; index: number } | null>(null);
  const viewerRef = useRef<FlatList<Attachment>>(null);
  const loadedRef = useRef(false);

  const loadPage = useCallback(async (before?: string | null) => {
    if (!params.id) return;
    try {
      const result = await api.messages(params.id, before ?? null, 100);
      if (before) {
        setMessages((current) => [...current, ...result.items]);
      } else {
        setMessages(result.items);
      }
      setNextCursor(result.nextCursor);
      return result.items.length;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('couldNotLoadMessages'));
      return 0;
    }
  }, [params.id, t]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    void loadPage(null).finally(() => setLoading(false));
  }, [loadPage]);

  const loadMore = async () => {
    if (loadingMore || !nextCursor) return;
    setLoadingMore(true);
    const count = await loadPage(nextCursor);
    if (count === 0) setNextCursor(null);
    setLoadingMore(false);
  };

  const media: Attachment[] = useMemo(() => messages.flatMap((message) => message.attachments.filter((attachment) => attachment.mimeType.startsWith('image/') || attachment.mimeType.startsWith('video/'))), [messages]);
  const files: Attachment[] = useMemo(() => messages.flatMap((message) => message.attachments.filter((attachment) => !attachment.mimeType.startsWith('image/') && !attachment.mimeType.startsWith('video/') && !attachment.mimeType.startsWith('audio/'))), [messages]);
  const links: { url: string; content: string }[] = useMemo(() => {
    const seen = new Set<string>();
    const rows: { url: string; content: string }[] = [];
    for (const message of messages) {
      const matches = message.content.match(/https?:\/\/[^\s"'<>]+/g);
      if (!matches) continue;
      for (const raw of matches) {
        const url = raw.replace(/[.,;:!?]+$/, '');
        if (seen.has(url)) continue;
        seen.add(url);
        rows.push({ url, content: message.content });
        if (rows.length >= 60) return rows;
      }
    }
    return rows;
  }, [messages]);

  const counts = { media: media.length, files: files.length, links: links.length };
  const tabMeta: { key: Tab; label: string; icon: 'image-multiple-outline' | 'file-document-outline' | 'link-variant'; emptyKey: 'noMedia' | 'noFiles' | 'noLinks' }[] = [
    { key: 'media', label: t('media'), icon: 'image-multiple-outline', emptyKey: 'noMedia' },
    { key: 'files', label: t('files'), icon: 'file-document-outline', emptyKey: 'noFiles' },
    { key: 'links', label: t('links'), icon: 'link-variant', emptyKey: 'noLinks' },
  ];

  const openAttachment = (attachment: Attachment) => {
    if (attachment.mimeType.startsWith('video/')) {
      void Linking.openURL(attachment.url);
      return;
    }
    setViewer({ items: media, index: Math.max(0, media.findIndex((item) => item.id === attachment.id)) });
  };

  const renderEmpty = (icon: 'image-multiple-outline' | 'file-document-outline' | 'link-variant', emptyKey: 'noMedia' | 'noFiles' | 'noLinks') => (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name={icon} size={30} color={colors.accent} /></View>
      <Text style={[styles.emptyText, { color: colors.muted }]}>{t(emptyKey)}</Text>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{params.name || t('mediaFilesLinks')}</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {tabMeta.map((item) => {
          const selected = tab === item.key;
          return (
            <Pressable key={item.key} onPress={() => setTab(item.key)} style={({ pressed }) => [styles.tab, selected && { backgroundColor: colors.accentSoft }, pressed && { opacity: 0.7 }]}>
              <Text style={[styles.tabText, { color: selected ? colors.accent : colors.muted, fontWeight: selected ? '800' : '600' }]}>{item.label} ({counts[item.key]})</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      ) : error && !messages.length ? (
        <View style={styles.center}><Text style={{ color: colors.danger, fontWeight: '700' }}>{error}</Text></View>
      ) : tab === 'media' ? (
        <FlatList
          data={media}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[styles.grid, media.length === 0 && styles.flexGrow]}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <View style={styles.moreLoader}><ActivityIndicator color={colors.accent} /></View> : null}
          ListEmptyComponent={renderEmpty('image-multiple-outline', 'noMedia')}
          renderItem={({ item }) => {
            const isVideo = item.mimeType.startsWith('video/');
            return (
              <Pressable onPress={() => openAttachment(item)} style={({ pressed }) => [styles.cell, { opacity: pressed ? 0.7 : 1 }]}>
                <Image source={{ uri: item.url }} style={styles.cellImage} />
                {isVideo ? <View style={styles.cellPlay}><MaterialCommunityIcons name="play" size={18} color="#FFFFFF" /></View> : null}
              </Pressable>
            );
          }}
        />
      ) : tab === 'files' ? (
        <FlatList
          data={files}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, files.length === 0 && styles.flexGrow]}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <View style={styles.moreLoader}><ActivityIndicator color={colors.accent} /></View> : null}
          ListEmptyComponent={renderEmpty('file-document-outline', 'noFiles')}
          renderItem={({ item }) => (
            <Pressable onPress={() => void Linking.openURL(item.url)} style={({ pressed }) => [styles.fileRow, { borderBottomColor: colors.border }, pressed && { opacity: 0.6 }]}>
              <View style={[styles.fileIcon, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="file-document-outline" size={22} color={colors.accent} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={[styles.fileName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.fileSize, { color: colors.muted }]}>{formatSize(item.size)}</Text>
              </View>
              <MaterialCommunityIcons name="download-outline" size={20} color={colors.faint} />
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={links}
          keyExtractor={(item) => item.url}
          contentContainerStyle={[styles.listContent, links.length === 0 && styles.flexGrow]}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <View style={styles.moreLoader}><ActivityIndicator color={colors.accent} /></View> : null}
          ListEmptyComponent={renderEmpty('link-variant', 'noLinks')}
          renderItem={({ item }) => (
            <Pressable onPress={() => void Linking.openURL(item.url)} style={({ pressed }) => [styles.fileRow, { borderBottomColor: colors.border }, pressed && { opacity: 0.6 }]}>
              <View style={[styles.fileIcon, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="link-variant" size={22} color={colors.accent} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={[styles.fileName, { color: colors.accent }]}>{item.url}</Text>
                <Text numberOfLines={1} style={[styles.fileSize, { color: colors.muted }]}>{item.content.replace(item.url, '').trim() || ' '}</Text>
              </View>
              <MaterialCommunityIcons name="open-in-new" size={18} color={colors.faint} />
            </Pressable>
          )}
        />
      )}

      <Modal visible={viewer !== null} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <View style={styles.viewerBackdrop}>
          <Pressable style={styles.viewerClose} onPress={() => setViewer(null)} hitSlop={10}><MaterialCommunityIcons name="close" size={26} color="#FFFFFF" /></Pressable>
          {viewer ? (
            <>
              <FlatList
                ref={viewerRef}
                horizontal
                pagingEnabled
                data={viewer.items}
                keyExtractor={(item) => item.id}
                initialScrollIndex={viewer.index}
                getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => setViewer((current) => current ? { ...current, index: Math.round(event.nativeEvent.contentOffset.x / width) } : null)}
                renderItem={({ item }) => (
                  <View style={{ width, alignItems: 'center', justifyContent: 'center' }}>
                    <Image source={{ uri: item.url }} style={styles.viewerImage} resizeMode="contain" />
                  </View>
                )}
              />
              {viewer.items.length > 1 ? (
                <>
                  <Pressable disabled={viewer.index === 0} onPress={() => viewerRef.current?.scrollToIndex({ index: Math.max(0, viewer.index - 1), animated: true })} style={[styles.viewerNav, styles.viewerNavLeft]}><MaterialCommunityIcons name="chevron-left" size={30} color="#FFFFFF" /></Pressable>
                  <Pressable disabled={viewer.index === viewer.items.length - 1} onPress={() => viewerRef.current?.scrollToIndex({ index: Math.min(viewer.items.length - 1, viewer.index + 1), animated: true })} style={[styles.viewerNav, styles.viewerNavRight]}><MaterialCommunityIcons name="chevron-right" size={30} color="#FFFFFF" /></Pressable>
                </>
              ) : null}
            </>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }, iconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth }, tab: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 16 }, tabText: { fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, flexGrow: { flexGrow: 1 },
  grid: { padding: 4, paddingBottom: 24 }, gridRow: { padding: 4, gap: 8 }, cell: { flex: 1, aspectRatio: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 8, backgroundColor: 'rgba(127,127,127,.15)' }, cellImage: { width: '100%', height: '100%' }, cellPlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 }, fileRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: StyleSheet.hairlineWidth }, fileIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, fileName: { fontSize: 14, fontWeight: '700' }, fileSize: { fontSize: 12, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 14 }, emptyIcon: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' }, emptyText: { fontSize: 13, fontWeight: '700' },
  moreLoader: { paddingVertical: 18 },
  viewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.95)' }, viewerClose: { position: 'absolute', top: 52, right: 18, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.2)', alignItems: 'center', justifyContent: 'center' }, viewerImage: { width: '100%', height: '100%' }, viewerNav: { position: 'absolute', top: '50%', zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,.2)', alignItems: 'center', justifyContent: 'center' }, viewerNavLeft: { left: 14 }, viewerNavRight: { right: 14 },
});
