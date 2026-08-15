import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RTCView } from 'react-native-webrtc';
import { api } from '@/api';
import { useCallSession, type CallEndReason, type CallKind, type CallSession } from '@/calls';
import { useI18n } from '@/i18n';
import { playCallRingtone, stopCallRingtone } from '@/sounds';
import { Avatar } from '@/ui';
import type { User } from '@/types';

type MCIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface CallRequest {
  type: CallKind;
  incoming?: boolean;
  conversationId: string;
  peerId: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
}

interface CallControllerValue {
  active: CallRequest | null;
  minimized: boolean;
  startCall: (request: CallRequest) => void;
  minimize: () => void;
  restore: () => void;
}

const CallContext = createContext<CallControllerValue | null>(null);

const CONTROLS: { id: string; icon: MCIconName; iconOff?: MCIconName }[] = [
  { id: 'mute', icon: 'microphone', iconOff: 'microphone-off' },
  { id: 'speaker', icon: 'volume-high', iconOff: 'volume-variant-off' },
];

function formatTime(total: number) {
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

const END_REASON_KEYS: Record<CallEndReason, string> = {
  self: 'callEnded',
  remote: 'callEnded',
  declined: 'callDeclined',
  busy: 'callBusy',
  missed: 'callMissed',
  'no-answer': 'callNoAnswer',
  failed: 'callFailed',
};

function PulseRings() {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(progress, { toValue: 1, duration: 1800, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [progress]);
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  return (
    <View style={styles.pulseWrap}>
      {[0, 1].map((i) => (
        <Animated.View key={i} style={[styles.pulseRing, { transform: [{ scale }], opacity, margin: -16 * (i + 1) * 0.9 }]} />
      ))}
    </View>
  );
}

function CallOverlay({ request, session, peerName, peerAvatar, onMinimize }: {
  request: CallRequest;
  session: CallSession;
  peerName: string;
  peerAvatar: string;
  onMinimize: () => void;
}) {
  const { t } = useI18n();
  const isVideo = request.type === 'video';
  const incoming = request.incoming === true;

  const remoteVisible = session.remoteStream && session.videoOn;
  const localVisible = session.localStream && session.videoOn;

  const toggle = (control: (typeof CONTROLS)[number]) => {
    if (control.id === 'mute') session.toggleMute();
    else if (control.id === 'speaker') session.toggleSpeaker();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={['#0B1026', '#1A1B4B', '#2D2A5E']} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[styles.glow, { top: -120, right: -90, width: 320, height: 320, backgroundColor: isVideo ? 'rgba(80,120,255,0.25)' : 'rgba(120,80,255,0.28)' }]} />
      <View pointerEvents="none" style={[styles.glow, { bottom: -140, left: -110, width: 360, height: 360, backgroundColor: isVideo ? 'rgba(0,210,255,0.18)' : 'rgba(255,120,220,0.16)' }]} />

      <View style={styles.topBar}>
        <View style={styles.brand}><MaterialCommunityIcons name={isVideo ? 'video' : 'phone'} size={15} color="#9AA3FF" /><Text style={styles.brandText}>XYTEEE {isVideo ? 'Video' : 'Audio'} {t('call')}</Text></View>
        {session.phase === 'active' ? <Pressable hitSlop={10} onPress={onMinimize} style={styles.minimizeBtn}><MaterialCommunityIcons name="chevron-down" size={26} color="#FFFFFF" /></Pressable> : <View style={styles.minimizeBtn} />}
      </View>

      <View style={styles.body}>
        {isVideo ? (
          <View style={styles.videoStage}>
            {remoteVisible ? (
              <RTCView streamURL={session.remoteStream!.toURL()} objectFit="cover" style={StyleSheet.absoluteFill} zOrder={0} />
            ) : (
              <LinearGradient colors={['#232B63', '#3B3B7A', '#2A2A5E']} style={StyleSheet.absoluteFill} />
            )}
            {!remoteVisible ? (
              <View style={styles.videoFallback}>
                <View style={styles.videoAvatar}><Avatar name={peerName} uri={peerAvatar || null} size={120} /></View>
                <Text style={styles.videoName}>{peerName || '…'}</Text>
                <Text style={styles.videoHint}>{session.phase === 'ringing' ? (incoming ? t('incomingCall') : t('ringing')) : session.phase === 'active' ? formatTime(session.seconds) : session.phase === 'ended' ? t(END_REASON_KEYS[session.endReason ?? 'remote']) : t('connecting')}</Text>
              </View>
            ) : null}
            {localVisible ? (
              <View style={styles.localPip}>
                <RTCView streamURL={session.localStream!.toURL()} mirror objectFit="cover" style={StyleSheet.absoluteFill} zOrder={1} />
                <Text style={styles.pipText}>{t('you')}</Text>
              </View>
            ) : null}
            {session.phase === 'ringing' ? (
              <View style={styles.ringingBadge}><ActivityIndicator size="small" color="#9AA3FF" /><Text style={styles.status}>{incoming ? t('incomingCall') : t('ringing')}</Text></View>
            ) : null}
          </View>
        ) : (
          <View style={styles.audioBody}>
            <View style={styles.avatarWrap}>
              {incoming && session.phase === 'ringing' ? <PulseRings /> : null}
              <View style={styles.avatarRing}><Avatar name={peerName} uri={peerAvatar || null} size={120} online /></View>
            </View>
            <Text style={styles.name}>{peerName || '…'}</Text>
            {session.phase === 'ringing' ? (
              <View style={styles.ringing}><ActivityIndicator size="small" color="#9AA3FF" /><Text style={styles.status}>{incoming ? t('incomingCall') : t('ringing')}</Text></View>
            ) : (
              <Text style={[styles.status, styles.timer]}>{formatTime(session.seconds)}</Text>
            )}
          </View>
        )}
      </View>

      {session.phase === 'ended' ? (
        <View style={styles.controls}><Text style={styles.endedText}>{t(END_REASON_KEYS[session.endReason ?? 'remote'])}</Text>{session.seconds > 0 ? <Text style={styles.endedTime}>{formatTime(session.seconds)}</Text> : null}</View>
      ) : incoming && session.phase === 'ringing' ? (
        <View style={styles.controls}>
          <View style={styles.endRow}>
            <Pressable onPress={session.decline} style={styles.declineBtn}><MaterialCommunityIcons name="phone-hangup" size={30} color="#FFFFFF" /></Pressable>
            <Pressable onPress={session.answer} style={styles.answerBtn}><MaterialCommunityIcons name="phone" size={30} color="#FFFFFF" /></Pressable>
          </View>
          <Text style={styles.dialingHint}>{t('incomingCallHint')}</Text>
        </View>
      ) : (
        <View style={styles.controls}>
          <View style={styles.controlRow}>
            {CONTROLS.map((control) => {
              const on = control.id === 'mute' ? !session.muted : session.speaker;
              return (
                <Pressable key={control.id} onPress={() => toggle(control)} style={[styles.controlBtn, { backgroundColor: on ? 'rgba(255,255,255,0.14)' : 'rgba(255,90,90,0.28)', borderColor: on ? 'rgba(255,255,255,0.16)' : 'rgba(255,90,90,0.35)' }]}>
                  <MaterialCommunityIcons name={on ? control.icon : control.iconOff!} size={26} color={on ? '#FFFFFF' : '#FF8A8A'} />
                </Pressable>
              );
            })}
            {isVideo ? (
              <>
                <Pressable onPress={session.toggleVideo} style={[styles.controlBtn, { backgroundColor: session.videoOn ? 'rgba(255,255,255,0.14)' : 'rgba(255,90,90,0.28)', borderColor: session.videoOn ? 'rgba(255,255,255,0.16)' : 'rgba(255,90,90,0.35)' }]}>
                  <MaterialCommunityIcons name={session.videoOn ? 'video' : 'video-off'} size={26} color={session.videoOn ? '#FFFFFF' : '#FF8A8A'} />
                </Pressable>
                <Pressable onPress={session.flipCamera} style={[styles.controlBtn, { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.16)' }]}>
                  <MaterialCommunityIcons name="camera-flip" size={26} color="#FFFFFF" />
                </Pressable>
              </>
            ) : null}
          </View>
          <Pressable onPress={session.hangUp} style={styles.endBtn}><MaterialCommunityIcons name="phone-hangup" size={32} color="#FFFFFF" /></Pressable>
          {session.phase === 'ringing' ? <Text style={styles.dialingHint}>{t('callingHint')}</Text> : null}
        </View>
      )}
    </SafeAreaView>
  );
}

function CallPill({ request, session, peerName, peerAvatar, onRestore }: {
  request: CallRequest;
  session: CallSession;
  peerName: string;
  peerAvatar: string;
  onRestore: () => void;
}) {
  const { t } = useI18n();
  const isVideo = request.type === 'video';

  return (
    <Pressable onPress={onRestore} style={styles.pill}>
      <View style={[styles.pillAvatar, { backgroundColor: isVideo ? 'rgba(80,120,255,0.2)' : 'rgba(120,80,255,0.2)' }]}>
        {isVideo && session.remoteStream && session.videoOn ? (
          <RTCView streamURL={session.remoteStream!.toURL()} objectFit="cover" style={StyleSheet.absoluteFill} />
        ) : (
          <Avatar name={peerName} uri={peerAvatar || null} size={44} />
        )}
      </View>
      <View style={styles.pillCopy}>
        <Text numberOfLines={1} style={styles.pillName}>{peerName || '…'}</Text>
        <Text style={styles.pillTime}>{session.phase === 'active' ? formatTime(session.seconds) : session.phase === 'ringing' ? (request.incoming ? t('incomingCall') : t('ringing')) : t('callEnded')}</Text>
      </View>
      <View style={styles.pillBadge}><MaterialCommunityIcons name={isVideo ? 'video' : 'phone'} size={15} color="#FFFFFF" /></View>
    </Pressable>
  );
}

export function CallProvider({ children }: PropsWithChildren) {
  const [active, setActive] = useState<CallRequest | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [peerUser, setPeerUser] = useState<User | null>(null);

  const request = active ?? {
    type: 'audio' as CallKind,
    incoming: false,
    conversationId: '',
    peerId: '',
    name: '',
    username: '',
    avatarUrl: '',
  };
  const session = useCallSession(request.conversationId, request.peerId, request.type, request.incoming === true);

  const startCall = useCallback((call: CallRequest) => {
    if (active) {
      if (active.conversationId === call.conversationId && active.incoming === call.incoming) return;
      return;
    }
    setActive(call);
    setMinimized(false);
    setPeerUser(null);
  }, [active]);

  const minimize = useCallback(() => setMinimized(true), []);
  const restore = useCallback(() => setMinimized(false), []);

  useEffect(() => {
    if (!active) return;
    let disposed = false;
    void api.presence(active.peerId).then((user) => { if (!disposed) setPeerUser(user); }).catch(() => undefined);
    return () => { disposed = true; };
  }, [active]);

  useEffect(() => {
    if (!active || session.phase !== 'ringing') {
      stopCallRingtone();
    } else {
      playCallRingtone(active.incoming ? 'incoming' : 'cellular');
    }
    return () => stopCallRingtone();
  }, [active, session, session?.phase, active?.incoming]);

  useEffect(() => {
    if (active && session && session.phase === 'ended') {
      const timer = setTimeout(() => setActive(null), 900);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [active, session, session?.phase]);

  const peerName = (active?.name || peerUser?.displayName || peerUser?.username || '') || '';
  const peerAvatar = (active?.avatarUrl || peerUser?.avatarUrl || '') || '';

  return (
    <CallContext.Provider value={{ active, minimized, startCall, minimize, restore }}>
      {children}
      {active && !minimized ? <View pointerEvents="auto" style={[StyleSheet.absoluteFill, styles.overlayLayer]}><CallOverlay request={active} session={session} peerName={peerName} peerAvatar={peerAvatar} onMinimize={minimize} /></View> : null}
      {active && minimized ? <CallPill request={active} session={session} peerName={peerName} peerAvatar={peerAvatar} onRestore={restore} /> : null}
    </CallContext.Provider>
  );
}

export function useCallController() {
  const value = useContext(CallContext);
  if (!value) throw new Error('useCallController must be used inside CallProvider');
  return value;
}

const styles = StyleSheet.create({
  overlayLayer: { zIndex: 1000 },
  safe: { flex: 1 },
  glow: { position: 'absolute', borderRadius: 999 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 8, height: 48 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 6 }, brandText: { color: '#9AA3FF', fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  minimizeBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', opacity: 0.85 },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  videoStage: { flex: 1, alignSelf: 'stretch', marginHorizontal: 14, marginTop: 6, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 14 },
  videoFallback: { alignItems: 'center', gap: 12 },
  videoAvatar: {},
  videoName: { color: '#EAF0FF', fontSize: 22, fontWeight: '800' },
  videoHint: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '600' },
  localPip: { position: 'absolute', top: 14, right: 14, width: 96, height: 128, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  pipText: { position: 'absolute', bottom: 6, color: '#FFFFFF', fontSize: 10, fontWeight: '800', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  ringingBadge: { position: 'absolute', bottom: 22, flexDirection: 'row', alignItems: 'center', gap: 8 },
  audioBody: { alignItems: 'center', gap: 14 },
  avatarWrap: { alignItems: 'center', justifyContent: 'center' },
  pulseWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.08)' },
  avatarRing: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 999, padding: 4, backgroundColor: 'rgba(0,0,0,0.3)' },
  name: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', marginTop: 4 },
  ringing: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  status: { color: '#9AA3FF', fontSize: 15, fontWeight: '700' },
  timer: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', letterSpacing: 1, fontVariant: ['tabular-nums'] },
  controls: { paddingHorizontal: 22, paddingBottom: 26, alignItems: 'center', gap: 18 },
  controlRow: { flexDirection: 'row', gap: 22, alignItems: 'center' },
  controlBtn: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  endRow: { flexDirection: 'row', alignItems: 'center', gap: 46 },
  endBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', shadowColor: '#EF4444', shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  answerBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', shadowColor: '#22C55E', shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  declineBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', shadowColor: '#EF4444', shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  dialingHint: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },
  endedText: { color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '700' },
  endedTime: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: 1, fontVariant: ['tabular-nums'] },
  pill: { position: 'absolute', bottom: 24, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(20,24,60,0.96)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 26, padding: 6, paddingRight: 16, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 12, zIndex: 1000 },
  pillAvatar: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  pillCopy: { maxWidth: 140 },
  pillName: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  pillTime: { color: '#9AA3FF', fontSize: 11, fontWeight: '700', marginTop: 1 },
  pillBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#3D3A7A', alignItems: 'center', justifyContent: 'center' },
});
