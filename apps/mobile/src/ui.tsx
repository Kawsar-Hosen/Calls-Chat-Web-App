import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps, PropsWithChildren } from 'react';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Image, Pressable, StyleSheet, Text, TextInput, View, type DimensionValue, type TextInputProps, type ViewStyle } from 'react-native';
import { useTheme } from './theme';
import { useI18n } from './i18n';

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

export function ScreenHeader({ title, eyebrow, right }: { title: string; eyebrow?: string; right?: React.ReactNode }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  return (
    <View style={[styles.screenHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
