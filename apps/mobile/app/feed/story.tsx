import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useI18n } from '@/i18n';
import { useSocket } from '@/socket';
import { useTheme } from '@/theme';
import { FluentEmoji, EmojiText, isEmojiOnly, emojiByChar } from '@/emoji';
import type { SocketEvent, StoryGroup, StoryItem, StoryViewerUser } from '@/types';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { Avatar } from '@/ui';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const DURATION_IMAGE = 5000;
const DURATION_VIDEO = 15000;
const TICK = 40;
const SWIPE_THRESHOLD = 50;
const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '🔥', '👏', '💯', '😍'] as const;

function parseStoryContent(raw: string | null): { text: string; x: number; y: number; style: number } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.t === 'string') {
      return {
        text: parsed.t,
        x: Number(parsed.x) || SCREEN_W / 2,
        y: Number(parsed.y) || SCREEN_H / 2,
        style: Number(parsed.s) || 0,
      };
    }
  } catch {}
  return { text: raw, x: SCREEN_W / 2, y: SCREEN_H / 2, style: 0 };
}

const TEXT_STYLES = [
  { bg: '#00000099', color: '#FFFFFF', fontWeight: '700' as const },
  { bg: '#FFFFFFDD', color: '#000000', fontWeight: '700' as const },
  { bg: 'transparent', color: '#FFFFFF', fontWeight: '900' as const },
  { bg: '#1F66FFCC', color: '#FFFFFF', fontWeight: '700' as const },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const ProgressBar = memo(function ProgressBar({
  segments,
  paused,
}: {
  segments: { completed: boolean; progress: number }[];
  paused: boolean;
}) {
  return (
    <View style={s.progressRow}>
      {segments.map((seg, i) => (
        <View key={i} style={s.progressTrack}>
          <View
            style={[
              s.progressFill,
              {
                width: `${seg.completed ? 100 : seg.progress}%`,
                opacity: paused && !seg.completed ? 0.6 : 1,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
});

function FloatingHeart({ x, onDone }: { x: number; onDone: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const driftDir = (Math.random() - 0.5) * 60;
    Animated.parallel([
      Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(anim, { toValue: 0, duration: 1000, useNativeDriver: true }),
        Animated.timing(drift, { toValue: driftDir, duration: 1000, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
      ]).start(() => onDone());
    });
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.floatingHeart,
        {
          left: x,
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [100, -SCREEN_H * 0.3] }) },
            { translateX: drift },
            { scale },
          ],
        },
      ]}
    >
      <MaterialCommunityIcons name="heart" size={36} color="#FF2D55" />
    </Animated.View>
  );
}

function FloatingEmoji({ char, x, onDone }: { char: string; x: number; onDone: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const driftDir = (Math.random() - 0.5) * 50;
    Animated.parallel([
      Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(anim, { toValue: 0, duration: 1200, useNativeDriver: true }),
        Animated.timing(drift, { toValue: driftDir, duration: 1200, useNativeDriver: true }),
      ]).start(() => onDone());
    });
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.floatingHeart,
        { left: x, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [80, -SCREEN_H * 0.35] }) }, { translateX: drift }] },
      ]}
    >
      <FluentEmoji char={char} size={40} />
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
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = useRef(false);

  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; type: 'heart' | 'emoji'; char?: string }[]>([]);
  const floatId = useRef(0);

  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<StoryViewerUser[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [shareFriends, setShareFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const [showMenu, setShowMenu] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const currentGroup = groups[groupIndex] ?? null;
  const currentStory = currentGroup?.stories[storyIndex] ?? null;
  const isOwn = user?.id === currentGroup?.author.id;
  const storyDuration = currentStory?.mediaType === 'video' ? DURATION_VIDEO : DURATION_IMAGE;

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
    pausedRef.current = false;
    setPaused(false);
    if (timerRef.current) clearInterval(timerRef.current);
    let elapsed = 0;
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return;
      elapsed += TICK;
      const pct = Math.min((elapsed / storyDuration) * 100, 100);
      setProgress(pct);
      if (elapsed >= storyDuration) {
        if (timerRef.current) clearInterval(timerRef.current);
        goNext();
      }
    }, TICK);
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
        setFloatingHearts((prev) => [...prev, { id: floatId.current++, x: SCREEN_W * 0.5 + (Math.random() - 0.5) * 40, type: 'heart' }]);
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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 10 || Math.abs(g.dx) > 10,
      onPanResponderGrant: () => {
        pausedRef.current = true;
        setPaused(true);
      },
      onPanResponderMove: (_, g) => {
        if (g.dy > 120) {
          slideAnim.setValue(Math.min(g.dy - 120, 100));
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 150) {
          Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 250, useNativeDriver: true }).start(() => router.back());
          return;
        }
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
        if (Math.abs(g.dx) > SWIPE_THRESHOLD && Math.abs(g.dx) > Math.abs(g.dy)) {
          if (g.dx < 0) goNext(); else goPrev();
        }
        pausedRef.current = false;
        setPaused(false);
      },
    })
  ).current;

  const lastTap = useRef(0);
  const handleTapAreaPress = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!isOwn) {
        toggleReaction();
      }
    } else {
      setTimeout(() => {
        if (Date.now() - lastTap.current >= 300) {
          setPaused(false);
          pausedRef.current = false;
        }
      }, 310);
    }
    lastTap.current = now;
  }, [isOwn]);

  const handlePressIn = useCallback(() => {
    pausedRef.current = true;
    setPaused(true);
  }, []);

  const handlePressOut = useCallback(() => {
    setTimeout(() => {
      if (Date.now() - lastTap.current >= 300) {
        pausedRef.current = false;
        setPaused(false);
      }
    }, 100);
  }, []);

  const handleLeftTap = useCallback(() => {
    pausedRef.current = false;
    setPaused(false);
    goPrev();
  }, [goPrev]);

  const handleRightTap = useCallback(() => {
    pausedRef.current = false;
    setPaused(false);
    goNext();
  }, [goNext]);

  const toggleReaction = useCallback(async () => {
    if (!currentStory) return;
    const newEmoji = myReaction ? null : '❤️';
    if (newEmoji) {
      setFloatingHearts((prev) => [...prev, { id: floatId.current++, x: SCREEN_W * 0.5 + (Math.random() - 0.5) * 50, type: 'heart' }]);
    }
    try {
      const res = await api.reactStory(currentStory.id, '❤️');
      setMyReaction(res.myReaction);
    } catch {}
  }, [currentStory, myReaction]);

  const sendReaction = useCallback(async (emoji: string) => {
    if (!currentStory) return;
    setShowReactionPicker(false);
    setFloatingHearts((prev) => [...prev, { id: floatId.current++, x: SCREEN_W * 0.5 + (Math.random() - 0.5) * 50, type: 'emoji', char: emoji }]);
    try {
      const res = await api.reactStory(currentStory.id, emoji);
      setMyReaction(res.myReaction);
    } catch {}
  }, [currentStory]);

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

  const loadShareFriends = useCallback(async () => {
    setLoadingFriends(true);
    setShowShareSheet(true);
    try {
      const friends = await api.friends();
      setShareFriends(friends);
    } catch {}
    setLoadingFriends(false);
  }, []);

  const shareToFriend = useCallback(async (friendId: string) => {
    if (!currentStory || !currentGroup) return;
    try {
      const conv = await api.createConversation(friendId);
      await api.sendMessage(conv.id, `[story:${currentGroup.author.id}]`);
    } catch {}
    setShowShareSheet(false);
  }, [currentStory, currentGroup]);

  const shareStoryLink = useCallback(async () => {
    if (!currentGroup) return;
    try {
      const { Share } = require('react-native');
      await Share.share({ message: `Check out ${currentGroup.author.displayName}'s story on XYTEEE` });
    } catch {}
    setShowShareSheet(false);
  }, [currentGroup]);

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
    setShowMenu(false);
    if (!currentStory) return;
    Alert.alert('Delete Story?', '', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try { await api.deleteStory(currentStory.id); router.back(); } catch {}
        },
      },
    ]);
  }, [currentStory, t, router]);

  const removeFloat = useCallback((id: number) => {
    setFloatingHearts((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const segments = useMemo(() =>
    currentGroup
      ? currentGroup.stories.map((_, i) => ({
          completed: i < storyIndex,
          progress: i === storyIndex ? progress : 0,
        }))
      : [],
    [currentGroup, storyIndex, progress]
  );

  if (loading) {
    return (
      <View style={[s.safe, { backgroundColor: '#000' }]}>
        <View style={s.center}>
          <ActivityIndicator color="#FFF" size="large" />
        </View>
      </View>
    );
  }

  if (!currentStory || !currentGroup) {
    return (
      <View style={[s.safe, { backgroundColor: '#000' }]}>
        <View style={s.center}>
          <MaterialCommunityIcons name="book-open-page-variant-outline" size={48} color="#555" />
          <Text style={s.emptyText}>No stories to view</Text>
          <Pressable onPress={() => router.back()} style={[s.backBtn, { marginTop: 16 }]}>
            <Text style={{ color: '#FFF', fontWeight: '600' }}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[s.safe, { transform: [{ translateY: slideAnim }] }]}
      {...panResponder.panHandlers}
    >
      <KeyboardAvoidingView
        style={s.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        {/* Progress Bars */}
        <View style={[s.progressContainer, { paddingTop: insets.top + 4 }]}>
          <ProgressBar segments={segments} paused={paused} />
        </View>

        {/* Top Gradient + Author */}
        <LinearGradient
          colors={['#000000AA', '#00000044', 'transparent']}
          style={[s.topGradient, { top: insets.top }]}
        >
          <View style={s.topBar}>
            <View style={s.authorRow}>
              <Avatar name={currentGroup.author.displayName} uri={currentGroup.author.avatarUrl ?? null} size={38} />
              <View style={styles_authorInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={s.authorName}>{currentGroup.author.displayName}</Text>
                  {currentGroup.author.isVerified ? (
                    <VerifiedBadge
                      category={currentGroup.author.verifiedCategory ?? null}
                      username={currentGroup.author.username}
                      displayName={currentGroup.author.displayName}
                      verifiedAt={currentGroup.author.verifiedAt ?? null}
                      size={14}
                    />
                  ) : null}
                </View>
                <Text style={s.storyTime}>{timeAgo(currentStory.createdAt)}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {isOwn ? (
                <Pressable onPress={loadViewers} style={s.iconBtn}>
                  <MaterialCommunityIcons name="eye-outline" size={22} color="#FFF" />
                  {viewCount > 0 && (
                    <View style={s.countBadge}>
                      <Text style={s.countBadgeText}>{viewCount}</Text>
                    </View>
                  )}
                </Pressable>
              ) : null}
              <Pressable onPress={() => setShowMenu(true)} style={s.iconBtn}>
                <MaterialCommunityIcons name="dots-vertical" size={22} color="#FFF" />
              </Pressable>
              <Pressable onPress={() => router.back()} style={s.iconBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#FFF" />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        {/* Story Image/Video + Text Overlay */}
        <View style={s.storyArea}>
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handleTapAreaPress}
            style={s.storyArea}
          >
            <Image source={{ uri: currentStory.mediaUrl }} style={s.storyImage} resizeMode="cover" />

            {(() => {
              const parsed = parseStoryContent(currentStory.content);
              if (!parsed) return null;
              const ts = TEXT_STYLES[parsed.style % TEXT_STYLES.length]!;
              return (
                <View
                  style={[
                    s.textOverlay,
                    {
                      left: Math.min(parsed.x - 80, SCREEN_W - 120),
                      top: parsed.y - 18,
                      backgroundColor: ts.bg,
                      borderRadius: ts.bg === 'transparent' ? 0 : 10,
                      paddingHorizontal: ts.bg === 'transparent' ? 0 : 16,
                      paddingVertical: ts.bg === 'transparent' ? 0 : 12,
                    },
                  ]}
                >
                  <Text style={{ color: ts.color, fontSize: 20, fontWeight: ts.fontWeight, textAlign: 'center' }}>
                    {parsed.text}
                  </Text>
                </View>
              );
            })()}

            {/* Tap Zones */}
            <Pressable onPress={handleLeftTap} style={[s.tapZone, { left: 0 }]} />
            <Pressable onPress={handleRightTap} style={[s.tapZone, { right: 0 }]} />
          </Pressable>

          {/* Floating Hearts + Emojis */}
          {floatingHearts.map((fh) =>
            fh.type === 'heart' ? (
              <FloatingHeart key={fh.id} x={fh.x} onDone={() => removeFloat(fh.id)} />
            ) : (
              <FloatingEmoji key={fh.id} char={fh.char!} x={fh.x} onDone={() => removeFloat(fh.id)} />
            )
          )}
        </View>

        {/* Bottom Gradient + Actions */}
        {!isOwn && (
          <LinearGradient
            colors={['transparent', '#00000044', '#000000CC']}
            style={[s.bottomGradient, { bottom: 0 }]}
          >
            <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              {/* Reply Input */}
              <View style={s.replyContainer}>
                <TextInput
                  style={s.replyInput}
                  placeholder={`Reply to ${currentGroup.author.displayName.split(' ')[0]}...`}
                  placeholderTextColor="#FFFFFF88"
                  value={replyText}
                  onChangeText={setReplyText}
                  onSubmitEditing={sendReply}
                  returnKeyType="send"
                  editable={!sendingReply}
                />
                {replyText.trim().length > 0 ? (
                  <Pressable onPress={sendReply} style={s.sendBtn}>
                    <MaterialCommunityIcons name="send" size={20} color={colors.accent} />
                  </Pressable>
                ) : (
                  <Pressable onPress={sendEmptyReply} style={s.sendBtn}>
                    <MaterialCommunityIcons name="send-outline" size={20} color="#FFFFFF88" />
                  </Pressable>
                )}
              </View>

              {/* Action Buttons */}
              <View style={s.actionRow}>
                <Pressable onPress={toggleReaction} style={s.actionBtn}>
                  <MaterialCommunityIcons
                    name={myReaction ? 'heart' : 'heart-outline'}
                    size={28}
                    color={myReaction ? '#FF2D55' : '#FFFFFF'}
                  />
                </Pressable>
                <Pressable onPress={() => setShowReactionPicker(true)} style={s.actionBtn}>
                  <MaterialCommunityIcons name="emoticon-outline" size={26} color="#FFFFFF" />
                </Pressable>
                <Pressable onPress={loadShareFriends} style={s.actionBtn}>
                  <MaterialCommunityIcons name="send-outline" size={26} color="#FFFFFF" />
                </Pressable>
                <Pressable onPress={shareStoryLink} style={s.actionBtn}>
                  <MaterialCommunityIcons name="share-variant-outline" size={24} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          </LinearGradient>
        )}

        {isOwn && (
          <LinearGradient
            colors={['transparent', '#00000044', '#000000AA']}
            style={[s.bottomGradient, { bottom: 0 }]}
          >
            <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <View style={s.ownBottomRow}>
                <View style={s.viewersPill} onTouchEnd={loadViewers}>
                  <MaterialCommunityIcons name="eye-outline" size={18} color="#FFF" />
                  <Text style={s.viewersPillText}>{viewCount}</Text>
                </View>
                <Pressable onPress={shareStoryLink} style={s.sharePill}>
                  <MaterialCommunityIcons name="share-variant-outline" size={18} color="#FFF" />
                  <Text style={s.viewersPillText}>Share</Text>
                </Pressable>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Reaction Picker Bottom Sheet */}
        {showReactionPicker && (
          <Pressable style={s.reactionOverlay} onPress={() => setShowReactionPicker(false)}>
            <View style={s.reactionPicker}>
              {REACTION_EMOJIS.map((emoji) => (
                <Pressable key={emoji} onPress={() => sendReaction(emoji)} style={s.reactionItem}>
                  <FluentEmoji char={emoji} size={36} />
                </Pressable>
              ))}
            </View>
          </Pressable>
        )}

        {/* Share Sheet */}
        <Modal visible={showShareSheet} transparent animationType="slide" onRequestClose={() => setShowShareSheet(false)}>
          <Pressable style={s.shareOverlay} onPress={() => setShowShareSheet(false)}>
            <View style={[s.shareSheet, { backgroundColor: colors.surface }]}>
              <View style={s.shareHandle} />
              <Text style={[s.shareTitle, { color: colors.text }]}>Send to</Text>

              {loadingFriends ? (
                <ActivityIndicator color={colors.accent} style={{ marginVertical: 24 }} />
              ) : (
                <FlatList
                  data={shareFriends}
                  keyExtractor={(item) => item.id}
                  style={{ maxHeight: 320 }}
                  renderItem={({ item }) => (
                    <Pressable onPress={() => shareToFriend(item.id)} style={[s.shareFriendRow, { borderBottomColor: colors.border }]}>
                      <Avatar name={item.displayName} uri={item.avatarUrl ?? null} size={44} />
                      <Text style={[s.shareFriendName, { color: colors.text }]}>{item.displayName}</Text>
                      <MaterialCommunityIcons name="send" size={20} color={colors.accent} />
                    </Pressable>
                  )}
                />
              )}

              <Pressable onPress={shareStoryLink} style={[s.shareLinkBtn, { backgroundColor: colors.accentSoft }]}>
                <MaterialCommunityIcons name="link-variant" size={20} color={colors.accent} />
                <Text style={{ color: colors.accent, fontWeight: '600', fontSize: 14 }}>Copy Link</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        {/* Viewers Bottom Sheet */}
        <Modal visible={showViewers} transparent animationType="slide" onRequestClose={() => setShowViewers(false)}>
          <Pressable style={s.shareOverlay} onPress={() => setShowViewers(false)}>
            <View style={[s.shareSheet, { backgroundColor: colors.surface }]}>
              <View style={s.shareHandle} />
              <Text style={[s.shareTitle, { color: colors.text }]}>Viewers ({viewers.length})</Text>

              {loadingViewers ? (
                <ActivityIndicator color={colors.accent} style={{ marginVertical: 24 }} />
              ) : viewers.length === 0 ? (
                <Text style={[s.emptyText, { color: colors.muted, marginVertical: 24 }]}>No viewers yet</Text>
              ) : (
                <FlatList
                  data={viewers}
                  keyExtractor={(item) => item.id}
                  style={{ maxHeight: 400 }}
                  renderItem={({ item }) => (
                    <View style={[s.shareFriendRow, { borderBottomColor: colors.border }]}>
                      <Avatar name={item.displayName} uri={item.avatarUrl ?? null} size={44} />
                      <View style={{ flex: 1 }}>
                        <Text style={[s.shareFriendName, { color: colors.text }]}>{item.displayName}</Text>
                        <Text style={{ color: colors.muted, fontSize: 11 }}>{timeAgo(item.viewedAt)}</Text>
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          </Pressable>
        </Modal>

        {/* Menu Bottom Sheet */}
        <Modal visible={showMenu} transparent animationType="slide" onRequestClose={() => setShowMenu(false)}>
          <Pressable style={s.shareOverlay} onPress={() => setShowMenu(false)}>
            <View style={[s.shareSheet, { backgroundColor: colors.surface }]}>
              <View style={s.shareHandle} />
              {isOwn ? (
                <>
                  <Pressable onPress={deleteStory} style={[s.menuItem, { borderBottomColor: colors.border }]}>
                    <MaterialCommunityIcons name="delete-outline" size={22} color={colors.danger} />
                    <Text style={[s.menuText, { color: colors.danger }]}>Delete Story</Text>
                  </Pressable>
                  <Pressable onPress={loadViewers} style={[s.menuItem, { borderBottomColor: colors.border }]}>
                    <MaterialCommunityIcons name="eye-outline" size={22} color={colors.text} />
                    <Text style={[s.menuText, { color: colors.text }]}>Viewers ({viewCount})</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable onPress={() => { setShowMenu(false); Alert.alert('Report submitted'); }} style={[s.menuItem, { borderBottomColor: colors.border }]}>
                    <MaterialCommunityIcons name="flag-outline" size={22} color={colors.danger} />
                    <Text style={[s.menuText, { color: colors.danger }]}>Report</Text>
                  </Pressable>
                  <Pressable onPress={() => { setShowMenu(false); Alert.alert('Story muted'); }} style={[s.menuItem, { borderBottomColor: colors.border }]}>
                    <MaterialCommunityIcons name="eye-off-outline" size={22} color={colors.text} />
                    <Text style={[s.menuText, { color: colors.text }]}>Mute</Text>
                  </Pressable>
                </>
              )}
            </View>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

  progressContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, paddingHorizontal: 8 },
  progressRow: { flexDirection: 'row', gap: 3 },
  progressTrack: { flex: 1, height: 2.5, borderRadius: 2, backgroundColor: '#FFFFFF44', overflow: 'hidden' },
  progressFill: { height: 2.5, borderRadius: 2, backgroundColor: '#FFFFFF' },

  topGradient: { position: 'absolute', left: 0, right: 0, height: 140, zIndex: 20, justifyContent: 'flex-end', paddingBottom: 12 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  authorName: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  storyTime: { color: '#FFFFFF99', fontSize: 11 },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19 },

  storyArea: { flex: 1 },
  storyImage: { width: SCREEN_W, height: SCREEN_H },
  textOverlay: { position: 'absolute', zIndex: 15, maxWidth: SCREEN_W * 0.72 },

  tapZone: { position: 'absolute', top: 80, bottom: 120, width: SCREEN_W * 0.35, zIndex: 5 },
  floatingHeart: { position: 'absolute', bottom: 30, zIndex: 25 },

  bottomGradient: { position: 'absolute', left: 0, right: 0, height: 200, zIndex: 20, justifyContent: 'flex-end' },
  bottomBar: { paddingHorizontal: 14 },

  replyContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF18', borderRadius: 24, borderWidth: 1, borderColor: '#FFFFFF30', marginBottom: 10 },
  replyInput: { flex: 1, color: '#FFF', fontSize: 14, paddingVertical: 10, paddingHorizontal: 14 },
  sendBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, paddingBottom: 4 },
  actionBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  ownBottomRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingBottom: 4 },
  viewersPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF22', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#FFFFFF33' },
  sharePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF22', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#FFFFFF33' },
  viewersPillText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  countBadge: { position: 'absolute', top: -3, right: -5, backgroundColor: '#FF3B5C', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  countBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '700' },

  reactionOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#00000066', zIndex: 40, justifyContent: 'flex-end', paddingBottom: 100 },
  reactionPicker: { flexDirection: 'row', justifyContent: 'center', gap: 8, backgroundColor: '#222222DD', borderRadius: 28, paddingVertical: 12, paddingHorizontal: 16, marginHorizontal: 20 },
  reactionItem: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },

  shareOverlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  shareSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
  shareHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#00000033', alignSelf: 'center', marginBottom: 12 },
  shareTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  shareFriendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  shareFriendName: { flex: 1, fontSize: 15, fontWeight: '600' },
  shareLinkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 24, marginTop: 12 },

  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  menuText: { fontSize: 16, fontWeight: '500' },

  backBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#333', borderRadius: 8 },
  emptyText: { color: '#FFFFFF99', fontSize: 14, fontWeight: '500' },
});

const styles_authorInfo = { flex: 1 } as const;
