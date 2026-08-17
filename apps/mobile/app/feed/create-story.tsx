import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

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
      await api.createStory(uploaded.id, text.trim() || undefined);
      router.back();
    } catch {} finally { setPosting(false); }
  };

  if (mediaUri) {
    return (
      <View style={styles.fullScreen}>
        <Image source={{ uri: mediaUri }} style={styles.previewImage} resizeMode="cover" />

        <View style={styles.previewOverlay}>
          <View style={styles.previewTopBar}>
            <Pressable onPress={() => { setMediaUri(null); setText(''); }} style={styles.previewBtn}>
              <MaterialCommunityIcons name="close" size={28} color="#FFF" />
            </Pressable>
            <View style={styles.previewTopRight}>
              <Pressable onPress={takePhoto} style={styles.previewBtn}>
                <MaterialCommunityIcons name="camera" size={24} color="#FFF" />
              </Pressable>
            </View>
          </View>

          {text.length > 0 ? (
            <View style={styles.textOverlay}>
              <Text style={styles.textOverlayContent}>{text}</Text>
            </View>
          ) : null}

          <View style={styles.previewBottom}>
            <View style={styles.textInputRow}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={t('storyText')}
                placeholderTextColor="#FFFFFF99"
                style={styles.storyTextInput}
                maxLength={200}
              />
            </View>

            <View style={styles.previewActions}>
              <Pressable onPress={pickFromGallery} style={styles.previewActionBtn}>
                <MaterialCommunityIcons name="image-multiple" size={22} color="#FFF" />
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
  textOverlay: { alignSelf: 'center', backgroundColor: '#00000088', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 30 },
  textOverlayContent: { color: '#FFF', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  previewBottom: { paddingHorizontal: 14, paddingBottom: 40, gap: 12, zIndex: 10 },
  textInputRow: { backgroundColor: '#00000055', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10 },
  storyTextInput: { color: '#FFF', fontSize: 15, textAlign: 'center' },
  previewActions: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  previewActionBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },
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
