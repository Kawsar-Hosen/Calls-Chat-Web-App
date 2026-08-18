import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Avatar } from '@/ui';
import { FluentEmoji } from '@/emoji';
import type { PostReaction } from '@/types';

const ALL_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

interface ReactionSheetProps {
  visible: boolean;
  reactions: PostReaction[];
  onClose: () => void;
}

export function ReactionSheet({ visible, reactions, onClose }: ReactionSheetProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, PostReaction[]> = {};
    for (const r of reactions) {
      (map[r.emoji] ??= []).push(r);
    }
    return map;
  }, [reactions]);

  const activeEmojis = useMemo(() => ALL_REACTIONS.filter((e) => grouped[e]?.length), [grouped]);

  const filtered = selected ? (grouped[selected] ?? []) : reactions;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.handle, { backgroundColor: colors.faint }]} />

          <View style={styles.emojiRow}>
            {ALL_REACTIONS.map((emoji) => {
              const count = grouped[emoji]?.length ?? 0;
              const isActive = selected === emoji;
              return (
                <Pressable
                  key={emoji}
                  onPress={() => setSelected(isActive ? null : emoji)}
                  style={[styles.emojiTab, isActive && { backgroundColor: colors.accentSoft, borderColor: colors.accent }, !count && { opacity: 0.3 }]}
                >
                  <FluentEmoji char={emoji} size={24} />
                  {count > 0 ? <Text style={[styles.emojiTabCount, { color: isActive ? colors.accent : colors.muted }]}>{count}</Text> : null}
                </Pressable>
              );
            })}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => `${item.userId}-${item.emoji}`}
            renderItem={({ item }) => (
              <Pressable
                style={styles.reactorRow}
                onPress={() => { onClose(); router.push({ pathname: '/feed/profile/[id]' as any, params: { id: item.userId } }); }}
              >
                <Avatar name={item.displayName || item.userId} uri={item.avatarUrl} size={36} />
                <View style={styles.reactorInfo}>
                  <Text style={[styles.reactorName, { color: colors.text }]} numberOfLines={1}>{item.displayName || item.userId}</Text>
                </View>
                <FluentEmoji char={item.emoji} size={20} />
              </Pressable>
            )}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={[styles.empty, { color: colors.muted }]}>No reactions</Text>}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingBottom: 32, maxHeight: '65%' },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  emojiRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.2)' },
  emojiTab: { alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent', gap: 2 },
  emojiTabCount: { fontSize: 11, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  reactorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4 },
  reactorInfo: { flex: 1 },
  reactorName: { fontSize: 14, fontWeight: '600' },
  empty: { textAlign: 'center', paddingVertical: 24, fontSize: 14 },
});
