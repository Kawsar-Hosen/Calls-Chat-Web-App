import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '@/api';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';

interface ShareSheetProps {
  visible: boolean;
  postId: string;
  shareCount: number;
  myShared: boolean;
  onClose: () => void;
  onShared?: () => void;
}

export function ShareSheet({ visible, postId, shareCount, myShared, onClose, onShared }: ShareSheetProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [sharing, setSharing] = useState(false);

  const handleShare = useCallback(async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await api.sharePost(postId);
      onShared?.();
    } catch {}
    setSharing(false);
    onClose();
  }, [postId, sharing, onShared, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.panelWrap}>
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          <View style={styles.handle} />

          <Text style={[styles.title, { color: colors.text }]}>{t('shareThisPost')}</Text>

          <View style={styles.shareCountRow}>
            <MaterialCommunityIcons name="share-variant" size={18} color={colors.muted} />
            <Text style={[styles.shareCount, { color: colors.muted }]}>
              {shareCount} {t('shares')}
            </Text>
            {myShared ? (
              <View style={[styles.sharedBadge, { backgroundColor: colors.accent + '20' }]}>
                <Text style={[styles.sharedBadgeText, { color: colors.accent }]}>{t('shared')}</Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.toggleRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
            <MaterialCommunityIcons name="repeat" size={18} color={colors.accent} />
            <Text style={[styles.toggleLabel, { color: colors.text }]}>{t('repostToFeed')}</Text>
            <View style={[styles.toggleDot, { backgroundColor: colors.accent }]} />
          </View>

          <View style={styles.buttonRow}>
            <Pressable onPress={onClose} style={[styles.cancelBtn, { borderColor: colors.border }]}>
              <Text style={[styles.cancelText, { color: colors.text }]}>{t('cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={handleShare}
              disabled={sharing}
              style={[styles.shareBtn, { backgroundColor: colors.accent, opacity: sharing ? 0.6 : 1 }]}
            >
              <MaterialCommunityIcons name="share" size={18} color="#fff" />
              <Text style={styles.shareBtnText}>{t('shareNow')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  panelWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  panel: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  shareCountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 },
  shareCount: { fontSize: 14, fontWeight: '500' },
  sharedBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  sharedBadgeText: { fontSize: 12, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 20 },
  toggleLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  toggleDot: { width: 8, height: 8, borderRadius: 4 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  cancelText: { fontSize: 15, fontWeight: '600' },
  shareBtn: { flex: 1, flexDirection: 'row', borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  shareBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
