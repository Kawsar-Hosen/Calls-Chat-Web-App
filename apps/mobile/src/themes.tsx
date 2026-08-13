import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type DimensionValue } from 'react-native';
import type { ChatPrefs, GroupCustomization } from './types';

export type MCIconName = keyof typeof import('@expo/vector-icons').MaterialCommunityIcons.glyphMap;

export interface ChatTheme {
  id: string;
  name: string;
  gradient: [string, string, ...string[]];
  header: string;
  headerText: string;
  bubbleIn: string;
  bubbleText: string;
  mine: string;
  mineText: string;
  accent: string;
  sender: string;
  time: string;
  text: string;
  border: string;
  wallpaper: string;
  decor: { icon: string; color: string; size: number; top: string; left: string; rotate?: string }[];
}

export const THEMES: ChatTheme[] = [
  {
    id: 'default', name: 'Default Clean', gradient: ['#F2F4F7', '#E4E9EF'], header: '#EDEFF3', headerText: '#111827',
    bubbleIn: '#FFFFFF', bubbleText: '#111827', mine: '#2563EB', mineText: '#FFFFFF', accent: '#2563EB', sender: '#2563EB',
    time: '#8A94A6', text: '#111827', border: '#D7DDE5', wallpaper: 'rgba(17,24,39,0.06)', decor: [],
  },
  {
    id: 'ocean', name: 'Ocean Blue', gradient: ['#1E90FF', '#0B4EA2'], header: '#0E5FB8', headerText: '#FFFFFF',
    bubbleIn: 'rgba(255,255,255,0.94)', bubbleText: '#0B2545', mine: '#FFD166', mineText: '#3A2A00', accent: '#FFD166', sender: '#BDE3FF',
    time: '#C7E6FF', text: '#EAF6FF', border: 'rgba(255,255,255,0.28)', wallpaper: 'rgba(255,255,255,0.16)', decor: [{ icon: '🌊', color: 'rgba(255,255,255,0.20)', size: 54, top: '12%', left: '6%' }, { icon: '🐬', color: 'rgba(255,255,255,0.18)', size: 40, top: '58%', left: '84%' }, { icon: '🫧', color: 'rgba(255,255,255,0.20)', size: 26, top: '32%', left: '72%' }],
  },
  {
    id: 'sunset', name: 'Sunset Gradient', gradient: ['#FF7E5F', '#FEB47B'], header: '#E96B4F', headerText: '#FFFFFF',
    bubbleIn: 'rgba(255,255,255,0.93)', bubbleText: '#4A1C0E', mine: '#C73E1D', mineText: '#FFFFFF', accent: '#C73E1D', sender: '#7A2E12',
    time: '#7A4630', text: '#4A1C0E', border: 'rgba(122,46,18,0.22)', wallpaper: 'rgba(255,255,255,0.18)', decor: [{ icon: '🌇', color: 'rgba(255,255,255,0.24)', size: 58, top: '10%', left: '76%' }, { icon: '☁️', color: 'rgba(255,255,255,0.20)', size: 40, top: '30%', left: '8%' }, { icon: '🕊️', color: 'rgba(255,255,255,0.16)', size: 30, top: '64%', left: '12%' }],
  },
  {
    id: 'aurora', name: 'Aurora', gradient: ['#0F2027', '#203A43', '#2C5364'], header: '#17303A', headerText: '#EAF6FF',
    bubbleIn: 'rgba(255,255,255,0.95)', bubbleText: '#0F2027', mine: '#00E5FF', mineText: '#00242A', accent: '#00E5FF', sender: '#7FE9FF',
    time: '#9FC8D8', text: '#EAF6FF', border: 'rgba(0,229,255,0.35)', wallpaper: 'rgba(0,229,255,0.12)', decor: [{ icon: '🌌', color: 'rgba(0,229,255,0.16)', size: 56, top: '8%', left: '70%' }, { icon: '✨', color: 'rgba(255,255,255,0.30)', size: 26, top: '20%', left: '20%' }, { icon: '⭐', color: 'rgba(255,255,255,0.22)', size: 22, top: '66%', left: '88%' }],
  },
  {
    id: 'sakura', name: 'Sakura Flowers 🌸', gradient: ['#FFE3F1', '#FFC1DC'], header: '#F4A8CC', headerText: '#5A2338',
    bubbleIn: 'rgba(255,255,255,0.93)', bubbleText: '#5A2338', mine: '#F06292', mineText: '#FFFFFF', accent: '#F06292', sender: '#C2185B',
    time: '#B06A8C', text: '#5A2338', border: 'rgba(192,24,91,0.20)', wallpaper: 'rgba(255,255,255,0.22)', decor: [{ icon: '🌸', color: 'rgba(240,98,146,0.30)', size: 46, top: '10%', left: '6%' }, { icon: '🌺', color: 'rgba(240,98,146,0.22)', size: 40, top: '48%', left: '86%' }, { icon: '🌷', color: 'rgba(240,98,146,0.24)', size: 34, top: '30%', left: '78%' }, { icon: '🌸', color: 'rgba(240,98,146,0.20)', size: 30, top: '72%', left: '14%' }],
  },
  {
    id: 'rose', name: 'Rose Garden 🌹', gradient: ['#FFF0F2', '#FFCBD4'], header: '#F0B0BD', headerText: '#4A1626',
    bubbleIn: 'rgba(255,255,255,0.93)', bubbleText: '#4A1626', mine: '#C2185B', mineText: '#FFFFFF', accent: '#C2185B', sender: '#8E1C46',
    time: '#A86A7C', text: '#4A1626', border: 'rgba(194,24,91,0.20)', wallpaper: 'rgba(255,255,255,0.22)', decor: [{ icon: '🌹', color: 'rgba(194,24,91,0.26)', size: 48, top: '12%', left: '78%' }, { icon: '🥀', color: 'rgba(194,24,91,0.20)', size: 36, top: '40%', left: '10%' }, { icon: '🌹', color: 'rgba(194,24,91,0.22)', size: 40, top: '68%', left: '84%' }],
  },
  {
    id: 'lavender', name: 'Lavender Flowers', gradient: ['#EFE4FF', '#CDB2FF'], header: '#C4A5F5', headerText: '#3A1E5C',
    bubbleIn: 'rgba(255,255,255,0.94)', bubbleText: '#3A1E5C', mine: '#7C4DFF', mineText: '#FFFFFF', accent: '#7C4DFF', sender: '#5E35B1',
    time: '#8F74B5', text: '#3A1E5C', border: 'rgba(124,77,255,0.22)', wallpaper: 'rgba(255,255,255,0.22)', decor: [{ icon: '💜', color: 'rgba(124,77,255,0.26)', size: 44, top: '10%', left: '8%' }, { icon: '🪻', color: 'rgba(124,77,255,0.24)', size: 38, top: '52%', left: '82%' }, { icon: '🔮', color: 'rgba(124,77,255,0.22)', size: 34, top: '30%', left: '70%' }],
  },
  {
    id: 'night', name: 'Night Sky ✨', gradient: ['#0F0C29', '#302B63', '#24243E'], header: '#1B1740', headerText: '#FFFFFF',
    bubbleIn: 'rgba(255,255,255,0.94)', bubbleText: '#1A1638', mine: '#FFD700', mineText: '#3A3000', accent: '#FFD700', sender: '#C9C2FF',
    time: '#A9A2E0', text: '#EDE9FF', border: 'rgba(255,215,0,0.35)', wallpaper: 'rgba(255,255,255,0.10)', decor: [{ icon: '🌙', color: 'rgba(255,215,0,0.35)', size: 52, top: '10%', left: '76%' }, { icon: '⭐', color: 'rgba(255,255,255,0.28)', size: 24, top: '26%', left: '18%' }, { icon: '✨', color: 'rgba(255,255,255,0.30)', size: 28, top: '60%', left: '10%' }, { icon: '⭐', color: 'rgba(255,255,255,0.20)', size: 20, top: '74%', left: '82%' }],
  },
  {
    id: 'forest', name: 'Forest Nature 🌿', gradient: ['#134E4A', '#2F7D6B'], header: '#1E5F55', headerText: '#FFFFFF',
    bubbleIn: 'rgba(255,255,255,0.94)', bubbleText: '#0F3B37', mine: '#F4A261', mineText: '#3A2400', accent: '#F4A261', sender: '#B8E6D8',
    time: '#BFE3D8', text: '#EAF7EF', border: 'rgba(255,255,255,0.25)', wallpaper: 'rgba(255,255,255,0.12)', decor: [{ icon: '🌿', color: 'rgba(244,162,97,0.30)', size: 44, top: '12%', left: '8%' }, { icon: '🍃', color: 'rgba(255,255,255,0.18)', size: 34, top: '50%', left: '86%' }, { icon: '🌲', color: 'rgba(255,255,255,0.16)', size: 40, top: '34%', left: '70%' }],
  },
  {
    id: 'premium', name: 'Premium Dark', gradient: ['#1F1F2E', '#2B2B3F'], header: '#232334', headerText: '#F5F0E0',
    bubbleIn: 'rgba(255,255,255,0.93)', bubbleText: '#14141F', mine: '#D4AF37', mineText: '#2E2400', accent: '#D4AF37', sender: '#D4AF37',
    time: '#AFA9B8', text: '#F0EEF5', border: 'rgba(212,175,55,0.4)', wallpaper: 'rgba(212,175,55,0.10)', decor: [{ icon: '💎', color: 'rgba(212,175,55,0.30)', size: 46, top: '12%', left: '76%' }, { icon: '◆', color: 'rgba(212,175,55,0.18)', size: 26, top: '38%', left: '10%' }, { icon: '✦', color: 'rgba(212,175,55,0.20)', size: 22, top: '66%', left: '86%' }],
  },
];

export interface FontDef {
  id: string;
  name: string;
  family?: string;
}

export const FONTS: FontDef[] = [
  { id: 'default', name: 'Default' },
  { id: 'modern', name: 'Modern', family: 'sans-serif-medium' },
  { id: 'elegant', name: 'Elegant', family: 'serif' },
  { id: 'rounded', name: 'Rounded', family: 'sans-serif-rounded' },
  { id: 'clean', name: 'Clean', family: 'sans-serif' },
  { id: 'classic', name: 'Classic', family: 'serif-monospace' },
  { id: 'friendly', name: 'Friendly', family: 'cursive' },
  { id: 'minimal', name: 'Minimal', family: 'sans-serif-thin' },
  { id: 'bold', name: 'Bold', family: 'sans-serif-black' },
  { id: 'soft', name: 'Soft', family: 'sans-serif-light' },
];

export interface WallpaperDef {
  id: string;
  name: string;
}

export const WALLPAPERS: WallpaperDef[] = [
  { id: 'plain', name: 'Plain' },
  { id: 'dots', name: 'Polka dots' },
  { id: 'bubbles', name: 'Bubbles' },
  { id: 'confetti', name: 'Confetti' },
  { id: 'stripes', name: 'Stripes' },
];

export interface BubbleStyleDef {
  id: string;
  name: string;
}

export const BUBBLE_STYLES: BubbleStyleDef[] = [
  { id: 'rounded', name: 'Rounded' },
  { id: 'pill', name: 'Pill' },
  { id: 'box', name: 'Box' },
  { id: 'outline', name: 'Outline' },
  { id: 'soft', name: 'Soft' },
];

export interface DensityDef {
  id: string;
  name: string;
  rowMargin: number;
  padV: number;
}

export const DENSITIES: DensityDef[] = [
  { id: 'compact', name: 'Compact', rowMargin: 5, padV: 6 },
  { id: 'comfortable', name: 'Comfortable', rowMargin: 14, padV: 9 },
  { id: 'spacious', name: 'Spacious', rowMargin: 22, padV: 12 },
];

export const RADIUS_OPTIONS: { value: number; name: string }[] = [
  { value: 4, name: 'Sharp' },
  { value: 8, name: 'Soft' },
  { value: 14, name: 'Round' },
  { value: 20, name: 'Extra round' },
];

export interface SoundOption {
  id: string;
  name: string;
  icon: MCIconName;
  sound: 'send' | 'receive' | 'react' | null;
}

export const SOUND_OPTIONS: SoundOption[] = [
  { id: 'default', name: 'Default', icon: 'bell-outline', sound: 'receive' },
  { id: 'pop', name: 'Pop', icon: 'balloon', sound: 'react' },
  { id: 'chime', name: 'Chime', icon: 'bell-ring-outline', sound: 'send' },
  { id: 'silent', name: 'Silent', icon: 'bell-off-outline', sound: null },
];

export const DEFAULT_CUSTOMIZATION: GroupCustomization = { theme: 'default', font: 'default', wallpaper: 'plain', bubble: 'rounded', density: 'comfortable', radius: 8 };
export const DEFAULT_CHAT_PREFS: ChatPrefs = { showTimestamps: true, showReceipts: true, showTyping: true, sound: 'default' };

export function themeById(id: string): ChatTheme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]!;
}

export function fontById(id: string): FontDef {
  return FONTS.find((font) => font.id === id) ?? FONTS[0]!;
}

export function wallpaperById(id: string): WallpaperDef {
  return WALLPAPERS.find((wallpaper) => wallpaper.id === id) ?? WALLPAPERS[0]!;
}

export function bubbleStyleById(id: string): BubbleStyleDef {
  return BUBBLE_STYLES.find((bubble) => bubble.id === id) ?? BUBBLE_STYLES[0]!;
}

export function densityById(id: string): DensityDef {
  return DENSITIES.find((density) => density.id === id) ?? DENSITIES[1]!;
}

export function soundById(id: string): SoundOption {
  return SOUND_OPTIONS.find((sound) => sound.id === id) ?? SOUND_OPTIONS[0]!;
}

export function bubbleLook(customization: GroupCustomization, theme: ChatTheme, mine: boolean) {
  const style = customization.bubble;
  let radius = customization.radius;
  if (style === 'pill') radius = 22;
  if (style === 'box') radius = 0;
  const background = style === 'outline' ? 'transparent' : mine ? theme.mine : theme.bubbleIn;
  const textColor = mine ? theme.mineText : theme.bubbleText;
  const borderColor = style === 'outline' ? (mine ? theme.mine : theme.accent) : mine ? theme.mine : theme.border;
  const borderWidth = style === 'outline' ? 1.5 : StyleSheet.hairlineWidth;
  return { radius, background, textColor, borderColor, borderWidth };
}

export function bubbleFont(customization: GroupCustomization): string | undefined {
  return fontById(customization.font).family;
}

export function WallpaperLayer({ kind, color }: { kind: string; color: string }) {
  if (kind === 'plain' || kind === 'none') return null;
  const base = { position: 'absolute' } as const;
  if (kind === 'dots') {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {([[8, 14], [22, 44], [42, 22], [58, 70], [76, 34], [88, 60], [30, 84], [64, 8], [12, 88], [90, 40]] as [number, number][]).map(([top, left], index) => (
          <View key={index} style={[base, { top: `${top}%`, left: `${left}%`, width: 14, height: 14, borderRadius: 7, backgroundColor: color }]} />
        ))}
      </View>
    );
  }
  if (kind === 'bubbles') {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {([[6, 18, 72], [20, 82, 46], [44, 12, 60], [64, 84, 34], [82, 24, 54]] as [number, number, number][]).map(([top, left, size], index) => (
          <View key={index} style={[base, { top: `${top}%`, left: `${left}%`, width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color }]} />
        ))}
      </View>
    );
  }
  if (kind === 'confetti') {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {([[6, 12], [14, 62], [26, 30], [34, 84], [48, 16], [58, 70], [72, 34], [84, 64], [90, 8], [66, 90]] as [number, number][]).map(([top, left], index) => (
          <View key={index} style={[base, { top: `${top}%`, left: `${left}%`, width: 12, height: 12, backgroundColor: color, transform: [{ rotate: `${index * 37}deg` }] }]} />
        ))}
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {([[8, -20, 40], [30, -20, 30], [55, -20, 46], [80, -20, 26]] as [number, number, number][]).map(([top, left, size], index) => (
          <View key={index} style={[base, { top: `${top}%`, left, width: size, height: size, backgroundColor: color, transform: [{ rotate: '40deg' }] }]} />
        ))}
    </View>
  );
}

export function ThemeBackdrop({ theme, wallpaper, children, wallpaperColor }: { theme: ChatTheme | null; wallpaper: string; children: React.ReactNode; wallpaperColor?: string }) {
  return (
    <View style={styles.backdrop}>
      {theme ? (
        <>
          <LinearGradient colors={theme.gradient} style={StyleSheet.absoluteFill} />
          {theme.decor.map((item, index) => (
            <View key={index} pointerEvents="none" style={{ position: 'absolute', top: item.top as DimensionValue, left: item.left as DimensionValue, opacity: 0.55, transform: [{ rotate: item.rotate ?? '0deg' }] }}>
              <Text style={{ fontSize: item.size, color: item.color }}>{item.icon}</Text>
            </View>
          ))}
          <WallpaperLayer kind={wallpaper} color={wallpaperColor ?? theme.wallpaper} />
        </>
      ) : (
        <LinearGradient colors={['#F2F4F7', '#E4E9EF']} style={StyleSheet.absoluteFill} />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, overflow: 'hidden' },
});
