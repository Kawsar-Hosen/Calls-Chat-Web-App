import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

export type SoundName = 'send' | 'receive' | 'react' | 'acceptFriend' | 'friendRequest';

const ASSETS: Record<SoundName, number> = {
  send: require('../assets/sounds/send.wav'),
  receive: require('../assets/sounds/receive.wav'),
  react: require('../assets/sounds/react.wav'),
  acceptFriend: require('../assets/sounds/accept-friend.wav'),
  friendRequest: require('../assets/sounds/friend-request.mp3'),
};

export const POP_SOUNDS: { id: string; label: string }[] = [
  { id: 'pop1', label: 'Pop 1' },
  { id: 'pop2', label: 'Pop 2' },
  { id: 'pop3', label: 'Pop 3' },
  { id: 'pop4', label: 'Pop 4' },
  { id: 'pop5', label: 'Pop 5' },
  { id: 'pop6', label: 'Pop 6' },
  { id: 'pop7', label: 'Pop 7' },
  { id: 'pop8', label: 'Pop 8' },
];

const POP_ASSETS: Record<string, number> = {
  pop1: require('../assets/sounds/Pop1.mp3'),
  pop2: require('../assets/sounds/Pop2.mp3'),
  pop3: require('../assets/sounds/Pop3.mp3'),
  pop4: require('../assets/sounds/Pop4.mp3'),
  pop5: require('../assets/sounds/Pop5.mp3'),
  pop6: require('../assets/sounds/Pop6.mp3'),
  pop7: require('../assets/sounds/Pop7.mp3'),
  pop8: require('../assets/sounds/Pop8.mp3'),
};

export const NOTIF_SOUNDS: { id: string; label: string }[] = [
  { id: 'notif1', label: 'Notif 1' },
  { id: 'notif2', label: 'Notif 2' },
  { id: 'notif3', label: 'Notif 3' },
  { id: 'notif4', label: 'Notif 4' },
  { id: 'notif5', label: 'Notif 5' },
  { id: 'notif6', label: 'Notif 6' },
  { id: 'notif7', label: 'Notif 7' },
];

const NOTIF_ASSETS: Record<string, number> = {
  notif1: require('../assets/sounds/Notification1.mp3'),
  notif2: require('../assets/sounds/Notification2.mp3'),
  notif3: require('../assets/sounds/Notification3.mp3'),
  notif4: require('../assets/sounds/Notification4.mp3'),
  notif5: require('../assets/sounds/Notification5.mp3'),
  notif6: require('../assets/sounds/Notification6.mp3'),
  notif7: require('../assets/sounds/Notification7.mp3'),
};

export const RING_SOUNDS: { id: string; label: string }[] = [
  { id: 'incoming', label: 'Incoming Call' },
  { id: 'cellular', label: 'Cellular Ringing' },
];

const RING_ASSETS: Record<string, number> = {
  incoming: require('../assets/sounds/Incoming_Call.mp3'),
  cellular: require('../assets/sounds/cellular-phone-ringing.mp3'),
};

let players: Record<SoundName, AudioPlayer> | null = null;
let popPlayers: Record<string, AudioPlayer> = {};
let notifPlayers: Record<string, AudioPlayer> = {};
let ringPlayers: Record<string, AudioPlayer> = {};
let activeRing: string | null = null;
let audioMode = false;

function ensurePlayers(): Record<SoundName, AudioPlayer> {
  if (!players) {
    players = {
      send: createAudioPlayer(ASSETS.send),
      receive: createAudioPlayer(ASSETS.receive),
      react: createAudioPlayer(ASSETS.react),
      acceptFriend: createAudioPlayer(ASSETS.acceptFriend),
      friendRequest: createAudioPlayer(ASSETS.friendRequest),
    };
  }
  return players;
}

async function ensureAudioMode() {
  if (audioMode) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    audioMode = true;
  } catch {
    // ignore
  }
}

export function playSound(name: SoundName) {
  try {
    const player = ensurePlayers()[name];
    void (async () => {
      await ensureAudioMode();
      try { player.seekTo(0); } catch { /* ignore */ }
      try { player.play(); } catch { /* ignore */ }
    })();
  } catch {
    // ignore
  }
}

export function playSendSound(value: string | null | undefined) {
  if (!value || value === 'none') return;
  if (value === 'default') {
    playSound('send');
    return;
  }
  const asset = POP_ASSETS[value];
  if (!asset) return;
  try {
    if (!popPlayers[value]) popPlayers[value] = createAudioPlayer(asset);
    const player = popPlayers[value];
    void (async () => {
      await ensureAudioMode();
      try { player.seekTo(0); } catch { /* ignore */ }
      try { player.play(); } catch { /* ignore */ }
    })();
  } catch {
    // ignore
  }
}

export function playCallRingtone(value: string) {
  if (!value || value === 'none') return;
  const asset = RING_ASSETS[value];
  if (!asset) return;
  try {
    if (!ringPlayers[value]) ringPlayers[value] = createAudioPlayer(asset);
    const player = ringPlayers[value];
    activeRing = value;
    void (async () => {
      await ensureAudioMode();
      try { player.loop = true; } catch { /* ignore */ }
      try { player.seekTo(0); } catch { /* ignore */ }
      try { player.play(); } catch { /* ignore */ }
    })();
  } catch {
    // ignore
  }
}

export function stopCallRingtone() {
  if (activeRing) {
    const player = ringPlayers[activeRing];
    if (player) {
      try { player.pause(); } catch { /* ignore */ }
    }
  }
  activeRing = null;
}

export function playNotificationSound(value: string | null | undefined) {
  if (!value || value === 'none') return;
  if (value === 'default') {
    playSound('receive');
    return;
  }
  const asset = NOTIF_ASSETS[value];
  if (!asset) return;
  try {
    if (!notifPlayers[value]) notifPlayers[value] = createAudioPlayer(asset);
    const player = notifPlayers[value];
    void (async () => {
      await ensureAudioMode();
      try { player.seekTo(0); } catch { /* ignore */ }
      try { player.play(); } catch { /* ignore */ }
    })();
  } catch {
    // ignore
  }
}
