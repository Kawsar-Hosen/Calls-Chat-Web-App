import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';
import type { StoryGroup, StoryItem } from '@/types';
import { Avatar } from '@/ui';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function parseStoryContent(raw: string | null): { text: string; x: number; y: number; style: number } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.t === 'string') {
      return { text: parsed.t, x: Number(parsed.x) || SCREEN_WIDTH / 2, y: Number(parsed.y) || SCREEN_HEIGHT / 2, style: Number(parsed.s) || 0 };
    }
  } catch {}
  return { text: raw, x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2, style: 0 };
}

const TEXT_STYLES = [
  { bg: '#00000088', color: '#FFFFFF', fontWeight: '700' as const },
  { bg: '#FFFFFFCC', color: '#000000', fontWeight: '700' as const },
  { bg: 'transparent', color: '#FFFFFF', fontWeight: '900' as const },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

const ProgressBar = memo(function ProgressBar({ segments, colors }: { segments: { completed: boolean; progress: number }[]; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={styles.progressRow}>
      {segments.map((seg, i) => (
        <View key={i} style={[styles.progressTrack, { backgroundColor: colors.elevated }]}>
          <View style={[styles.progressFill, { width: `${seg.completed ? 100 : seg.progress}%`, backgroundColor: colors.accentText }]} />
        </View>
      ))}
    </View>
  );
});

export default function StoryViewerScreen() {
  const params = useLocalSearchParams<{ authorId: string; storyIndex?: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [groupIndex, setGroupIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(Number(params.storyIndex ?? 0));
  const [viewCount, setViewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentGroup = groups[groupIndex] ?? null;
  const currentStory = currentGroup?.stories[storyIndex] ?? null;
  const isOwn = user?.id === currentGroup?.author.id;
  const storyDuration = currentStory?.mediaType === 'video' ? 15000 : 5000;

  useEffect(() => {
    api.feedStories().then((res) => {
      const idx = res.findIndex((g) => g.author.id === params.authorId);
      setGroups(res);
      setGroupIndex(idx >= 0 ? idx : 0);
      setStoryIndex(Number(params.storyIndex ?? 0));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [params.authorId]);

  const markViewed = useCallback(async (story: StoryItem) => {
    try {
      const res = await api.viewStory(story.id);
      setViewCount(res.viewCount);
    } catch {}
  }, []);

  useEffect(() => {
    if (!currentStory || loading) return;
    markViewed(currentStory);
    setViewCount(currentStory.viewCount);
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
    const interval = 50;
    let elapsed = 0;
    timerRef.current = setInterval(() => {
      elapsed += interval;
      const pct = Math.min((elapsed / storyDuration) * 100, 100);
      setProgress(pct);
      if (elapsed >= storyDuration) {
        if (timerRef.current) clearInterval(timerRef.current);
        goNext();
      }
    }, interval);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentStory?.id, loading]);

  const goNext = useCallback(() => {
    if (!currentGroup) return;
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((prev) => prev + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((prev) => prev + 1);
      setStoryIndex(0);
    } else {
      router.back();
    }
  }, [currentGroup, storyIndex, groupIndex, groups.length, router]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
    } else if (groupIndex > 0) {
      setGroupIndex((prev) => prev - 1);
      const prevGroup = groups[groupIndex - 1];
      setStoryIndex(prevGroup ? prevGroup.stories.length - 1 : 0);
    }
  }, [storyIndex, groupIndex, groups]);

  const handleTap = useCallback((x: number) => {
    if (x < SCREEN_WIDTH / 3) goPrev(); else if (x > (SCREEN_WIDTH * 2) / 3) goNext();
  }, [goPrev, goNext]);

  const deleteStory = useCallback(() => {
    if (!currentStory) return;
    Alert.alert(t('deleteAccount'), '', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('deleteAccount'), style: 'destructive', onPress: async () => {
          try { await api.deleteStory(currentStory.id); router.back(); } catch {}
        },
      },
    ]);
  }, [currentStory, t, router]);

  const segments = currentGroup ? currentGroup.stories.map((_, i) => ({
    completed: i < storyIndex,
    progress: i === storyIndex ? progress : 0,
  })) : [];

  if (loading) {
    return (
      <View style={[styles.safe, { backgroundColor: '#000000' }]}>
        <View style={styles.center}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      </View>
    );
  }

  if (!currentStory || !currentGroup) {
    return (
      <View style={[styles.safe, { backgroundColor: '#000000' }]}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t('noPostsYet')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { backgroundColor: '#000000' }]}>
      <ProgressBar segments={segments} colors={colors} />

      <View style={styles.topBar}>
        <View style={styles.authorRow}>
          <Avatar name={currentGroup.author.displayName} uri={currentGroup.author.avatarUrl} size={36} />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{currentGroup.author.displayName}</Text>
            <Text style={styles.storyTime}>{timeAgo(currentStory.createdAt)}</Text>
          </View>
        </View>
        <View style={styles.topActions}>
          {isOwn ? (
            <Pressable onPress={deleteStory} style={styles.iconBtn}>
              <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FFFFFF" />
            </Pressable>
          ) : null}
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <Pressable onPress={(e) => handleTap(e.nativeEvent.locationX)} style={styles.storyArea}>
        <Image source={{ uri: currentStory.mediaUrl }} style={styles.storyImage} resizeMode="cover" />
        {(() => {
          const parsed = parseStoryContent(currentStory.content);
          if (!parsed) return null;
          const ts = TEXT_STYLES[parsed.style % TEXT_STYLES.length]!;
          return (
            <View style={[styles.draggableTextOverlay, {
              left: parsed.x - 80,
              top: parsed.y - 18,
              backgroundColor: ts.bg,
              borderRadius: ts.bg === 'transparent' ? 0 : 8,
              paddingHorizontal: ts.bg === 'transparent' ? 0 : 14,
              paddingVertical: ts.bg === 'transparent' ? 0 : 10,
            }]}>
              <Text style={[styles.storyContentParsed, { color: ts.color, fontWeight: ts.fontWeight }]}>{parsed.text}</Text>
            </View>
          );
        })()}
      </Pressable>

      <View style={styles.bottomBar}>
        <View style={styles.viewRow}>
          <MaterialCommunityIcons name="eye-outline" size={18} color="#FFFFFF" />
          <Text style={styles.viewCount}>{viewCount}</Text>
        </View>
      </View>

      <Pressable onPress={goPrev} style={[styles.sideTap, { left: 0 }]} />
      <Pressable onPress={goNext} style={[styles.sideTap, { right: 0 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 12, paddingTop: 8 },
  progressTrack: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },
  topBar: { position: 'absolute', top: 20, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, zIndex: 10 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  authorInfo: { flex: 1 },
  authorName: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  storyTime: { color: '#FFFFFF99', fontSize: 11 },
  topActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  storyArea: { flex: 1 },
  storyImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  contentOverlay: { position: 'absolute', bottom: 80, left: 16, right: 16, backgroundColor: '#00000066', borderRadius: 12, padding: 14 },
  storyContent: { color: '#FFFFFF', fontSize: 15, lineHeight: 22 },
  draggableTextOverlay: { position: 'absolute', zIndex: 20, maxWidth: SCREEN_WIDTH * 0.7 },
  storyContentParsed: { fontSize: 20, textAlign: 'center' },
  bottomBar: { position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  viewRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  viewCount: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  emptyText: { color: '#FFFFFF99', fontSize: 14 },
  sideTap: { position: 'absolute', top: 80, bottom: 80, width: SCREEN_WIDTH / 3, zIndex: 5 },
});
