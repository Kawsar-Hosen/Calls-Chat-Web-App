import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const CATEGORY_COLORS: Record<string, string> = {
  business: '#1F66FF',
  personal: '#34C759',
  government: '#FFB800',
  media: '#FF6B35',
  sports: '#FF2D55',
  music: '#AF52DE',
  other: '#8E8E93',
};

export function VerifiedBadge({ category, size = 16 }: { category?: string | null; size?: number }) {
  const color = CATEGORY_COLORS[category || ''] || CATEGORY_COLORS.other;
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="check-decagram" size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 4,
  },
});
