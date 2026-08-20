import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { memo, useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  GestureResponderEvent,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';
import { FluentEmoji, emojiList, type EmojiDef } from '@/emoji';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const TEXT_STYLES = [
  { bg: '#00000099', color: '#FFFFFF', fontWeight: '700' as const },
  { bg: '#FFFFFFDD', color: '#000000', fontWeight: '700' as const },
  { bg: 'transparent', color: '#FFFFFF', fontWeight: '900' as const },
  { bg: '#1F66FFCC', color: '#FFFFFF', fontWeight: '700' as const },
];

const FILTERS = [
  { id: 'none', label: 'None', color: 'transparent' },
  { id: 'warm', label: 'Warm', color: '#FF880030' },
  { id: 'cool', label: 'Cool', color: '#0066FF25' },
  { id: 'vintage', label: 'Vintage', color: '#AA885530' },
  { id: 'bw', label: 'B&W', color: '#00000050' },
] as const;

const DRAW_COLORS = ['#FFFFFF', '#FF2D55', '#FF8800', '#FFCC00', '#34C759', '#007AFF', '#AF52DE', '#000000'];

type Mode = null | 'text' | 'sticker' | 'draw' | 'filter';

interface DrawPath {
  d: string;
  color: string;
  width: number;
}

interface PlacedSticker {
  char: string;
  x: number;
  y: number;
  scale: number;
}

function CreateStoryScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [posting, setPosting] = useState(false);

  const [mode, setMode] = useState<Mode>(null);

  // Text
  const [storyText, setStoryText] = useState('');
  const [textPos, setTextPos] = useState({ x: SCREEN_W / 2, y: SCREEN_H / 2 });
  const [textStyleIdx, setTextStyleIdx] = useState(0);
  const [showTextInput, setShowTextInput] = useState(false);
  const textDragRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0, dragging: false });

  // Draw
  const [drawPaths, setDrawPaths] = useState<DrawPath[]>([]);
  const [drawColor, setDrawColor] = useState('#FFFFFF');
  const [drawWidth, setDrawWidth] = useState(4);
  const currentPath = useRef({ d: '', color: '#FFFFFF', width: 4 });
  const drawDragging = useRef(false);

  // Sticker
  const [stickers, setStickers] = useState<PlacedSticker[]>([]);
  const [showStickerPicker, setShowStickerPicker] = useState(false);

  // Filter
  const [filterIdx, setFilterIdx] = useState(0);

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: false,
      quality: 0.9,
      videoMaxDuration: 30,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMediaUri(asset.uri);
      setMediaType(asset.type === 'video' ? 'video' : 'image');
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
      setMediaType('image');
    }
  };

  const postStory = async () => {
    if (posting || !mediaUri) return;
    setPosting(true);
    try {
      const ext = mediaType === 'video' ? 'mp4' : 'jpg';
      const mime = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
      const uploaded = await api.uploadMedia(mediaUri, `story_${Date.now()}.${ext}`, mime);
      const textContent = storyText.trim()
        ? JSON.stringify({ t: storyText.trim(), x: Math.round(textPos.x), y: Math.round(textPos.y), s: textStyleIdx })
        : undefined;
      await api.createStory(uploaded.id, textContent);
      router.back();
    } catch (e: any) {
      Alert.alert('Upload failed', String(e?.message || e || 'Unknown error'));
    } finally {
      setPosting(false);
    }
  };

  // Drag text
  const onTextDragStart = (e: GestureResponderEvent) => {
    textDragRef.current = { startX: e.nativeEvent.pageX, startY: e.nativeEvent.pageY, posX: textPos.x, posY: textPos.y, dragging: true };
  };
  const onTextDragMove = (e: GestureResponderEvent) => {
    if (!textDragRef.current.dragging) return;
    const dx = e.nativeEvent.pageX - textDragRef.current.startX;
    const dy = e.nativeEvent.pageY - textDragRef.current.startY;
    setTextPos({
      x: Math.max(40, Math.min(SCREEN_W - 40, textDragRef.current.posX + dx)),
      y: Math.max(100, Math.min(SCREEN_H - 200, textDragRef.current.posY + dy)),
    });
  };
  const onTextDragEnd = () => { textDragRef.current.dragging = false; };

  // Draw handlers
  const onDrawStart = (e: GestureResponderEvent) => {
    if (mode !== 'draw') return;
    drawDragging.current = true;
    const { pageX, pageY } = e.nativeEvent;
    currentPath.current = { d: `M ${pageX} ${pageY}`, color: drawColor, width: drawWidth };
  };
  const onDrawMove = (e: GestureResponderEvent) => {
    if (mode !== 'draw' || !drawDragging.current) return;
    const { pageX, pageY } = e.nativeEvent;
    currentPath.current.d += ` L ${pageX} ${pageY}`;
    setDrawPaths((prev) => {
      const last = prev[prev.length - 1];
      if (last && last === currentPath.current) {
        return [...prev.slice(0, -1), { ...currentPath.current }];
      }
      return [...prev, { ...currentPath.current }];
    });
  };
  const onDrawEnd = () => {
    drawDragging.current = false;
    if (currentPath.current.d) {
      setDrawPaths((prev) => [...prev, { ...currentPath.current }]);
    }
  };

  // Sticker drag
  const stickerDragRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0, idx: -1 });
  const onStickerDragStart = (idx: number, e: GestureResponderEvent) => {
    const sticker = stickers[idx];
    if (!sticker) return;
    stickerDragRef.current = { startX: e.nativeEvent.pageX, startY: e.nativeEvent.pageY, posX: sticker.x, posY: sticker.y, idx };
  };
  const onStickerDragMove = (e: GestureResponderEvent) => {
    const ref = stickerDragRef.current;
    if (ref.idx < 0) return;
    const dx = e.nativeEvent.pageX - ref.startX;
    const dy = e.nativeEvent.pageY - ref.startY;
    setStickers((prev) => prev.map((s, i) => i === ref.idx ? { ...s, x: ref.posX + dx, y: ref.posY + dy } : s));
  };
  const onStickerDragEnd = () => { stickerDragRef.current.idx = -1; };

  if (!mediaUri) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <MaterialCommunityIcons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('createStory')}</Text>
          <View style={styles.headerBtn} />
        </View>

        <View style={styles.emptyState}>
          <LinearGradient colors={[colors.accent + '20', colors.accent + '08']} style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="camera-plus-outline" size={44} color={colors.accent} />
          </LinearGradient>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Create a Story</Text>
          <Text style={[styles.emptyDesc, { color: colors.muted }]}>Share photos and videos with your friends. They disappear after 24 hours.</Text>

          <View style={styles.choiceRow}>
            <Pressable onPress={takePhoto} style={[styles.choiceBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="camera" size={30} color={colors.accent} />
              <Text style={[styles.choiceLabel, { color: colors.text }]}>Camera</Text>
            </Pressable>
            <Pressable onPress={pickFromGallery} style={[styles.choiceBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="image-multiple" size={30} color={colors.accent} />
              <Text style={[styles.choiceLabel, { color: colors.text }]}>Gallery</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const ts = TEXT_STYLES[textStyleIdx % TEXT_STYLES.length] ?? TEXT_STYLES[0]!;
  const filter = FILTERS[filterIdx % FILTERS.length] ?? FILTERS[0]!;

  return (
    <View style={styles.fullScreen}>
      <Image source={{ uri: mediaUri }} style={styles.previewImage} resizeMode="cover" />

      {/* Filter Overlay */}
      {filter.color !== 'transparent' && (
        <View style={[styles.filterOverlay, { backgroundColor: filter.color }]} />
      )}

      {/* Draw SVG Overlay */}
      {drawPaths.length > 0 && (
        <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
          {drawPaths.map((path, i) => (
            <Path key={i} d={path.d} stroke={path.color} strokeWidth={path.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </Svg>
      )}

      {/* Text Overlay */}
      {storyText.trim() ? (
        <View
          style={[
            styles.draggableText,
            {
              left: textPos.x - 80,
              top: textPos.y - 18,
              backgroundColor: ts.bg,
              borderRadius: ts.bg === 'transparent' ? 0 : 10,
              paddingHorizontal: ts.bg === 'transparent' ? 0 : 16,
              paddingVertical: ts.bg === 'transparent' ? 0 : 12,
            },
          ]}
          onStartShouldSetResponder={() => true}
          onResponderGrant={onTextDragStart}
          onResponderMove={onTextDragMove}
          onResponderRelease={onTextDragEnd}
        >
          <Text style={[styles.draggableTextContent, { color: ts.color, fontWeight: ts.fontWeight }]}>{storyText}</Text>
        </View>
      ) : null}

      {/* Sticker Overlays */}
      {stickers.map((sticker, i) => (
        <View
          key={i}
          style={[styles.stickerOverlay, { left: sticker.x - 24, top: sticker.y - 24 }]}
          onStartShouldSetResponder={() => true}
          onResponderGrant={(e) => onStickerDragStart(i, e)}
          onResponderMove={onStickerDragMove}
          onResponderRelease={onStickerDragEnd}
        >
          <FluentEmoji char={sticker.char} size={48 * sticker.scale} />
        </View>
      ))}

      {/* Draw touch area */}
      {mode === 'draw' && (
        <View
          style={StyleSheet.absoluteFill}
          onStartShouldSetResponder={() => true}
          onResponderGrant={onDrawStart}
          onResponderMove={onDrawMove}
          onResponderRelease={onDrawEnd}
        />
      )}

      {/* Top Bar */}
      <View style={styles.previewTopBar}>
        <Pressable onPress={() => { setMediaUri(null); setStoryText(''); setDrawPaths([]); setStickers([]); setFilterIdx(0); setMode(null); }} style={styles.circleBtn}>
          <MaterialCommunityIcons name="close" size={26} color="#FFF" />
        </Pressable>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* Draw button */}
          <Pressable onPress={() => setMode(mode === 'draw' ? null : 'draw')} style={[styles.circleBtn, mode === 'draw' && styles.circleBtnActive]}>
            <MaterialCommunityIcons name="draw" size={22} color="#FFF" />
          </Pressable>
          {/* Text button */}
          <Pressable onPress={() => { setMode('text'); setShowTextInput(true); }} style={[styles.circleBtn, mode === 'text' && styles.circleBtnActive]}>
            <MaterialCommunityIcons name="format-text" size={22} color="#FFF" />
          </Pressable>
          {/* Sticker button */}
          <Pressable onPress={() => { setMode('sticker'); setShowStickerPicker(true); }} style={[styles.circleBtn, mode === 'sticker' && styles.circleBtnActive]}>
            <MaterialCommunityIcons name="sticker-outline" size={22} color="#FFF" />
          </Pressable>
          {/* Filter button */}
          <Pressable onPress={() => setMode(mode === 'filter' ? null : 'filter')} style={[styles.circleBtn, mode === 'filter' && styles.circleBtnActive]}>
            <MaterialCommunityIcons name="auto-fix" size={22} color="#FFF" />
          </Pressable>
        </View>
      </View>

      {/* Text Input Modal */}
      {showTextInput && (
        <View style={styles.textInputOverlay}>
          <TextInput
            value={storyText}
            onChangeText={setStoryText}
            placeholder="Type something..."
            placeholderTextColor="#FFFFFF99"
            style={styles.storyTextInput}
            maxLength={150}
            autoFocus
            onSubmitEditing={() => setShowTextInput(false)}
            blurOnSubmit
          />
          {storyText.trim().length > 0 && (
            <Pressable onPress={() => setTextStyleIdx((prev) => prev + 1)} style={styles.textStyleToggle}>
              <MaterialCommunityIcons name="format-letter-case" size={22} color="#FFF" />
            </Pressable>
          )}
        </View>
      )}

      {/* Draw Color Picker */}
      {mode === 'draw' && (
        <View style={styles.drawToolbar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {DRAW_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setDrawColor(c)}
                style={[styles.drawColorDot, { backgroundColor: c, borderColor: drawColor === c ? colors.accent : 'transparent', borderWidth: drawColor === c ? 2 : 0 }]}
              />
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' }}>
            {[2, 4, 8].map((w) => (
              <Pressable key={w} onPress={() => setDrawWidth(w)} style={[styles.drawWidthBtn, drawWidth === w && { backgroundColor: colors.accent }]}>
                <View style={{ width: w + 2, height: w + 2, borderRadius: (w + 2) / 2, backgroundColor: '#FFF' }} />
              </Pressable>
            ))}
            <Pressable onPress={() => setDrawPaths((prev) => prev.slice(0, -1))} style={styles.drawUndoBtn}>
              <MaterialCommunityIcons name="undo" size={18} color="#FFF" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Filter Picker */}
      {mode === 'filter' && (
        <View style={styles.filterToolbar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {FILTERS.map((f, i) => (
              <Pressable key={f.id} onPress={() => setFilterIdx(i)} style={[styles.filterOption, filterIdx === i && { borderColor: '#FFF', borderWidth: 2 }]}>
                <View style={[styles.filterPreview, { backgroundColor: f.color === 'transparent' ? '#333' : f.color }]}>
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>{f.label}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Sticker Picker Modal */}
      <Modal visible={showStickerPicker} transparent animationType="slide" onRequestClose={() => setShowStickerPicker(false)}>
        <Pressable style={styles.stickerOverlay2} onPress={() => setShowStickerPicker(false)}>
          <View style={styles.stickerSheet}>
            <View style={styles.stickerHandle} />
            <Text style={styles.stickerTitle}>Stickers</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <View style={styles.stickerGrid}>
                {emojiList('all').map((emoji) => (
                  <Pressable
                    key={emoji.id}
                    onPress={() => {
                      setStickers((prev) => [...prev, { char: emoji.char, x: SCREEN_W / 2, y: SCREEN_H / 2, scale: 1.0 }]);
                      setShowStickerPicker(false);
                    }}
                    style={styles.stickerItem}
                  >
                    <FluentEmoji char={emoji.char} size={32} />
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Bottom Bar */}
      <LinearGradient colors={['transparent', '#000000BB']} style={styles.previewBottomGradient}>
        <View style={styles.previewBottom}>
          <View style={styles.bottomTools}>
            <Pressable onPress={takePhoto} style={styles.toolBtn}>
              <MaterialCommunityIcons name="camera" size={22} color="#FFF" />
            </Pressable>
            <Pressable onPress={pickFromGallery} style={styles.toolBtn}>
              <MaterialCommunityIcons name="image-multiple" size={22} color="#FFF" />
            </Pressable>
          </View>

          <Pressable
            onPress={() => void postStory()}
            disabled={posting}
            style={[styles.shareBtn, { backgroundColor: colors.accent }]}
          >
            {posting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={20} color="#FFF" />
                <Text style={styles.shareBtnText}>Your Story</Text>
              </>
            )}
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

export default memo(CreateStoryScreen);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' },
  headerBtn: { paddingHorizontal: 8, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', textAlign: 'center' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  choiceRow: { flexDirection: 'row', gap: 16, marginTop: 24 },
  choiceBtn: { flex: 1, height: 120, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  choiceLabel: { fontSize: 13, fontWeight: '700' },

  fullScreen: { flex: 1, backgroundColor: '#000' },
  previewImage: { width: SCREEN_W, height: SCREEN_H },
  filterOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },

  previewTopBar: { position: 'absolute', top: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, zIndex: 15 },
  circleBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },
  circleBtnActive: { backgroundColor: '#FFFFFF33', borderWidth: 1.5, borderColor: '#FFFFFF88' },

  draggableText: { position: 'absolute', zIndex: 10, maxWidth: SCREEN_W * 0.72 },
  draggableTextContent: { fontSize: 20, textAlign: 'center' },

  stickerOverlay: { position: 'absolute', zIndex: 12 },

  textInputOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#00000088', zIndex: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  storyTextInput: { color: '#FFF', fontSize: 22, textAlign: 'center', minWidth: 200, fontWeight: '700', borderBottomWidth: 1, borderBottomColor: '#FFFFFF44', paddingBottom: 8 },
  textStyleToggle: { position: 'absolute', top: 80, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },

  drawToolbar: { position: 'absolute', bottom: 120, left: 14, right: 14, zIndex: 15, backgroundColor: '#000000AA', borderRadius: 16, padding: 12 },
  drawColorDot: { width: 32, height: 32, borderRadius: 16 },
  drawWidthBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' },
  drawUndoBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },

  filterToolbar: { position: 'absolute', bottom: 120, left: 0, right: 0, zIndex: 15, paddingHorizontal: 14 },
  filterOption: { width: 64, height: 64, borderRadius: 12, overflow: 'hidden', borderWidth: 0 },
  filterPreview: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },

  stickerOverlay2: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  stickerSheet: { backgroundColor: '#1A1A1F', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
  stickerHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#333', alignSelf: 'center', marginBottom: 10 },
  stickerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700', marginBottom: 12 },
  stickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  stickerItem: { width: (SCREEN_W - 32 - 16) / 7, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },

  previewBottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 160, zIndex: 15, justifyContent: 'flex-end' },
  previewBottom: { paddingHorizontal: 14, paddingBottom: 40, gap: 12 },
  bottomTools: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  toolBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 24 },
  shareBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
