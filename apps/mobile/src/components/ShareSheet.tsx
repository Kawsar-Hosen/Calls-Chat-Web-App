import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';
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
  const [copied, setCopied] = useState(false);
  const [nativeShared, setNativeShared] = useState(false);
  const [reposted, setReposted] = useState(false);

  const handleCopyLink = useCallback(async () => {
    await Clipboard.setStringAsync(`https://xyteee.com/post/${postId}`);
    setCopied(true);
    setTimeout(() => { setCopied(false); onClose(); }, 800);
  }, [postId, onClose]);

  const handleNativeShare = useCallback(async () => {
    try {
      await Share.share({ message: `Check out this post on XYTEEE! https://xyteee.com/post/${postId}` });
      setNativeShared(true);
      setTimeout(() => { setNativeShared(false); onClose(); }, 800);
    } catch {}
  }, [postId, onClose]);

  const handleRepost = useCallback(async () => {
    if (myShared || reposted) return;
    setReposted(true);
    try {
      await api.sharePost(postId);
      onShared?.();
    } catch {}
    setTimeout(() => { setReposted(false); onClose(); }, 800);
  }, [postId, myShared, reposted, onShared, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.panelWrap}>
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.faint }]} />
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

          <Pressable style={[styles.row, { borderBottomColor: colors.border }]} onPress={handleCopyLink}>
            <MaterialCommunityIcons name="link" size={20} color={colors.text} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>{copied ? 'Copied!' : 'Copy Link'}</Text>
            {copied ? <MaterialCommunityIcons name="check" size={20} color={colors.accent} /> : null}
          </Pressable>

          <Pressable style={[styles.row, { borderBottomColor: colors.border }]} onPress={handleNativeShare}>
            <MaterialCommunityIcons name="share-variant-outline" size={20} color={colors.text} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>{nativeShared ? 'Shared!' : 'Share via...'}</Text>
            {nativeShared ? <MaterialCommunityIcons name="check" size={20} color={colors.accent} /> : null}
          </Pressable>

          <Pressable style={[styles.row, { borderBottomColor: colors.border }]} onPress={handleRepost} disabled={myShared}>
            <MaterialCommunityIcons name="repeat" size={20} color={myShared ? colors.muted : colors.accent} />
            <Text style={[styles.rowLabel, { color: myShared ? colors.muted : colors.text }]}>
              {reposted ? 'Reposted!' : t('repostToFeed')}
            </Text>
            {myShared ? <Text style={[styles.rowHint, { color: colors.muted }]}>{t('shared')}</Text> : null}
            {reposted && !myShared ? <MaterialCommunityIcons name="check" size={20} color={colors.accent} /> : null}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  panelWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  panel: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  shareCountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 },
  shareCount: { fontSize: 14, fontWeight: '500' },
  sharedBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  sharedBadgeText: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  rowHint: { fontSize: 13, fontWeight: '500' },
});
