import { useCallback, useEffect, useRef, useState } from 'react';
import { mediaDevices, RTCPeerConnection, RTCSessionDescription, type MediaStream, type RTCIceCandidate } from 'react-native-webrtc';
import { api } from '@/api';
import { useSocket } from '@/socket';

export type CallKind = 'audio' | 'video';
export type CallPhase = 'ringing' | 'active' | 'ended';

let activeCallConversation: string | null = null;

export function isOnCall(conversationId?: string): boolean {
  return conversationId ? activeCallConversation === conversationId : activeCallConversation !== null;
}

export interface PendingOffer {
  conversationId: string;
  callerId: string;
  sdp: string;
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

export function useCallSession(conversationId: string, peerId: string, kind: CallKind, incoming: boolean): CallSession {
  const { subscribe, send } = useSocket();
  const [phase, setPhase] = useState<CallPhase>('ringing');
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

  useEffect(() => {
    if (phase !== 'active') return;
    const interval = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const endLocal = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setPhase('ended');
    try { pcRef.current?.close(); } catch { /* ignore */ }
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    activeCallConversation = null;
  }, []);

  useEffect(() => {
    activeCallConversation = conversationId;
    let disposed = false;

    const flushIce = () => {
      if (!pcRef.current || !remoteDescSet.current) return;
      while (iceBuffer.current.length) {
        const candidate = iceBuffer.current.shift();
        if (candidate) {
          try { void pcRef.current.addIceCandidate(candidate); } catch { /* ignore */ }
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
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') setPhase('active');
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected') {
          if (!disposed) endLocal();
        }
      };

      let stream: MediaStream;
      try {
        stream = await mediaDevices.getUserMedia({
          audio: true,
          video: kind === 'video' ? { facingMode: 'user', width: 640, height: 480 } : false,
        });
      } catch {
        if (!disposed) endLocal();
        return;
      }
      if (disposed) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      if (!incoming) {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          send({ type: 'call.offer', conversation_id: conversationId, sdp: offer.sdp ?? '' });
        } catch { /* ignore */ }
      } else {
        let pending = takePendingOffer(conversationId);
        if (!pending) {
          try {
            const fetched = await api.pendingCall();
            if (fetched && fetched.conversation_id === conversationId) {
              pending = { conversationId: fetched.conversation_id, callerId: fetched.caller_id, sdp: fetched.sdp };
            }
          } catch { /* ignore */ }
        }
        if (pending) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: pending.sdp }));
            remoteDescSet.current = true;
            flushIce();
          } catch { /* ignore */ }
        } else if (!disposed) {
          try { send({ type: 'call.decline', conversation_id: conversationId }); } catch { /* ignore */ }
          endLocal();
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
          try {
            void pcRef.current?.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: event.sdp }));
          } catch { /* ignore */ }
          flushIce();
        }
      } else if (event.type === 'call.ice') {
        const candidate = event.candidate as RTCIceCandidate;
        if (remoteDescSet.current) {
          try { void pcRef.current?.addIceCandidate(candidate); } catch { /* ignore */ }
        } else {
          iceBuffer.current.push(candidate);
        }
      } else if (event.type === 'call.hangup' || event.type === 'call.decline') {
        if (!disposed) endLocal();
      }
    });

    return () => {
      disposed = true;
      unsubscribe();
      if (activeCallConversation === conversationId) activeCallConversation = null;
      try { pcRef.current?.close(); } catch { /* ignore */ }
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    };
  }, [conversationId, peerId, kind, incoming, endLocal]);

  const answer = useCallback(() => {
    if (!pcRef.current) return;
    void (async () => {
      try {
        const answerDescription = await pcRef.current?.createAnswer();
        await pcRef.current?.setLocalDescription(answerDescription);
        send({ type: 'call.answer', conversation_id: conversationId, sdp: answerDescription?.sdp ?? '' });
      } catch { /* ignore */ }
    })();
  }, [conversationId, send]);

  const decline = useCallback(() => {
    try { send({ type: 'call.decline', conversation_id: conversationId }); } catch { /* ignore */ }
    endLocal();
  }, [conversationId, send, endLocal]);

  const hangUp = useCallback(() => {
    if (!endedRef.current) {
      try { send({ type: 'call.hangup', conversation_id: conversationId }); } catch { /* ignore */ }
    }
    endLocal();
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
    setSpeaker((value) => !value);
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
        try { stream.removeTrack(oldVideo); } catch { /* ignore */ }
        try { oldVideo.stop(); } catch { /* ignore */ }
      }
      if (newVideo) {
        stream.addTrack(newVideo);
        if (!videoOn) newVideo.enabled = false;
        const sender = (await pcRef.current.getSenders()).find((s) => s.track?.kind === 'video');
        if (sender) { try { pcRef.current.removeTrack(sender); } catch { /* ignore */ } }
        pcRef.current.addTrack(newVideo, stream);
      }
    } catch { /* ignore */ }
  }, [videoOn]);

  useEffect(() => {
    if (phase !== 'ringing') return;
    const timer = setTimeout(() => {
      if (incoming) decline();
      else hangUp();
    }, 45000);
    return () => clearTimeout(timer);
  }, [phase, incoming, decline, hangUp]);

  return { phase, seconds, muted, speaker, videoOn, localStream, remoteStream, answer, decline, hangUp, toggleMute, toggleSpeaker, toggleVideo, flipCamera };
}
