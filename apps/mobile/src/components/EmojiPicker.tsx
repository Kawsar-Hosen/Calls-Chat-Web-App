import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo, useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FluentEmoji, emojiList, type EmojiDef } from '@/emoji';
import { useTheme, useFont } from '@/theme';
import { useI18n } from '@/i18n';

const QUICK_EMOJIS = ['👍', '😂', '❤️', '😍', '🔥', '😭', '😎', '🙌', '💯', '🚀', '✨', '😊'];

const STICKER_EMOJIS = emojiList('fluent').filter((e) => e.src === 'bundled');

interface EmojiPickerProps {
  visible: boolean;
  onSelect: (char: string) => void;
  onClose: () => void;
}

type Tab = 'emoji' | 'stickers';

export function EmojiPicker({ visible, onSelect, onClose }: EmojiPickerProps) {
  const { colors } = useTheme();
  const { fontFamily } = useFont();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('emoji');
  const [query, setQuery] = useState('');

  const filteredEmojis = useMemo(() => {
    if (query.trim()) return emojiList('all', query);
    return emojiList('all');
  }, [query]);

  const handleSelect = useCallback((char: string) => {
    onSelect(char);
  }, [onSelect]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => { setTab('emoji'); setQuery(''); }}
            style={[styles.tab, tab === 'emoji' && { borderBottomColor: colors.accent }]}
          >
            <Text style={[styles.tabText, { color: tab === 'emoji' ? colors.accent : colors.muted, fontFamily }]}>
              Emoji
            </Text>
          </Pressable>
          <Pressable
            onPress={() => { setTab('stickers'); setQuery(''); }}
            style={[styles.tab, tab === 'stickers' && { borderBottomColor: colors.accent }]}
          >
            <Text style={[styles.tabText, { color: tab === 'stickers' ? colors.accent : colors.muted, fontFamily }]}>
              Stickers
            </Text>
          </Pressable>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.elevated }]}>
          <MaterialCommunityIcons name="magnify" size={18} color={colors.faint} />
          <TextInput
            style={[styles.searchInput, { color: colors.text, fontFamily }]}
            placeholder={t('search')}
            placeholderTextColor={colors.faint}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={16} color={colors.faint} />
            </Pressable>
          ) : null}
        </View>

        {tab === 'emoji' && !query.trim() ? (
          <View style={[styles.quickRow, { borderBottomColor: colors.border }]}>
            {QUICK_EMOJIS.map((char) => (
              <Pressable key={char} onPress={() => handleSelect(char)} style={styles.quickBtn}>
                <FluentEmoji char={char} size={28} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {tab === 'emoji' ? (
          <FlatList
            data={filteredEmojis}
            keyExtractor={(item) => `${item.char}-${item.family}`}
            numColumns={7}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.gridRow}
            renderItem={({ item }) => (
              <EmojiButton emoji={item} onSelect={handleSelect} />
            )}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.faint }]}>{t('search')}</Text>
            }
          />
        ) : (
          <FlatList
            data={query.trim() ? emojiList('all', query).filter((e) => e.src === 'bundled') : STICKER_EMOJIS}
            keyExtractor={(item) => `sticker-${item.char}-${item.family}`}
            numColumns={3}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.stickerRow}
            renderItem={({ item }) => (
              <StickerButton emoji={item} onSelect={handleSelect} />
            )}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.faint }]}>No stickers found</Text>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const EmojiButton = memo(function EmojiButton({ emoji, onSelect }: { emoji: EmojiDef; onSelect: (char: string) => void }) {
  return (
    <Pressable onPress={() => onSelect(emoji.char)} style={styles.emojiBtn}>
      <FluentEmoji char={emoji.char} size={28} />
    </Pressable>
  );
});

const StickerButton = memo(function StickerButton({ emoji, onSelect }: { emoji: EmojiDef; onSelect: (char: string) => void }) {
  return (
    <Pressable onPress={() => onSelect(emoji.char)} style={styles.stickerBtn}>
      <FluentEmoji char={emoji.char} size={60} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 4 },
  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginTop: 10, marginBottom: 6, borderRadius: 10, paddingHorizontal: 10, height: 36, gap: 6 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 8, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  quickBtn: { padding: 6, borderRadius: 8 },
  gridContent: { paddingHorizontal: 8, paddingBottom: 20 },
  gridRow: { justifyContent: 'flex-start' },
  stickerRow: { justifyContent: 'flex-start' },
  emojiBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', aspectRatio: 1, maxWidth: '14.28%' },
  stickerBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', aspectRatio: 1, maxWidth: '33.33%', padding: 8 },
  emptyText: { textAlign: 'center', fontSize: 14, paddingVertical: 40 },
});
