import { Fragment } from 'react';
import { Image, Text } from 'react-native';
import { FLUENT_EMOJIS as FLUENT_DATA, TELEGRAM_EMOJIS as TELEGRAM_DATA, type EmojiEntry } from './emoji-data';
import { API_URL } from './api';

export type EmojiFamily = 'fluent' | 'telegram';
export type EmojiSource = 'bundled' | 'remote';

export interface EmojiDef {
  id: string;
  name: string;
  char: string;
  file: string;
  family: EmojiFamily;
  src: EmojiSource;
}

const CORE_FLUENT: EmojiDef[] = [
  { id: 'grinning', name: 'Grinning Face', char: '😀', file: 'grinning.gif', family: 'fluent', src: 'bundled' },
  { id: 'joy', name: 'Face with Tears of Joy', char: '😂', file: 'joy.gif', family: 'fluent', src: 'bundled' },
  { id: 'heart_eyes', name: 'Smiling Face with Heart-Eyes', char: '😍', file: 'heart_eyes.gif', family: 'fluent', src: 'bundled' },
  { id: 'smiling_hearts', name: 'Smiling Face with Hearts', char: '🥰', file: 'smiling_hearts.gif', family: 'fluent', src: 'bundled' },
  { id: 'smile', name: 'Smiling Face with Smiling Eyes', char: '😊', file: 'smile.gif', family: 'fluent', src: 'bundled' },
  { id: 'sob', name: 'Loudly Crying Face', char: '😭', file: 'sob.gif', family: 'fluent', src: 'bundled' },
  { id: 'sunglasses', name: 'Smiling Face with Sunglasses', char: '😎', file: 'sunglasses.gif', family: 'fluent', src: 'bundled' },
  { id: 'thinking', name: 'Thinking Face', char: '🤔', file: 'thinking.gif', family: 'fluent', src: 'bundled' },
  { id: 'sweat_smile', name: 'Grinning Face with Sweat', char: '😅', file: 'sweat_smile.gif', family: 'fluent', src: 'bundled' },
  { id: 'raised_hands', name: 'Raising Hands', char: '🙌', file: 'raised_hands.gif', family: 'fluent', src: 'bundled' },
  { id: 'clap', name: 'Clapping Hands', char: '👏', file: 'clap.gif', family: 'fluent', src: 'bundled' },
  { id: 'thumbsup', name: 'Thumbs Up', char: '👍', file: 'thumbsup.gif', family: 'fluent', src: 'bundled' },
  { id: 'heart', name: 'Red Heart', char: '❤', file: 'heart.gif', family: 'fluent', src: 'bundled' },
  { id: 'fire', name: 'Fire', char: '🔥', file: 'fire.gif', family: 'fluent', src: 'bundled' },
  { id: 'tada', name: 'Party Popper', char: '🎉', file: 'tada.gif', family: 'fluent', src: 'bundled' },
  { id: 'sparkles', name: 'Sparkles', char: '✨', file: 'sparkles.gif', family: 'fluent', src: 'bundled' },
  { id: 'pray', name: 'Folded Hands', char: '🙏', file: 'pray.gif', family: 'fluent', src: 'bundled' },
  { id: 'hundred', name: 'Hundred Points', char: '💯', file: '100.gif', family: 'fluent', src: 'bundled' },
  { id: 'eyes', name: 'Eyes', char: '👀', file: 'eyes.gif', family: 'fluent', src: 'bundled' },
  { id: 'handshake', name: 'Handshake', char: '🤝', file: 'handshake.gif', family: 'fluent', src: 'bundled' },
  { id: 'blue_heart', name: 'Blue Heart', char: '💙', file: 'blue_heart.gif', family: 'fluent', src: 'bundled' },
  { id: 'sleeping', name: 'Sleeping Face', char: '😴', file: 'sleeping.gif', family: 'fluent', src: 'bundled' },
  { id: 'angry', name: 'Angry Face', char: '😡', file: 'angry.gif', family: 'fluent', src: 'bundled' },
  { id: 'star_struck', name: 'Star-Struck', char: '🤩', file: 'star_struck.gif', family: 'fluent', src: 'bundled' },
  { id: 'partying', name: 'Partying Face', char: '🥳', file: 'partying.gif', family: 'fluent', src: 'bundled' },
  { id: 'muscle', name: 'Flexed Biceps', char: '💪', file: 'muscle.gif', family: 'fluent', src: 'bundled' },
  { id: 'white_check_mark', name: 'Check Mark Button', char: '✅', file: 'white_check_mark.gif', family: 'fluent', src: 'bundled' },
  { id: 'birthday', name: 'Birthday Cake', char: '🎂', file: 'birthday.gif', family: 'fluent', src: 'bundled' },
  { id: 'star', name: 'Glowing Star', char: '🌟', file: 'star.gif', family: 'fluent', src: 'bundled' },
  { id: 'rocket', name: 'Rocket', char: '🚀', file: 'rocket.gif', family: 'fluent', src: 'bundled' },
];

const CORE_FLUENT_BY_CHAR = new Map(CORE_FLUENT.map((emoji) => [emoji.char, emoji]));
const CORE_TELEGRAM = CORE_FLUENT.filter((emoji) => emoji.id !== 'heart_eyes').map((emoji) => ({ ...emoji, family: 'telegram' as EmojiFamily }));
const CORE_TELEGRAM_BY_CHAR = new Map(CORE_TELEGRAM.map((emoji) => [emoji.char, emoji]));

function remoteDef(entry: EmojiEntry, family: EmojiFamily): EmojiDef {
  return { id: entry.id, name: entry.n, char: entry.c, file: entry.f, family, src: 'remote' };
}

export const FLUENT_EMOJIS: EmojiDef[] = FLUENT_DATA.map((entry) => CORE_FLUENT_BY_CHAR.get(entry.c) ?? remoteDef(entry, 'fluent'));
export const TELEGRAM_EMOJIS: EmojiDef[] = TELEGRAM_DATA.map((entry) => CORE_TELEGRAM_BY_CHAR.get(entry.c) ?? remoteDef(entry, 'telegram'));

const FLUENT_BY_CHAR = new Map(FLUENT_EMOJIS.map((emoji) => [emoji.char, emoji]));
const TELEGRAM_BY_CHAR = new Map(TELEGRAM_EMOJIS.map((emoji) => [emoji.char, emoji]));

export const ALL_EMOJIS: EmojiDef[] = [...FLUENT_EMOJIS, ...TELEGRAM_EMOJIS.filter((emoji) => !FLUENT_BY_CHAR.has(emoji.char))];

function normalize(char: string): string {
  return char.length > 1 && char.endsWith('\ufe0f') ? char.slice(0, -1) : char;
}

export function emojiByChar(char: string, family: EmojiFamily = 'fluent'): EmojiDef | undefined {
  const value = normalize(char);
  if (family === 'telegram') return TELEGRAM_BY_CHAR.get(value) ?? FLUENT_BY_CHAR.get(value);
  return FLUENT_BY_CHAR.get(value);
}

export function emojiList(mode: 'all' | 'fluent' | 'telegram', query = ''): EmojiDef[] {
  const list = mode === 'all' ? ALL_EMOJIS : mode === 'fluent' ? FLUENT_EMOJIS : TELEGRAM_EMOJIS;
  const needle = query.trim().toLowerCase();
  if (!needle) return list;
  return list.filter((emoji) => emoji.name.toLowerCase().includes(needle) || emoji.id.includes(needle) || emoji.char.includes(needle));
}

export const EMOJI_FAMILY_MARKER = '\u{E000}';

export function encodeEmoji(char: string, family: EmojiFamily = 'fluent'): string {
  return family === 'telegram' ? EMOJI_FAMILY_MARKER + char : char;
}

export function decodeEmoji(value: string): { char: string; family: EmojiFamily } {
  if (value.startsWith(EMOJI_FAMILY_MARKER)) return { char: value.slice(EMOJI_FAMILY_MARKER.length), family: 'telegram' };
  return { char: value, family: 'fluent' };
}

const EMOJI_ASSETS: Record<string, number> = {
  'grinning.gif': require('../assets/emoji/grinning.gif'),
  'joy.gif': require('../assets/emoji/joy.gif'),
  'heart_eyes.gif': require('../assets/emoji/heart_eyes.gif'),
  'smiling_hearts.gif': require('../assets/emoji/smiling_hearts.gif'),
  'smile.gif': require('../assets/emoji/smile.gif'),
  'sob.gif': require('../assets/emoji/sob.gif'),
  'sunglasses.gif': require('../assets/emoji/sunglasses.gif'),
  'thinking.gif': require('../assets/emoji/thinking.gif'),
  'sweat_smile.gif': require('../assets/emoji/sweat_smile.gif'),
  'raised_hands.gif': require('../assets/emoji/raised_hands.gif'),
  'clap.gif': require('../assets/emoji/clap.gif'),
  'thumbsup.gif': require('../assets/emoji/thumbsup.gif'),
  'heart.gif': require('../assets/emoji/heart.gif'),
  'fire.gif': require('../assets/emoji/fire.gif'),
  'tada.gif': require('../assets/emoji/tada.gif'),
  'sparkles.gif': require('../assets/emoji/sparkles.gif'),
  'pray.gif': require('../assets/emoji/pray.gif'),
  '100.gif': require('../assets/emoji/100.gif'),
  'eyes.gif': require('../assets/emoji/eyes.gif'),
  'handshake.gif': require('../assets/emoji/handshake.gif'),
  'blue_heart.gif': require('../assets/emoji/blue_heart.gif'),
  'sleeping.gif': require('../assets/emoji/sleeping.gif'),
  'angry.gif': require('../assets/emoji/angry.gif'),
  'star_struck.gif': require('../assets/emoji/star_struck.gif'),
  'partying.gif': require('../assets/emoji/partying.gif'),
  'muscle.gif': require('../assets/emoji/muscle.gif'),
  'white_check_mark.gif': require('../assets/emoji/white_check_mark.gif'),
  'birthday.gif': require('../assets/emoji/birthday.gif'),
  'star.gif': require('../assets/emoji/star.gif'),
  'rocket.gif': require('../assets/emoji/rocket.gif'),
};

const TELEGRAM_ASSETS: Record<string, number> = {
  'grinning.gif': require('../assets/emoji-tg/grinning.gif'),
  'joy.gif': require('../assets/emoji-tg/joy.gif'),
  'smiling_hearts.gif': require('../assets/emoji-tg/smiling_hearts.gif'),
  'smile.gif': require('../assets/emoji-tg/smile.gif'),
  'sob.gif': require('../assets/emoji-tg/sob.gif'),
  'sunglasses.gif': require('../assets/emoji-tg/sunglasses.gif'),
  'thinking.gif': require('../assets/emoji-tg/thinking.gif'),
  'sweat_smile.gif': require('../assets/emoji-tg/sweat_smile.gif'),
  'raised_hands.gif': require('../assets/emoji-tg/raised_hands.gif'),
  'clap.gif': require('../assets/emoji-tg/clap.gif'),
  'thumbsup.gif': require('../assets/emoji-tg/thumbsup.gif'),
  'heart.gif': require('../assets/emoji-tg/heart.gif'),
  'fire.gif': require('../assets/emoji-tg/fire.gif'),
  'tada.gif': require('../assets/emoji-tg/tada.gif'),
  'sparkles.gif': require('../assets/emoji-tg/sparkles.gif'),
  'pray.gif': require('../assets/emoji-tg/pray.gif'),
  '100.gif': require('../assets/emoji-tg/100.gif'),
  'eyes.gif': require('../assets/emoji-tg/eyes.gif'),
  'handshake.gif': require('../assets/emoji-tg/handshake.gif'),
  'blue_heart.gif': require('../assets/emoji-tg/blue_heart.gif'),
  'sleeping.gif': require('../assets/emoji-tg/sleeping.gif'),
  'angry.gif': require('../assets/emoji-tg/angry.gif'),
  'star_struck.gif': require('../assets/emoji-tg/star_struck.gif'),
  'partying.gif': require('../assets/emoji-tg/partying.gif'),
  'muscle.gif': require('../assets/emoji-tg/muscle.gif'),
  'white_check_mark.gif': require('../assets/emoji-tg/white_check_mark.gif'),
  'birthday.gif': require('../assets/emoji-tg/birthday.gif'),
  'star.gif': require('../assets/emoji-tg/star.gif'),
  'rocket.gif': require('../assets/emoji-tg/rocket.gif'),
};

export function emojiSrc(def: EmojiDef): number | { uri: string } {
  if (def.src === 'bundled') {
    return def.family === 'telegram' ? (TELEGRAM_ASSETS[def.file] as number) : (EMOJI_ASSETS[def.file] as number);
  }
  return { uri: `${API_URL}/emoji/${def.family}/${def.id}.gif` };
}

export type EmojiRun = { type: 'emoji'; value: string; family: EmojiFamily } | { type: 'text'; value: string };

const EMOJI_INDEX = new Map<number, EmojiDef[]>();
for (const emoji of ALL_EMOJIS) {
  const cp = emoji.char.codePointAt(0);
  if (cp === undefined) continue;
  const bucket = EMOJI_INDEX.get(cp) ?? [];
  bucket.push(emoji);
  EMOJI_INDEX.set(cp, bucket);
}
for (const bucket of EMOJI_INDEX.values()) bucket.sort((a, b) => b.char.length - a.char.length);

export function splitEmojiRuns(text: string): EmojiRun[] {
  const runs: EmojiRun[] = [];
  let plain = '';
  let pending: EmojiFamily = 'fluent';
  let index = 0;
  while (index < text.length) {
    const ch = text.charAt(index);
    if (ch === EMOJI_FAMILY_MARKER) {
      pending = 'telegram';
      index += 1;
      continue;
    }
    const cp = text.codePointAt(index);
    const candidates = cp === undefined ? undefined : EMOJI_INDEX.get(cp);
    let matched: string | null = null;
    if (candidates) {
      for (const cand of candidates) {
        if (text.startsWith(cand.char, index)) {
          matched = cand.char;
          break;
        }
      }
    }
    if (matched !== null) {
      if (plain) {
        runs.push({ type: 'text', value: plain });
        plain = '';
      }
      runs.push({ type: 'emoji', value: matched, family: pending });
      index += matched.length;
      pending = 'fluent';
    } else {
      const width = cp !== undefined && cp > 0xffff ? 2 : 1;
      plain += text.slice(index, index + width);
      index += width;
      pending = 'fluent';
    }
  }
  if (plain) runs.push({ type: 'text', value: plain });
  return runs;
}

export function FluentEmoji({ char, size = 20, family = 'fluent' }: { char: string; size?: number; family?: EmojiFamily }) {
  const def = emojiByChar(char, family);
  if (!def) return <Text style={{ fontSize: size }}>{char}</Text>;
  return <Image source={emojiSrc(def)} style={{ width: size, height: size }} resizeMode="contain" />;
}

export function EmojiText({ text, size = 20 }: { text: string; size?: number }) {
  const runs = splitEmojiRuns(text);
  if (runs.length === 1 && runs[0] && runs[0].type === 'text') return <>{text}</>;
  return <>{runs.map((run, index) => run.type === 'emoji' ? <FluentEmoji key={index} char={run.value} family={run.family} size={size} /> : <Fragment key={index}>{run.value}</Fragment>)}</>;
}

export function Emoji({ text, size = 20 }: { text: string; size?: number }) {
  return <Text style={{ fontSize: size, lineHeight: Math.ceil(size * 1.2) }}><EmojiText text={text} size={size} /></Text>;
}

export function isEmojiOnly(text: string): boolean {
  if (!text) return false;
  return splitEmojiRuns(text).every((run) => run.type === 'emoji');
}

export const REACTION_CHOICES = ['👍', '😂', '❤️', '😮', '😢'] as const;
