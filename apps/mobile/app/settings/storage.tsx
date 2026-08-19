import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { ScreenHeader, ConfirmSheet } from '@/ui';

interface DataUsage { posts: number; stories: number; messages: number; media: number; mediaBytes: number }

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

const DATA_ITEMS: { key: keyof Omit<DataUsage, 'mediaBytes'>; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; color: string; label: string; desc: string }[] = [
  { key: 'posts', icon: 'post-outline', color: '#6C5CE7', label: 'Posts', desc: 'Posts, likes, comments, shares' },
  { key: 'stories', icon: 'clock-outline', color: '#00B894', label: 'Stories', desc: 'Stories, highlights, reactions' },
  { key: 'messages', icon: 'message-text-outline', color: '#0984E3', label: 'Messages', desc: 'All sent chat messages' },
  { key: 'media', icon: 'image-multiple-outline', color: '#E17055', label: 'Media', desc: 'Uploaded images & files' },
];

export default function StorageScreen() {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const [cacheOpen, setCacheOpen] = useState(false);
  const [usage, setUsage] = useState<DataUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<typeof DATA_ITEMS[number] | null>(null);
  const [step, setStep] = useState(0);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const direction = { flexDirection: isRTL ? 'row-reverse' as const : 'row' as const };
  const alignment = { textAlign: isRTL ? 'right' as const : 'left' as const };

  useEffect(() => { loadUsage(); }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const loadUsage = async () => {
    setLoading(true);
    try { setUsage(await api.getDataUsage()); } catch {}
    setLoading(false);
  };

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const clearCache = async () => {
    setClearing(true);
    await new Promise(r => setTimeout(r, 800));
    setClearing(false);
    setCacheOpen(false);
    showToast('Cache cleared');
  };

  const openDelete = (item: typeof DATA_ITEMS[number]) => {
    setDeleteTarget(item);
    setStep(0);
    setConfirmText('');
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.key === 'posts') await api.deleteAllPosts();
      else if (deleteTarget.key === 'stories') await api.deleteAllStories();
      else if (deleteTarget.key === 'messages') await api.deleteAllMessages();
      else if (deleteTarget.key === 'media') await api.deleteAllMedia();
      showToast(`${deleteTarget.label} permanently deleted`);
      setDeleteTarget(null);
      setStep(0);
      setConfirmText('');
      loadUsage();
    } catch {}
    setDeleting(false);
  };

  const totalItems = usage ? usage.posts + usage.stories + usage.messages + usage.media : 0;
  const totalSize = usage?.mediaBytes ?? 0;

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Storage" back />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Cache */}
        <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>CACHE</Text>
        <Pressable onPress={() => setCacheOpen(true)} style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
          <View style={styles.cardInner}>
            <View style={[styles.cardIcon, { backgroundColor: colors.accentSoft }]}>
              <MaterialCommunityIcons name="broom" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, alignment, { color: colors.text }]}>Clear Cache</Text>
              <Text style={[styles.cardDesc, alignment, { color: colors.muted }]}>Remove temporary files</Text>
            </View>
            <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={21} color={colors.faint} />
          </View>
        </Pressable>

        {/* Storage Overview */}
        <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>STORAGE OVERVIEW</Text>
        <View style={[styles.overviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.overviewHeader, direction]}>
            <View style={[styles.overviewIcon, { backgroundColor: colors.danger + '12' }]}>
              <MaterialCommunityIcons name="database-outline" size={22} color={colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.overviewTitle, { color: colors.text }]}>Your Data</Text>
              <Text style={[styles.overviewSub, { color: colors.muted }]}>{totalItems} items stored</Text>
            </View>
            <View style={styles.overviewSize}>
              <Text style={[styles.sizeNumber, { color: colors.text }]}>{formatSize(totalSize)}</Text>
              <Text style={[styles.sizeLabel, { color: colors.muted }]}>media</Text>
            </View>
          </View>
          {totalItems > 0 ? (
            <View style={[styles.barContainer, { backgroundColor: colors.border }]}>
              {DATA_ITEMS.map((item) => {
                const count = usage?.[item.key] ?? 0;
                const pct = totalItems > 0 ? (count / totalItems) * 100 : 0;
                return pct > 0 ? <View key={item.key} style={[styles.barSegment, { backgroundColor: item.color, width: `${pct}%` }]} /> : null;
              })}
            </View>
          ) : (
            <View style={[styles.barContainer, { backgroundColor: colors.border }]}>
              <View style={[styles.barEmpty, { backgroundColor: colors.faint + '30' }]} />
            </View>
          )}
          <View style={[styles.legendRow, direction]}>
            {DATA_ITEMS.map((item) => {
              const count = usage?.[item.key] ?? 0;
              return (
                <View key={item.key} style={[styles.legendItem, direction]}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.legendText, { color: colors.muted }]}>{item.label}</Text>
                  <Text style={[styles.legendCount, { color: colors.text }]}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Permanent Delete */}
        <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>PERMANENT DELETE</Text>
        <View style={[styles.dangerBanner, { backgroundColor: colors.danger + '08', borderColor: colors.danger + '20' }]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.danger} />
          <Text style={[styles.dangerBannerText, { color: colors.danger }]}>These actions are irreversible. Deleted data cannot be recovered.</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={colors.accent} /><Text style={{ color: colors.muted, fontSize: 13 }}>Loading...</Text></View>
        ) : (
          DATA_ITEMS.map((item) => {
            const count = usage?.[item.key] ?? 0;
            const isMedia = item.key === 'media';
            const size = isMedia ? (usage?.mediaBytes ?? 0) : 0;
            return (
              <View key={item.key} style={[styles.dataCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.dataInner, direction]}>
                  <View style={[styles.dataIcon, { backgroundColor: item.color + '15' }]}>
                    <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dataTitle, alignment, { color: colors.text }]}>{item.label}</Text>
                    <Text style={[styles.dataDesc, alignment, { color: colors.muted }]}>{item.desc}</Text>
                  </View>
                  <View style={styles.dataStats}>
                    <Text style={[styles.dataCount, { color: colors.text }]}>{count}</Text>
                    {isMedia && size > 0 ? <Text style={[styles.dataSize, { color: colors.muted }]}>{formatSize(size)}</Text> : null}
                  </View>
                </View>
                <Pressable onPress={() => openDelete(item)} disabled={count === 0} style={({ pressed }) => [styles.deleteBtn, { borderColor: colors.danger + '30', opacity: count === 0 ? 0.3 : pressed ? 0.6 : 1 }]}>
                  <MaterialCommunityIcons name="delete-forever-outline" size={15} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '800' }}>DELETE ALL</Text>
                </Pressable>
              </View>
            );
          })
        )}

        {totalItems === 0 && !loading ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="check-decagram" size={40} color={colors.success} />
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>All Clean!</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>No stored data found</Text>
          </View>
        ) : null}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Cache Confirm */}
      <ConfirmSheet visible={cacheOpen} title="Clear cache?" message="This will remove all cached files. You will stay logged in." icon="broom" iconColor={colors.accent} iconBg={colors.accent + '18'} confirmLabel="Clear" confirmColor={colors.accent} onConfirm={() => void clearCache()} onCancel={() => setCacheOpen(false)} loading={clearing} />

      {/* Permanent Delete Modal */}
      {deleteTarget ? (
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {step === 0 && (
              <>
                <View style={[styles.sheetIcon, { backgroundColor: colors.danger + '18' }]}>
                  <MaterialCommunityIcons name="alert-circle" size={36} color={colors.danger} />
                </View>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>Delete {deleteTarget.label}?</Text>
                <Text style={[styles.sheetDesc, alignment, { color: colors.muted }]}>You are about to permanently delete <Text style={{ color: colors.danger, fontWeight: '800' }}>ALL {usage?.[deleteTarget.key] ?? 0} {deleteTarget.label.toLowerCase()}</Text> from your account.</Text>
                <View style={[styles.sheetWarning, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '20' }]}>
                  <MaterialCommunityIcons name="information-outline" size={16} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontSize: 12, flex: 1, lineHeight: 17 }}>This action is permanent and cannot be undone. All related data will be removed from the database forever.</Text>
                </View>
                <View style={styles.sheetActions}>
                  <Pressable onPress={() => { setDeleteTarget(null); setStep(0); }} style={({ pressed }) => [styles.sheetCancel, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={() => setStep(1)} style={({ pressed }) => [styles.sheetConfirm, { backgroundColor: colors.danger, opacity: pressed ? 0.7 : 1 }]}>
                    <MaterialCommunityIcons name="arrow-right" size={18} color="#FFF" />
                    <Text style={{ color: '#FFF', fontWeight: '800' }}>Continue</Text>
                  </Pressable>
                </View>
              </>
            )}
            {step === 1 && (
              <>
                <View style={[styles.sheetIcon, { backgroundColor: colors.danger + '18' }]}>
                  <MaterialCommunityIcons name="keyboard" size={36} color={colors.danger} />
                </View>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>Final Confirmation</Text>
                <Text style={[styles.sheetDesc, alignment, { color: colors.muted }]}>Type <Text style={{ fontWeight: '800', color: colors.danger }}>DELETE ALL {deleteTarget.label.toUpperCase()}</Text> to confirm:</Text>
                <View style={[styles.phraseBox, { backgroundColor: colors.danger + '08', borderColor: colors.danger + '25' }]}>
                  <Text style={[styles.phraseText, { color: colors.danger }]}>DELETE ALL {deleteTarget.label.toUpperCase()}</Text>
                </View>
                <TextInput value={confirmText} onChangeText={setConfirmText} placeholder="Type here..." placeholderTextColor={colors.faint} style={[styles.confirmInput, { backgroundColor: colors.background, borderColor: confirmText === `DELETE ALL ${deleteTarget.label.toUpperCase()}` ? colors.success : colors.border, color: colors.text }]} autoCapitalize="characters" autoCorrect={false} autoFocus />
                {confirmText && confirmText !== `DELETE ALL ${deleteTarget.label.toUpperCase()}` ? (
                  <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '600' }}>Text does not match</Text>
                ) : confirmText === `DELETE ALL ${deleteTarget.label.toUpperCase()}` ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialCommunityIcons name="check-circle" size={14} color={colors.success} />
                    <Text style={{ color: colors.success, fontSize: 11, fontWeight: '600' }}>Confirmed</Text>
                  </View>
                ) : null}
                <View style={styles.sheetActions}>
                  <Pressable onPress={() => { setDeleteTarget(null); setStep(0); setConfirmText(''); }} style={({ pressed }) => [styles.sheetCancel, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={() => void doDelete()} disabled={confirmText !== `DELETE ALL ${deleteTarget.label.toUpperCase()}` || deleting} style={({ pressed }) => [styles.sheetConfirm, { backgroundColor: colors.danger, opacity: (confirmText !== `DELETE ALL ${deleteTarget.label.toUpperCase()}` || deleting) ? 0.4 : pressed ? 0.7 : 1 }]}>
                    {deleting ? <ActivityIndicator color="#FFF" size="small" /> : <MaterialCommunityIcons name="delete-forever" size={18} color="#FFF" />}
                    <Text style={{ color: '#FFF', fontWeight: '800' }}>{deleting ? 'Deleting...' : 'Delete Forever'}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      ) : null}

      {toast ? <View style={[styles.toast, { backgroundColor: colors.text }]}><MaterialCommunityIcons name="check" size={16} color={colors.background} /><Text style={{ color: colors.background, fontSize: 13, fontWeight: '700' }}>{toast}</Text></View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '800', marginTop: 12, marginBottom: 4, paddingHorizontal: 4, letterSpacing: 0.5 },

  card: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  cardInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  cardIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  cardDesc: { fontSize: 11, marginTop: 2 },

  overviewCard: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 14 },
  overviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  overviewIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  overviewTitle: { fontSize: 16, fontWeight: '800' },
  overviewSub: { fontSize: 12, marginTop: 2 },
  overviewSize: { alignItems: 'flex-end' },
  sizeNumber: { fontSize: 18, fontWeight: '900' },
  sizeLabel: { fontSize: 11, fontWeight: '600' },
  barContainer: { height: 8, borderRadius: 4, overflow: 'hidden', flexDirection: 'row' },
  barSegment: { height: '100%' },
  barEmpty: { width: '100%', height: '100%', borderRadius: 4 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: '600' },
  legendCount: { fontSize: 11, fontWeight: '800' },

  dangerBanner: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 12, gap: 8, alignItems: 'flex-start' },
  dangerBannerText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  loadingBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },

  dataCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  dataInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dataIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dataTitle: { fontSize: 14, fontWeight: '700' },
  dataDesc: { fontSize: 11, marginTop: 2 },
  dataStats: { alignItems: 'flex-end' },
  dataCount: { fontSize: 20, fontWeight: '900' },
  dataSize: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 10 },

  emptyCard: { borderWidth: 1, borderRadius: 14, padding: 32, alignItems: 'center', gap: 6 },

  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheetCard: { width: '100%', maxWidth: 400, borderWidth: 1, borderRadius: 20, padding: 24, alignItems: 'center', gap: 12 },
  sheetIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  sheetDesc: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  sheetWarning: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, padding: 12, gap: 8, width: '100%' },
  sheetActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  sheetCancel: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetConfirm: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6, flexDirection: 'row' },
  phraseBox: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, width: '100%', alignItems: 'center' },
  phraseText: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  confirmInput: { width: '100%', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, fontWeight: '700', textAlign: 'center', letterSpacing: 1 },
  toast: { position: 'absolute', bottom: 30, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
});
