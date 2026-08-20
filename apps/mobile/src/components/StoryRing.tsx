import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import type { StoryGroup } from '@/types';
import { Avatar } from '@/ui';

const RING_GRADIENT = ['#F58529', '#DD2A7B', '#8134AF', '#515BD4'] as const;
const RING_SIZE = 72;
const AVATAR_SIZE = 64;
const RING_WIDTH = 3;

function StoryAvatar({ group, isOwn, onPress }: { group: StoryGroup | undefined; isOwn?: boolean; onPress: () => void }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.9, useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }).start();
  };

  const hasStory = !!group?.stories?.length;
  const hasUnviewed = group?.hasUnviewed ?? false;

  const displayName = isOwn
    ? (user?.displayName || 'You')
    : (group?.author?.displayName || '');
  const avatarUri = isOwn
    ? (user?.avatarUrl ?? null)
    : (group?.author?.avatarUrl ?? null);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={styles.item}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={styles.ringWrap}>
          {hasStory ? (
            <LinearGradient
              colors={hasUnviewed ? [...RING_GRADIENT] : ['#555555', '#555555']}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={[styles.gradientRing, !hasUnviewed && { opacity: 0.5 }]}
            />
          ) : (
            <View style={[styles.noRing, { borderColor: colors.border }]} />
          )}
          <View style={styles.avatarInner}>
            <Avatar
              name={displayName}
              uri={avatarUri}
              size={AVATAR_SIZE}
              online={false}
            />
          </View>
          {isOwn && !hasStory && (
            <View style={[styles.addBadge, { backgroundColor: colors.accent, borderColor: colors.surface }]}>
              <MaterialCommunityIcons name="plus" size={14} color="#FFFFFF" />
            </View>
          )}
          {isOwn && hasStory && (
            <View style={[styles.addBadge, { backgroundColor: colors.accent, borderColor: colors.surface }]}>
              <MaterialCommunityIcons name="plus" size={14} color="#FFFFFF" />
            </View>
          )}
        </View>
      </Animated.View>
      <Text
        style={[styles.label, { color: colors.muted }]}
        numberOfLines={1}
      >
        {isOwn ? 'Your Story' : displayName.split(' ')[0]}
      </Text>
    </Pressable>
  );
}

export const StoryRing = memo(function StoryRing({ stories }: { stories: StoryGroup[] }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const myStory = stories.find((g) => g.author.id === user?.id);
  const otherStories = stories.filter((g) => g.author.id !== user?.id);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <StoryAvatar
          group={myStory ?? undefined}
          isOwn
          onPress={() =>
            myStory?.stories[0]
              ? router.push({
                  pathname: '/feed/story' as any,
                  params: { authorId: myStory.author.id, storyIndex: '0' },
                })
              : router.push('/feed/create-story' as any)
          }
        />

        {otherStories.map((group) => (
          <StoryAvatar
            key={group.author.id}
            group={group}
            onPress={() =>
              group.stories[0] &&
              router.push({
                pathname: '/feed/story' as any,
                params: { authorId: group.author.id, storyIndex: '0' },
              })
            }
          />
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#00000015',
  },
  row: {
    paddingHorizontal: 10,
    paddingVertical: 14,
    gap: 4,
    alignItems: 'flex-start',
  },
  item: {
    alignItems: 'center',
    width: 80,
    gap: 6,
  },
  ringWrap: {
    position: 'relative',
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RING_SIZE / 2,
    padding: RING_WIDTH,
  },
  noRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_WIDTH,
  },
  avatarInner: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  addBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 76,
  },
});
