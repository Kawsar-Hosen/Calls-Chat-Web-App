import { useCallback, useEffect, useRef, useState } from 'react';
import { mediaDevices, RTCPeerConnection, RTCSessionDescription, type MediaStream, type RTCIceCandidate } from 'react-native-webrtc';
import { setAudioModeAsync } from 'expo-audio';
import { api } from '@/api';
import { useSocket } from '@/socket';

export type CallKind = 'audio' | 'video';
export type CallPhase = 'ringing' | 'active' | 'ended';
export type CallEndReason = 'self' | 'remote' | 'declined' | 'busy' | 'missed' | 'no-answer' | 'failed';

let activeCallConversation: string | null = null;

export function isOnCall(conversationId?: string): boolean {
  return conversationId ? activeCallConversation === conversationId : activeCallConversation !== null;
}

export interface PendingOffer {
  conversationId: string;
  callerId: string;
  sdp: string;
  kind: CallKind;
}

let pendingOffer: PendingOffer | null = null;

export function storePendingOffer(offer: PendingOffer): void {
  pendingOffer = offer;
}

export function takePendingOffer(conversationId: string): PendingOffer | null {
  const offer = pendingOffer && pendingOffer.conversationId === conversationId ? pendingOffer : null;
  if (offer) pendingOffer = null;
  return offer;
}

export interface CallSession {
  phase: CallPhase;
  endReason: CallEndReason | null;
  seconds: number;
  muted: boolean;
  speaker: boolean;
  videoOn: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  answer: () => void;
  decline: () => void;
  hangUp: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  toggleVideo: () => void;
  flipCamera: () => void;
}

const RING_TIMEOUT_MS = 45_000;

export function useCallSession(conversationId: string, peerId: string, kind: CallKind, incoming: boolean): CallSession {
  const { subscribe, send } = useSocket();
  const [phase, setPhase] = useState<CallPhase>('ringing');
  const [endReason, setEndReason] = useState<CallEndReason | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [videoOn, setVideoOn] = useState(kind === 'video');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteDescSet = useRef(false);
  const iceBuffer = useRef<RTCIceCandidate[]>([]);
  const endedRef = useRef(false);
  const startedAtRef = useRef(0);
  const activeAtRef = useRef<number | null>(null);

  const endLocal = useCallback((reason: CallEndReason) => {
    if (endedRef.current) return;
    endedRef.current = true;
    activeAtRef.current = null;
    setPhase('ended');
    setEndReason(reason);
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    activeCallConversation = null;
    setAudioModeAsync({ shouldRouteThroughEarpiece: false, playsInSilentMode: true, allowsRecording: false }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!conversationId || !peerId) return;
    activeCallConversation = conversationId;
    endedRef.current = false;
    remoteDescSet.current = false;
    iceBuffer.current = [];
    startedAtRef.current = 0;
    activeAtRef.current = null;
    setPhase('ringing');
    setEndReason(null);
    setSeconds(0);
    setMuted(false);
    setSpeaker(true);
    setVideoOn(kind === 'video');
    setLocalStream(null);
    setRemoteStream(null);
    let disposed = false;

    const markActive = () => {
      if (endedRef.current || disposed) return;
      if (activeAtRef.current == null) {
        activeAtRef.current = Date.now();
        startedAtRef.current = Date.now();
        setSeconds(0);
      }
      setPhase('active');
    };

    const flushIce = () => {
      if (!pcRef.current || !remoteDescSet.current) return;
      while (iceBuffer.current.length) {
        const candidate = iceBuffer.current.shift();
        if (candidate) {
          try { pcRef.current.addIceCandidate(candidate); } catch {}
        }
      }
    };

    const createPeer = async () => {
      let iceServers: { urls: string[]; username?: string; credential?: string }[] = [{ urls: ['stun:stun.cloudflare.com:3478'] }];
      try {
        const credentials = await api.turnCredentials();
        if (credentials?.iceServers?.length) iceServers = credentials.iceServers;
      } catch { /* fall back to public STUN */ }
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      pc.onicecandidate = (event: any) => {
        if (event.candidate) {
          send({ type: 'call.ice', conversation_id: conversationId, candidate: event.candidate.toJSON() });
        }
      };
      pc.ontrack = (event: any) => {
        const stream = event.streams[0] as MediaStream | undefined;
        if (stream) setRemoteStream(stream);
        markActive();
      };
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') markActive();
        if (pc.iceConnectionState === 'failed') {
          if (!disposed && activeAtRef.current != null) endLocal('failed');
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') markActive();
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          if (!disposed && activeAtRef.current != null) endLocal('failed');
        }
      };

      let stream: MediaStream;
      try {
        stream = await mediaDevices.getUserMedia({
          audio: true,
          video: kind === 'video' ? { facingMode: 'user', width: 640, height: 480 } : false,
        });
      } catch {
        if (!disposed) endLocal('failed');
        return;
      }
      if (disposed) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      setAudioModeAsync({ shouldRouteThroughEarpiece: false, playsInSilentMode: true, allowsRecording: true }).catch(() => {});

      if (!incoming) {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          send({ type: 'call.offer', conversation_id: conversationId, sdp: offer.sdp ?? '', kind });
        } catch {
          if (!disposed) endLocal('failed');
        }
      } else {
        let pending = takePendingOffer(conversationId);
        if (!pending) {
          try {
            const fetched = await api.pendingCall();
            if (fetched && fetched.conversation_id === conversationId) {
              pending = { conversationId: fetched.conversation_id, callerId: fetched.caller_id, sdp: fetched.sdp, kind: (fetched.kind as CallKind | undefined) ?? 'audio' };
            }
          } catch { /* ignore */ }
        }
        if (pending) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: pending.sdp }));
            remoteDescSet.current = true;
            flushIce();
          } catch {
            if (!disposed) endLocal('failed');
          }
        } else if (!disposed) {
          try { send({ type: 'call.decline', conversation_id: conversationId, reason: 'missed' }); } catch {}
          endLocal('missed');
        }
      }
    };

    void createPeer();

    const unsubscribe = subscribe((event) => {
      if (!('conversationId' in event)) return;
      if (event.conversationId !== conversationId) return;
      if (event.type === 'call.answer' && !incoming) {
        if (event.sdp && !remoteDescSet.current) {
          remoteDescSet.current = true;
          pcRef.current?.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: event.sdp })).then(() => {
            flushIce();
            markActive();
          }).catch(() => {
            if (!disposed) endLocal('failed');
          });
        }
      } else if (event.type === 'call.ice') {
        const candidate = event.candidate as RTCIceCandidate;
        if (remoteDescSet.current) {
          try { pcRef.current?.addIceCandidate(candidate); } catch {}
        } else {
          iceBuffer.current.push(candidate);
        }
      } else if (event.type === 'call.hangup') {
        if (!disposed) endLocal(activeAtRef.current != null ? 'remote' : 'missed');
      } else if (event.type === 'call.decline') {
        if (!disposed) endLocal(event.reason === 'busy' ? 'busy' : (event.reason === 'no-answer' || event.reason === 'missed') ? 'no-answer' : 'declined');
      }
    });

    return () => {
      disposed = true;
      unsubscribe();
      if (activeCallConversation === conversationId) activeCallConversation = null;
      try { pcRef.current?.close(); } catch {}
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    };
  }, [conversationId, peerId, kind, incoming, endLocal]);

  useEffect(() => {
    if (phase !== 'active') return;
    const tick = () => {
      if (activeAtRef.current != null) {
        setSeconds(Math.max(0, Math.floor((Date.now() - activeAtRef.current) / 1000)));
      }
    };
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [phase]);

  const answer = useCallback(() => {
    if (!conversationId || !pcRef.current || endedRef.current) return;
    void (async () => {
      try {
        const answerDescription = await pcRef.current?.createAnswer();
        if (!answerDescription) {
          endLocal('failed');
          return;
        }
        await pcRef.current?.setLocalDescription(answerDescription);
        send({ type: 'call.answer', conversation_id: conversationId, sdp: answerDescription.sdp ?? '' });
      } catch {
        endLocal('failed');
      }
    })();
  }, [conversationId, send, endLocal]);

  const decline = useCallback(() => {
    if (!conversationId || endedRef.current) return;
    try { send({ type: 'call.decline', conversation_id: conversationId, reason: 'declined' }); } catch {}
    endLocal('self');
  }, [conversationId, send, endLocal]);

  const hangUp = useCallback(() => {
    if (!conversationId || endedRef.current) return;
    try { send({ type: 'call.hangup', conversation_id: conversationId }); } catch {}
    endLocal('self');
  }, [conversationId, send, endLocal]);

  const toggleMute = useCallback(() => {
    setMuted((value) => {
      const next = !value;
      const track = localStreamRef.current?.getAudioTracks()[0];
      if (track) track.enabled = !next;
      return next;
    });
  }, []);

  const toggleSpeaker = useCallback(() => {
    setSpeaker((value) => {
      const next = !value;
      setAudioModeAsync({ shouldRouteThroughEarpiece: !next }).catch(() => {});
      return next;
    });
  }, []);

  const toggleVideo = useCallback(() => {
    setVideoOn((value) => {
      const next = !value;
      const track = localStreamRef.current?.getVideoTracks()[0];
      if (track) track.enabled = next;
      return next;
    });
  }, []);

  const facingRef = useRef<'user' | 'environment'>('user');

  const flipCamera = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream || !pcRef.current) return;
    const next = facingRef.current === 'user' ? 'environment' : 'user';
    facingRef.current = next;
    try {
      const swapped = await mediaDevices.getUserMedia({ audio: false, video: { facingMode: next, width: 640, height: 480 } });
      const newVideo = swapped.getVideoTracks()[0];
      const oldVideo = stream.getVideoTracks()[0];
      if (oldVideo) {
        try { stream.removeTrack(oldVideo); } catch {}
        try { oldVideo.stop(); } catch {}
      }
      if (newVideo) {
        stream.addTrack(newVideo);
        if (!videoOn) newVideo.enabled = false;
        const sender = (await pcRef.current.getSenders()).find((s) => s.track?.kind === 'video');
        if (sender) { try { pcRef.current.removeTrack(sender); } catch {} }
        pcRef.current.addTrack(newVideo, stream);
      }
    } catch {}
  }, [videoOn]);

  useEffect(() => {
    if (phase !== 'ringing') return;
    const timer = setTimeout(() => {
      if (incoming) {
        if (!endedRef.current) {
          try { send({ type: 'call.decline', conversation_id: conversationId, reason: 'missed' }); } catch {}
          endLocal('missed');
        }
      } else if (!endedRef.current) {
        try { send({ type: 'call.hangup', conversation_id: conversationId }); } catch {}
        endLocal('no-answer');
      }
    }, RING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [phase, incoming, conversationId, send, endLocal]);

  return { phase, endReason, seconds, muted, speaker, videoOn, localStream, remoteStream, answer, decline, hangUp, toggleMute, toggleSpeaker, toggleVideo, flipCamera };
}
