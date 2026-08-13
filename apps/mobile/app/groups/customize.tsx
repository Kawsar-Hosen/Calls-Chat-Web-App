import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { chatPrefsFor, resetChatPrefs, setChatPrefs, useChatMeta } from '@/chat-meta';
import { useTheme } from '@/theme';
import type { ChatPrefs, Group, GroupCustomization } from '@/types';
import { bubbleLook, bubbleFont, BUBBLE_STYLES, DEFAULT_CHAT_PREFS, DEFAULT_CUSTOMIZATION, DENSITIES, FONTS, RADIUS_OPTIONS, SOUND_OPTIONS, ThemeBackdrop, THEMES, themeById, WALLPAPERS } from '@/themes';

const DEFAULT_PREFS = DEFAULT_CHAT_PREFS;

export default function CustomizeChatScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const meta = useChatMeta();
  const [group, setGroup] = useState<Group | null>(null);
  const [custom, setCustom] = useState<GroupCustomization>(DEFAULT_CUSTOMIZATION);
  const [prefs, setPrefs] = useState<ChatPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    void api.group(id)
      .then((row) => { setGroup(row); setCustom({ ...DEFAULT_CUSTOMIZATION, ...row.customization }); setPrefs(chatPrefsFor(row.conversationId)); })
      .catch(() => setToast('Could not load group customization'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  const isAdmin = group?.myRole === 'owner' || group?.myRole === 'admin';
  const conversationId = group?.conversationId ?? '';

  const setPref = (patch: Partial<ChatPrefs>) => {
    setPrefs((current) => ({ ...current, ...patch }));
    if (conversationId) setChatPrefs(conversationId, patch);
  };

  const applyGroupLook = async () => {
    if (!group || busy) return;
    setBusy(true);
    try {
      setGroup(await api.updateGroup(group.id, { customization: custom }));
      showToast('Group look updated for everyone');
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Could not update group look');
    } finally { setBusy(false); }
  };

  const resetGroupLook = async () => {
    if (!group || busy) return;
    setBusy(true);
    try {
      setGroup(await api.updateGroup(group.id, { customization: null }));
      setCustom(DEFAULT_CUSTOMIZATION);
      showToast('Reset to group default');
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Could not reset group look');
    } finally { setBusy(false); }
  };

  const activeTheme = themeById(custom.theme);
  const isDefaultTheme = custom.theme === 'default';

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>Customize chat</Text>
        {busy ? <ActivityIndicator size="small" color={colors.accent} /> : <View style={{ width: 38 }} />}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      ) : !group ? (
        <View style={styles.center}><Text style={{ color: colors.danger, fontWeight: '700' }}>Group not found</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.previewCard, { borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>PREVIEW</Text>
            <View style={[styles.preview, { borderColor: colors.border }]}>
              <ThemeBackdrop theme={isDefaultTheme ? null : activeTheme} wallpaper={custom.wallpaper}>
                <View style={[styles.previewHeader, { backgroundColor: isDefaultTheme ? colors.surface : activeTheme.header }]}>
                  <Text style={[styles.previewHeaderText, { color: isDefaultTheme ? colors.text : activeTheme.headerText }]} numberOfLines={1}>{name ?? group.name}</Text>
                </View>
                <View style={styles.previewBody}>
                  <PreviewBubble custom={custom} mine={false} text="Hey! How's your day going?" sender="Alex" />
                  <PreviewBubble custom={custom} mine text="Pretty good, thanks! 🌟" />
                  <PreviewBubble custom={custom} mine={false} text="Let's catch up later" sender="Alex" />
                </View>
              </ThemeBackdrop>
            </View>
            {!isAdmin ? <Text style={[styles.lockNote, { color: colors.muted }]}><MaterialCommunityIcons name="lock-outline" size={12} color={colors.muted} /> Only group admins can change the group look.</Text> : null}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.muted }]}>CHAT THEME</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.themeGrid}>
              {THEMES.map((theme) => {
                const selected = custom.theme === theme.id;
                const disabled = !isAdmin;
                return (
                  <Pressable key={theme.id} disabled={disabled} onPress={() => setCustom((current) => ({ ...current, theme: theme.id }))} style={({ pressed }) => [styles.themeCell, { opacity: disabled ? 0.75 : pressed ? 0.7 : 1 }]}>
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

          <Text style={[styles.sectionLabel, { color: colors.muted }]}>CHAT WALLPAPER</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.chipRow}>
              {WALLPAPERS.map((wallpaper) => {
                const selected = custom.wallpaper === wallpaper.id;
                return (
                  <Pressable key={wallpaper.id} disabled={!isAdmin} onPress={() => setCustom((current) => ({ ...current, wallpaper: wallpaper.id }))} style={({ pressed }) => [styles.chip, selected && { borderColor: colors.accent, backgroundColor: colors.accentSoft }, !isAdmin && styles.chipDisabled, pressed && { opacity: 0.7 }]}>
                    <Text style={[styles.chipText, { color: selected ? colors.accent : colors.text }]}>{wallpaper.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.muted }]}>CHAT FONT</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {FONTS.map((font, index) => {
              const selected = custom.font === font.id;
              return (
                <Pressable key={font.id} disabled={!isAdmin} onPress={() => setCustom((current) => ({ ...current, font: font.id }))} style={({ pressed }) => [styles.fontRow, index < FONTS.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }, pressed && { opacity: 0.7 }]}>
                  <MaterialCommunityIcons name={selected ? 'radiobox-marked' : 'radiobox-blank'} size={20} color={selected ? colors.accent : colors.faint} />
                  <Text style={[styles.fontName, { color: colors.text, fontFamily: font.family }]}>{font.name}</Text>
                  <Text style={[styles.fontSample, { color: colors.faint, fontFamily: font.family }]}>The quick brown fox</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.muted }]}>BUBBLE STYLE</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.chipRow}>
              {BUBBLE_STYLES.map((bubble) => {
                const selected = custom.bubble === bubble.id;
                return (
                  <Pressable key={bubble.id} disabled={!isAdmin} onPress={() => setCustom((current) => ({ ...current, bubble: bubble.id }))} style={({ pressed }) => [styles.chip, selected && { borderColor: colors.accent, backgroundColor: colors.accentSoft }, !isAdmin && styles.chipDisabled, pressed && { opacity: 0.7 }]}>
                    <Text style={[styles.chipText, { color: selected ? colors.accent : colors.text }]}>{bubble.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.muted }]}>CHAT DENSITY</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.chipRow}>
              {DENSITIES.map((density) => {
                const selected = custom.density === density.id;
                return (
                  <Pressable key={density.id} disabled={!isAdmin} onPress={() => setCustom((current) => ({ ...current, density: density.id }))} style={({ pressed }) => [styles.chip, selected && { borderColor: colors.accent, backgroundColor: colors.accentSoft }, !isAdmin && styles.chipDisabled, pressed && { opacity: 0.7 }]}>
                    <Text style={[styles.chipText, { color: selected ? colors.accent : colors.text }]}>{density.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.muted }]}>BUBBLE CORNER RADIUS</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.chipRow}>
              {RADIUS_OPTIONS.map((option) => {
                const selected = custom.radius === option.value;
                return (
                  <Pressable key={option.value} disabled={!isAdmin} onPress={() => setCustom((current) => ({ ...current, radius: option.value }))} style={({ pressed }) => [styles.chip, selected && { borderColor: colors.accent, backgroundColor: colors.accentSoft }, !isAdmin && styles.chipDisabled, pressed && { opacity: 0.7 }]}>
                    <Text style={[styles.chipText, { color: selected ? colors.accent : colors.text }]}>{option.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {isAdmin ? (
            <>
              <Pressable disabled={busy} onPress={() => void applyGroupLook()} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.accent, opacity: busy ? 0.6 : pressed ? 0.8 : 1 }]}>{busy ? <ActivityIndicator color={colors.accentText} /> : <Text style={{ color: colors.accentText, fontWeight: '800', fontSize: 15 }}>Apply to group</Text>}</Pressable>
              <Pressable disabled={busy} onPress={() => void resetGroupLook()} style={({ pressed }) => [styles.ghostBtn, { borderColor: colors.border, opacity: busy ? 0.5 : pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="restore" size={17} color={colors.danger} /><Text style={{ color: colors.danger, fontWeight: '800' }}>Reset to group default</Text></Pressable>
            </>
          ) : null}

          <Text style={[styles.sectionLabel, { color: colors.muted }]}>YOUR VIEW</Text>
          <Text style={[styles.personalNote, { color: colors.muted }]}>These settings only affect how you see this chat.</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.optionRow, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <MaterialCommunityIcons name="clock-outline" size={21} color={colors.accent} />
              <Text style={[styles.rowText, { color: colors.text }]}>Show timestamps</Text>
              <Switch value={prefs.showTimestamps} onValueChange={(value) => setPref({ showTimestamps: value })} trackColor={{ true: colors.accent, false: colors.border }} thumbColor={prefs.showTimestamps ? colors.accentText : colors.text} />
            </View>
            <View style={[styles.optionRow, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <MaterialCommunityIcons name="eye-check-outline" size={21} color={colors.accent} />
              <Text style={[styles.rowText, { color: colors.text }]}>Show read receipts</Text>
              <Switch value={prefs.showReceipts} onValueChange={(value) => setPref({ showReceipts: value })} trackColor={{ true: colors.accent, false: colors.border }} thumbColor={prefs.showReceipts ? colors.accentText : colors.text} />
            </View>
            <View style={[styles.optionRow, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <MaterialCommunityIcons name="keyboard-outline" size={21} color={colors.accent} />
              <Text style={[styles.rowText, { color: colors.text }]}>Show typing indicator</Text>
              <Switch value={prefs.showTyping} onValueChange={(value) => setPref({ showTyping: value })} trackColor={{ true: colors.accent, false: colors.border }} thumbColor={prefs.showTyping ? colors.accentText : colors.text} />
            </View>
            <View style={styles.optionRow}>
              <MaterialCommunityIcons name="bell-outline" size={21} color={colors.accent} />
              <Text style={[styles.rowText, { color: colors.text }]}>Notification sound</Text>
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

          <Pressable onPress={() => { setPrefs(DEFAULT_PREFS); if (conversationId) resetChatPrefs(conversationId); showToast('Your view reset'); }} style={({ pressed }) => [styles.ghostBtn, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="restore" size={17} color={colors.danger} /><Text style={{ color: colors.danger, fontWeight: '800' }}>Reset my view</Text></Pressable>
        </ScrollView>
      )}

      {toast ? <View style={[styles.toast, { backgroundColor: colors.text }]}><Text style={{ color: colors.background, fontSize: 13, fontWeight: '700' }}>{toast}</Text></View> : null}
    </SafeAreaView>
  );
}

function PreviewBubble({ custom, mine, text, sender }: { custom: GroupCustomization; mine: boolean; text: string; sender?: string }) {
  const theme = themeById(custom.theme);
  const look = bubbleLook(custom, theme, mine);
  const fontFamily = bubbleFont(custom);
  return (
    <View style={[styles.previewRow, mine && styles.previewRowMine]}>
      <View style={[styles.previewBubble, { backgroundColor: look.background, borderColor: look.borderColor, borderWidth: look.borderWidth, borderRadius: look.radius }]}>
        {!mine && sender ? <Text style={[styles.previewSender, { color: theme.sender, fontFamily }]}>{sender}</Text> : null}
        <Text style={[styles.previewText, { color: look.textColor, fontFamily }]}>{text}</Text>
        <Text style={[styles.previewTime, { color: theme.time }]}>{mine ? '✓✓ 12:04' : '12:04'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }, iconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, content: { padding: 16, paddingBottom: 36 },
  previewCard: { marginBottom: 4 }, sectionLabel: { fontSize: 10, fontWeight: '900', marginTop: 22, marginBottom: 9 }, lockNote: { fontSize: 11, marginTop: 8, textAlign: 'center' },
  preview: { height: 240, borderRadius: 12, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth }, previewHeader: { height: 40, paddingHorizontal: 14, justifyContent: 'center' }, previewHeaderText: { fontSize: 13, fontWeight: '800' }, previewBody: { flex: 1, padding: 14, justifyContent: 'flex-end', gap: 9 },
  previewRow: { alignItems: 'flex-start' }, previewRowMine: { alignItems: 'flex-end' }, previewBubble: { maxWidth: '82%', paddingHorizontal: 12, paddingVertical: 8 }, previewSender: { fontSize: 10, fontWeight: '700', marginBottom: 2 }, previewText: { fontSize: 14, lineHeight: 19 }, previewTime: { fontSize: 9, marginTop: 3, alignSelf: 'flex-end' },
  card: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 12 }, themeCell: { width: '18.5%', alignItems: 'center', gap: 5 }, themeSwatch: { width: '100%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', position: 'relative' }, themeSwatchInner: { flex: 1, padding: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }, swatchBubble: { width: 13, height: 9, borderRadius: 4, alignSelf: 'flex-end', marginBottom: 2 }, swatchBubbleMine: { width: 13, height: 9, borderRadius: 4, marginBottom: 2 }, themeCheck: { position: 'absolute', top: 3, right: 3, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, themeName: { fontSize: 9, fontWeight: '700', textAlign: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 12 }, chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: 'transparent' }, chipDisabled: { opacity: 0.7 }, chipText: { fontSize: 12, fontWeight: '700' },
  fontRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10 }, fontName: { fontSize: 14, fontWeight: '700', width: 88 }, fontSample: { flex: 1, fontSize: 13, textAlign: 'right' },
  primaryBtn: { minHeight: 50, borderRadius: 8, marginTop: 22, alignItems: 'center', justifyContent: 'center' }, ghostBtn: { minHeight: 48, borderRadius: 8, marginTop: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  personalNote: { fontSize: 12, marginTop: -4 }, optionRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 }, rowText: { flex: 1, fontSize: 14, fontWeight: '600' }, soundChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', gap: 6 },
  toast: { position: 'absolute', bottom: 30, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, maxWidth: '85%' },
});
