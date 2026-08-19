import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/components/VerifiedBadge';

interface VerificationBadgeSheetProps {
  visible: boolean;
  onClose: () => void;
  category: string | null;
  username: string;
  displayName: string;
  verifiedAt: string | null;
}

export function VerificationBadgeSheet({ visible, onClose, category, username, displayName, verifiedAt }: VerificationBadgeSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const color = CATEGORY_COLORS[category || ''] || CATEGORY_COLORS.other;
  const label = CATEGORY_LABELS[category || ''] || 'Other';

  const formattedDate = verifiedAt
    ? new Date(verifiedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: insets.bottom + 20 }]} onPress={() => undefined}>
          {/* Close handle */}
          <View style={[styles.handle, { backgroundColor: colors.faint }]} />

          {/* Big badge icon */}
          <View style={[styles.iconWrap, { backgroundColor: color + '15' }]}>
            <MaterialCommunityIcons name="check-decagram" size={56} color={color} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>Verified</Text>

          {/* Category pill */}
          <View style={[styles.categoryPill, { backgroundColor: color + '18' }]}>
            <MaterialCommunityIcons name="shield-check" size={14} color={color} />
            <Text style={[styles.categoryText, { color }]}>{label}</Text>
          </View>

          {/* Details */}
          <View style={[styles.detailCard, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
            <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>Account</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {displayName ? `${displayName}` : ''}{username ? ` @${username}` : ''}
              </Text>
            </View>
            <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>Type</Text>
              <Text style={[styles.detailValue, { color }]}>{label}</Text>
            </View>
            {formattedDate ? (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.muted }]}>Verified on</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{formattedDate}</Text>
              </View>
            ) : null}
          </View>

          {/* Footer note */}
          <Text style={[styles.footerNote, { color: colors.faint }]}>
            This account is verified by XYTEEE
          </Text>

          {/* Done button */}
          <Pressable onPress={onClose} style={({ pressed }) => [styles.doneBtn, { backgroundColor: color, opacity: pressed ? 0.8 : 1 }]}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  detailCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    maxWidth: '60%',
    textAlign: 'right',
  },
  footerNote: {
    fontSize: 11,
    marginBottom: 16,
  },
  doneBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
