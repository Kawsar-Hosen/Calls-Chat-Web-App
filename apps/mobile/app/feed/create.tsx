import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';
import { Avatar } from '@/ui';
import { giphyItems, type GiphyItem } from '@/giphy';

interface MediaPreview {
  uri: string;
  id: string | null;
  type: 'image' | 'video';
}

const ACTION_BUTTONS = [
  { key: 'photo', icon: 'image-multiple-outline' as const, labelKey: 'photos' },
  { key: 'video', icon: 'video-outline' as const, labelKey: 'video' },
  { key: 'sticker', icon: 'sticker-outline' as const, labelKey: 'stickers' },
  { key: 'feeling', icon: 'emoticon-happy-outline' as const, labelKey: 'feelings' },
  { key: 'emoji', icon: 'emoticon-outline' as const, labelKey: 'emoji' },
] as const;

const EMOJI_GRID = [
  '😀','😂','🥹','😍','🤩','😘','😎','🤓','😇','🥳',
  '😏','😒','😞','😔','😟','😕','🙁','😣','😖','😫',
  '🥺','😢','😭','😤','😠','🤯','😳','🥵','🥶','😱',
  '🤔','🤫','🤭','🫡','🤗','🫠','😴','🤢','🤮','🤧',
  '👍','👎','👏','🙌','🤝','💪','🫶','❤️','🔥','💯',
  '🎉','🎊','✨','⭐','🌟','💫','🌈','☀️','🌙','💡',
];

const FEELINGS = [
  { emoji: '😊', label: 'happy' },
  { emoji: '😢', label: 'sad' },
  { emoji: '😡', label: 'angry' },
  { emoji: '🥳', label: 'excited' },
  { emoji: '😍', label: 'in love' },
  { emoji: '🤔', label: 'thinking' },
  { emoji: '😴', label: 'tired' },
  { emoji: '🙏', label: 'grateful' },
  { emoji: '💪', label: 'strong' },
  { emoji: '😎', label: 'cool' },
  { emoji: '🥺', label: 'emotional' },
  { emoji: '🫠', label: 'melting' },
];

type PickerType = null | 'emoji' | 'feeling' | 'sticker';

export default function CreatePostScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<MediaPreview[]>([]);
  const [visibility, setVisibility] = useState<'friends' | 'public'>('public');
  const [posting, setPosting] = useState(false);
  const [activePicker, setActivePicker] = useState<PickerType>(null);
  const [activeFeeling, setActiveFeeling] = useState<{ emoji: string; label: string } | null>(null);
  const [stickers, setStickers] = useState<GiphyItem[]>([]);
  const [stickersLoading, setStickersLoading] = useState(false);
  const [stickersError, setStickersError] = useState('');
  const [stickerQuery, setStickerQuery] = useState('');

  const pickImages = async () => {
    const remaining = 4 - media.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newMedia = result.assets.map((asset) => ({ uri: asset.uri, id: null, type: 'image' as const }));
      setMedia((prev) => [...prev, ...newMedia].slice(0, 4));
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: false,
      quality: 0.8,
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMedia((prev) => [...prev, { uri: asset.uri, id: null, type: 'video' as const }].filter((m) => m.type !== 'video' || m.uri === asset.uri).slice(0, 4));
    }
  };

  const handleAction = (key: string) => {
    switch (key) {
      case 'photo': pickImages(); break;
      case 'video': pickVideo(); break;
      case 'sticker': {
        const next = activePicker === 'sticker' ? null : 'sticker';
        setActivePicker(next);
        if (next === 'sticker' && stickers.length === 0) loadStickers('');
        break;
      }
      case 'feeling': setActivePicker(activePicker === 'feeling' ? null : 'feeling'); break;
      case 'emoji': setActivePicker(activePicker === 'emoji' ? null : 'emoji'); break;
    }
  };

  const loadStickers = useCallback(async (q: string) => {
    setStickersLoading(true);
    setStickersError('');
    try {
      const items = await giphyItems('sticker', q);
      setStickers(items);
    } catch (e: any) {
      setStickersError(e?.message || 'Failed to load stickers');
    } finally {
      setStickersLoading(false);
    }
  }, []);

  const selectSticker = useCallback(async (item: GiphyItem) => {
    setPosting(true);
    try {
      const saved = await api.saveGiphy({ id: item.id, kind: 'sticker', title: item.title, url: item.url });
      setMedia((prev) => [...prev, { uri: saved.url, id: saved.id, type: 'image' }]);
      setActivePicker(null);
    } catch {} finally { setPosting(false); }
  }, []);

  const insertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
  };

  const selectFeeling = (feeling: { emoji: string; label: string }) => {
    setActiveFeeling(activeFeeling?.label === feeling.label ? null : feeling);
    setActivePicker(null);
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const post = async () => {
    if (posting || (!content.trim() && media.length === 0)) return;
    setPosting(true);
    try {
      const mediaIds: string[] = [];
      for (const m of media) {
        if (m.id) { mediaIds.push(m.id); continue; }
        const ext = m.type === 'video' ? 'mp4' : 'jpg';
        const mime = m.type === 'video' ? 'video/mp4' : 'image/jpeg';
        const uploaded = await api.uploadMedia(m.uri, `media_${Date.now()}.${ext}`, mime);
        mediaIds.push(uploaded.id);
      }
      const feelingPrefix = activeFeeling ? `${activeFeeling.emoji} ${activeFeeling.label}\n` : '';
      await api.createPost({ content: feelingPrefix + (content.trim() || ''), mediaIds, visibility });
      router.back();
    } catch {} finally { setPosting(false); }
  };

  const canPost = content.trim().length > 0 || media.length > 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialCommunityIcons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('newPost')}</Text>
        <Pressable
          disabled={posting || !canPost}
          onPress={() => void post()}
          style={[styles.postHeaderBtn, { backgroundColor: canPost ? colors.accent : colors.elevated }]}
        >
          {posting ? (
            <ActivityIndicator size="small" color={colors.accentText} />
          ) : (
            <Text style={[styles.postHeaderText, { color: canPost ? colors.accentText : colors.faint }]}>{t('postButton')}</Text>
          )}
        </Pressable>
      </View>

      <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled">
        <View style={styles.authorRow}>
          <Avatar name={user?.displayName || 'You'} uri={user?.avatarUrl ?? null} size={44} online />
          <View style={styles.authorInfo}>
            <Text style={[styles.authorName, { color: colors.text }]}>{user?.displayName}</Text>
            <Pressable style={[styles.visBtn, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
              <MaterialCommunityIcons name={visibility === 'friends' ? 'account-group' : 'earth'} size={14} color={colors.muted} />
              <Text style={[styles.visText, { color: colors.muted }]}>{visibility === 'friends' ? t('friends') : t('public')}</Text>
              <MaterialCommunityIcons name="chevron-down" size={14} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder={t('whatsOnYourMind')}
          placeholderTextColor={colors.faint}
          multiline
          maxLength={5000}
          autoFocus
          textAlignVertical="top"
          style={[styles.input, { color: colors.text }]}
        />

        {media.length > 0 ? (
          <View style={styles.mediaPreview}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaScroll}>
              {media.map((m, index) => (
                <View key={`${m.uri}_${index}`} style={styles.mediaItem}>
                  <Image source={{ uri: m.uri }} style={styles.mediaThumb} resizeMode="cover" />
                  {m.type === 'video' ? (
                    <View style={styles.videoBadge}>
                      <MaterialCommunityIcons name="play" size={14} color="#FFF" />
                    </View>
                  ) : null}
                  <Pressable onPress={() => removeMedia(index)} style={[styles.removeBtn, { backgroundColor: colors.surface }]}>
                    <MaterialCommunityIcons name="close" size={14} color={colors.text} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={[styles.actionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.actionsTitle, { color: colors.muted }]}>{t('addPostContent')}</Text>
          <View style={styles.actionsGrid}>
            {ACTION_BUTTONS.map((btn) => (
              <Pressable key={btn.key} onPress={() => handleAction(btn.key)} style={styles.actionItem}>
                <View style={[styles.actionIcon, { backgroundColor: colors.accentSoft }]}>
                  <MaterialCommunityIcons name={btn.icon} size={24} color={colors.accent} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text }]}>{t(btn.labelKey)}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.visibilityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.actionsTitle, { color: colors.muted }]}>{t('whoCanSee')}</Text>
          <View style={styles.visRow}>
            {(['friends', 'public'] as const).map((v) => (
              <Pressable
                key={v}
                onPress={() => setVisibility(v)}
                style={[styles.visOption, visibility === v && { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}
              >
                <MaterialCommunityIcons
                  name={v === 'friends' ? 'account-group' : 'earth'}
                  size={20}
                  color={visibility === v ? colors.accent : colors.muted}
                />
                <View style={styles.visOptionText}>
                  <Text style={[styles.visOptionTitle, { color: visibility === v ? colors.accent : colors.text }]}>
                    {v === 'friends' ? t('friends') : t('public')}
                  </Text>
                  <Text style={[styles.visOptionDesc, { color: colors.muted }]}>
                    {v === 'friends' ? t('friendsOnlyDesc') : t('publicDesc')}
                  </Text>
                </View>
                {visibility === v ? <MaterialCommunityIcons name="check-circle" size={22} color={colors.accent} /> : null}
              </Pressable>
            ))}
          </View>
        </View>

        {activeFeeling ? (
          <View style={[styles.feelingBadge, { backgroundColor: colors.accentSoft }]}>
            <Text style={{ fontSize: 16 }}>{activeFeeling.emoji}</Text>
            <Text style={[styles.feelingText, { color: colors.accent }]}>{activeFeeling.label}</Text>
            <Pressable onPress={() => setActiveFeeling(null)}>
              <MaterialCommunityIcons name="close" size={16} color={colors.accent} />
            </Pressable>
          </View>
        ) : null}

        {activePicker === 'emoji' ? (
          <View style={[styles.pickerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>{t('emoji')}</Text>
              <Pressable onPress={() => setActivePicker(null)}>
                <MaterialCommunityIcons name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>
            <FlatList
              data={EMOJI_GRID}
              numColumns={8}
              scrollEnabled={false}
              keyExtractor={(item, i) => `${item}_${i}`}
              renderItem={({ item }) => (
                <Pressable onPress={() => insertEmoji(item)} style={styles.emojiCell}>
                  <Text style={styles.emojiText}>{item}</Text>
                </Pressable>
              )}
              contentContainerStyle={styles.emojiGrid}
            />
          </View>
        ) : null}

        {activePicker === 'feeling' ? (
          <View style={[styles.pickerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>{t('feelings')}</Text>
              <Pressable onPress={() => setActivePicker(null)}>
                <MaterialCommunityIcons name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>
            <View style={styles.feelingsGrid}>
              {FEELINGS.map((f) => (
                <Pressable
                  key={f.label}
                  onPress={() => selectFeeling(f)}
                  style={[styles.feelingItem, activeFeeling?.label === f.label && { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}
                >
                  <Text style={styles.feelingEmoji}>{f.emoji}</Text>
                  <Text style={[styles.feelingItemLabel, { color: activeFeeling?.label === f.label ? colors.accent : colors.text }]}>{f.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {activePicker === 'sticker' ? (
          <View style={[styles.pickerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>{t('stickers')}</Text>
              <Pressable onPress={() => setActivePicker(null)}>
                <MaterialCommunityIcons name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>
            <View style={[styles.pickerSearch, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <MaterialCommunityIcons name="magnify" size={18} color={colors.faint} />
              <TextInput
                value={stickerQuery}
                onChangeText={(q) => { setStickerQuery(q); loadStickers(q); }}
                placeholder="Search stickers..."
                placeholderTextColor={colors.faint}
                style={{ flex: 1, color: colors.text, fontSize: 14 }}
              />
            </View>
            {stickersLoading ? (
              <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 20 }} />
            ) : stickersError ? (
              <Text style={{ color: colors.faint, textAlign: 'center', marginTop: 20, fontSize: 13 }}>{stickersError}</Text>
            ) : (
              <View style={styles.stickerGrid}>
                {stickers.map((item) => (
                  <Pressable key={item.id} onPress={() => selectSticker(item)} style={styles.stickerGridCell}>
                    <Image source={{ uri: item.previewUrl }} resizeMode="cover" style={styles.stickerGridImage} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' },
  headerBtn: { paddingHorizontal: 8, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  postHeaderBtn: { paddingHorizontal: 16, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  postHeaderText: { fontSize: 14, fontWeight: '800' },
  authorRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  authorInfo: { flex: 1, gap: 4 },
  authorName: { fontSize: 15, fontWeight: '700' },
  visBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  visText: { fontSize: 11, fontWeight: '600' },
  input: { fontSize: 16, lineHeight: 24, paddingHorizontal: 14, minHeight: 120, textAlignVertical: 'top' },
  mediaPreview: { paddingHorizontal: 14, paddingBottom: 12 },
  mediaScroll: { gap: 8 },
  mediaItem: { position: 'relative', width: 110, height: 110, borderRadius: 12, overflow: 'hidden' },
  mediaThumb: { width: '100%', height: '100%' },
  videoBadge: { position: 'absolute', bottom: 6, left: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center' },
  removeBtn: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionsCard: { marginHorizontal: 14, marginTop: 8, borderRadius: 14, borderWidth: 1, padding: 14 },
  actionsTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  actionItem: { alignItems: 'center', gap: 6, width: 64 },
  actionIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  visibilityCard: { marginHorizontal: 14, marginTop: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  visRow: { gap: 8 },
  visOption: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  visOptionText: { flex: 1 },
  visOptionTitle: { fontSize: 14, fontWeight: '700' },
  visOptionDesc: { fontSize: 11, marginTop: 1 },
  feelingBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 14, marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start' },
  feelingText: { fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  pickerCard: { marginHorizontal: 14, marginTop: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  pickerTitle: { fontSize: 14, fontWeight: '700' },
  emojiGrid: { gap: 2 },
  emojiCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', maxWidth: '12.5%' },
  emojiText: { fontSize: 24 },
  feelingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  feelingItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  feelingEmoji: { fontSize: 18 },
  feelingItemLabel: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  stickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stickerGridCell: { width: '30%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(127,127,127,.1)' },
  stickerGridImage: { width: '100%', height: '100%' },
  pickerSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
});
