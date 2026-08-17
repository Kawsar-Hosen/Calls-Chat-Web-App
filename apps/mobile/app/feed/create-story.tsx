import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, GestureResponderEvent, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CreateStoryScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [storyText, setStoryText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPos, setTextPos] = useState({ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 });
  const [textStyle, setTextStyle] = useState(0);
  const dragRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0, dragging: false });
  const [posting, setPosting] = useState(false);

  const TEXT_STYLES = [
    { bg: '#00000088', color: '#FFFFFF', fontWeight: '700' as const },
    { bg: '#FFFFFFCC', color: '#000000', fontWeight: '700' as const },
    { bg: 'transparent', color: '#FFFFFF', fontWeight: '900' as const },
  ];

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
        ? `${storyText.trim()}|${Math.round(textPos.x)}|${Math.round(textPos.y)}|${textStyle}`
        : undefined;
      await api.createStory(uploaded.id, textContent);
      router.back();
    } catch {} finally { setPosting(false); }
  };

  const onDragStart = (e: GestureResponderEvent) => {
    dragRef.current = { startX: e.nativeEvent.pageX, startY: e.nativeEvent.pageY, posX: textPos.x, posY: textPos.y, dragging: true };
  };

  const onDragMove = (e: GestureResponderEvent) => {
    if (!dragRef.current.dragging) return;
    const dx = e.nativeEvent.pageX - dragRef.current.startX;
    const dy = e.nativeEvent.pageY - dragRef.current.startY;
    setTextPos({
      x: Math.max(40, Math.min(SCREEN_WIDTH - 40, dragRef.current.posX + dx)),
      y: Math.max(100, Math.min(SCREEN_HEIGHT - 200, dragRef.current.posY + dy)),
    });
  };

  const onDragEnd = () => {
    dragRef.current.dragging = false;
  };

  if (mediaUri) {
    const ts = TEXT_STYLES[textStyle % TEXT_STYLES.length]!;
    return (
      <View style={styles.fullScreen}>
        <Image source={{ uri: mediaUri }} style={styles.previewImage} resizeMode="cover" />

        <View style={styles.previewOverlay}>
          <View style={styles.previewTopBar}>
            <Pressable onPress={() => { setMediaUri(null); setStoryText(''); setShowTextInput(false); setTextPos({ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 }); }} style={styles.previewBtn}>
              <MaterialCommunityIcons name="close" size={28} color="#FFF" />
            </Pressable>
            <View style={styles.previewTopRight}>
              <Pressable onPress={() => setTextStyle((prev) => prev + 1)} style={styles.previewBtn}>
                <MaterialCommunityIcons name="format-letter-case" size={22} color="#FFF" />
              </Pressable>
              <Pressable onPress={() => setShowTextInput(!showTextInput)} style={styles.previewBtn}>
                <MaterialCommunityIcons name="format-text" size={22} color="#FFF" />
              </Pressable>
            </View>
          </View>

          {storyText.trim() ? (
            <View
              style={[styles.draggableText, {
                left: textPos.x - 80,
                top: textPos.y - 18,
                backgroundColor: ts.bg,
                borderRadius: ts.bg === 'transparent' ? 0 : 8,
                paddingHorizontal: ts.bg === 'transparent' ? 0 : 14,
                paddingVertical: ts.bg === 'transparent' ? 0 : 10,
              }]}
              onStartShouldSetResponder={() => true}
              onResponderGrant={onDragStart}
              onResponderMove={onDragMove}
              onResponderRelease={onDragEnd}
            >
              <Text style={[styles.draggableTextContent, { color: ts.color, fontWeight: ts.fontWeight }]}>{storyText}</Text>
            </View>
          ) : null}

          {showTextInput ? (
            <View style={styles.textInputOverlay}>
              <TextInput
                value={storyText}
                onChangeText={setStoryText}
                placeholder={t('storyText')}
                placeholderTextColor="#FFFFFF99"
                style={styles.storyTextInput}
                maxLength={150}
                autoFocus
                onSubmitEditing={() => setShowTextInput(false)}
                blurOnSubmit
              />
            </View>
          ) : null}

          <View style={styles.previewBottom}>
            <View style={styles.bottomActions}>
              <Pressable onPress={takePhoto} style={styles.bottomActionBtn}>
                <MaterialCommunityIcons name="camera" size={22} color="#FFF" />
              </Pressable>
              <Pressable onPress={pickFromGallery} style={styles.bottomActionBtn}>
                <MaterialCommunityIcons name="image-multiple" size={22} color="#FFF" />
              </Pressable>
              <Pressable onPress={() => setShowTextInput(!showTextInput)} style={styles.bottomActionBtn}>
                <MaterialCommunityIcons name="format-text" size={22} color="#FFF" />
              </Pressable>
            </View>

            <Pressable
              onPress={() => void postStory()}
              disabled={posting}
              style={[styles.shareBtn, { backgroundColor: colors.accent }]}
            >
              {posting ? (
                <ActivityIndicator size="small" color={colors.accentText} />
              ) : (
                <>
                  <MaterialCommunityIcons name="send" size={18} color={colors.accentText} />
                  <Text style={[styles.shareBtnText, { color: colors.accentText }]}>{t('addToStory')}</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

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
        <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}>
          <MaterialCommunityIcons name="camera-plus-outline" size={48} color={colors.accent} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('createStory')}</Text>
        <Text style={[styles.emptyDesc, { color: colors.muted }]}>{t('addPostContent')}</Text>

        <View style={styles.choiceRow}>
          <Pressable onPress={takePhoto} style={[styles.choiceBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="camera" size={32} color={colors.accent} />
            <Text style={[styles.choiceLabel, { color: colors.text }]}>{t('camera')}</Text>
          </Pressable>

          <Pressable onPress={pickFromGallery} style={[styles.choiceBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="image-multiple" size={32} color={colors.accent} />
            <Text style={[styles.choiceLabel, { color: colors.text }]}>{t('cameraRoll')}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' },
  headerBtn: { paddingHorizontal: 8, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  fullScreen: { flex: 1, backgroundColor: '#000' },
  previewImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  previewOverlay: { ...StyleSheet.absoluteFill, justifyContent: 'space-between' },
  previewTopBar: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 48, paddingHorizontal: 14, zIndex: 10 },
  previewTopRight: { flexDirection: 'row', gap: 4 },
  previewBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },
  draggableText: { position: 'absolute', zIndex: 20, maxWidth: SCREEN_WIDTH * 0.7 },
  draggableTextContent: { fontSize: 20, textAlign: 'center' },
  textInputOverlay: { alignSelf: 'center', backgroundColor: '#00000055', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, marginHorizontal: 30, zIndex: 15 },
  storyTextInput: { color: '#FFF', fontSize: 16, textAlign: 'center', minWidth: 200 },
  previewBottom: { paddingHorizontal: 14, paddingBottom: 40, gap: 12, zIndex: 10 },
  bottomActions: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  bottomActionBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 24 },
  shareBtnText: { fontSize: 15, fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginTop: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  choiceRow: { flexDirection: 'row', gap: 16, marginTop: 24 },
  choiceBtn: { flex: 1, height: 120, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  choiceLabel: { fontSize: 13, fontWeight: '700' },
});
