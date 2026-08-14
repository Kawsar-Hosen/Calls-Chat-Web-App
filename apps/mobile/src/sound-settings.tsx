import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

export interface SoundSettings {
  requestSound: boolean;
  acceptSound: boolean;
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = { requestSound: true, acceptSound: true };

const STORAGE_KEY = 'xyteee.sound-settings';
let state: SoundSettings = DEFAULT_SOUND_SETTINGS;
const listeners = new Set<() => void>();
let hydrated = false;

function emit() {
  for (const listener of listeners) listener();
}

async function persist() {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // best-effort persistence only
  }
}

async function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SoundSettings>;
      state = { ...DEFAULT_SOUND_SETTINGS, ...parsed };
      emit();
    }
  } catch {
    // ignore corrupted storage
  }
}

void hydrate();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getState(): SoundSettings {
  return state;
}

export function useSoundSettings(): SoundSettings {
  return useSyncExternalStore(subscribe, getState);
}

export function setSoundSetting(key: keyof SoundSettings, value: boolean) {
  if (state[key] === value) return;
  state = { ...state, [key]: value };
  emit();
  void persist();
}

export function soundSettings(): SoundSettings {
  return state;
}
