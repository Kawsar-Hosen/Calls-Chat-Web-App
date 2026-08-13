import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

export type SoundName = 'send' | 'receive' | 'react';

const ASSETS: Record<SoundName, number> = {
  send: require('../assets/sounds/send.wav'),
  receive: require('../assets/sounds/receive.wav'),
  react: require('../assets/sounds/react.wav'),
};

let players: Record<SoundName, AudioPlayer> | null = null;
let audioMode = false;

function ensurePlayers(): Record<SoundName, AudioPlayer> {
  if (!players) {
    players = {
      send: createAudioPlayer(ASSETS.send),
      receive: createAudioPlayer(ASSETS.receive),
      react: createAudioPlayer(ASSETS.react),
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
    void ensureAudioMode();
    const player = ensurePlayers()[name];
    void player.seekTo(0).catch(() => undefined);
    player.play();
  } catch {
    // ignore
  }
}
