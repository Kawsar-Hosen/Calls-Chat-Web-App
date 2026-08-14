import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RTCView } from 'react-native-webrtc';
import { api } from '@/api';
import { useCallSession } from '@/calls';
import { useI18n } from '@/i18n';
import { playCallRingtone, stopCallRingtone } from '@/sounds';
import { Avatar } from '@/ui';
import type { User } from '@/types';

type MCIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const CONTROLS: { id: string; icon: MCIconName; iconOff?: MCIconName }[] = [
  { id: 'mute', icon: 'microphone', iconOff: 'microphone-off' },
  { id: 'speaker', icon: 'volume-high', iconOff: 'volume-variant-off' },
];

export default function CallScreen() {
  const params = useLocalSearchParams<{ type?: string; incoming?: string; id?: string; peerId?: string; name?: string; username?: string; avatarUrl?: string }>();
  const isVideo = params.type === 'video';
  const incoming = params.incoming === '1';
  const conversationId = params.id ?? '';
  const peerId = params.peerId ?? '';
  const router = useRouter();
  const { t } = useI18n();

  const [peerUser, setPeerUser] = useState<User | null>(null);

  useEffect(() => {
    if (!peerId) return;
    let disposed = false;
    void api.presence(peerId).then((user) => { if (!disposed) setPeerUser(user); }).catch(() => undefined);
    return () => { disposed = true; };
  }, [peerId]);

  const peerName = params.name || peerUser?.displayName || peerUser?.username || '';
  const peerAvatar = params.avatarUrl || peerUser?.avatarUrl || '';

  const session = useCallSession(conversationId, peerId, isVideo ? 'video' : 'audio', incoming);

  useEffect(() => {
    if (session.phase === 'ringing') {
      playCallRingtone(incoming ? 'incoming' : 'cellular');
    } else {
      stopCallRingtone();
    }
    return () => stopCallRingtone();
  }, [session.phase, incoming]);

  useEffect(() => {
    if (session.phase === 'ended') {
      const timer = setTimeout(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }, 900);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [session.phase, router]);

  const formatTime = (total: number) => {
    const minutes = Math.floor(total / 60);
    const remaining = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
  };

  if (!conversationId || !peerId) {
    return (
      <SafeAreaView style={styles.safe}>
        <LinearGradient colors={['#0B1026', '#1A1B4B', '#2D2A5E']} style={StyleSheet.absoluteFill} />
        <View style={styles.centerError}>
          <MaterialCommunityIcons name="phone-off" size={42} color="#8B93C4" />
          <Text style={{ color: '#EAF0FF', fontSize: 16, fontWeight: '700', marginTop: 10 }}>{t('callUnavailable')}</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}><Text style={{ color: '#0B1026', fontWeight: '800' }}>{t('back')}</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const remoteVisible = session.remoteStream && session.videoOn;
  const localVisible = session.localStream && session.videoOn;

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={['#0B1026', '#1A1B4B', '#2D2A5E']} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[styles.glow, { top: -120, right: -90, width: 320, height: 320, backgroundColor: isVideo ? 'rgba(80,120,255,0.25)' : 'rgba(120,80,255,0.28)' }]} />
      <View pointerEvents="none" style={[styles.glow, { bottom: -140, left: -110, width: 360, height: 360, backgroundColor: isVideo ? 'rgba(0,210,255,0.18)' : 'rgba(255,120,220,0.16)' }]} />

      <View style={styles.topBar}>
        <View style={styles.brand}><MaterialCommunityIcons name={isVideo ? 'video' : 'phone'} size={15} color="#9AA3FF" /><Text style={styles.brandText}>XYTEEE {isVideo ? 'Video' : 'Audio'} {t('call')}</Text></View>
        <Pressable hitSlop={10} onPress={() => router.back()} style={styles.minimizeBtn}><MaterialCommunityIcons name="chevron-down" size={26} color="#FFFFFF" /></Pressable>
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
                <Text style={styles.videoName}>{peerName}</Text>
                {session.phase !== 'active' ? <Text style={styles.videoHint}>{incoming ? t('incomingCall') : t('ringing')}</Text> : <Text style={styles.videoHint}>{t('connecting')}</Text>}
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
            <View style={styles.avatarRing}><Avatar name={peerName} uri={peerAvatar || null} size={120} online /></View>
            <Text style={styles.name}>{peerName || '…'}</Text>
            {session.phase === 'ringing' ? (
              <View style={styles.ringing}><ActivityIndicator size="small" color="#9AA3FF" /><Text style={styles.status}>{incoming ? t('incomingCall') : t('ringing')}</Text></View>
            ) : (
              <Text style={[styles.status, styles.timer]}>{formatTime(session.seconds)}</Text>
            )}
          </View>
        )}

        {session.phase === 'active' ? (
          <View style={styles.statusRow}><Text style={[styles.status, styles.timer]}>{formatTime(session.seconds)}</Text></View>
        ) : null}
      </View>

      {session.phase === 'ended' ? (
        <View style={styles.controls}><Text style={styles.endedText}>{t('callEnded')}</Text></View>
      ) : incoming && session.phase === 'ringing' ? (
        <View style={styles.controls}>
          <View style={styles.endRow}>
            <Pressable onPress={session.decline} style={styles.declineBtn}><MaterialCommunityIcons name="phone-hangup" size={30} color="#FFFFFF" /></Pressable>
            <Pressable onPress={session.answer} style={styles.answerBtn}><MaterialCommunityIcons name="phone" size={30} color="#FFFFFF" /></Pressable>
          </View>
          <Text style={styles.dialingHint}>{t('incomingCallHint')}</Text>
        </View>
      ) : session.phase === 'ringing' ? (
        <View style={styles.controls}>
          <View style={styles.controlRow}>
            {CONTROLS.map((control) => {
              const on = control.id === 'mute' ? !session.muted : session.speaker;
              return (
                <Pressable key={control.id} onPress={() => (control.id === 'mute' ? session.toggleMute() : session.toggleSpeaker())} style={[styles.controlBtn, { backgroundColor: on ? 'rgba(255,255,255,0.14)' : 'rgba(255,90,90,0.28)', borderColor: on ? 'rgba(255,255,255,0.16)' : 'rgba(255,90,90,0.35)' }]}>
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
            ) : (
              <Pressable style={[styles.controlBtn, { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.16)' }]}>
                <MaterialCommunityIcons name="dialpad" size={26} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
          <Pressable onPress={session.hangUp} style={styles.endBtn}><MaterialCommunityIcons name="phone-hangup" size={32} color="#FFFFFF" /></Pressable>
          <Text style={styles.dialingHint}>{t('callingHint')}</Text>
        </View>
      ) : (
        <View style={styles.controls}>
          <View style={styles.controlRow}>
            {CONTROLS.map((control) => {
              const on = control.id === 'mute' ? !session.muted : session.speaker;
              return (
                <Pressable key={control.id} onPress={() => (control.id === 'mute' ? session.toggleMute() : session.toggleSpeaker())} style={[styles.controlBtn, { backgroundColor: on ? 'rgba(255,255,255,0.14)' : 'rgba(255,90,90,0.28)', borderColor: on ? 'rgba(255,255,255,0.16)' : 'rgba(255,90,90,0.35)' }]}>
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
            ) : (
              <Pressable style={[styles.controlBtn, { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.16)' }]}>
                <MaterialCommunityIcons name="dialpad" size={26} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
          <Pressable onPress={session.hangUp} style={styles.endBtn}><MaterialCommunityIcons name="phone-hangup" size={32} color="#FFFFFF" /></Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  glow: { position: 'absolute', borderRadius: 999 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 8, height: 48 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 6 }, brandText: { color: '#9AA3FF', fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  minimizeBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', opacity: 0.85 },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  videoStage: { flex: 1, alignSelf: 'stretch', marginHorizontal: 14, marginTop: 6, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 14 },
  videoFallback: { alignItems: 'center', gap: 12 },
  videoAvatar: { },
  videoName: { color: '#EAF0FF', fontSize: 22, fontWeight: '800' },
  videoHint: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '600' },
  localPip: { position: 'absolute', top: 14, right: 14, width: 96, height: 128, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  pipText: { position: 'absolute', bottom: 6, color: '#FFFFFF', fontSize: 10, fontWeight: '800', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  ringingBadge: { position: 'absolute', bottom: 22, flexDirection: 'row', alignItems: 'center', gap: 8 },
  audioBody: { alignItems: 'center', gap: 14 },
  avatarRing: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 999, padding: 4 },
  name: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', marginTop: 4 },
  statusRow: { marginTop: 26, alignItems: 'center', minHeight: 26 },
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
  centerError: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  backBtn: { marginTop: 6, backgroundColor: '#EAF0FF', paddingHorizontal: 22, paddingVertical: 10, borderRadius: 20 },
});
