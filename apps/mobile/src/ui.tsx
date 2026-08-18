import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps, PropsWithChildren } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View, type DimensionValue, type TextInputProps, type ViewStyle } from 'react-native';
import { useTheme } from './theme';
import { useI18n } from './i18n';
import { useRouter } from 'expo-router';

export function BrandMark({ size = 42 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.brand, { width: size, height: size, backgroundColor: colors.accent, borderTopLeftRadius: size * 0.18, borderTopRightRadius: size * 0.18, borderBottomRightRadius: size * 0.18, borderBottomLeftRadius: size * 0.05 }]}>
      <MaterialCommunityIcons name="message-processing-outline" size={size * 0.54} color={colors.accentText} />
    </View>
  );
}

export function Avatar({ name, uri, size = 46, online = false }: { name: string; uri?: string | null; size?: number; online?: boolean }) {
  const { colors } = useTheme();
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.elevated }]}> 
        {uri ? <Image source={{ uri }} resizeMode="cover" style={{ width: size, height: size, borderRadius: size / 2 }} /> : <Text style={{ color: colors.text, fontWeight: '700', fontSize: size * 0.27 }}>{initials || '?'}</Text>}
      </View>
      {online ? <View style={[styles.online, { backgroundColor: colors.success, borderColor: colors.surface }]} /> : null}
    </View>
  );
}

export function Field(props: TextInputProps) {
  const { colors } = useTheme();
  return <TextInput placeholderTextColor={colors.faint} {...props} style={[styles.field, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }, props.style]} />;
}

export function PrimaryButton({ title, loading, icon = 'arrow-right', onPress, disabled }: { title: string; loading?: boolean; icon?: ComponentProps<typeof MaterialCommunityIcons>['name']; onPress: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  return (
    <Pressable disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.primaryButton, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: colors.accent, opacity: disabled || loading ? 0.55 : pressed ? 0.82 : 1 }]}> 
      {loading ? <ActivityIndicator color={colors.accentText} /> : <><Text style={[styles.primaryText, { color: colors.accentText }]}>{title}</Text><MaterialCommunityIcons name={icon} size={20} color={colors.accentText} /></>}
    </Pressable>
  );
}

export function ScreenHeader({ title, eyebrow, right, back }: { title: string; eyebrow?: string; right?: React.ReactNode; back?: boolean }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const router = useRouter();
  return (
    <View style={[styles.screenHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {back ? <Pressable onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}><MaterialCommunityIcons name={isRTL ? 'chevron-right' : 'chevron-left'} size={26} color={colors.text} /></Pressable> : null}
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: colors.accent, textAlign: isRTL ? 'right' : 'left' }]}>{eyebrow.toUpperCase()}</Text> : null}
        <Text style={[styles.title, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

export function ErrorText({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return <Text style={[styles.error, { color: colors.danger, borderLeftColor: colors.danger }]}>{children}</Text>;
}

export function Skeleton({ width, height, radius = 7, style }: { width: DimensionValue; height: number; radius?: number; style?: ViewStyle }) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.4, duration: 750, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse]);
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors.elevated, opacity: pulse }, style]} />;
}

export function SkeletonList({ rows = 6, avatar = true }: { rows?: number; avatar?: boolean }) {
  return <View style={styles.skeletonList}>{Array.from({ length: rows }).map((_, index) => (
    <View style={styles.skeletonRow} key={index}>
      {avatar ? <Skeleton width={46} height={46} radius={23} /> : null}
      <View style={styles.skeletonLines}><Skeleton width="100%" height={13} /><Skeleton width="55%" height={10} /></View>
    </View>
  ))}</View>;
}

export function SkeletonChat({ bubbles = 8 }: { bubbles?: number }) {
  const widths = [38, 52, 44];
  return <View style={styles.skeletonChat}>{Array.from({ length: bubbles }).map((_, index) => {
    const mine = index % 3 === 0;
    return <View key={index} style={[styles.skeletonBubbleRow, mine ? styles.skeletonBubbleRowMine : null]}>
      {!mine ? <Skeleton width={30} height={30} radius={15} /> : null}
      <Skeleton width={`${Number(widths[index % 3] ?? 44) + (mine ? 10 : 0)}%`} height={38} radius={10} />
    </View>;
  })}</View>;
}

export function ConfirmSheet({ visible, title, message, icon, iconBg, iconColor, confirmLabel, confirmColor, onConfirm, onCancel, loading }: {
  visible: boolean;
  title: string;
  message: string;
  icon?: ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconBg?: string;
  iconColor?: string;
  confirmLabel?: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.92);
      opacity.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={confirmStyles.backdrop}>
        <Animated.View style={[confirmStyles.card, { backgroundColor: colors.surface, borderColor: colors.border, opacity, transform: [{ scale }] }]}>
          <View style={[confirmStyles.iconWrap, { backgroundColor: (iconBg || colors.danger + '18') }]}>
            <MaterialCommunityIcons name={icon || 'alert'} size={32} color={iconColor || colors.danger} />
          </View>
          <Text style={[confirmStyles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[confirmStyles.message, { color: colors.muted }]}>{message}</Text>
          <View style={confirmStyles.actions}>
            <Pressable onPress={onCancel} style={({ pressed }) => [confirmStyles.cancelBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[confirmStyles.cancelText, { color: colors.text }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={loading ? undefined : onConfirm} style={({ pressed }) => [confirmStyles.confirmBtn, { backgroundColor: confirmColor || colors.danger, opacity: loading ? 0.6 : pressed ? 0.8 : 1 }]}>
              {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={confirmStyles.confirmText}>{confirmLabel || 'Delete'}</Text>}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const confirmStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  card: { width: '100%', borderRadius: 24, borderWidth: 1, paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center' },
  iconWrap: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { fontSize: 19, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  message: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 28 },
  actions: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700' },
  confirmBtn: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});

const styles = StyleSheet.create({
  brand: { alignItems: 'center', justifyContent: 'center' },
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  online: { position: 'absolute', right: 0, bottom: 1, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  field: { minHeight: 50, borderWidth: 1, borderRadius: 7, paddingHorizontal: 14, fontSize: 16 },
  primaryButton: { minHeight: 52, borderRadius: 7, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryText: { fontSize: 15, fontWeight: '800' },
  screenHeader: { minHeight: 92, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 20, paddingBottom: 15 },
  eyebrow: { fontSize: 10, fontWeight: '800', marginBottom: 3 },
  title: { fontSize: 27, fontWeight: '700' },
  error: { borderLeftWidth: 3, paddingLeft: 10, fontSize: 13, lineHeight: 18 },
  skeletonList: { paddingVertical: 6 }, skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }, skeletonLines: { flex: 1, gap: 9 },
  skeletonChat: { flex: 1, padding: 18, gap: 18, overflow: 'hidden' }, skeletonBubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 }, skeletonBubbleRowMine: { flexDirection: 'row-reverse' },
});
