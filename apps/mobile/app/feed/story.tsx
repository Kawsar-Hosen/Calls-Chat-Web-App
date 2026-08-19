import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useI18n } from '@/i18n';
import { useSocket } from '@/socket';
import { useTheme } from '@/theme';
import type { SocketEvent, StoryGroup, StoryItem, StoryViewerUser } from '@/types';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { Avatar } from '@/ui';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FLOAT_DURATION = 1400;

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

function FloatingHeart({ x, onDone }: { x: number; onDone: () => void }) {
  const anim = useRef(new Animated.Value(1)).current;
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const driftDir = (Math.random() - 0.5) * 50;
    Animated.parallel([
      Animated.timing(anim, { toValue: 0, duration: FLOAT_DURATION, useNativeDriver: true }),
      Animated.timing(drift, { toValue: driftDir, duration: FLOAT_DURATION, useNativeDriver: true }),
    ]).start(() => onDone());
  }, []);
  return (
    <Animated.View style={[styles.floatingHeart, { left: x, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-SCREEN_HEIGHT * 0.5, 0] }) }, { translateX: drift }] }]} pointerEvents="none">
      <MaterialCommunityIcons name="heart" size={30} color="#FF6B9D" />
    </Animated.View>
  );
}

export default function StoryViewerScreen() {
  const params = useLocalSearchParams<{ authorId: string; storyIndex?: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { subscribe } = useSocket();
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [groupIndex, setGroupIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(Number(params.storyIndex ?? 0));
  const [viewCount, setViewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number }[]>([]);
  const heartId = useRef(0);

  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<StoryViewerUser[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

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

  useEffect(() => {
    if (!currentStory) return;
    setMyReaction(null);
    api.getStoryReactions(currentStory.id).then((res) => setMyReaction(res.myReaction)).catch(() => {});
  }, [currentStory?.id]);

  useEffect(() => {
    return subscribe((event: SocketEvent) => {
      if (event.type === 'story.reacted' && currentStory && event.storyId === currentStory.id) {
        setFloatingHearts((prev) => [...prev, { id: heartId.current++, x: SCREEN_WIDTH * 0.5 + (Math.random() - 0.5) * 40 }]);
      }
      if (event.type === 'story.viewed' && currentStory && event.storyId === currentStory.id && isOwn) {
        setViewCount((v) => v + 1);
      }
    });
  }, [currentStory?.id, isOwn]);

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
    Keyboard.dismiss();
    if (x < SCREEN_WIDTH / 3) goPrev(); else if (x > (SCREEN_WIDTH * 2) / 3) goNext();
  }, [goPrev, goNext]);

  const toggleReaction = useCallback(async () => {
    if (!currentStory) return;
    const newEmoji = myReaction ? null : '❤️';
    if (newEmoji) {
      setFloatingHearts((prev) => [...prev, { id: heartId.current++, x: SCREEN_WIDTH * 0.5 + (Math.random() - 0.5) * 40 }]);
    }
    try {
      const res = await api.reactStory(currentStory.id, '❤️');
      setMyReaction(res.myReaction);
    } catch {}
  }, [currentStory, myReaction]);

  const sendReply = useCallback(async () => {
    if (!currentStory || !replyText.trim()) return;
    setSendingReply(true);
    const text = replyText.trim();
    setReplyText('');
    try {
      const peerId = currentGroup?.author.id;
      await api.replyStory(currentStory.id, text);
      if (peerId) {
        const conv = await api.createConversation(peerId);
        await api.sendMessage(conv.id, `💬 ${text}`);
      }
    } catch {}
    setSendingReply(false);
  }, [currentStory, replyText, currentGroup]);

  const sendEmptyReply = useCallback(async () => {
    if (!currentStory) return;
    setSendingReply(true);
    try {
      await api.replyStory(currentStory.id, '');
      const peerId = currentGroup?.author.id;
      if (peerId) {
        const conv = await api.createConversation(peerId);
        await api.sendMessage(conv.id, '👀');
      }
    } catch {}
    setSendingReply(false);
  }, [currentStory, currentGroup]);

  const shareStory = useCallback(async () => {
    if (!currentStory || !currentGroup) return;
    try {
      const friends = await api.friends();
      if (friends.length === 0) return;
      Alert.alert(
        'Share Story',
        `Share ${currentGroup.author.displayName}'s story to:`,
        [
          ...friends.slice(0, 5).map((f) => ({
            text: f.displayName,
            onPress: async () => {
              try {
                const conv = await api.createConversation(f.id);
                await api.sendMessage(conv.id, `[story:${currentGroup.author.id}]`);
              } catch {}
            },
          })),
          { text: t('cancel'), style: 'cancel' as const },
        ],
      );
    } catch {}
  }, [currentStory, currentGroup, t]);

  const loadViewers = useCallback(async () => {
    if (!currentStory || !isOwn) return;
    setLoadingViewers(true);
    try {
      const res = await api.getStoryViewers(currentStory.id);
      setViewers(res);
      setShowViewers(true);
    } catch {}
    setLoadingViewers(false);
  }, [currentStory, isOwn]);

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

  const removeHeart = useCallback((id: number) => {
    setFloatingHearts((prev) => prev.filter((f) => f.id !== id));
  }, []);

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
    <KeyboardAvoidingView style={[styles.safe, { backgroundColor: '#000000' }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top + 40}>
      <ProgressBar segments={segments} colors={colors} />

      <View style={styles.topBar}>
        <View style={styles.authorRow}>
          <Avatar name={currentGroup.author.displayName} uri={currentGroup.author.avatarUrl} size={36} />
          <View style={styles.authorInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.authorName}>{currentGroup.author.displayName}</Text>
              {currentGroup.author.isVerified ? <VerifiedBadge category={currentGroup.author.verifiedCategory ?? null} username={currentGroup.author.username} displayName={currentGroup.author.displayName} verifiedAt={currentGroup.author.verifiedAt ?? null} size={14} /> : null}
            </View>
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
              left: parsed.x - 80, top: parsed.y - 18,
              backgroundColor: ts.bg,
              borderRadius: ts.bg === 'transparent' ? 0 : 8,
              paddingHorizontal: ts.bg === 'transparent' ? 0 : 14,
              paddingVertical: ts.bg === 'transparent' ? 0 : 10,
            }]}>
              <Text style={[styles.storyContentParsed, { color: ts.color, fontWeight: ts.fontWeight }]}>{parsed.text}</Text>
            </View>
          );
        })()}

        {floatingHearts.map((fh) => (
          <FloatingHeart key={fh.id} x={fh.x} onDone={() => removeHeart(fh.id)} />
        ))}
      </Pressable>

      <View style={styles.rightActions}>
        {!isOwn && (
          <>
            <Pressable onPress={toggleReaction} style={styles.heartBtn}>
              <MaterialCommunityIcons
                name={myReaction ? 'heart' : 'heart-outline'}
                size={30}
                color={myReaction ? '#FF6B9D' : '#FFFFFF'}
              />
            </Pressable>
            <Pressable onPress={shareStory} style={styles.actionBtn}>
              <MaterialCommunityIcons name="share-variant-outline" size={24} color="#FFFFFF" />
            </Pressable>
          </>
        )}
        {isOwn ? (
          <Pressable onPress={loadViewers} style={styles.actionBtn}>
            <MaterialCommunityIcons name="eye-outline" size={26} color="#FFFFFF" />
            {viewCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{viewCount}</Text></View>}
          </Pressable>
        ) : null}
      </View>

      {!isOwn && (
        <View style={styles.bottomBar}>
          <View style={styles.replyRow}>
            <TextInput
              style={styles.replyInput}
              placeholder={t('replyToStory')}
              placeholderTextColor="#FFFFFF55"
              value={replyText}
              onChangeText={setReplyText}
              onSubmitEditing={sendReply}
              returnKeyType="send"
              editable={!sendingReply}
            />
            {replyText.trim().length > 0 ? (
              <Pressable onPress={sendReply} style={styles.replySendBtn}>
                <MaterialCommunityIcons name="send" size={20} color={colors.accentText} />
              </Pressable>
            ) : (
              <Pressable onPress={sendEmptyReply} style={styles.replySendBtn}>
                <MaterialCommunityIcons name="send-outline" size={20} color="#FFFFFF88" />
              </Pressable>
            )}
          </View>
        </View>
      )}

      <Pressable onPress={goPrev} style={[styles.sideTap, { left: 0 }]} />
      <Pressable onPress={goNext} style={[styles.sideTap, { right: 0 }]} />

      {showViewers && (
        <View style={styles.viewersOverlay}>
          <View style={[styles.viewersSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.viewersHeader}>
              <Text style={[styles.viewersTitle, { color: colors.text }]}>{t('storyViews')} ({viewers.length})</Text>
              <Pressable onPress={() => setShowViewers(false)}>
                <MaterialCommunityIcons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>
            {loadingViewers ? (
              <ActivityIndicator color={colors.accentText} style={{ marginVertical: 20 }} />
            ) : viewers.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.muted }]}>{t('noStoryViews')}</Text>
            ) : (
              viewers.map((v) => (
                <View key={v.id} style={styles.viewerRow}>
                  <Avatar name={v.displayName} uri={v.avatarUrl} size={36} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.viewerName, { color: colors.text }]}>{v.displayName}</Text>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>{timeAgo(v.viewedAt)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
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
  draggableTextOverlay: { position: 'absolute', zIndex: 20, maxWidth: SCREEN_WIDTH * 0.7 },
  storyContentParsed: { fontSize: 20, textAlign: 'center' },
  emptyText: { color: '#FFFFFF99', fontSize: 14 },
  sideTap: { position: 'absolute', top: 80, bottom: 80, width: SCREEN_WIDTH / 3, zIndex: 5 },
  rightActions: { position: 'absolute', right: 12, bottom: 120, alignItems: 'center', gap: 20, zIndex: 10 },
  heartBtn: { alignItems: 'center', justifyContent: 'center', width: 48, height: 48 },
  actionBtn: { alignItems: 'center', justifyContent: 'center', width: 44, height: 44 },
  badge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#FF3B5C', borderRadius: 8, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  floatingHeart: { position: 'absolute', bottom: 20, zIndex: 30 },
  bottomBar: { position: 'absolute', bottom: 20, left: 12, right: 12, zIndex: 10 },
  replyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF15', borderRadius: 24, borderWidth: 1, borderColor: '#FFFFFF33' },
  replyInput: { flex: 1, color: '#FFFFFF', fontSize: 14, paddingVertical: 10, paddingHorizontal: 14 },
  replySendBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  viewersOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#00000088', zIndex: 50, justifyContent: 'flex-end' },
  viewersSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, maxHeight: SCREEN_HEIGHT * 0.5 },
  viewersHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewersTitle: { fontSize: 16, fontWeight: '700' },
  viewerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  viewerName: { fontSize: 14, fontWeight: '600' },
});
