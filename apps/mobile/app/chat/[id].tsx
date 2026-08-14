import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Linking, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, Vibration, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, mapGroup } from '@/api';
import { useAuth } from '@/auth';
import { useSocket } from '@/socket';
import { useTheme } from '@/theme';
import type { Group, Message, SocketEvent, User } from '@/types';
import { Avatar, SkeletonChat } from '@/ui';
import { useI18n } from '@/i18n';
import { giphyItems, mediaRecents, rememberMedia, type GiphyItem, type GiphyKind, type RecentItem } from '@/giphy';
import { Emoji, EmojiText, EMOJI_FAMILY_MARKER, encodeEmoji, emojiList, isEmojiOnly, REACTION_CHOICES } from '@/emoji';
import { time } from '@/time';
import { previewText } from '@/preview';
import { playNotificationSound, playSendSound, playSound } from '@/sounds';
import { addReminder, chatPrefsFor, consumeDueReminders, setConversationUnread, setPinned, useChatMeta } from '@/chat-meta';
import type { PinnedMessage } from '@/chat-meta';
import { bubbleLook, bubbleFont, densityById, DEFAULT_CUSTOMIZATION, soundById, ThemeBackdrop, themeById } from '@/themes';

type MCIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

function sameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function dayLabel(iso: string, today: string, yesterday: string): string {
  const date = new Date(iso);
  const now = new Date();
  const key = (value: Date) => value.toDateString();
  if (key(date) === key(now)) return today;
  const previous = new Date(now);
  previous.setDate(now.getDate() - 1);
  if (key(date) === key(previous)) return yesterday;
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

const REMINDER_OPTIONS: { label: string; icon: MCIconName; at: () => Date }[] = [
  { label: 'In 1 hour', icon: 'clock-outline', at: () => new Date(Date.now() + 3600_000) },
  { label: 'In 3 hours', icon: 'clock-outline', at: () => new Date(Date.now() + 3 * 3600_000) },
  { label: 'Tomorrow morning', icon: 'weather-sunset-up', at: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; } },
  { label: 'Tomorrow evening', icon: 'weather-night', at: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(19, 0, 0, 0); return d; } },
  { label: 'In 1 week', icon: 'calendar-week', at: () => new Date(Date.now() + 7 * 86400_000) },
];

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string; username?: string; groupId?: string; groupName?: string; autoSearch?: string; peerId?: string; avatarUrl?: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const { subscribe, send: wsSend } = useSocket();
  const router = useRouter();
  const listRef = useRef<FlatList<Message>>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<Map<string, User>>(new Map());
  const [groupInfo, setGroupInfo] = useState<Group | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searching, setSearching] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [viewer, setViewer] = useState<string | null>(null);
  const [selected, setSelected] = useState<Message | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);
  const [reminderTarget, setReminderTarget] = useState<Message | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const meta = useChatMeta();
  const mutedRef = useRef(false);
  mutedRef.current = !!meta.muted[params.id];
  const prefs = meta.prefs[params.id] ? { showTimestamps: true, showReceipts: true, showTyping: true, sound: 'default', sendSound: 'default', notifSound: 'default', ...meta.prefs[params.id] } : chatPrefsFor(params.id);
  const soundPrefRef = useRef(prefs.sound);
  soundPrefRef.current = prefs.sound;
  const sendSoundRef = useRef(prefs.sendSound ?? 'default');
  sendSoundRef.current = prefs.sendSound ?? 'default';
  const notifSoundRef = useRef(prefs.notifSound ?? 'default');
  notifSoundRef.current = prefs.notifSound ?? 'default';
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reactingTo, setReactingTo] = useState<Message | null>(null);
  const [peerOnline, setPeerOnline] = useState<boolean | null>(null);
  const [peerLastSeen, setPeerLastSeen] = useState<string | null>(null);
  const [peerUser, setPeerUser] = useState<User | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [peerTypingUser, setPeerTypingUser] = useState<string | null>(null);
  const typingSent = useRef(false);
  const lastTypingAt = useRef(0);
  const peerTypingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isGroup = params.groupId != null;

  const groupAdminOnlySend = isGroup && groupInfo ? groupInfo.settings.canSend === 'admins' && groupInfo.myRole === 'member' : false;
  const groupAdminOnlyMedia = isGroup && groupInfo ? groupInfo.settings.canSendMedia === 'admins' && groupInfo.myRole === 'member' : false;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [page, memberRows] = await Promise.all([
        api.messages(params.id),
        isGroup && params.groupId ? api.group(params.groupId) : Promise.resolve(null),
      ]);
      setMessages(page.items);
      const latest = page.items[page.items.length - 1];
      if (latest && latest.senderId !== user?.id) void api.markRead(params.id, latest.id).catch(() => undefined);
      if (memberRows) { setMembers(new Map(memberRows.members.map((member) => [member.user.id, member.user]))); setGroupInfo(memberRows); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load messages'); }
    finally { setLoading(false); }
  }, [params.id, params.groupId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (params.autoSearch === '1') setSearchOpen(true); }, [params.autoSearch]);
  const peerId = !isGroup && user ? (params.peerId || messages.map((item) => item.senderId).find((senderId) => senderId !== user.id) || null) : null;
  const peerAvatar = peerUser?.avatarUrl ?? (params.avatarUrl || null);
  useEffect(() => {
    if (!peerId) return;
    let disposed = false;
    void api.presence(peerId).then((row) => { if (!disposed) { setPeerOnline(row.isOnline); setPeerLastSeen(row.lastSeenAt); setPeerUser(row); } }).catch(() => undefined);
    return () => { disposed = true; };
  }, [peerId]);
  useEffect(() => subscribe((event: SocketEvent) => {
    if (event.type === 'presence.updated') {
      if (event.userId === peerId) {
        setPeerOnline(event.isOnline);
        setPeerLastSeen(event.lastSeenAt);
        if (!event.isOnline) { if (peerTypingTimer.current) clearTimeout(peerTypingTimer.current); setPeerTyping(false); setPeerTypingUser(null); }
      }
      return;
    }
    if (event.type === 'typing.start' || event.type === 'typing.stop') {
      if (event.conversationId !== params.id || event.userId === user?.id) return;
      if (peerTypingTimer.current) clearTimeout(peerTypingTimer.current);
      if (event.type === 'typing.stop') {
        setPeerTyping(false);
        setPeerTypingUser(null);
      } else {
        setPeerTyping(true);
        setPeerTypingUser(event.userId);
        peerTypingTimer.current = setTimeout(() => {
          setPeerTyping(false);
          setPeerTypingUser(null);
        }, 5000);
      }
      return;
    }
    if (event.type === 'group.updated' && event.group) {
      if (event.groupId === params.groupId) setGroupInfo(mapGroup(event.group as Record<string, unknown>));
      return;
    }
    if (!('message' in event) || event.message.conversationId !== params.id) return;
    if (event.type === 'message.created' && event.message.senderId !== user?.id) void api.markRead(params.id, event.message.id).catch(() => undefined);
    setMessages((current) => {
      const message = event.message;
      if (event.type === 'message.deleted') return current.map((item) => item.id === message.id ? message : item);
      const index = current.findIndex((item) => item.id === message.id);
      if (index < 0) {
        if (event.type === 'message.created' && message.senderId !== user?.id && !mutedRef.current) {
          const notifSound = notifSoundRef.current;
          if (notifSound && notifSound !== 'none') {
            if (notifSound === 'default') {
              const sound = soundById(soundPrefRef.current).sound;
              if (sound) playSound(sound);
            } else playNotificationSound(notifSound);
          }
        }
        return [...current, message];
      }
      if (event.type === 'message.created' && message.senderId === user?.id) playSendSound(sendSoundRef.current);
      if (event.type === 'message.updated') {
        const previous = current[index];
        if (previous && message.reactions.length > previous.reactions.length) playSound('react');
      }
      return current.map((item) => item.id === message.id ? message : item);
    });
  }), [params.id, params.groupId, peerId, subscribe, user?.id]);

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (!value.trim()) {
      if (typingSent.current) { wsSend({ type: 'typing.stop', conversation_id: params.id }); typingSent.current = false; }
      return;
    }
    const now = Date.now();
    if (!typingSent.current || now - lastTypingAt.current >= 3000) {
      wsSend({ type: 'typing.start', conversation_id: params.id });
      typingSent.current = true;
      lastTypingAt.current = now;
    }
  };

  useEffect(() => () => {
    if (peerTypingTimer.current) clearTimeout(peerTypingTimer.current);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (typingSent.current) wsSend({ type: 'typing.stop', conversation_id: params.id });
  }, [params.id, wsSend]);

  useEffect(() => {
    if (meta.unread[params.id]) setConversationUnread(params.id, false);
  }, [params.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      const due = consumeDueReminders(params.id);
      if (due.length) showToast(`Reminder: ${due[0]?.label ?? 'Reminder'}`);
    }, 10_000);
    return () => clearInterval(timer);
  }, [params.id]);

  const openActions = (message: Message) => {
    if (message.deletedAt) return;
    setSelected(message);
  };

  const toggleReaction = async (message: Message, emoji: string) => {
    try {
      const mine = message.reactions.find((reaction) => reaction.userId === user?.id);
      let updated: Message;
      if (mine && mine.emoji !== emoji) {
        await api.toggleReaction(message.id, mine.emoji);
        updated = await api.toggleReaction(message.id, emoji);
      } else {
        updated = await api.toggleReaction(message.id, emoji);
      }
      setMessages((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update reaction');
    }
  };

  const onPickerEmoji = (emoji: string) => {
    const plain = emoji.replace(EMOJI_FAMILY_MARKER, '');
    if (reactingTo) {
      const target = reactingTo;
      setReactingTo(null);
      setPickerOpen(false);
      void toggleReaction(target, plain);
    } else {
      void sendEmoji(emoji);
    }
  };

  const doDelete = async (message: Message) => {
    setSelected(null);
    try {
      const updated = await api.deleteMessage(message.id);
      setMessages((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Message could not be deleted');
    }
  };

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  const togglePin = (message: Message) => {
    const current = meta.pinned[params.id];
    if (current?.id === message.id) {
      setPinned(params.id, null);
      showToast('Message unpinned');
    } else {
      setPinned(params.id, {
        id: message.id,
        senderId: message.senderId,
        content: message.content,
        media: pinMediaType(message),
        pinnedAt: Date.now(),
      });
      showToast('Message pinned');
    }
    setSelected(null);
  };

  const markUnread = () => {
    setConversationUnread(params.id, true);
    setSelected(null);
    router.back();
  };

  const scheduleReminder = (target: Message, at: Date, label: string) => {
    addReminder(params.id, target.id, at.getTime(), label);
    showToast(`Reminder set: ${label}`);
  };

  const send = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true); setError('');
    if (typingSent.current) { wsSend({ type: 'typing.stop', conversation_id: params.id }); typingSent.current = false; }
    if (editingId) {
      try {
        const updated = await api.editMessage(editingId, content);
        setMessages((current) => current.map((item) => item.id === updated.id ? updated : item));
        setDraft(''); setEditingId(null);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Message could not be edited');
      } finally { setSending(false); }
      return;
    }
    setDraft('');
    try {
      const message = await api.sendMessage(params.id, content, [], replyingTo?.id ?? null);
      setReplyingTo(null);
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
    } catch (reason) {
      setDraft(content);
      setError(reason instanceof Error ? reason.message : 'Message could not be sent');
    } finally { setSending(false); }
  };

  const startRecording = async () => {
    setError('');
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) { setError('Microphone permission is required to record voice messages.'); return; }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stopRecording = async (cancel = false) => {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    if (cancel) setVoiceUri(null);
    else setVoiceUri(recorder.uri);
  };

  const sendVoice = async () => {
    if (!voiceUri || sending) return;
    setSending(true); setError('');
    try {
      const webRecording = voiceUri.startsWith('blob:');
      const extension = webRecording ? 'webm' : 'm4a';
      const attachment = await api.uploadMedia(voiceUri, `voice-${Date.now()}.${extension}`, webRecording ? 'audio/webm' : 'audio/mp4');
      const message = await api.sendMessage(params.id, '', [attachment.id], replyingTo?.id ?? null);
      setReplyingTo(null);
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      setVoiceUri(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Voice message could not be sent'); }
    finally { setSending(false); }
  };

  const sendEmoji = async (emoji: string) => {
    setPickerOpen(false); void rememberMedia({ type: 'emoji', value: emoji }); setSending(true);
    try { const message = await api.sendMessage(params.id, emoji, [], replyingTo?.id ?? null); setReplyingTo(null); setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Message could not be sent'); }
    finally { setSending(false); }
  };

  const sendGiphy = async (item: GiphyItem) => {
    setPickerOpen(false); void rememberMedia({ ...item, type: item.kind }); setSending(true);
    try { const attachment = await api.saveGiphy({ id: item.id, kind: item.kind, title: item.title, url: item.url }); const message = await api.sendMessage(params.id, '', [attachment.id], replyingTo?.id ?? null); setReplyingTo(null); setMessages((current) => current.some((row) => row.id === message.id) ? current : [...current, message]); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Media could not be sent'); }
    finally { setSending(false); }
  };

  const deliverAttachments = async (items: { uri: string; name: string; mimeType: string }[]) => {
    setSending(true); setError('');
    try {
      const uploaded = [];
      for (const item of items) uploaded.push(await api.uploadMedia(item.uri, item.name, item.mimeType));
      const message = await api.sendMessage(params.id, '', uploaded.map((attachment) => attachment.id), replyingTo?.id ?? null);
      setReplyingTo(null);
      setMessages((current) => current.some((row) => row.id === message.id) ? current : [...current, message]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Attachment could not be sent');
    } finally { setSending(false); }
  };

  const pickCamera = async () => {
    setAttachOpen(false);
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) { setError('Camera permission is required to take photos.'); return; }
    }
    setCameraOpen(true);
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || sending) return;
    setSending(true);
    try {
      const photo = await cameraRef.current.takePictureAsync();
      if (!photo) return;
      setCameraOpen(false);
      await deliverAttachments([{ uri: photo.uri, name: `photo-${Date.now()}.jpg`, mimeType: 'image/jpeg' }]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Photo could not be taken');
    } finally { setSending(false); }
  };

  const pickGallery = async () => {
    setAttachOpen(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 10, quality: 0.8 });
      if (result.canceled || !result.assets.length) return;
      await deliverAttachments(result.assets.map((asset) => ({ uri: asset.uri, name: asset.fileName ?? `photo-${Date.now()}.jpg`, mimeType: asset.mimeType ?? (asset.fileName?.endsWith('.png') ? 'image/png' : 'image/jpeg') })));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Gallery could not be opened');
    }
  };

  const pickDocument = async () => {
    setAttachOpen(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true });
      if (result.canceled || !result.assets.length) return;
      await deliverAttachments(result.assets.map((asset) => ({ uri: asset.uri, name: asset.name || 'document', mimeType: asset.mimeType ?? 'application/octet-stream' })));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Document picker could not be opened');
    }
  };

  const openMedia = (attachment: import('@/types').Attachment) => {
    if (attachment.mimeType.startsWith('image/')) setViewer(attachment.url);
    else void Linking.openURL(attachment.url).catch(() => undefined);
  };

  const attachOptions: { key: string; icon: MCIconName; label: string; color: string; onPress: () => void }[] = [
    { key: 'camera', icon: 'camera-outline', label: t('camera'), color: colors.accent, onPress: () => void pickCamera() },
    { key: 'gallery', icon: 'image-multiple-outline', label: t('gallery'), color: colors.success, onPress: () => void pickGallery() },
    { key: 'document', icon: 'file-document-outline', label: t('document'), color: colors.danger, onPress: () => void pickDocument() },
  ];

  useEffect(() => {
    if (!searchOpen || searchQuery.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const timer = setTimeout(() => {
      api.searchMessages(searchQuery.trim(), params.id)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchOpen, params.id]);

  const jumpTo = (message: Message) => {
    setMessages([...messages, message]);
    setSearchOpen(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  if (!user) return <Redirect href="/login" />;
  const rawName = isGroup ? params.groupName ?? params.name ?? 'Group' : params.name ?? 'Conversation';
  const name = !isGroup ? meta.prefs[params.id]?.nickname || rawName : rawName;
  const memberName = (senderId: string) => members.get(senderId)?.displayName ?? (senderId === user.id ? t('you') : '');
  const customization = isGroup && groupInfo ? groupInfo.customization : meta.prefs[params.id]?.customization ?? null;
  const themed = !!customization && customization.theme !== 'default';
  const activeTheme = themeById(customization?.theme ?? 'default');
  const density = densityById(customization?.density ?? DEFAULT_CUSTOMIZATION.density);
  const fontFamily = customization ? bubbleFont(customization) : undefined;
  const hText = themed ? activeTheme.headerText : colors.text;
  const hBg = themed ? activeTheme.header : colors.surface;
  const typingWho = prefs.showTyping && peerTyping && peerTypingUser ? memberName(peerTypingUser) : null;
  const presenceLine = isGroup ? (typingWho ? `${typingWho} ${t('typing')}` : `Tap for group details · ${members.size} members`) : (prefs.showTyping && peerTyping) ? (typingWho ? `${typingWho} ${t('typing')}` : t('typing')) : peerOnline === true ? t('online') : peerOnline === false ? (peerLastSeen ? `${t('lastSeen')} ${time(peerLastSeen)}` : t('offline')) : '';
  const presenceColor = isGroup ? (themed ? activeTheme.time : colors.muted) : (prefs.showTyping && peerTyping) ? (themed ? activeTheme.accent : colors.accent) : peerOnline === true ? (themed ? activeTheme.time : colors.success) : (themed ? activeTheme.time : colors.muted);
  const pinned = meta.pinned[params.id] ?? null;
  const pinnedMessage = pinned ? messages.find((item) => item.id === pinned.id) ?? null : null;

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const mine = item.senderId === user.id;
    const previous = messages[index - 1];
    const grouped = previous?.senderId === item.senderId;
    const isLast = messages[index + 1]?.senderId !== item.senderId;
    const showDivider = !previous || !sameDay(previous.createdAt, item.createdAt);
    const look = customization ? bubbleLook(customization, activeTheme, mine) : null;
    const isGiphyBubble = item.attachments.some((a) => (a.name ?? '').startsWith('GIPHY:'));
    const bubbleStyle = item.content && isEmojiOnly(item.content) ? styles.bubbleEmoji : isGiphyBubble ? styles.bubbleGiphy : look ? { backgroundColor: look.background, borderColor: look.borderColor, borderWidth: look.borderWidth, borderRadius: look.radius, ...look.extraStyle } : { backgroundColor: mine ? colors.accent : colors.surface, borderColor: mine ? colors.accent : colors.border };
    const tailedStyle = (!isEmojiOnly(item.content) && !isGiphyBubble) ? { ...bubbleStyle, borderBottomLeftRadius: mine ? (look?.radius ?? 8) : (isLast ? 2 : (look?.radius ?? 8)), borderBottomRightRadius: mine ? (isLast ? 2 : (look?.radius ?? 8)) : (look?.radius ?? 8) } : bubbleStyle;
    const messageColor = look ? look.textColor : mine ? colors.accentText : colors.text;
    const replied = item.replyToId ? messages.find((row) => row.id === item.replyToId) ?? null : null;
    const reactionGroups = new Map<string, { count: number; mine: boolean }>();
    for (const reaction of item.reactions) {
      const group = reactionGroups.get(reaction.emoji) ?? { count: 0, mine: false };
      group.count += 1;
      if (reaction.userId === user.id) group.mine = true;
      reactionGroups.set(reaction.emoji, group);
    }
    return (
      <View>
        {showDivider ? (
          <View style={[styles.dayDivider, { marginBottom: density.rowMargin }]}>
            <View style={[styles.dayChip, { backgroundColor: colors.elevated }]}><Text style={[styles.dayChipText, { color: colors.muted }]}>{dayLabel(item.createdAt, t('today'), t('yesterday'))}</Text></View>
          </View>
        ) : null}
        <ReplySwipe onReply={() => { if (!item.deletedAt) { setReplyingTo(item); setEditingId(null); Vibration.vibrate(12); } }}>
        <View style={[styles.messageRow, { marginBottom: density.rowMargin }, mine && styles.mine, grouped && styles.grouped]}>
        {!mine && !grouped ? <Avatar name={memberName(item.senderId) || name} uri={members.get(item.senderId)?.avatarUrl ?? peerAvatar} size={30} /> : !mine ? <View style={{ width: 30 }} /> : null}
        <View style={[styles.bubbleWrap, mine && styles.bubbleMine]}>
          {!mine && isGroup && !grouped ? <Text style={[styles.sender, { color: themed ? activeTheme.sender : colors.accent, fontFamily }]}>{memberName(item.senderId) || 'Unknown'}</Text> : null}
          <Pressable onLongPress={() => { Vibration.vibrate(12); openActions(item); }} style={[styles.bubble, { paddingVertical: density.padV }, tailedStyle, (replyingTo && replyingTo.id === item.id) ? styles.replyTarget : null]}>{item.deletedAt ? <Text style={[styles.messageText, { color: themed ? activeTheme.time : colors.faint, fontStyle: 'italic', fontFamily }]}>{t('deletedMessage')}</Text> : <>{replied ? <Pressable onPress={() => { if (replied.id !== item.id) jumpTo(replied); }} style={[styles.replyQuote, { backgroundColor: mine ? (look ? activeTheme.mine : 'rgba(255,255,255,.16)') : (look ? activeTheme.bubbleIn : colors.background), borderLeftColor: look ? (mine ? activeTheme.mineText : activeTheme.accent) : colors.accent }]}><Text numberOfLines={1} style={[styles.replyQuoteName, { color: mine ? (look ? activeTheme.mineText : 'rgba(255,255,255,.92)') : (look ? activeTheme.accent : colors.accent) }]}>{memberName(replied.senderId) || 'Unknown'}</Text><ReplyPreview message={replied} color={mine ? (look ? activeTheme.mineText : 'rgba(255,255,255,.85)') : (look ? activeTheme.bubbleText : colors.muted)} /></Pressable> : null}{item.content ? isEmojiOnly(item.content) ? <Pressable onLongPress={() => { Vibration.vibrate(12); openActions(item); }} delayLongPress={200} style={{ alignSelf: mine ? 'flex-end' : 'flex-start' }}><Emoji text={item.content} size={40} /></Pressable> : <Text style={[styles.messageText, { color: messageColor, fontFamily, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}><EmojiText text={item.content} size={26} /></Text> : null}<MessageMedia attachments={item.attachments} onOpen={openMedia} />{item.attachments.filter((attachment) => attachment.mimeType.startsWith('audio/')).map((attachment) => <VoicePlayer key={attachment.id} uri={attachment.url} color={messageColor} />)}</>}</Pressable>
          {reactionGroups.size ? <View style={[styles.reactionSummary, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>{[...reactionGroups.entries()].map(([emoji, group]) => <Pressable key={emoji} onPress={() => void toggleReaction(item, emoji)} style={[styles.reactionSummaryChip, { backgroundColor: group.mine ? colors.accentSoft : colors.surface, borderColor: group.mine ? colors.accent : colors.border }]}><Emoji text={encodeEmoji(emoji, 'telegram')} size={15} /><Text style={[styles.reactionSummaryCount, { color: group.mine ? colors.accent : colors.text }]}>{group.count}</Text></Pressable>)}</View> : null}
          <View style={styles.timeRow}>{prefs.showTimestamps ? <Text style={[styles.time, { color: themed ? activeTheme.time : colors.faint }]}>{time(item.createdAt)}{item.editedAt ? '  edited' : ''}</Text> : null}{prefs.showReceipts && mine ? <View style={styles.receipts}><MaterialCommunityIcons name={item.readByCount > 0 ? 'check-all' : 'check'} size={12} color={item.readByCount > 0 ? (themed ? activeTheme.accent : colors.accent) : (themed ? activeTheme.time : colors.faint)} />{item.readByCount > 0 ? <Text style={[styles.receiptCount, { color: themed ? activeTheme.time : colors.faint }]}>{item.readByCount}</Text> : null}</View> : null}</View>
        </View>
      </View>
      </ReplySwipe>
      </View>
    );
  };

  const messageList = (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(item) => item.id}
      contentContainerStyle={messages.length ? styles.messages : styles.emptyList}
      onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      ListEmptyComponent={<View style={styles.empty}><View style={[styles.emptyIcon, { backgroundColor: themed ? 'rgba(255,255,255,0.14)' : colors.accentSoft }]}><MaterialCommunityIcons name="message-text-outline" size={30} color={themed ? activeTheme.headerText : colors.accent} /></View><Text style={[styles.emptyTitle, { color: themed ? activeTheme.headerText : colors.text }]}>{t('startConversation')}</Text><Text style={[styles.emptyCopy, { color: error ? (themed ? activeTheme.accent : colors.danger) : (themed ? activeTheme.time : colors.muted) }]}>{error || t('conversationEmpty')}</Text></View>}
      renderItem={renderMessage}
    />
  );
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: themed ? activeTheme.gradient[0] : colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.header, { backgroundColor: hBg, borderBottomColor: themed ? activeTheme.border : colors.border }]}>
          <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={hText} /></Pressable>
          <Pressable onPress={() => params.groupId ? router.push({ pathname: '/groups/[id]', params: { id: params.groupId } }) : peerId ? router.push({ pathname: '/contacts/[id]', params: { id: peerId, name, username: params.username ?? '' } }) : undefined} style={[styles.titleBtn]}>
            {isGroup ? (groupInfo?.avatarUrl ? <Image source={{ uri: groupInfo.avatarUrl }} style={[styles.headerGroupPhoto, { backgroundColor: colors.elevated }]} /> : <View style={[styles.groupAvatar, { backgroundColor: themed ? 'rgba(255,255,255,0.18)' : colors.accentSoft }]}><MaterialCommunityIcons name="account-group-outline" size={18} color={themed ? activeTheme.headerText : colors.accent} /></View>) : <Avatar name={name} uri={peerAvatar} size={39} online={peerOnline === true} />}
            <View style={styles.identity}><Text numberOfLines={1} style={[styles.headerName, { color: hText, fontFamily }]}>{name}</Text><Text style={[styles.presence, { color: presenceColor }]}>{presenceLine}</Text></View>
          </Pressable>
          {!isGroup ? <>
            <Pressable accessibilityLabel="Audio call" hitSlop={10} onPress={() => peerId ? router.push({ pathname: '/call', params: { type: 'audio', id: params.id, peerId, name, username: params.username ?? '', avatarUrl: peerAvatar ?? '' } }) : undefined} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="phone" size={21} color={hText} /></Pressable>
            <Pressable accessibilityLabel="Video call" hitSlop={10} onPress={() => peerId ? router.push({ pathname: '/call', params: { type: 'video', id: params.id, peerId, name, username: params.username ?? '', avatarUrl: peerAvatar ?? '' } }) : undefined} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="video" size={23} color={hText} /></Pressable>
          </> : null}
          <Pressable accessibilityLabel="Chat settings" hitSlop={10} onPress={() => router.push({ pathname: '/chat/settings', params: { id: params.id, name, username: params.username ?? '', groupId: params.groupId ?? '', groupName: params.groupName ?? '', peerId: peerId ?? '', avatarUrl: peerAvatar ?? '' } })} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="dots-vertical" size={23} color={hText} /></Pressable>
        </View>
        {pinned ? <Pressable onPress={() => pinnedMessage ? jumpTo(pinnedMessage) : undefined} style={[styles.pinnedBar, { backgroundColor: colors.accentSoft, borderBottomColor: colors.border }]}><MaterialCommunityIcons name="pin" size={16} color={colors.accent} /><View style={{ flex: 1, minWidth: 0 }}><Text style={[styles.pinnedTitle, { color: colors.accent }]}>{t('pinnedMessage')}</Text><Text numberOfLines={1} style={[styles.pinnedPreview, { color: colors.text }]}>{memberName(pinned.senderId) || 'Someone'}: {pinPreview(pinned)}</Text></View><Pressable hitSlop={8} onPress={() => { setPinned(params.id, null); showToast('Message unpinned'); }}><MaterialCommunityIcons name="close" size={16} color={colors.muted} /></Pressable></Pressable> : null}
        {searchOpen ? (
          <View style={[styles.searchOverlay, { backgroundColor: hBg, borderBottomColor: themed ? activeTheme.border : colors.border }]}>
            <View style={[styles.searchBar, { backgroundColor: themed ? 'rgba(255,255,255,0.16)' : colors.background, borderColor: themed ? activeTheme.border : colors.border }]}>
              <MaterialCommunityIcons name="magnify" size={18} color={themed ? activeTheme.headerText : colors.muted} />
              <TextInput autoFocus value={searchQuery} onChangeText={setSearchQuery} placeholder={`${t('search')}…`} placeholderTextColor={themed ? activeTheme.time : colors.faint} style={[styles.searchInput, { color: hText, textAlign: isRTL ? 'right' : 'left' }]} />
              {searchQuery ? <Pressable hitSlop={8} onPress={() => setSearchQuery('')}><MaterialCommunityIcons name="close-circle" size={18} color={colors.faint} /></Pressable> : null}
              <Pressable hitSlop={8} onPress={() => { setSearchOpen(false); setSearchQuery(''); }}><MaterialCommunityIcons name="close" size={22} color={hText} /></Pressable>
            </View>
            <FlatList
              style={{ flex: 1 }} contentContainerStyle={styles.searchList} keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={[styles.searchHint, { color: colors.muted }]}>{searching ? 'Searching…' : searchQuery.trim().length < 2 ? 'Type at least two characters to search.' : 'No messages found.'}</Text>}
              data={searchResults} keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable onPress={() => jumpTo(item)} style={({ pressed }) => [styles.searchResult, { backgroundColor: pressed ? colors.elevated : colors.surface }]}>
                  <MaterialCommunityIcons name="message-outline" size={17} color={colors.accent} />
                  <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={2} style={[styles.searchResultText, { color: colors.text }]}>{item.deletedAt ? 'Message removed' : item.content}</Text><Text style={[styles.searchResultMeta, { color: colors.faint }]}>{memberName(item.senderId) || name} · {time(item.createdAt)}</Text></View>
                  <MaterialCommunityIcons name="arrow-down" size={16} color={colors.faint} />
                </Pressable>
              )}
            />
          </View>
        ) : null}
        {loading ? <SkeletonChat /> : themed ? <ThemeBackdrop theme={activeTheme} wallpaper={customization!.wallpaper}><View style={{ flex: 1 }}>{messageList}</View></ThemeBackdrop> : messageList}
        {error && messages.length ? <Text style={[styles.inlineError, { color: themed ? activeTheme.accent : colors.danger }]}>{error}</Text> : null}
        <View style={[styles.composerOuter, { backgroundColor: hBg }]}>
          {replyingTo || editingId ? <View style={[styles.replyBar, { backgroundColor: themed ? 'rgba(255,255,255,0.12)' : colors.surface, borderTopColor: themed ? activeTheme.border : colors.border }]}><MaterialCommunityIcons name={editingId ? 'pencil-outline' : 'reply'} size={16} color={themed ? activeTheme.accent : colors.accent} /><View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={[styles.replyBarLabel, { color: themed ? activeTheme.accent : colors.accent }]}>{editingId ? t('editingMessage') : `Reply to ${memberName(replyingTo!.senderId) || 'message'}`}</Text><Text numberOfLines={1} style={[styles.replyBarPreview, { color: themed ? activeTheme.time : colors.muted }]}>{editingId ? draft || ' ' : previewText(replyingTo!)}</Text></View><Pressable hitSlop={8} onPress={() => { setReplyingTo(null); setEditingId(null); }}><MaterialCommunityIcons name="close" size={18} color={themed ? activeTheme.time : colors.muted} /></Pressable></View> : null}
          {recorderState.isRecording ? <View style={[styles.recordingBar, { backgroundColor: themed ? 'rgba(255,255,255,0.12)' : colors.surface, borderColor: themed ? activeTheme.border : colors.border }]}><Text style={{ color: colors.danger }}>● {t('recording')}</Text><Text style={{ color: hText, flex: 1 }}>{duration(recorderState.durationMillis / 1000)}</Text><Pressable onPress={() => void stopRecording(true)}><Text style={{ color: hText }}>{t('cancel')}</Text></Pressable><Pressable onPress={() => void stopRecording()}><Text style={{ color: colors.danger, fontWeight: '800' }}>{t('stop')}</Text></Pressable></View> : null}
          {voiceUri ? <View style={[styles.recordingBar, { backgroundColor: themed ? 'rgba(255,255,255,0.12)' : colors.surface, borderColor: themed ? activeTheme.border : colors.border }]}><Text style={{ color: hText, fontWeight: '700' }}>{t('preview')}</Text><VoicePlayer uri={voiceUri} color={hText} /><Pressable onPress={() => setVoiceUri(null)}><Text style={{ color: hText }}>{t('cancel')}</Text></Pressable><Pressable disabled={sending} onPress={() => void sendVoice()}><Text style={{ color: themed ? activeTheme.accent : colors.accent, fontWeight: '800' }}>{t('send')}</Text></Pressable></View> : null}
          <View style={[styles.composer, { backgroundColor: themed ? 'rgba(255,255,255,0.16)' : colors.surface, borderColor: themed ? activeTheme.border : colors.border }]}>
            <Pressable accessibilityLabel="Attach camera, gallery, or document" onPress={() => groupAdminOnlyMedia ? showToast(t('onlyAdminsCanSendMedia')) : setAttachOpen(true)} style={styles.attach}><MaterialCommunityIcons name="plus-circle-outline" size={22} color={groupAdminOnlyMedia ? (themed ? activeTheme.time : colors.faint) : (themed ? activeTheme.headerText : colors.accent)} /></Pressable>
            <TextInput value={draft} onChangeText={handleDraftChange} editable={!groupAdminOnlySend} placeholder={groupAdminOnlySend ? t('onlyAdminsCanSend') : t('writeMessage')} placeholderTextColor={themed ? activeTheme.time : colors.faint} multiline maxLength={10000} style={[styles.input, { color: hText, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} />
            {!voiceUri ? <Pressable accessibilityLabel={recorderState.isRecording ? 'Stop recording' : 'Record voice message'} onPress={() => recorderState.isRecording ? void stopRecording() : groupAdminOnlyMedia ? showToast(t('onlyAdminsCanSendMedia')) : void startRecording()} style={styles.mic}><MaterialCommunityIcons name="microphone-outline" size={21} color={groupAdminOnlyMedia ? (themed ? activeTheme.time : colors.faint) : (themed ? activeTheme.headerText : colors.muted)} /></Pressable> : null}
            <Pressable accessibilityLabel="Emoji, GIF, or sticker" onPress={() => groupAdminOnlyMedia ? showToast(t('onlyAdminsCanSendMedia')) : setPickerOpen(true)} style={styles.mic}><MaterialCommunityIcons name="sticker-emoji" size={21} color={groupAdminOnlyMedia ? (themed ? activeTheme.time : colors.faint) : (themed ? activeTheme.headerText : colors.muted)} /></Pressable>
            <Pressable accessibilityLabel="Send message" disabled={!draft.trim() || sending || groupAdminOnlySend} onPress={() => void send()} style={({ pressed }) => [styles.send, { backgroundColor: colors.accent, opacity: !draft.trim() || sending || groupAdminOnlySend ? 0.45 : pressed ? 0.75 : 1 }]}>{sending ? <ActivityIndicator size="small" color={colors.accentText} /> : <MaterialCommunityIcons name="send" size={19} color={colors.accentText} />}</Pressable>
          </View>
        </View>
        <MediaPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} emojiOnly={reactingTo != null} onEmoji={(value) => onPickerEmoji(value)} onMedia={(item) => void sendGiphy(item)} />
        <Modal visible={attachOpen} transparent animationType="fade" onRequestClose={() => setAttachOpen(false)}><Pressable style={styles.sheetBackdrop} onPress={() => setAttachOpen(false)}><Pressable onPress={() => undefined} style={[styles.attachSheet, { backgroundColor: colors.surface, borderTopColor: colors.border }]}><View style={[styles.attachSheetHandle, { backgroundColor: colors.elevated }]} /><View style={[styles.attachSheetRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>{attachOptions.map((option) => <Pressable key={option.key} onPress={option.onPress} style={({ pressed }) => [styles.attachSheetBtn, { opacity: pressed ? 0.6 : 1 }]}><View style={[styles.attachSheetCircle, { backgroundColor: `${option.color}1F` }]}><MaterialCommunityIcons name={option.icon} size={26} color={option.color} /></View><Text style={[styles.attachSheetLabel, { color: colors.text }]}>{option.label}</Text></Pressable>)}</View></Pressable></Pressable></Modal>
        <Modal visible={cameraOpen} transparent animationType="slide" onRequestClose={() => setCameraOpen(false)}><View style={styles.cameraWrap}><CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" mute><Pressable accessibilityLabel="Close camera" onPress={() => setCameraOpen(false)} style={[styles.cameraClose, { backgroundColor: 'rgba(0,0,0,.45)' }]}><MaterialCommunityIcons name="close" size={24} color="#FFFFFF" /></Pressable><View style={styles.cameraBottom}><Pressable accessibilityLabel="Take photo" disabled={sending} onPress={() => void capturePhoto()} style={[styles.cameraShutter, { opacity: sending ? 0.5 : 1 }]}><View style={styles.cameraShutterInner} /></Pressable></View></CameraView></View></Modal>
        <Modal visible={viewer != null} transparent animationType="fade" onRequestClose={() => setViewer(null)}><Pressable onPress={() => setViewer(null)} style={styles.viewer}>{viewer ? <Image source={{ uri: viewer }} resizeMode="contain" style={styles.viewerImage} /> : null}<MaterialCommunityIcons name="close-circle" size={34} color="#FFFFFF" style={styles.viewerClose} /></Pressable></Modal>
        <Modal visible={selected != null} transparent animationType="slide" onRequestClose={() => setSelected(null)}><Pressable style={styles.sheetBackdrop} onPress={() => setSelected(null)}><Pressable onPress={() => undefined} style={[styles.msgActions, { backgroundColor: colors.surface, borderColor: colors.border }]}>{selected ? <><View style={styles.msgActionsHeader}><Avatar name={memberName(selected.senderId) || name} uri={members.get(selected.senderId)?.avatarUrl ?? peerAvatar} size={34} /><View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={[styles.msgActionsName, { color: colors.text }]}>{memberName(selected.senderId) || name}</Text><Text style={[styles.msgActionsMeta, { color: colors.faint }]}>{time(selected.createdAt)}{selected.editedAt ? ' · edited' : ''}</Text></View></View>{selected.content && isEmojiOnly(selected.content) ? <View style={styles.msgActionsEmoji}><Emoji text={selected.content} size={120} /></View> : selected.content ? <Text style={[styles.msgActionsPreview, { color: colors.text }]}>{selected.content}</Text> : null}<View style={[styles.msgActionsReactions, { borderTopColor: colors.border }]}>{REACTION_CHOICES.map((emoji) => { const reacted = selected.reactions.some((reaction) => reaction.emoji === emoji && reaction.userId === user?.id); return <Pressable key={emoji} onPress={() => { setSelected(null); void toggleReaction(selected, emoji); }} style={[styles.msgActionsReactionChip, reacted && { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}><EmojiText text={encodeEmoji(emoji, 'telegram')} size={27} /></Pressable>; })}<Pressable onPress={() => { setReactingTo(selected); setSelected(null); setPickerOpen(true); }} style={[styles.msgActionsReactionChip, { borderColor: colors.border }]}><MaterialCommunityIcons name="plus" size={22} color={colors.text} /></Pressable></View><View style={[styles.msgActionsList, { borderTopColor: colors.border }]}><Pressable onPress={() => { setReplyingTo(selected); setEditingId(null); setSelected(null); }} style={({ pressed }) => [styles.msgAction, { opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="reply" size={20} color={colors.text} /><Text style={[styles.msgActionText, { color: colors.text }]}>Reply</Text></Pressable><Pressable onPress={() => togglePin(selected)} style={({ pressed }) => [styles.msgAction, { opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name={pinned?.id === selected.id ? 'pin-off-outline' : 'pin'} size={20} color={colors.text} /><Text style={[styles.msgActionText, { color: colors.text }]}>{pinned?.id === selected.id ? 'Unpin Message' : 'Pin Message'}</Text></Pressable>{selected.senderId === user?.id && !selected.deletedAt ? <Pressable onPress={() => { setDraft(selected.content); setEditingId(selected.id); setReplyingTo(null); setSelected(null); }} style={({ pressed }) => [styles.msgAction, { opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="pencil-outline" size={20} color={colors.text} /><Text style={[styles.msgActionText, { color: colors.text }]}>Edit Message</Text></Pressable> : null}{selected.content ? <Pressable onPress={() => { setSelected(null); void Clipboard.setStringAsync(selected.content); }} style={({ pressed }) => [styles.msgAction, { opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="content-copy" size={20} color={colors.text} /><Text style={[styles.msgActionText, { color: colors.text }]}>Copy Message</Text></Pressable> : null}<Pressable onPress={markUnread} style={({ pressed }) => [styles.msgAction, { opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="email-outline" size={20} color={colors.text} /><Text style={[styles.msgActionText, { color: colors.text }]}>Mark as Unread</Text></Pressable><Pressable onPress={() => { setReminderTarget(selected); setSelected(null); }} style={({ pressed }) => [styles.msgAction, { opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="bell-outline" size={20} color={colors.text} /><Text style={[styles.msgActionText, { color: colors.text }]}>Remind Me</Text></Pressable>{selected.senderId === user?.id && !selected.deletedAt ? <Pressable onPress={() => { setDeleteTarget(selected); setSelected(null); }} style={({ pressed }) => [styles.msgAction, { opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="delete-outline" size={20} color={colors.danger} /><Text style={[styles.msgActionText, { color: colors.danger }]}>Delete Message</Text></Pressable> : null}</View></> : null}</Pressable></Pressable></Modal>
        <Modal visible={deleteTarget != null} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}><Pressable style={styles.confirmBackdrop} onPress={() => setDeleteTarget(null)}><Pressable onPress={() => undefined} style={[styles.confirmSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.confirmIcon, { backgroundColor: `${colors.danger}1F` }]}><MaterialCommunityIcons name="delete-outline" size={28} color={colors.danger} /></View><Text style={[styles.confirmTitle, { color: colors.text }]}>Delete message</Text><Text style={[styles.confirmText, { color: colors.muted }]}>Delete this message for everyone?</Text><View style={[styles.confirmActions, { borderTopColor: colors.border }]}><Pressable onPress={() => setDeleteTarget(null)} style={({ pressed }) => [styles.confirmButton, { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}><Text style={[styles.confirmButtonText, { color: colors.text }]}>Cancel</Text></Pressable><Pressable onPress={() => { const target = deleteTarget; setDeleteTarget(null); if (target) void doDelete(target); }} style={({ pressed }) => [styles.confirmButton, styles.confirmButtonDanger, { backgroundColor: colors.danger, opacity: pressed ? 0.8 : 1 }]}><Text style={[styles.confirmButtonText, { color: '#FFFFFF', fontWeight: '800' }]}>Delete</Text></Pressable></View></Pressable></Pressable></Modal>
        <Modal visible={reminderTarget != null} transparent animationType="slide" onRequestClose={() => setReminderTarget(null)}><Pressable style={styles.sheetBackdrop} onPress={() => setReminderTarget(null)}><Pressable onPress={() => undefined} style={[styles.msgActions, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.msgActionsHeader}><View style={[styles.confirmIcon, { backgroundColor: colors.accentSoft, width: 44, height: 44, borderRadius: 22 }]}><MaterialCommunityIcons name="bell-outline" size={20} color={colors.accent} /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={[styles.msgActionsName, { color: colors.text }]}>Remind me about this message</Text><Text numberOfLines={1} style={[styles.msgActionsMeta, { color: colors.faint }]}>{reminderTarget ? (memberName(reminderTarget.senderId) || 'Someone') + ' · ' + (reminderTarget.content || previewText(reminderTarget)) : ''}</Text></View></View>{REMINDER_OPTIONS.map((option) => <Pressable key={option.label} onPress={() => { const target = reminderTarget; setReminderTarget(null); if (target) void scheduleReminder(target, option.at(), option.label); }} style={({ pressed }) => [styles.msgAction, { opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name={option.icon} size={20} color={colors.text} /><Text style={[styles.msgActionText, { color: colors.text }]}>{option.label}</Text></Pressable>)}</Pressable></Pressable></Modal>
        {toast ? <View pointerEvents="none" style={styles.toastWrap}><View style={[styles.toast, { backgroundColor: colors.elevated }]}><Text style={[styles.toastText, { color: colors.text }]}>{toast}</Text></View></View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const ReplySwipe = memo(function ReplySwipe({ onReply, children }: { onReply: () => void; children: ReactNode }) {
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderRelease: (_, gesture) => { if (gesture.dx > 60) onReply(); },
  })).current;
  return <View {...pan.panHandlers}>{children}</View>;
});

function pinMediaType(message: Message): PinnedMessage['media'] {
  if (message.attachments.length) {
    if (message.attachments.some((attachment) => (attachment.name ?? '').startsWith('GIPHY:sticker'))) return 'sticker';
    if (message.attachments.some((attachment) => (attachment.name ?? '').startsWith('GIPHY:'))) return 'gif';
    if (message.attachments.some((attachment) => attachment.mimeType.startsWith('audio/'))) return 'voice';
    if (message.attachments.some((attachment) => attachment.mimeType.startsWith('video/'))) return 'video';
    return 'photo';
  }
  if (message.content && isEmojiOnly(message.content)) return 'emoji';
  return 'text';
}

function pinPreview(pinned: PinnedMessage): string {
  if (pinned.media === 'photo') return 'Photo';
  if (pinned.media === 'video') return 'Video';
  if (pinned.media === 'voice') return 'Voice message';
  if (pinned.media === 'gif') return 'GIF';
  if (pinned.media === 'sticker') return 'Sticker';
  if (pinned.media === 'emoji') return pinned.content || 'Emoji';
  return pinned.content || 'Message';
}

function ReplyPreview({ message, color }: { message: Message; color: string }) {
  if (message.deletedAt) return <Text numberOfLines={1} style={[styles.replyQuoteText, { color }]}>Message removed</Text>;
  if (message.attachments.length) {
    const media = message.attachments.find((attachment) => attachment.mimeType.startsWith('image/') || attachment.mimeType.startsWith('video/'));
    if (media) return <View style={styles.replyQuoteMedia}><Image source={{ uri: media.url }} style={styles.replyQuoteThumb} /><Text numberOfLines={1} style={[styles.replyQuoteText, { color, flex: 1 }]}>{media.mimeType.startsWith('video/') ? 'Video' : 'Photo'}</Text></View>;
  }
  if (message.content && isEmojiOnly(message.content)) return <View style={styles.replyQuoteMedia}><Emoji text={message.content} size={18} /><Text numberOfLines={1} style={[styles.replyQuoteText, { color, flex: 1 }]}>Emoji</Text></View>;
  return <Text numberOfLines={1} style={[styles.replyQuoteText, { color }]}>{previewText(message)}</Text>;
}

function MessageMedia({ attachments, onOpen }: { attachments: import('@/types').Attachment[]; onOpen: (item: import('@/types').Attachment) => void }) {
  const { colors } = useTheme();
  if (!attachments.length) return null;
  const sticker = (attachments[0]?.name ?? '').startsWith('GIPHY:sticker');
  const giphy = (attachments[0]?.name ?? '').startsWith('GIPHY:');
  const images = attachments.filter((item) => item.mimeType.startsWith('image/'));
  const files = attachments.filter((item) => !item.mimeType.startsWith('image/') && !item.mimeType.startsWith('audio/'));
  if (giphy || sticker) {
    return <View style={[styles.mediaGrid, sticker ? styles.mediaGridSticker : styles.mediaGridGif]}>{attachments.map((item, index) => <Pressable key={item.id} onPress={() => onOpen(item)} style={[styles.mediaCell, sticker ? styles.mediaCellSticker : styles.mediaCellGif]}><Image source={{ uri: item.url }} resizeMode="contain" style={styles.mediaImage} /></Pressable>)}</View>;
  }
  const shown = images.slice(0, 4);
  const single = shown.length === 1;
  return <>
    {shown.length ? <View style={[styles.mediaGrid, single && styles.mediaGridSingle]}>{shown.map((item, index) => <Pressable key={item.id} onPress={() => onOpen(item)} style={[styles.mediaCell, single && styles.mediaCellSingle, !single && images.length === 3 && index === 0 && styles.mediaCellThreeLead]}><Image source={{ uri: item.url }} resizeMode="contain" style={styles.mediaImage} />{index === 3 && images.length > 4 ? <View style={styles.mediaMore}><Text style={styles.mediaMoreText}>+{images.length - 4}</Text></View> : null}</Pressable>)}</View> : null}
    {files.map((item) => { const isVideo = item.mimeType.startsWith('video/'); const isAudioFile = item.mimeType.startsWith('audio/'); return <Pressable key={item.id} onPress={() => onOpen(item)} style={[styles.docCard, { backgroundColor: colors.background, borderColor: colors.border }]}><MaterialCommunityIcons name={isVideo ? 'video-outline' : isAudioFile ? 'file-music-outline' : 'file-document-outline'} size={22} color={colors.accent} /><Text numberOfLines={1} style={[styles.docName, { color: colors.text }]}>{item.name || (isVideo ? 'Video' : isAudioFile ? 'Audio' : 'Document')}</Text><MaterialCommunityIcons name="open-in-new" size={15} color={colors.faint} /></Pressable>; })}
  </>;
}

function MediaPicker({ visible, onClose, onEmoji, onMedia, emojiOnly = false }: { visible: boolean; onClose: () => void; onEmoji: (value: string) => void; onMedia: (item: GiphyItem) => void; emojiOnly?: boolean }) {
  const { colors } = useTheme(); const { height } = useWindowDimensions();
  const [tab, setTab] = useState<'emoji' | GiphyKind>('emoji'); const [emojiMode, setEmojiMode] = useState<'all' | 'fluent' | 'telegram'>('all'); const [query, setQuery] = useState(''); const [items, setItems] = useState<GiphyItem[]>([]); const [recents, setRecents] = useState<RecentItem[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  useEffect(() => { if (visible) void mediaRecents().then(setRecents); }, [visible]);
  useEffect(() => { if (!visible || tab === 'emoji') return; const timer = setTimeout(() => { setLoading(true); setError(''); void giphyItems(tab, query).then(setItems).catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load media')).finally(() => setLoading(false)); }, query ? 350 : 0); return () => clearTimeout(timer); }, [visible, tab, query]);
  const activeTab = emojiOnly ? 'emoji' : tab;
  const recent = recents.filter((item) => item.type === activeTab);
  const emojiCells = useMemo(() => emojiList(emojiMode, query).map((emoji) => encodeEmoji(emoji.char, emoji.family)), [emojiMode, query]);
  const recentEmoji = recent.filter((item): item is { type: 'emoji'; value: string } => item.type === 'emoji');
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={styles.sheetBackdrop} onPress={onClose}><Pressable onPress={() => undefined} style={[styles.sheet, { maxHeight: height * .72, backgroundColor: colors.surface }]}>
    {emojiOnly ? null : <View style={[styles.tabs, { borderBottomColor: colors.border }]}>{(['emoji','gif','sticker'] as const).map((value) => <Pressable key={value} onPress={() => { setTab(value); setQuery(''); }} style={[styles.tab, activeTab === value && { borderBottomColor: colors.accent }]}><Text style={{ color: activeTab === value ? colors.accent : colors.muted, fontWeight: '700' }}>{value === 'emoji' ? 'Emoji' : value === 'gif' ? 'GIF' : 'Sticker'}</Text></Pressable>)}</View>}
    {activeTab === 'emoji' && <View style={[styles.familyTabs, { borderColor: colors.border }]}>{(['all', 'fluent', 'telegram'] as const).map((mode) => <Pressable key={mode} onPress={() => setEmojiMode(mode)} style={[styles.familyTab, emojiMode === mode && { borderColor: colors.accent, backgroundColor: colors.background }]}><Text style={{ color: emojiMode === mode ? colors.accent : colors.muted, fontWeight: '700', fontSize: 12 }}>{mode === 'all' ? 'All' : mode === 'fluent' ? 'Fluent' : 'Telegram'}</Text></Pressable>)}</View>}
    <View style={[styles.pickerSearch, { borderColor: colors.border, backgroundColor: colors.background }]}><MaterialCommunityIcons name="magnify" size={18} color={colors.faint} /><TextInput value={query} onChangeText={setQuery} placeholder={activeTab === 'emoji' ? 'Search emoji, GIFs and Stickers' : `Search ${activeTab === 'gif' ? 'GIFs' : 'Stickers'}`} placeholderTextColor={colors.faint} style={{ flex: 1, color: colors.text }} /></View>
    {activeTab === 'emoji' ? <FlatList
      key={`emoji-${emojiMode}`}
      data={emojiCells}
      keyExtractor={(value) => value}
      numColumns={7}
      renderItem={({ item }) => <EmojiCell value={item} onEmoji={onEmoji} />}
      ListHeaderComponent={<>{recentEmoji.length ? <><Text style={[styles.pickerTitle, { color: colors.muted }]}>RECENT</Text><View style={styles.emojiGrid}>{recentEmoji.map((item) => <Pressable key={item.value} onPress={() => onEmoji(item.value)} style={styles.emojiCell}><EmojiText text={item.value} size={30} /></Pressable>)}</View></> : null}<Text style={[styles.pickerTitle, { color: colors.muted }]}>{`EMOJI · ${emojiMode === 'all' ? 'ALL' : emojiMode === 'fluent' ? 'FLUENT' : 'TELEGRAM'}${query ? ` · ${emojiCells.length}` : ''}`}</Text></>}
      contentContainerStyle={styles.pickerContent}
      style={{ flexShrink: 1 }}
      initialNumToRender={56}
      maxToRenderPerBatch={56}
      windowSize={7}
      removeClippedSubviews
      keyboardShouldPersistTaps="handled"
    /> : <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.pickerContent}>{recent.length ? <><Text style={[styles.pickerTitle, { color: colors.muted }]}>RECENT</Text><PickerGrid items={recent} tab={tab} onEmoji={onEmoji} onMedia={onMedia} /></> : null}<Text style={[styles.pickerTitle, { color: colors.muted }]}>{query ? 'RESULTS' : 'TRENDING'}</Text>{loading ? <ActivityIndicator color={colors.accent} style={{ margin: 50 }} /> : error ? <Text style={[styles.pickerState, { color: colors.muted }]}>Could not load GIPHY. Emoji is still available.</Text> : <PickerGrid items={items.map((item) => ({ ...item, type: item.kind }))} tab={tab} onEmoji={onEmoji} onMedia={onMedia} />}</ScrollView>}
  </Pressable></Pressable></Modal>;
}

function PickerGrid({ items, tab, onEmoji, onMedia }: { items: RecentItem[]; tab: 'emoji' | GiphyKind; onEmoji: (value: string) => void; onMedia: (item: GiphyItem) => void }) { return <View style={tab === 'emoji' ? styles.emojiGrid : styles.giphyGrid}>{items.map((item) => item.type === 'emoji' ? <Pressable key={item.value} onPress={() => onEmoji(item.value)} style={styles.emojiCell}><EmojiText text={item.value} size={30} /></Pressable> : <Pressable key={item.id} onPress={() => onMedia(item)} style={styles.giphyCell}><Image source={{ uri: item.previewUrl }} resizeMode="cover" style={styles.giphyImage} /></Pressable>)}</View>; }

const EmojiCell = memo(function EmojiCell({ value, onEmoji }: { value: string; onEmoji: (value: string) => void }) { return <Pressable onPress={() => onEmoji(value)} style={styles.emojiCellFlat}><EmojiText text={value} size={30} /></Pressable>; });

function VoicePlayer({ uri, color }: { uri: string; color: string }) {
  const player = useAudioPlayer(uri, { updateInterval: 200 });
  const status = useAudioPlayerStatus(player);
  const progress = status.duration ? Math.min(1, status.currentTime / status.duration) : 0;
  return <View style={styles.voicePlayer}><Pressable accessibilityLabel={status.playing ? 'Pause voice message' : 'Play voice message'} onPress={() => status.playing ? player.pause() : player.play()}><MaterialCommunityIcons name={status.playing ? 'pause-circle' : 'play-circle'} size={31} color={color} /></Pressable><Pressable accessibilityLabel="Voice message progress" onPress={(event) => { const ratio = Math.max(0, Math.min(1, event.nativeEvent.locationX / 130)); void player.seekTo(ratio * status.duration); }} style={styles.voiceTrack}><View style={[styles.voiceProgress, { width: `${progress * 100}%`, backgroundColor: color }]} /></Pressable><Text style={{ color, fontSize: 10 }}>{duration(status.playing || status.currentTime ? status.currentTime : status.duration)}</Text></View>;
}

function duration(value: number) { const seconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { height: 67, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }, iconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' }, titleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }, identity: { flex: 1, minWidth: 0 }, headerName: { fontSize: 15, fontWeight: '800' }, presence: { fontSize: 11, marginTop: 2 }, groupAvatar: { width: 39, height: 39, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, headerGroupPhoto: { width: 39, height: 39, borderRadius: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, messages: { padding: 16, paddingBottom: 10 }, emptyList: { flexGrow: 1 }, empty: { flex: 1, minHeight: 330, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { fontSize: 17, fontWeight: '800' }, emptyCopy: { marginTop: 7, fontSize: 13 }, emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  dayDivider: { alignItems: 'center', marginTop: 8 }, dayChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 }, dayChipText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  pinnedBar: { height: 44, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, pinnedTitle: { fontSize: 11, fontWeight: '800' }, pinnedPreview: { fontSize: 12, marginTop: 1 },
  messageRow: { maxWidth: '88%', flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 14 }, mine: { alignSelf: 'flex-end', flexDirection: 'row-reverse' }, grouped: { marginTop: -9 }, bubbleWrap: { alignItems: 'flex-start', minWidth: 45, maxWidth: '100%' }, bubbleMine: { alignItems: 'flex-end' }, sender: { fontSize: 11, fontWeight: '700', marginBottom: 3, paddingHorizontal: 2 }, bubble: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 7, borderBottomLeftRadius: 2, paddingHorizontal: 12, paddingVertical: 9 }, replyTarget: { borderColor: 'rgba(80,140,255,.85)', shadowColor: 'rgba(80,140,255,.5)', shadowOpacity: 0.45, shadowRadius: 7, elevation: 4 }, bubbleGiphy: { backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0, borderRadius: 10, paddingHorizontal: 0, paddingVertical: 0 }, bubbleEmoji: { backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0, paddingHorizontal: 0, paddingVertical: 0 }, messageText: { fontSize: 15, lineHeight: 21 }, time: { fontSize: 9, marginTop: 4, paddingHorizontal: 2 }, timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 2 }, receipts: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 }, receiptCount: { fontSize: 9, fontWeight: '700' },
  inlineError: { textAlign: 'center', fontSize: 12, paddingHorizontal: 16, paddingTop: 6 }, composerOuter: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10 }, composer: { minHeight: 53, maxHeight: 132, borderWidth: 1, borderRadius: 22, paddingLeft: 8, paddingRight: 5, paddingVertical: 5, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }, input: { flex: 1, minHeight: 41, maxHeight: 116, paddingTop: 10, paddingBottom: 8, fontSize: 16, lineHeight: 21 }, send: { width: 41, height: 41, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, mic: { width: 36, height: 41, alignItems: 'center', justifyContent: 'center' }, attach: { width: 36, height: 41, alignItems: 'center', justifyContent: 'center' }, attachSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, paddingBottom: 30 }, attachSheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }, attachSheetRow: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start' }, attachSheetBtn: { alignItems: 'center', gap: 8 }, attachSheetCircle: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' }, attachSheetLabel: { fontSize: 12, fontWeight: '800' }, attachRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 13 }, attachIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, attachLabel: { flex: 1, fontSize: 15, fontWeight: '700' }, docCard: { maxWidth: 260, alignSelf: 'flex-start', marginTop: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 9 }, docName: { flex: 1, fontSize: 12, fontWeight: '600' }, recordingBar: { minHeight: 50, marginBottom: 6, paddingHorizontal: 12, borderWidth: 1, borderRadius: 7, flexDirection: 'row', alignItems: 'center', gap: 12 }, voicePlayer: { minWidth: 200, flexDirection: 'row', alignItems: 'center', gap: 7 }, voiceTrack: { width: 130, height: 4, borderRadius: 2, backgroundColor: 'rgba(127,127,127,.3)', overflow: 'hidden' }, voiceProgress: { height: 4, borderRadius: 2 }, cameraWrap: { flex: 1, backgroundColor: '#000' }, cameraClose: { position: 'absolute', top: 48, left: 18, zIndex: 10, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }, cameraBottom: { position: 'absolute', bottom: 42, left: 0, right: 0, alignItems: 'center' }, cameraShutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, cameraShutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#FFFFFF' },
  mediaGrid: { width: 260, marginTop: 5, flexDirection: 'row', flexWrap: 'wrap', gap: 3 }, mediaGridSingle: { width: 270 }, mediaGridGif: { width: 200 }, mediaGridSticker: { width: 140 }, mediaCell: { width: 128, height: 128, overflow: 'hidden', borderRadius: 6, backgroundColor: 'rgba(127,127,127,.15)' }, mediaCellSingle: { width: 270, height: 220 }, mediaCellGif: { width: 200, height: 150, backgroundColor: 'transparent' }, mediaCellSticker: { width: 140, height: 140, backgroundColor: 'transparent' }, mediaCellThreeLead: { height: 259 }, mediaImage: { width: '100%', height: '100%' }, mediaMore: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,.52)' }, mediaMoreText: { color: '#FFFFFF', fontSize: 25, fontWeight: '800' },
  viewer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(7,9,9,.94)' }, viewerImage: { width: '94%', height: '84%' }, viewerClose: { position: 'absolute', top: 45, right: 18 },
  replyQuote: { alignSelf: 'flex-start', maxWidth: '100%', marginBottom: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 5, borderLeftWidth: 3 }, replyQuoteName: { fontSize: 11, fontWeight: '800' }, replyQuoteText: { fontSize: 13, marginTop: 1 }, replyQuoteMedia: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }, replyQuoteThumb: { width: 34, height: 34, borderRadius: 5, backgroundColor: 'rgba(127,127,127,.2)' },
  reactionSummary: { marginTop: 3, gap: 4, paddingHorizontal: 2 }, reactionSummaryChip: { minHeight: 24, paddingHorizontal: 8, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }, reactionSummaryCount: { fontSize: 12, fontWeight: '700' },
  replyBar: { minHeight: 48, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, replyBarLabel: { fontSize: 11, fontWeight: '800' }, replyBarPreview: { fontSize: 13, marginTop: 1 },
  msgActions: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: StyleSheet.hairlineWidth, overflow: 'hidden' }, msgActionsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 16 }, msgActionsName: { fontSize: 14, fontWeight: '800' }, msgActionsMeta: { fontSize: 11, marginTop: 2 }, msgActionsEmoji: { alignItems: 'center', justifyContent: 'center', paddingVertical: 18 }, msgActionsPreview: { fontSize: 16, paddingHorizontal: 18, paddingVertical: 12, textAlign: 'center' }, msgActionsReactions: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 6 }, msgActionsReactionChip: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' }, msgActionsList: { borderTopWidth: StyleSheet.hairlineWidth, paddingBottom: 10 }, msgAction: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 15 }, msgActionText: { fontSize: 15, fontWeight: '600' },
  confirmBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(7,9,9,.55)', padding: 26 }, confirmSheet: { width: '100%', maxWidth: 380, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 22, paddingTop: 26, paddingBottom: 18, alignItems: 'center', gap: 4 }, confirmIcon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }, confirmTitle: { fontSize: 17, fontWeight: '800', marginTop: 4 }, confirmText: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 5, marginBottom: 10 }, confirmActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14 },   confirmButton: { flex: 1, height: 46, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' }, confirmButtonDanger: { borderWidth: 0 }, confirmButtonText: { fontSize: 15, fontWeight: '600' },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 124, alignItems: 'center', zIndex: 20 }, toast: { maxWidth: '86%', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 }, toastText: { fontSize: 13, fontWeight: '600' },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,.28)' }, sheet: { minHeight: 360, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }, tabs: { height: 52, flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth }, tab: { flex: 1, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' }, familyTabs: { marginHorizontal: 12, marginTop: 8, flexDirection: 'row', gap: 4 }, familyTab: { flex: 1, alignItems: 'center', paddingVertical: 7, borderWidth: 1, borderRadius: 9 }, pickerSearch: { height: 45, marginHorizontal: 12, marginTop: 10, paddingHorizontal: 11, borderWidth: 1, borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 8 }, pickerContent: { padding: 12, paddingBottom: 24 }, pickerTitle: { marginBottom: 9, marginTop: 4, fontSize: 10, fontWeight: '800', letterSpacing: 1 }, pickerState: { paddingVertical: 60, textAlign: 'center', fontSize: 13 },   emojiGrid: { flexDirection: 'row', flexWrap: 'wrap' }, emojiCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }, emojiCellFlat: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }, emojiText: { fontSize: 26 }, giphyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 }, giphyCell: { width: '49%', height: 120, overflow: 'hidden', borderRadius: 8, backgroundColor: 'rgba(127,127,127,.15)' }, giphyImage: { width: '100%', height: '100%' },
  searchOverlay: { maxHeight: 320, borderBottomWidth: StyleSheet.hairlineWidth }, searchBar: { height: 42, marginHorizontal: 12, marginVertical: 10, borderWidth: 1, borderRadius: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, gap: 8 }, searchInput: { flex: 1, fontSize: 15 }, searchList: { paddingHorizontal: 10, paddingBottom: 12 }, searchHint: { textAlign: 'center', fontSize: 13, paddingVertical: 26 }, searchResult: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 7, paddingHorizontal: 11, paddingVertical: 9, marginBottom: 6 }, searchResultText: { fontSize: 14, lineHeight: 19 }, searchResultMeta: { fontSize: 11, marginTop: 3 },
});
