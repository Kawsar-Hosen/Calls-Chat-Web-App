import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { VerificationBadgeSheet } from '@/components/VerificationBadgeSheet';

export const CATEGORY_COLORS: Record<string, string> = {
  business: '#1F66FF',
  personal: '#34C759',
  government: '#FFB800',
  media: '#FF6B35',
  sports: '#FF2D55',
  music: '#AF52DE',
  other: '#8E8E93',
};

export const CATEGORY_LABELS: Record<string, string> = {
  business: 'Business',
  personal: 'Personal',
  government: 'Government',
  media: 'Media / Press',
  sports: 'Sports',
  music: 'Music',
  other: 'Other',
};

interface VerifiedBadgeProps {
  category: string | null;
  size?: number;
  username: string;
  displayName: string;
  verifiedAt: string | null;
}

export function VerifiedBadge({ category, size = 16, username, displayName, verifiedAt }: VerifiedBadgeProps) {
  const [showSheet, setShowSheet] = useState(false);
  const color = CATEGORY_COLORS[category || ''] || CATEGORY_COLORS.other;

  return (
    <>
      <Pressable onPress={() => setShowSheet(true)} hitSlop={4} style={styles.container}>
        <MaterialCommunityIcons name="check-decagram" size={size} color={color} />
      </Pressable>
      <VerificationBadgeSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        category={category}
        username={username}
        displayName={displayName}
        verifiedAt={verifiedAt}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 4,
    alignSelf: 'center',
  },
});
