import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const light = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  elevated: '#F0F0F0',
  text: '#191919',
  muted: '#666666',
  faint: '#999999',
  border: '#E5E5E5',
  accent: '#1F66FF',
  accentSoft: '#E9F0FF',
  accentText: '#FFFFFF',
  success: '#0DA05B',
  danger: '#D94848',
} as const;

const dark = {
  background: '#101014',
  surface: '#17171D',
  elevated: '#1F1F26',
  text: '#F2F3F5',
  muted: '#9A9AA5',
  faint: '#6B6B76',
  border: '#2A2A33',
  accent: '#4D82FF',
  accentSoft: '#1A2B52',
  accentText: '#FFFFFF',
  success: '#3FC584',
  danger: '#F16A6A',
} as const;

type ThemeMode = 'system' | 'light' | 'dark';
type Theme = typeof light | typeof dark;

interface ThemeContextValue {
  colors: Theme;
  dark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  useEffect(() => { void SecureStore.getItemAsync('xyteee.theme').then((saved) => { if (saved === 'system' || saved === 'light' || saved === 'dark') setMode(saved); }); }, []);
  const updateMode = (next: ThemeMode) => { setMode(next); void SecureStore.setItemAsync('xyteee.theme', next); };
  const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';
  return (
    <ThemeContext.Provider value={{ colors: isDark ? dark : light, dark: isDark, mode, setMode: updateMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
