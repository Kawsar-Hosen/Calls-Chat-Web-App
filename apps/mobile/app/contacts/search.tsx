import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useI18n } from '@/i18n';
import { soundSettings } from '@/sound-settings';
import { playSound } from '@/sounds';
import { useTheme } from '@/theme';
import type { UserSearchResult } from '@/types';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { Avatar, SkeletonList } from '@/ui';

type Mode = 'number' | 'username' | 'email';

const MODES: { mode: Mode; icon: 'phone-outline' | 'account-outline' | 'email-outline'; labelKey: string; hintKey: string; placeholderKey: string }[] = [
  { mode: 'number', icon: 'phone-outline', labelKey: 'tabNumber', hintKey: 'numberHint', placeholderKey: 'numberPlaceholder' },
  { mode: 'username', icon: 'account-outline', labelKey: 'tabUsername', hintKey: 'usernameHint', placeholderKey: 'usernamePlaceholder' },
  { mode: 'email', icon: 'email-outline', labelKey: 'tabEmail', hintKey: 'emailHint', placeholderKey: 'emailPlaceholder' },
];

export default function SearchPeopleScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('number');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true); setError('');
    timer.current = setTimeout(() => {
      api.searchUsers(query.trim(), mode)
        .then(setResults)
        .catch((reason) => setError(reason instanceof Error ? reason.message : t('searchFailed')))
        .finally(() => setLoading(false));
    }, 320);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, mode]);

  const current = MODES.find((item) => item.mode === mode)!;
  const queryTooShort = query.trim().length > 0 && query.trim().length < 2;

  const openChat = useCallback(async (person: UserSearchResult) => {
    setBusyId(person.id); setError('');
    try {
      const conversationId = await api.startDirectChat(person.id);
      router.push({ pathname: '/chat/[id]', params: { id: conversationId, name: person.displayName, username: person.username, peerId: person.id, avatarUrl: person.avatarUrl ?? '' } });
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('unableOpenChat')); }
    finally { setBusyId(null); }
  }, [router, t]);

  const sendRequest = useCallback(async (person: UserSearchResult) => {
    setBusyId(person.id); setError('');
    try {
      await api.sendFriendRequest(person.id);
      if (person.requestStatus === 'incoming') { if (soundSettings().acceptSound) playSound('acceptFriend'); } else if (soundSettings().requestSound) playSound('friendRequest');
      setResults((items) => items.map((item) => item.id === person.id ? { ...item, isFriend: item.requestStatus === 'incoming', requestStatus: item.requestStatus === 'incoming' ? null : 'outgoing' } : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('requestFailed')); }
    finally { setBusyId(null); }
  }, [t]);

  const cancelRequest = useCallback(async (person: UserSearchResult) => {
    if (!person.requestId) return;
    setBusyId(person.id); setError('');
    try {
      await api.cancelFriendRequest(person.requestId);
      setResults((items) => items.map((item) => item.id === person.id ? { ...item, requestStatus: null, requestId: null } : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('couldNotCancel')); }
    finally { setBusyId(null); }
  }, [t]);

  const openProfile = (person: UserSearchResult) => {
    router.push({ pathname: '/contacts/[id]', params: { id: person.id, name: person.displayName, username: person.username } });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('searchPeople')}</Text>
      </View>

      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MaterialCommunityIcons name="magnify" size={19} color={colors.muted} />
        <TextInput autoFocus value={query} onChangeText={setQuery} placeholder={t(current.placeholderKey)} placeholderTextColor={colors.faint} keyboardType={mode === 'number' ? 'phone-pad' : mode === 'email' ? 'email-address' : 'default'} autoCapitalize={mode === 'username' || mode === 'email' ? 'none' : undefined} autoCorrect={false} style={[styles.searchInput, { color: colors.text }]} />
        {query ? <Pressable accessibilityLabel="Clear" hitSlop={8} onPress={() => setQuery('')} style={[styles.clearBtn, { backgroundColor: colors.elevated }]}><MaterialCommunityIcons name="close" size={14} color={colors.muted} /></Pressable> : null}
      </View>

      <View style={[styles.segments, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {MODES.map((item) => {
          const active = item.mode === mode;
          return (
            <Pressable key={item.mode} onPress={() => { setMode(item.mode); setQuery(''); setResults([]); }} style={({ pressed }) => [styles.segment, active ? { backgroundColor: colors.accent } : { backgroundColor: pressed ? colors.elevated : 'transparent' }]}>
              <MaterialCommunityIcons name={item.icon} size={16} color={active ? colors.accentText : colors.muted} />
              <Text style={[styles.segmentLabel, { color: active ? colors.accentText : colors.muted, fontWeight: active ? '900' : '700' }]}>{t(item.labelKey)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.hint, { color: colors.muted, textAlign: isRTL ? 'right' : 'left' }]}>{t(current.hintKey)}</Text>

      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        {loading ? <SkeletonList rows={5} /> : null}
        {!loading && queryTooShort ? <View style={styles.state}><View style={[styles.stateIcon, { backgroundColor: colors.elevated }]}><MaterialCommunityIcons name="keyboard-outline" size={34} color={colors.muted} /></View><Text style={[styles.stateText, { color: colors.muted }]}>{t('searchMinChars')}</Text></View> : null}
        {!loading && query.trim().length >= 2 && results.length === 0 && !error ? <View style={styles.state}><View style={[styles.stateIcon, { backgroundColor: colors.elevated }]}><MaterialCommunityIcons name="account-search-outline" size={34} color={colors.muted} /></View><Text style={[styles.stateText, { color: colors.muted }]}>{t('searchNoResults')}</Text></View> : null}

        {results.map((person) => (
          <Pressable key={person.id} onPress={() => openProfile(person)} style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.elevated : colors.surface, borderColor: colors.border }]}>
            <Avatar name={person.displayName} uri={person.avatarUrl ?? null} size={46} online={person.isOnline} />
            <View style={styles.rowCopy}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text numberOfLines={1} style={[styles.name, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{person.displayName}</Text>
                {person.isVerified ? <VerifiedBadge category={person.verifiedCategory ?? null} username={person.username} displayName={person.displayName} verifiedAt={person.verifiedAt ?? null} /> : null}
              </View>
              <Text numberOfLines={1} style={[styles.handle, { color: colors.muted, textAlign: isRTL ? 'right' : 'left' }]}>@{person.username}</Text>
              {mode === 'number' && (person.phoneCode || person.phone) ? <Text numberOfLines={1} style={[styles.phone, { color: colors.accent }]}><MaterialCommunityIcons name="cellphone" size={11} color={colors.accent} /> {person.phoneCode}{person.phone}</Text> : null}
            </View>
            {person.isBlocked ? <View style={[styles.pill, { backgroundColor: colors.danger }]}><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>{t('blocked')}</Text></View>
              : (
                <>
                  <Pressable accessibilityLabel="Message" hitSlop={8} disabled={busyId === person.id} onPress={() => void openChat(person)} style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.accentSoft, opacity: busyId === person.id ? 0.5 : pressed ? 0.65 : 1 }]}>
                    {busyId === person.id ? <ActivityIndicator size="small" color={colors.accent} /> : <MaterialCommunityIcons name="message-text-outline" size={19} color={colors.accent} />}
                  </Pressable>
                  {person.isFriend ? <View style={[styles.pill, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="check" size={12} color={colors.accent} /><Text style={{ color: colors.accent, fontSize: 11, fontWeight: '800' }}>{t('friend')}</Text></View>
                    : person.requestStatus === 'outgoing' ? <Pressable hitSlop={8} disabled={busyId === person.id} onPress={() => void cancelRequest(person)} style={({ pressed }) => [styles.pill, { backgroundColor: colors.elevated, opacity: pressed ? 0.6 : 1 }]}>
                        {busyId === person.id ? <ActivityIndicator size="small" color={colors.muted} /> : <MaterialCommunityIcons name="close" size={12} color={colors.muted} />}
                        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800' }}>{t('cancel')}</Text>
                      </Pressable>
                      : <Pressable accessibilityLabel={person.requestStatus === 'incoming' ? t('acceptFriendRequest') : t('addFriend')} hitSlop={8} disabled={busyId === person.id} onPress={() => void sendRequest(person)} style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.accent, opacity: busyId === person.id ? 0.5 : pressed ? 0.75 : 1 }]}>
                        {busyId === person.id ? <ActivityIndicator size="small" color={colors.accentText} /> : <MaterialCommunityIcons name={person.requestStatus === 'incoming' ? 'check' : 'account-plus-outline'} size={20} color={colors.accentText} />}
                      </Pressable>}
                </>
              )}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }, iconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  search: { height: 48, marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9 }, searchInput: { flex: 1, fontSize: 15 }, clearBtn: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segments: { marginHorizontal: 16, marginTop: 12, flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 4 }, segment: { flex: 1, height: 40, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, segmentLabel: { fontSize: 13 },
  hint: { fontSize: 12, marginHorizontal: 18, marginTop: 9, marginBottom: 4 },
  list: { padding: 16, paddingBottom: 40 }, error: { fontSize: 13, marginBottom: 8 }, state: { alignItems: 'center', paddingTop: 56, gap: 12 }, stateIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, stateText: { fontSize: 13, textAlign: 'center' },
  row: { minHeight: 72, borderWidth: 1, borderRadius: 16, marginBottom: 10, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 12 }, rowCopy: { flex: 1, minWidth: 0 }, name: { fontSize: 15, fontWeight: '800' }, handle: { fontSize: 12, marginTop: 2 }, phone: { fontSize: 12, marginTop: 2, fontWeight: '700' },
  iconBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, pill: { borderRadius: 20, paddingHorizontal: 11, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 4 },
});
