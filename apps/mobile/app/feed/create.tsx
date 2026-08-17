import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';
import { api as apiClient } from '@/api';

interface MediaPreview {
  uri: string;
  id: string | null;
}

export default function CreatePostScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<MediaPreview[]>([]);
  const [visibility, setVisibility] = useState<'friends' | 'public'>('public');
  const [posting, setPosting] = useState(false);

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4 - media.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newMedia = result.assets.map((asset) => ({ uri: asset.uri, id: null }));
      setMedia((prev) => [...prev, ...newMedia].slice(0, 4));
    }
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
        const uploaded = await apiClient.uploadMedia(m.uri, `media_${Date.now()}.jpg`, 'image/jpeg');
        mediaIds.push(uploaded.id);
      }
      await api.createPost({ content: content.trim() || '', mediaIds, visibility });
      router.back();
    } catch {} finally { setPosting(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={[styles.cancelText, { color: colors.text }]}>{t('cancel')}</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('newPost')}</Text>
        <Pressable
          disabled={posting || (!content.trim() && media.length === 0)}
          onPress={() => void post()}
          style={[styles.postBtn, { opacity: posting || (!content.trim() && media.length === 0) ? 0.5 : 1 }]}
        >
          {posting ? (
            <ActivityIndicator size="small" color={colors.accentText} />
          ) : (
            <Text style={[styles.postText, { color: colors.accent }]}>{t('postButton')}</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.flex}>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder={t('whatsOnYourMind')}
          placeholderTextColor={colors.faint}
          multiline
          maxLength={5000}
          autoFocus
          style={[styles.input, { color: colors.text }]}
        />

        {media.length > 0 ? (
          <View style={styles.mediaGrid}>
            {media.map((m, index) => (
              <View key={`${m.uri}_${index}`} style={[styles.mediaItem, media.length === 1 && styles.mediaFull]}>
                <Image source={{ uri: m.uri }} style={[styles.mediaImage, media.length === 1 && styles.mediaImageFull]} resizeMode="cover" />
                <Pressable onPress={() => removeMedia(index)} style={[styles.removeBtn, { backgroundColor: colors.surface }]}>
                  <MaterialCommunityIcons name="close" size={16} color={colors.text} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <View style={[styles.bottomBar, { borderTopColor: colors.border }]}>
          <Pressable onPress={pickMedia} style={[styles.addMediaBtn, { backgroundColor: colors.elevated }]}>
            <MaterialCommunityIcons name="image-multiple-outline" size={22} color={colors.accent} />
          </Pressable>
          <View style={styles.visibilityRow}>
            {(['friends', 'public'] as const).map((v) => (
              <Pressable
                key={v}
                onPress={() => setVisibility(v)}
                style={[styles.visibilityBtn, visibility === v && { backgroundColor: colors.accentSoft }]}
              >
                <MaterialCommunityIcons
                  name={v === 'friends' ? 'account-group' : 'earth'}
                  size={18}
                  color={visibility === v ? colors.accent : colors.muted}
                />
                <Text style={[styles.visibilityLabel, { color: visibility === v ? colors.accent : colors.muted }]}>
                  {v === 'friends' ? t('friends') : t('explore')}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' },
  headerBtn: { paddingHorizontal: 8, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  postBtn: { paddingHorizontal: 8, height: 42, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15 },
  postText: { fontSize: 15, fontWeight: '800' },
  input: { flex: 1, fontSize: 16, lineHeight: 24, paddingHorizontal: 16, paddingTop: 16 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  mediaItem: { position: 'relative', width: 100, height: 100, borderRadius: 12, overflow: 'hidden' },
  mediaFull: { width: '100%', height: 240 },
  mediaImage: { width: 100, height: 100 },
  mediaImageFull: { width: '100%', height: 240 },
  removeBtn: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 12, borderTopWidth: StyleSheet.hairlineWidth },
  addMediaBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  visibilityRow: { flexDirection: 'row', flex: 1, gap: 8 },
  visibilityBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  visibilityLabel: { fontSize: 12, fontWeight: '700' },
});
