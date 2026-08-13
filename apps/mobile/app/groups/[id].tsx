import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useTheme } from '@/theme';
import type { Group, GroupApplication, GroupMember, User } from '@/types';
import { Avatar, SkeletonList } from '@/ui';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [applications, setApplications] = useState<GroupApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!id) return;
    if (!quiet) setLoading(true);
    setError('');
    try {
      const [groupRow, appRows] = await Promise.all([api.group(id), api.groupApplications(id)]);
      setGroup(groupRow); setApplications(appRows);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load group'); }
    finally { setLoading(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  useEffect(() => {
    if (!group?.name) return;
    router.setParams({ name: group.name });
  }, [group?.name]);

  const update = (next: Group) => {
    setGroup(next);
    if (next.myRole === 'member') {
      void load(true);
    }
  };

  const canManage = (member: GroupMember) => {
    if (!group || !user) return false;
    if (member.user.id === user.id) return false;
    if (group.myRole === 'owner') return true;
    if (group.myRole === 'admin' && member.role === 'member') return true;
    return false;
  };

  const changeRole = async (member: GroupMember, role: 'admin' | 'member') => {
    if (!group || busy) return;
    setBusy(true); setError('');
    try { update(await api.changeGroupMemberRole(group.id, member.user.id, role)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not change role'); }
    finally { setBusy(false); }
  };

  const removeMember = async (member: GroupMember) => {
    if (!group || busy) return;
    Alert.alert('Remove member', `Remove ${member.user.displayName} from ${group.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void doRemove(member) },
    ]);
  };

  const doRemove = async (member: GroupMember) => {
    if (!group) return;
    setBusy(true); setError('');
    try { update(await api.removeGroupMember(group.id, member.user.id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not remove member'); }
    finally { setBusy(false); }
  };

  const deleteGroup = () => {
    if (!group) return;
    Alert.alert('Delete group', `Delete ${group.name} for everyone? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void doDelete() },
    ]);
  };

  const doDelete = async () => {
    if (!group) return;
    setBusy(true); setError('');
    try { await api.deleteGroup(group.id); router.replace('/contacts/groups'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete group'); }
    finally { setBusy(false); }
  };

  if (!user) return null;
  if (loading) return <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}><View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}><Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable><Text style={[styles.headerTitle, { color: colors.text }]}>Group</Text></View><SkeletonList rows={6} /></SafeAreaView>;
  if (!group) return <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}><View style={styles.center}><Text style={{ color: colors.danger, fontWeight: '700' }}>{error || 'Group not found'}</Text></View></SafeAreaView>;

  const owner = group.members.find((member) => member.role === 'owner')?.user;

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{group.name}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.identity, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.groupAvatar, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="account-group-outline" size={30} color={colors.accent} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.identityName, { color: colors.text }]}>{group.name}</Text>
            <Text style={[styles.identityMeta, { color: colors.muted }]}>{group.memberCount} members · you are {group.myRole}</Text>
            {group.description ? <Text style={[styles.description, { color: colors.muted }]}>{group.description}</Text> : null}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.muted }]}>MEMBERS · {group.memberCount}</Text>
        <View style={[styles.memberCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {group.members.map((member) => (
            <View key={member.user.id} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
              <Avatar name={member.user.displayName} size={42} online={member.user.isOnline} />
              <View style={styles.memberCopy}>
                <Text numberOfLines={1} style={[styles.memberName, { color: colors.text }]}>{member.user.displayName}{member.user.id === user.id ? '  (you)' : ''}</Text>
                <Text numberOfLines={1} style={[styles.memberMeta, { color: colors.muted }]}>@{member.user.username} · {member.role}</Text>
              </View>
              {canManage(member) ? (
                <View style={styles.actions}>
                  {group.myRole === 'owner' && member.role !== 'owner' ? (
                    <Pressable onPress={() => void changeRole(member, member.role === 'admin' ? 'member' : 'admin')} style={({ pressed }) => [styles.roleBtn, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}><Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>{member.role === 'admin' ? 'Demote' : 'Promote'}</Text></Pressable>
                  ) : null}
                  <Pressable onPress={() => void removeMember(member)} style={({ pressed }) => [styles.removeBtn, { opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="account-remove-outline" size={19} color={colors.danger} /></Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>

        {group.myRole !== 'member' && applications.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>PENDING APPLICATIONS</Text>
            <View style={[styles.memberCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {applications.map((application) => (
                <View key={application.id} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                  <Avatar name={application.applicant.displayName} size={42} />
                  <View style={styles.memberCopy}><Text numberOfLines={1} style={[styles.memberName, { color: colors.text }]}>{application.applicant.displayName}</Text><Text numberOfLines={1} style={[styles.memberMeta, { color: colors.muted }]}>@{application.applicant.username}</Text></View>
                  <View style={styles.actions}>
                    <Pressable onPress={() => void respond(application, true)} style={({ pressed }) => [styles.acceptBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.75 : 1 }]}><MaterialCommunityIcons name="check" size={17} color={colors.accentText} /></Pressable>
                    <Pressable onPress={() => void respond(application, false)} style={({ pressed }) => [styles.rejectBtn, { backgroundColor: colors.elevated, opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="close" size={17} color={colors.muted} /></Pressable>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

        {group.myRole === 'owner' ? (
          <Pressable onPress={deleteGroup} style={({ pressed }) => [styles.dangerBtn, { borderColor: colors.border, opacity: busy ? 0.5 : pressed ? 0.55 : 1 }]}><MaterialCommunityIcons name="delete-outline" size={20} color={colors.danger} /><Text style={{ color: colors.danger, fontWeight: '800' }}>Delete group</Text></Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );

  async function respond(application: GroupApplication, accept: boolean) {
    if (!group) return;
    setBusy(true); setError('');
    try {
      await api.respondGroupApplication(group.id, application.id, accept);
      if (accept) void load(true);
      else setApplications((current) => current.filter((item) => item.id !== application.id));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not respond'); }
    finally { setBusy(false); }
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }, iconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, content: { padding: 16, paddingBottom: 32 },
  identity: { borderWidth: 1, borderRadius: 8, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 13 }, groupAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' }, identityName: { fontSize: 17, fontWeight: '800' }, identityMeta: { fontSize: 12, marginTop: 3 }, description: { fontSize: 12, marginTop: 7, lineHeight: 18 },
  sectionLabel: { fontSize: 10, fontWeight: '900', marginTop: 22, marginBottom: 9 }, memberCard: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  memberRow: { minHeight: 62, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 11 }, memberCopy: { flex: 1, minWidth: 0 }, memberName: { fontSize: 14, fontWeight: '800' }, memberMeta: { fontSize: 11, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 7 }, roleBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 }, removeBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  acceptBtn: { width: 34, height: 34, borderRadius: 7, alignItems: 'center', justifyContent: 'center' }, rejectBtn: { width: 34, height: 34, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  error: { fontSize: 13, marginTop: 14 }, dangerBtn: { minHeight: 50, borderWidth: 1, borderRadius: 7, marginTop: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
