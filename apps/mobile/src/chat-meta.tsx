import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

export type PinnedMedia = 'text' | 'emoji' | 'photo' | 'video' | 'voice' | 'gif' | 'sticker';

export interface PinnedMessage {
  id: string;
  senderId: string;
  content: string;
  media: PinnedMedia;
  pinnedAt: number;
}

interface ChatMetaState {
  pinned: Record<string, PinnedMessage>;
  unread: Record<string, boolean>;
  reminders: Record<string, { at: number; label: string; conversationId: string }>;
  muted: Record<string, boolean>;
  prefs: Record<string, import('@/types').ChatPrefs>;
}

export const DEFAULT_CHAT_PREFS = { showTimestamps: true, showReceipts: true, showTyping: true, sound: 'default', sendSound: 'default', notifSound: 'default' };

const STORAGE_KEY = 'chat-meta-v2';
let state: ChatMetaState = { pinned: {}, unread: {}, reminders: {}, muted: {}, prefs: {} };
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
      const parsed = JSON.parse(raw) as Partial<ChatMetaState>;
      state = {
        pinned: parsed.pinned ?? {},
        unread: parsed.unread ?? {},
        reminders: parsed.reminders ?? {},
        muted: parsed.muted ?? {},
        prefs: parsed.prefs ?? {},
      };
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

function getChatMeta(): ChatMetaState {
  return state;
}

export function useChatMeta(): ChatMetaState {
  return useSyncExternalStore(subscribe, getChatMeta);
}

export function setPinned(conversationId: string, message: PinnedMessage | null) {
  if (message) {
    state = { ...state, pinned: { ...state.pinned, [conversationId]: message } };
  } else {
    const { [conversationId]: _removed, ...rest } = state.pinned;
    state = { ...state, pinned: rest };
  }
  emit();
  void persist();
}

export function setConversationUnread(conversationId: string, unread: boolean) {
  if (state.unread[conversationId] === unread) return;
  state = { ...state, unread: { ...state.unread, [conversationId]: unread } };
  emit();
  void persist();
}

export function setConversationMuted(conversationId: string, muted: boolean) {
  if (state.muted[conversationId] === muted) return;
  state = { ...state, muted: { ...state.muted, [conversationId]: muted } };
  emit();
  void persist();
}

export function setChatPrefs(conversationId: string, patch: Partial<import('@/types').ChatPrefs>) {
  state = { ...state, prefs: { ...state.prefs, [conversationId]: { ...DEFAULT_CHAT_PREFS, ...state.prefs[conversationId], ...patch } } };
  emit();
  void persist();
}

export function resetChatPrefs(conversationId: string) {
  const { [conversationId]: _removed, ...rest } = state.prefs;
  state = { ...state, prefs: rest };
  emit();
  void persist();
}

export function chatPrefsFor(conversationId: string): import('@/types').ChatPrefs {
  return { ...DEFAULT_CHAT_PREFS, ...state.prefs[conversationId] };
}

export function addReminder(conversationId: string, messageId: string, at: number, label: string) {
  state = { ...state, reminders: { ...state.reminders, [messageId]: { at, label, conversationId } } };
  emit();
  void persist();
}

export function consumeDueReminders(conversationId?: string): { messageId: string; label: string }[] {
  const now = Date.now();
  const due: { messageId: string; label: string }[] = [];
  const reminders: ChatMetaState['reminders'] = {};
  for (const [messageId, reminder] of Object.entries(state.reminders)) {
    if (reminder.at <= now && (conversationId === undefined || reminder.conversationId === conversationId)) {
      due.push({ messageId, label: reminder.label });
    } else {
      reminders[messageId] = reminder;
    }
  }
  if (!due.length) return [];
  state = { ...state, reminders };
  emit();
  void persist();
  return due;
}
