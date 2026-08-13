import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { languages, useI18n, type LanguageCode } from '@/i18n';

const SPEECH_LANG: Record<LanguageCode, string> = { bn: 'bn-BD', en: 'en-US', id: 'id-ID', hi: 'hi-IN', ar: 'ar-SA', es: 'es-ES', pt: 'pt-BR' };

let voiceEnabled = false;

export function AuthTopBar({ mode }: { mode: 'login' | 'register' }) {
  const { t, language, setLanguage, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const [voiceOn, setVoiceOn] = useState(voiceEnabled);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!voiceOn) { void Speech.stop(); return; }
    const text = t(mode === 'login' ? 'authVoiceLoginGuide' : 'authVoiceRegisterGuide');
    const target = SPEECH_LANG[language] ?? 'en-US';
    (async () => {
      await Speech.stop();
      if (cancelled) return;
      const voices = await Speech.getAvailableVoicesAsync();
      const prefix = target.split('-')[0]?.toLowerCase() ?? target.toLowerCase();
      const voice = voices.find((item) => item.language.toLowerCase() === target.toLowerCase())
        ?? voices.find((item) => item.language.toLowerCase().startsWith(prefix));
      if (cancelled) return;
      const options: Speech.SpeechOptions = { language: target, rate: 1 };
      if (voice) options.voice = voice.identifier;
      await Speech.speak(text, options);
    })();
    return () => { cancelled = true; void Speech.stop(); };
  }, [voiceOn, language, mode, t]);

  const toggleVoice = () => {
    voiceEnabled = !voiceOn;
    setVoiceOn(!voiceOn);
  };

  return (
    <>
      {open ? <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} /> : null}
      <View pointerEvents="box-none" style={[styles.bar, { top: insets.top + 12, ...(isRTL ? { left: insets.left + 12 } : { right: insets.right + 12 }) }]}>
        <View style={styles.toolWrap}>
          <Pressable accessibilityLabel={t('chooseLanguage')} onPress={() => setOpen((value) => !value)} style={({ pressed }) => [styles.toolBtn, pressed && styles.toolPressed]}>
            <MaterialCommunityIcons name="translate" size={19} color="#475569" />
          </Pressable>
          {open ? <View style={[styles.menu, isRTL ? { right: 0 } : { left: 0 }]}>
            {languages.map((item) => {
              const active = item.code === language;
              return <Pressable key={item.code} accessibilityRole="menuitem" accessibilityState={{ selected: active }} onPress={() => { setLanguage(item.code); setOpen(false); }} style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
                <Text style={[styles.menuText, active && styles.menuTextActive]}>{item.nativeLabel}</Text>
                {active ? <MaterialCommunityIcons name="check" size={16} color="#2563EB" /> : null}
              </Pressable>;
            })}
          </View> : null}
        </View>
        <Pressable accessibilityLabel={voiceOn ? t('authVoiceStop') : t('authVoiceStart')} onPress={toggleVoice} style={({ pressed }) => [styles.toolBtn, voiceOn && styles.toolBtnOn, pressed && styles.toolPressed]}>
          <MaterialCommunityIcons name={voiceOn ? 'volume-high' : 'volume-off'} size={19} color={voiceOn ? '#2563EB' : '#475569'} />
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 10 },
  toolWrap: { position: 'relative' },
  toolBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  toolBtnOn: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  toolPressed: { opacity: 0.72 },
  menu: { position: 'absolute', top: 46, minWidth: 196, paddingVertical: 6, borderWidth: 1, borderColor: '#E8EDF3', borderRadius: 14, backgroundColor: '#FFFFFF', shadowColor: '#0F172A', shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  menuItemPressed: { backgroundColor: '#F1F5F9' },
  menuText: { color: '#1F2937', fontSize: 14 },
  menuTextActive: { color: '#2563EB', fontWeight: '700' },
});
