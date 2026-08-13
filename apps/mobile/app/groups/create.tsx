import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useTheme } from '@/theme';
import type { User } from '@/types';
import { Avatar, SkeletonList } from '@/ui';

export default function CreateGroupScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [friends, setFriends] = useState<User[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    api.friends().then(setFriends).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load friends')).finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const toggle = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const submit = async () => {
    if (busy || !name.trim()) return;
    setBusy(true); setError('');
    try {
      const group = await api.createGroup(name.trim(), description.trim(), [...selected]);
      router.replace({ pathname: '/chat/[id]', params: { id: group.conversationId, name: group.name, groupId: group.id } });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create group'); }
    finally { setBusy(false); }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create Group</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.fieldCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.muted }]}>GROUP NAME</Text>
          <TextInput value={name} onChangeText={setName} placeholder="e.g. Design Team" placeholderTextColor={colors.faint} maxLength={80} style={[styles.input, { color: colors.text }]} />
          <Text style={[styles.label, { color: colors.muted }]}>DESCRIPTION</Text>
          <TextInput value={description} onChangeText={setDescription} placeholder="What is this group about?" placeholderTextColor={colors.faint} maxLength={500} multiline style={[styles.input, styles.multiline, { color: colors.text }]} />
        </View>
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>MEMBERS · {selected.size}</Text>
        {loading ? <SkeletonList rows={5} /> : friends.length === 0 ? <Text style={[styles.hint, { color: colors.muted }]}>Add friends first to build a group.</Text> : (
          <View style={styles.members}>
            {friends.map((friend) => {
              const active = selected.has(friend.id);
              return (
                <Pressable key={friend.id} onPress={() => toggle(friend.id)} style={({ pressed }) => [styles.tile, { backgroundColor: active ? colors.accentSoft : colors.surface, borderColor: active ? colors.accent : colors.border, opacity: pressed ? 0.8 : 1 }]}>
                  <Avatar name={friend.displayName} size={40} online={friend.isOnline} />
                  <Text numberOfLines={1} style={[styles.tileName, { color: colors.text }]}>{friend.displayName}</Text>
                  <Text numberOfLines={1} style={[styles.tileHandle, { color: colors.muted }]}>@{friend.username}</Text>
                  {active ? <MaterialCommunityIcons name="check-circle" size={18} color={colors.accent} /> : null}
                </Pressable>
              );
            })}
          </View>
        )}
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        <Pressable disabled={busy || !name.trim()} onPress={() => void submit()} style={({ pressed }) => [styles.createBtn, { backgroundColor: colors.accent, opacity: busy || !name.trim() ? 0.5 : pressed ? 0.8 : 1 }]}>{busy ? <ActivityIndicator color={colors.accentText} /> : <Text style={{ color: colors.accentText, fontWeight: '800', fontSize: 15 }}>Create group</Text>}</Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }, iconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 16, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 32 }, fieldCard: { borderWidth: 1, borderRadius: 8, padding: 14 }, label: { fontSize: 10, fontWeight: '900', marginBottom: 7 }, input: { fontSize: 15, minHeight: 42 }, multiline: { minHeight: 74, textAlignVertical: 'top', paddingTop: 8 },
  sectionLabel: { fontSize: 10, fontWeight: '900', marginTop: 22, marginBottom: 9 }, center: { paddingVertical: 30 }, hint: { fontSize: 13, textAlign: 'center' },
  members: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, tile: { width: '31.5%', borderWidth: 1, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', gap: 3 }, tileName: { fontSize: 12, fontWeight: '800', marginTop: 4 }, tileHandle: { fontSize: 10 },
  error: { fontSize: 13, marginTop: 14 }, createBtn: { minHeight: 52, borderRadius: 8, marginTop: 24, alignItems: 'center', justifyContent: 'center' },
});
