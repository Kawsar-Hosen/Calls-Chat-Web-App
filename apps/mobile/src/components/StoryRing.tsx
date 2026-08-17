import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import type { StoryGroup } from '@/types';
import { Avatar } from '@/ui';

export const StoryRing = memo(function StoryRing({ stories }: { stories: StoryGroup[] }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  const myStory = stories.find((g) => g.author.id === user?.id);
  const otherStories = stories.filter((g) => g.author.id !== user?.id);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {/* Your story */}
      <Pressable style={styles.item} onPress={() => myStory?.stories[0] ? router.push({ pathname: '/feed/story' as any, params: { authorId: myStory.author.id, storyIndex: '0' } }) : router.push('/feed/create-story' as any)}>
        <View style={[styles.ringBase, { borderColor: colors.border }]}>
          <Avatar name={user?.displayName || 'You'} uri={user?.avatarUrl ?? null} size={56} />
          {!myStory ? (
            <View style={[styles.addBadge, { backgroundColor: colors.accent, borderColor: colors.surface }]}>
              <MaterialCommunityIcons name="plus" size={14} color={colors.accentText} />
            </View>
          ) : null}
        </View>
        <Text style={[styles.label, { color: colors.muted }]} numberOfLines={1}>{t('yourStory')}</Text>
      </Pressable>

      {/* Other stories */}
      {otherStories.map((group) => (
        <Pressable key={group.author.id} style={styles.item} onPress={() => group.stories[0] && router.push({ pathname: '/feed/story' as any, params: { authorId: group.author.id, storyIndex: '0' } })}>
          <View style={[styles.ringBase, { borderColor: group.hasUnviewed ? colors.accent : colors.faint + '40' }]}>
            <Avatar name={group.author.displayName} uri={group.author.avatarUrl ?? null} size={56} />
          </View>
          <Text style={[styles.label, { color: colors.muted }]} numberOfLines={1}>{group.author.displayName.split(' ')[0]}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, paddingVertical: 14, gap: 14 },
  item: { alignItems: 'center', width: 72, gap: 6 },
  ringBase: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  addBadge: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
});
