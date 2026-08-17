import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

export default function EditPostScreen() {
  const { id, content: initialContent } = useLocalSearchParams<{ id: string; content: string }>();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [content, setContent] = useState(initialContent ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving || !content.trim() || !id) return;
    setSaving(true);
    try {
      await api.editPost(id, content.trim());
      router.back();
    } catch {} finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={[styles.cancelText, { color: colors.text }]}>{t('cancel')}</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('editProfile')}</Text>
        <Pressable
          disabled={saving || !content.trim()}
          onPress={() => void save()}
          style={[styles.saveBtn, { opacity: saving || !content.trim() ? 0.5 : 1 }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={[styles.saveText, { color: colors.accent }]}>{t('saveChanges')}</Text>
          )}
        </Pressable>
      </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' },
  headerBtn: { paddingHorizontal: 8, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  saveBtn: { paddingHorizontal: 8, height: 42, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15 },
  saveText: { fontSize: 15, fontWeight: '800' },
  input: { flex: 1, fontSize: 16, lineHeight: 24, paddingHorizontal: 16, paddingTop: 16 },
});
