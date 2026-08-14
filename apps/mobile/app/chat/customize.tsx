import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { chatPrefsFor, resetChatPrefs, setChatPrefs, useChatMeta } from '@/chat-meta';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';
import type { ChatPrefs, Group, GroupCustomization } from '@/types';
import { bubbleLook, bubbleFont, BUBBLE_STYLES, DEFAULT_CHAT_PREFS, DEFAULT_CUSTOMIZATION, DENSITIES, FONTS, RADIUS_OPTIONS, SOUND_OPTIONS, ThemeBackdrop, THEMES, themeById, WallpaperLayer, WALLPAPERS } from '@/themes';

export default function ChatCustomizeScreen() {
  const params = useLocalSearchParams<{ id: string; groupId?: string; name?: string }>();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const meta = useChatMeta();
  const isGroup = !!params.groupId;
  const conversationId = params.id;
  const [group, setGroup] = useState<Group | null>(null);
  const [custom, setCustom] = useState<GroupCustomization>(() => ({ ...DEFAULT_CUSTOMIZATION, ...(isGroup ? undefined : meta.prefs[conversationId]?.customization) }));
  const [prefs, setPrefs] = useState<ChatPrefs>(() => chatPrefsFor(conversationId));
  const [loading, setLoading] = useState(isGroup);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!isGroup) return;
    void api.group(params.groupId!)
      .then((row) => { setGroup(row); setCustom({ ...DEFAULT_CUSTOMIZATION, ...row.customization }); })
      .catch(() => setToast(t('groupNotFound')))
      .finally(() => setLoading(false));
  }, [isGroup, params.groupId, t]);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  const isAdmin = group?.myRole === 'owner' || group?.myRole === 'admin';
  const controlsEnabled = !isGroup || isAdmin;

  const setCustomValue = (patch: Partial<GroupCustomization>) => {
    const next = { ...custom, ...patch };
    setCustom(next);
    if (!isGroup) setChatPrefs(conversationId, { customization: next });
  };

  const setPref = (patch: Partial<ChatPrefs>) => {
    setPrefs((current) => ({ ...current, ...patch }));
    setChatPrefs(conversationId, patch);
  };

  const applyGroupLook = async () => {
    if (!group || busy) return;
    setBusy(true);
    try {
      setGroup(await api.updateGroup(group.id, { customization: custom }));
      showToast(t('lookUpdatedForEveryone'));
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : t('actionFailed'));
    } finally { setBusy(false); }
  };

  const resetGroupLook = async () => {
    if (!group || busy) return;
    setBusy(true);
    try {
      setGroup(await api.updateGroup(group.id, { customization: null }));
      setCustom({ ...DEFAULT_CUSTOMIZATION });
      showToast(t('groupLookReset'));
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : t('actionFailed'));
    } finally { setBusy(false); }
  };

  const resetMyView = () => {
    setPrefs({ ...DEFAULT_CHAT_PREFS });
    resetChatPrefs(conversationId);
    if (!isGroup) setCustom({ ...DEFAULT_CUSTOMIZATION });
    showToast(t('yourViewReset'));
  };

  const activeTheme = themeById(custom.theme);
  const isDefaultTheme = custom.theme === 'default';

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
        <Header colors={colors} title={t('customizeChat')} busy={false} onBack={() => router.back()} />
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <Header colors={colors} title={t('customizeChat')} busy={busy} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.previewCard, { borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>{t('preview').toUpperCase()}</Text>
          <View style={[styles.preview, { borderColor: colors.border }]}>
            <ThemeBackdrop theme={isDefaultTheme ? null : activeTheme} wallpaper={custom.wallpaper}>
              <View style={[styles.previewHeader, { backgroundColor: isDefaultTheme ? colors.surface : activeTheme.header }]}>
                <Text style={[styles.previewHeaderText, { color: isDefaultTheme ? colors.text : activeTheme.headerText }]} numberOfLines={1}>{params.name ?? group?.name ?? ' '}</Text>
              </View>
              <View style={styles.previewBody}>
                <PreviewBubble custom={custom} mine={false} text="Hey! How's your day going?" sender="Alex" />
                <PreviewBubble custom={custom} mine text="Pretty good, thanks! 🌟" />
                <PreviewBubble custom={custom} mine={false} text="Let's catch up later" sender="Alex" />
              </View>
            </ThemeBackdrop>
          </View>
          {isGroup && !isAdmin ? <Text style={[styles.lockNote, { color: colors.muted }]}><MaterialCommunityIcons name="lock-outline" size={12} color={colors.muted} /> {t('onlyAdminsChangeLook')}</Text> : null}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.muted }]}>{t('chatTheme').toUpperCase()}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.themeGrid}>
            {THEMES.map((theme) => {
              const selected = custom.theme === theme.id;
              return (
                <Pressable key={theme.id} disabled={!controlsEnabled} onPress={() => setCustomValue({ theme: theme.id })} style={({ pressed }) => [styles.themeCell, { opacity: !controlsEnabled ? 0.75 : pressed ? 0.7 : 1 }]}>
                  <View style={[styles.themeSwatch, { borderColor: selected ? colors.accent : colors.border, borderWidth: selected ? 2.5 : 1 }]}>
                    <View style={[styles.themeSwatchInner, { backgroundColor: theme.gradient[0] }]}>
                      <View style={[styles.swatchBubble, { backgroundColor: theme.bubbleIn }]} />
                      <View style={[styles.swatchBubbleMine, { backgroundColor: theme.mine }]} />
                    </View>
                    {selected ? <View style={[styles.themeCheck, { backgroundColor: colors.accent }]}><MaterialCommunityIcons name="check" size={12} color={colors.accentText} /></View> : null}
                  </View>
                  <Text numberOfLines={1} style={[styles.themeName, { color: selected ? colors.accent : colors.text }]}>{theme.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.muted }]}>{t('chatWallpaper').toUpperCase()}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.tileRow}>
            {WALLPAPERS.map((wallpaper) => {
              const selected = custom.wallpaper === wallpaper.id;
              return (
                <Pressable key={wallpaper.id} disabled={!controlsEnabled} onPress={() => setCustomValue({ wallpaper: wallpaper.id })} style={({ pressed }) => [styles.wpTile, { opacity: !controlsEnabled ? 0.75 : pressed ? 0.7 : 1 }]}>
                  <View style={[styles.wpSwatch, { backgroundColor: isDefaultTheme ? colors.elevated : activeTheme.gradient[0], borderColor: selected ? colors.accent : colors.border, borderWidth: selected ? 2.5 : 1 }]}>
                    <WallpaperLayer kind={wallpaper.id} color={isDefaultTheme ? colors.faint : activeTheme.wallpaper} />
                    {selected ? <View style={[styles.themeCheck, { backgroundColor: colors.accent }]}><MaterialCommunityIcons name="check" size={12} color={colors.accentText} /></View> : null}
                  </View>
                  <Text numberOfLines={1} style={[styles.themeName, { color: selected ? colors.accent : colors.text }]}>{wallpaper.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.muted }]}>{t('chatFont').toUpperCase()}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {FONTS.map((font, index) => {
            const selected = custom.font === font.id;
            return (
              <Pressable key={font.id} disabled={!controlsEnabled} onPress={() => setCustomValue({ font: font.id })} style={({ pressed }) => [styles.fontRow, index < FONTS.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }, pressed && { opacity: 0.7 }]}>
                <MaterialCommunityIcons name={selected ? 'radiobox-marked' : 'radiobox-blank'} size={20} color={selected ? colors.accent : colors.faint} />
                <Text style={[styles.fontName, { color: colors.text, fontFamily: font.family }]}>{font.name}</Text>
                <Text style={[styles.fontSample, { color: colors.faint, fontFamily: font.family }]}>The quick brown fox</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.muted }]}>{t('bubbleStyle').toUpperCase()}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.tileRow}>
            {BUBBLE_STYLES.map((bubble) => {
              const selected = custom.bubble === bubble.id;
              return (
                <Pressable key={bubble.id} disabled={!controlsEnabled} onPress={() => setCustomValue({ bubble: bubble.id })} style={({ pressed }) => [styles.wpTile, { opacity: !controlsEnabled ? 0.75 : pressed ? 0.7 : 1 }]}>
                  <View style={[styles.bubbleSwatch, { borderColor: selected ? colors.accent : colors.border, borderWidth: selected ? 2.5 : 1 }]}>
                    <View style={[styles.bubbleMini, bubbleMiniStyle(bubble.id, colors)]} />
                  </View>
                  <Text numberOfLines={1} style={[styles.themeName, { color: selected ? colors.accent : colors.text }]}>{bubble.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.muted }]}>{t('chatDensity').toUpperCase()}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.chipRow}>
            {DENSITIES.map((density) => {
              const selected = custom.density === density.id;
              return (
                <Pressable key={density.id} disabled={!controlsEnabled} onPress={() => setCustomValue({ density: density.id })} style={({ pressed }) => [styles.chip, selected && { borderColor: colors.accent, backgroundColor: colors.accentSoft }, !controlsEnabled && styles.chipDisabled, pressed && { opacity: 0.7 }]}>
                  <Text style={[styles.chipText, { color: selected ? colors.accent : colors.text }]}>{density.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.muted }]}>{t('bubbleRadius').toUpperCase()}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.chipRow}>
            {RADIUS_OPTIONS.map((option) => {
              const selected = custom.radius === option.value;
              return (
                <Pressable key={option.value} disabled={!controlsEnabled} onPress={() => setCustomValue({ radius: option.value })} style={({ pressed }) => [styles.chip, selected && { borderColor: colors.accent, backgroundColor: colors.accentSoft }, !controlsEnabled && styles.chipDisabled, pressed && { opacity: 0.7 }]}>
                  <Text style={[styles.chipText, { color: selected ? colors.accent : colors.text }]}>{option.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {isGroup && isAdmin ? (
          <>
            <Pressable disabled={busy} onPress={() => void applyGroupLook()} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.accent, opacity: busy ? 0.6 : pressed ? 0.8 : 1 }]}>{busy ? <ActivityIndicator color={colors.accentText} /> : <Text style={{ color: colors.accentText, fontWeight: '800', fontSize: 15 }}>{t('applyToGroup')}</Text>}</Pressable>
            <Pressable disabled={busy} onPress={() => void resetGroupLook()} style={({ pressed }) => [styles.ghostBtn, { borderColor: colors.border, opacity: busy ? 0.5 : pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="restore" size={17} color={colors.danger} /><Text style={{ color: colors.danger, fontWeight: '800' }}>{t('resetToGroupDefault')}</Text></Pressable>
          </>
        ) : null}

        <Text style={[styles.sectionLabel, { color: colors.muted }]}>{t('yourView').toUpperCase()}</Text>
        <Text style={[styles.personalNote, { color: colors.muted }]}>{t('personalNote')}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.optionRow, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <MaterialCommunityIcons name="clock-outline" size={21} color={colors.accent} />
            <Text style={[styles.rowText, { color: colors.text }]}>{t('showTimestamps')}</Text>
            <Switch value={prefs.showTimestamps} onValueChange={(value) => setPref({ showTimestamps: value })} trackColor={{ true: colors.accent, false: colors.border }} thumbColor={prefs.showTimestamps ? colors.accentText : colors.text} />
          </View>
          <View style={[styles.optionRow, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <MaterialCommunityIcons name="eye-check-outline" size={21} color={colors.accent} />
            <Text style={[styles.rowText, { color: colors.text }]}>{t('showReadReceipts')}</Text>
            <Switch value={prefs.showReceipts} onValueChange={(value) => setPref({ showReceipts: value })} trackColor={{ true: colors.accent, false: colors.border }} thumbColor={prefs.showReceipts ? colors.accentText : colors.text} />
          </View>
          <View style={[styles.optionRow, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <MaterialCommunityIcons name="keyboard-outline" size={21} color={colors.accent} />
            <Text style={[styles.rowText, { color: colors.text }]}>{t('showTypingIndicator')}</Text>
            <Switch value={prefs.showTyping} onValueChange={(value) => setPref({ showTyping: value })} trackColor={{ true: colors.accent, false: colors.border }} thumbColor={prefs.showTyping ? colors.accentText : colors.text} />
          </View>
          <View style={styles.optionRow}>
            <MaterialCommunityIcons name="bell-outline" size={21} color={colors.accent} />
            <Text style={[styles.rowText, { color: colors.text }]}>{t('notificationSound')}</Text>
          </View>
          <View style={styles.chipRow}>
            {SOUND_OPTIONS.map((option) => {
              const selected = prefs.sound === option.id;
              return (
                <Pressable key={option.id} onPress={() => setPref({ sound: option.id })} style={({ pressed }) => [styles.soundChip, selected && { borderColor: colors.accent, backgroundColor: colors.accentSoft }, pressed && { opacity: 0.7 }]}>
                  <MaterialCommunityIcons name={option.icon} size={16} color={selected ? colors.accent : colors.text} />
                  <Text style={[styles.chipText, { color: selected ? colors.accent : colors.text }]}>{option.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable onPress={resetMyView} style={({ pressed }) => [styles.ghostBtn, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="restore" size={17} color={colors.danger} /><Text style={{ color: colors.danger, fontWeight: '800' }}>{t('resetMyView')}</Text></Pressable>
      </ScrollView>

      {toast ? <View style={[styles.toast, { backgroundColor: colors.text }]}><Text style={{ color: colors.background, fontSize: 13, fontWeight: '700' }}>{toast}</Text></View> : null}
    </SafeAreaView>
  );
}

function Header({ colors, title, busy, onBack }: { colors: { background: string; surface: string; border: string; text: string; accent: string }; title: string; busy: boolean; onBack: () => void }) {
  return (
    <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <Pressable accessibilityLabel="Back" hitSlop={10} onPress={onBack} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
      <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
      {busy ? <ActivityIndicator size="small" color={colors.accent} /> : <View style={{ width: 38 }} />}
    </View>
  );
}

function PreviewBubble({ custom, mine, text, sender }: { custom: GroupCustomization; mine: boolean; text: string; sender?: string }) {
  const theme = themeById(custom.theme);
  const look = bubbleLook(custom, theme, mine);
  const fontFamily = bubbleFont(custom);
  return (
    <View style={[styles.previewRow, mine && styles.previewRowMine]}>
      <View style={[styles.previewBubble, { backgroundColor: look.background, borderColor: look.borderColor, borderWidth: look.borderWidth, borderRadius: look.radius, ...look.extraStyle }]}>
        {!mine && sender ? <Text style={[styles.previewSender, { color: theme.sender, fontFamily }]}>{sender}</Text> : null}
        <Text style={[styles.previewText, { color: look.textColor, fontFamily }]}>{text}</Text>
        <Text style={[styles.previewTime, { color: theme.time }]}>{mine ? '✓✓ 12:04' : '12:04'}</Text>
      </View>
    </View>
  );
}

function bubbleMiniStyle(id: string, colors: { accent: string; accentSoft: string; border: string; surface: string; background: string }) {
  const base = { width: 32, height: 16 } as const;
  if (id === 'pill') return { ...base, width: 36, borderRadius: 16, backgroundColor: colors.accentSoft };
  if (id === 'box') return { ...base, width: 30, borderRadius: 2, backgroundColor: colors.accentSoft };
  if (id === 'outline') return { ...base, borderRadius: 10, borderWidth: 1.5, borderColor: colors.accent, backgroundColor: 'transparent' };
  if (id === 'flat') return { ...base, borderRadius: 10, backgroundColor: colors.accentSoft, borderWidth: 0 };
  if (id === 'crisp') return { ...base, borderRadius: 10, borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.surface };
  if (id === 'glass') return { ...base, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.55)' };
  if (id === 'edge') return { ...base, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: colors.accent, backgroundColor: colors.accentSoft };
  if (id === 'soft') return { ...base, borderRadius: 14, backgroundColor: colors.accentSoft };
  return { ...base, borderRadius: 10, backgroundColor: colors.accentSoft };
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }, iconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, content: { padding: 16, paddingBottom: 36 },
  previewCard: { marginBottom: 4 }, sectionLabel: { fontSize: 10, fontWeight: '900', marginTop: 22, marginBottom: 9 }, lockNote: { fontSize: 11, marginTop: 8, textAlign: 'center' },
  preview: { height: 240, borderRadius: 12, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth }, previewHeader: { height: 40, paddingHorizontal: 14, justifyContent: 'center' }, previewHeaderText: { fontSize: 13, fontWeight: '800' }, previewBody: { flex: 1, padding: 14, justifyContent: 'flex-end', gap: 9 },
  previewRow: { alignItems: 'flex-start' }, previewRowMine: { alignItems: 'flex-end' }, previewBubble: { maxWidth: '82%', paddingHorizontal: 12, paddingVertical: 8 }, previewSender: { fontSize: 10, fontWeight: '700', marginBottom: 2 }, previewText: { fontSize: 14, lineHeight: 19 }, previewTime: { fontSize: 9, marginTop: 3, alignSelf: 'flex-end' },
  card: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 12 }, themeCell: { width: '18.5%', alignItems: 'center', gap: 5 }, themeSwatch: { width: '100%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', position: 'relative' }, themeSwatchInner: { flex: 1, padding: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }, swatchBubble: { width: 13, height: 9, borderRadius: 4, alignSelf: 'flex-end', marginBottom: 2 }, swatchBubbleMine: { width: 13, height: 9, borderRadius: 4, marginBottom: 2 }, themeCheck: { position: 'absolute', top: 3, right: 3, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, themeName: { fontSize: 9, fontWeight: '700', textAlign: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 12 }, chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: 'transparent' }, chipDisabled: { opacity: 0.7 }, chipText: { fontSize: 12, fontWeight: '700' },
  tileRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 12 }, wpTile: { width: '23%', alignItems: 'center', gap: 5 }, wpSwatch: { width: '100%', height: 56, borderRadius: 10, overflow: 'hidden', position: 'relative' }, bubbleSwatch: { width: '100%', height: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center', position: 'relative' }, bubbleMini: { },
  fontRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10 }, fontName: { fontSize: 14, fontWeight: '700', width: 88 }, fontSample: { flex: 1, fontSize: 13, textAlign: 'right' },
  primaryBtn: { minHeight: 50, borderRadius: 14, marginTop: 22, alignItems: 'center', justifyContent: 'center' }, ghostBtn: { minHeight: 48, borderRadius: 14, marginTop: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  personalNote: { fontSize: 12, marginTop: -4 }, optionRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 }, rowText: { flex: 1, fontSize: 14, fontWeight: '600' }, soundChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', gap: 6 },
  toast: { position: 'absolute', bottom: 30, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, maxWidth: '85%' },
});
