import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, prepareAvatarImage } from '@/api';
import { useAuth } from '@/auth';
import { setConversationMuted, useChatMeta } from '@/chat-meta';
import { useTheme } from '@/theme';
import type { Group, GroupApplication, GroupMember, GroupSettings, User } from '@/types';
import { Avatar, SkeletonList } from '@/ui';

type PermissionKey = 'canSend' | 'canSendMedia' | 'canAddMembers' | 'canEditInfo';

const PERMISSION_ROWS: { key: PermissionKey; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; hint: string }[] = [
  { key: 'canSend', icon: 'message-text-outline', label: 'Send messages', hint: 'Who can send messages in this group' },
  { key: 'canSendMedia', icon: 'image-multiple-outline', label: 'Send media & files', hint: 'Who can send photos, files and voice' },
  { key: 'canAddMembers', icon: 'account-plus-outline', label: 'Add members', hint: 'Who can add new members' },
  { key: 'canEditInfo', icon: 'pencil-outline', label: 'Edit group info', hint: 'Who can change name, description and photo' },
];

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const meta = useChatMeta();
  const [group, setGroup] = useState<Group | null>(null);
  const [applications, setApplications] = useState<GroupApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [permsOpen, setPermsOpen] = useState(false);
  const [adminsOpen, setAdminsOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

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

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const update = (next: Group) => {
    setGroup(next);
    if (next.myRole === 'member') {
      void load(true);
    }
  };

  const isPrivileged = group?.myRole === 'owner' || group?.myRole === 'admin';
  const canEditInfo = group ? isPrivileged || group.settings.canEditInfo === 'everyone' : false;
  const muted = group ? !!meta.muted[group.conversationId] : false;

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

  const openEdit = () => {
    if (!group) return;
    setEditName(group.name); setEditDesc(group.description ?? '');
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!group || busy) return;
    const name = editName.trim();
    if (!name) { showToast('Group name cannot be empty'); return; }
    setBusy(true); setError('');
    try {
      update(await api.updateGroup(group.id, { name, description: editDesc.trim() || null }));
      setEditOpen(false);
      showToast('Group info updated');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update group'); }
    finally { setBusy(false); }
  };

  const changePhoto = async () => {
    if (!group || busy || photoBusy) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (result.canceled || !result.assets.length) return;
      const asset = result.assets[0];
      if (!asset) return;
      setPhotoBusy(true); setError('');
      const prepared = await prepareAvatarImage(asset.uri);
      const attachment = await api.uploadMedia(prepared, 'group-photo.jpg', 'image/jpeg');
      update(await api.updateGroup(group.id, { avatarUrl: attachment.url }));
      showToast('Group photo updated');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not change photo'); }
    finally { setPhotoBusy(false); }
  };

  const savePermission = async (key: PermissionKey, value: 'everyone' | 'admins') => {
    if (!group || busy) return;
    const nextSettings = { ...group.settings, [key]: value } as GroupSettings;
    setGroup((current) => current ? { ...current, settings: nextSettings } : current);
    try { update(await api.updateGroup(group.id, { settings: nextSettings })); }
    catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update permissions');
      void load(true);
    }
  };

  const toggleMute = (value: boolean) => {
    if (!group) return;
    setConversationMuted(group.conversationId, value);
    showToast(value ? 'Notifications muted' : 'Notifications unmuted');
  };

  const leaveGroup = () => {
    if (!group || !user) return;
    Alert.alert('Leave group', `Leave ${group.name}? You can no longer see its messages.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => void doLeave() },
    ]);
  };

  const doLeave = async () => {
    if (!group || !user) return;
    setBusy(true); setError('');
    try { await api.removeGroupMember(group.id, user.id); router.replace('/contacts/groups'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not leave group'); }
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

  const openChat = (autoSearch = false) => {
    if (!group) return;
    router.push({ pathname: '/chat/[id]', params: { id: group.conversationId, name: group.name, groupId: group.id, ...(autoSearch ? { autoSearch: '1' } : {}) } });
  };

  if (!user) return null;
  if (loading) return <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}><View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}><Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable><Text style={[styles.headerTitle, { color: colors.text }]}>Group</Text></View><SkeletonList rows={6} /></SafeAreaView>;
  if (!group) return <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}><View style={styles.center}><Text style={{ color: colors.danger, fontWeight: '700' }}>{error || 'Group not found'}</Text></View></SafeAreaView>;

  const owner = group.members.find((member) => member.role === 'owner')?.user;

  const renderPermissionModal = () => (
    <Modal visible={permsOpen} transparent animationType="slide" onRequestClose={() => setPermsOpen(false)}>
      <Pressable style={styles.sheetBackdrop} onPress={() => setPermsOpen(false)}>
        <Pressable onPress={() => undefined} style={[styles.sheetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sheetHeader}><Text style={[styles.sheetTitle, { color: colors.text }]}>Group permissions</Text><Pressable hitSlop={10} onPress={() => setPermsOpen(false)}><MaterialCommunityIcons name="close" size={22} color={colors.muted} /></Pressable></View>
          {PERMISSION_ROWS.map((row) => {
            const value = group.settings[row.key];
            return (
              <View key={row.key} style={[styles.permRow, { borderBottomColor: colors.border }]}>
                <MaterialCommunityIcons name={row.icon} size={21} color={colors.accent} />
                <View style={styles.permCopy}><Text style={[styles.permLabel, { color: colors.text }]}>{row.label}</Text><Text style={[styles.permHint, { color: colors.muted }]}>{row.hint}</Text></View>
                <View style={[styles.segmented, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  {(['everyone', 'admins'] as const).map((option) => (
                    <Pressable key={option} onPress={() => void savePermission(row.key, option)} style={[styles.segmentBtn, value === option && { backgroundColor: colors.accent }]}>
                      <Text style={[styles.segmentText, { color: value === option ? colors.accentText : colors.muted }]}>{option === 'everyone' ? 'Everyone' : 'Admins only'}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}
          <Text style={[styles.sheetNote, { color: colors.muted }]}>Only group admins can change these settings.</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const renderAdminsModal = () => (
    <Modal visible={adminsOpen} transparent animationType="slide" onRequestClose={() => setAdminsOpen(false)}>
      <Pressable style={styles.sheetBackdrop} onPress={() => setAdminsOpen(false)}>
        <Pressable onPress={() => undefined} style={[styles.sheetCard, styles.adminsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sheetHeader}><Text style={[styles.sheetTitle, { color: colors.text }]}>Manage admins</Text><Pressable hitSlop={10} onPress={() => setAdminsOpen(false)}><MaterialCommunityIcons name="close" size={22} color={colors.muted} /></Pressable></View>
          <ScrollView style={styles.adminsList}>
            {group.members.map((member) => (
              <View key={member.user.id} style={[styles.adminRow, { borderBottomColor: colors.border }]}>
                <Avatar name={member.user.displayName} uri={member.user.avatarUrl ?? null} size={40} online={member.user.isOnline} />
                <View style={styles.memberCopy}><Text numberOfLines={1} style={[styles.memberName, { color: colors.text }]}>{member.user.displayName}{member.user.id === user.id ? '  (you)' : ''}</Text><Text style={[styles.memberMeta, { color: colors.muted }]}>@{member.user.username}</Text></View>
                {member.role === 'owner' ? <Text style={[styles.ownerTag, { color: colors.accent, backgroundColor: colors.accentSoft }]}>Owner</Text> : group.myRole === 'owner' ? (
                  <Switch value={member.role === 'admin'} onValueChange={(value) => void changeRole(member, value ? 'admin' : 'member')} trackColor={{ true: colors.accent, false: colors.border }} thumbColor={member.role === 'admin' ? colors.accentText : colors.muted} />
                ) : <Text style={[styles.memberMeta, { color: colors.muted }]}>{member.role === 'admin' ? 'Admin' : 'Member'}</Text>}
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const renderPinnedModal = () => {
    const pinned = meta.pinned[group.conversationId];
    const preview = (p: typeof pinned) => {
      if (!p) return '';
      switch (p.media) {
        case 'photo': return '📷 Photo';
        case 'video': return '🎬 Video';
        case 'voice': return '🎤 Voice message';
        case 'gif': return '🎞️ GIF';
        case 'sticker': return 'Sticker';
        case 'emoji': return p.content;
        default: return p.content;
      }
    };
    return (
      <Modal visible={pinnedOpen} transparent animationType="slide" onRequestClose={() => setPinnedOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setPinnedOpen(false)}>
          <Pressable onPress={() => undefined} style={[styles.sheetCard, styles.adminsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sheetHeader}><Text style={[styles.sheetTitle, { color: colors.text }]}>Pinned messages</Text><Pressable hitSlop={10} onPress={() => setPinnedOpen(false)}><MaterialCommunityIcons name="close" size={22} color={colors.muted} /></Pressable></View>
            {pinned ? (
              <Pressable onPress={() => { setPinnedOpen(false); openChat(); }} style={[styles.pinnedCard, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
                <MaterialCommunityIcons name="pin" size={18} color={colors.accent} />
                <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={[styles.memberName, { color: colors.text }]}>{preview(pinned)}</Text><Text style={[styles.memberMeta, { color: colors.muted }]}>Tap to open chat</Text></View>
              </Pressable>
            ) : (
              <Text style={[styles.sheetNote, { color: colors.muted }]}>No pinned messages yet. Long-press a message in the chat and choose “Pin message”.</Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{group.name}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.identity, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable disabled={!canEditInfo} onPress={() => void changePhoto()} style={styles.avatarWrap}>
            {group.avatarUrl ? <Image source={{ uri: group.avatarUrl }} style={styles.groupPhoto} /> : <View style={[styles.groupAvatar, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="account-group-outline" size={30} color={colors.accent} /></View>}
            {canEditInfo ? <View style={[styles.photoBadge, { backgroundColor: colors.accent }]}><MaterialCommunityIcons name="camera" size={13} color={colors.accentText} /></View> : null}
            {photoBusy ? <ActivityIndicator style={styles.photoBusy} color={colors.accentText} /> : null}
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Pressable disabled={!canEditInfo} onPress={openEdit}><Text style={[styles.identityName, { color: colors.text }]} numberOfLines={2}>{group.name}{canEditInfo ? '  ✎' : ''}</Text></Pressable>
            <Text style={[styles.identityMeta, { color: colors.muted }]}>{group.memberCount} members · you are {group.myRole}</Text>
            {group.description ? <Text style={[styles.description, { color: colors.muted }]}>{group.description}</Text> : null}
          </View>
        </View>

        {canEditInfo ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>GROUP DETAILS</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Pressable onPress={() => void changePhoto()} style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="camera-outline" size={21} color={colors.accent} /><Text style={[styles.rowText, { color: colors.text }]}>Change group photo</Text><MaterialCommunityIcons name="chevron-right" size={20} color={colors.faint} /></Pressable>
              <Pressable onPress={openEdit} style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="pencil-outline" size={21} color={colors.accent} /><Text style={[styles.rowText, { color: colors.text }]}>Edit group name</Text><MaterialCommunityIcons name="chevron-right" size={20} color={colors.faint} /></Pressable>
              <Pressable onPress={openEdit} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="card-text-outline" size={21} color={colors.accent} /><Text style={[styles.rowText, { color: colors.text }]}>Edit group description</Text><MaterialCommunityIcons name="chevron-right" size={20} color={colors.faint} /></Pressable>
            </View>
          </>
        ) : null}

        <Text style={[styles.sectionLabel, { color: colors.muted }]}>MEMBERS · {group.memberCount}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {group.myRole !== 'member' || group.settings.canAddMembers === 'everyone' ? (
            <Pressable onPress={() => router.push({ pathname: '/groups/add-members', params: { id: group.id, name: group.name } })} style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 }]}><View style={[styles.addMemberIcon, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="account-plus" size={20} color={colors.accent} /></View><Text style={[styles.rowText, { color: colors.accent, fontWeight: '800' }]}>Add members</Text></Pressable>
          ) : null}
          {group.members.map((member) => (
            <View key={member.user.id} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
              <Avatar name={member.user.displayName} uri={member.user.avatarUrl ?? null} size={42} online={member.user.isOnline} />
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
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {applications.map((application) => (
                <View key={application.id} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                  <Avatar name={application.applicant.displayName} uri={application.applicant.avatarUrl ?? null} size={42} />
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

        <Text style={[styles.sectionLabel, { color: colors.muted }]}>OPTIONS</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable onPress={() => router.push({ pathname: '/chat/customize', params: { id: group.conversationId, groupId: group.id, name: group.name } })} style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="palette-outline" size={21} color={colors.accent} /><Text style={[styles.rowText, { color: colors.text }]}>Customize chat</Text><Text style={[styles.soonTag, { color: colors.faint }]}>THEME · FONT · WALLPAPER</Text></Pressable>
          <Pressable disabled style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 0.45 }]}><MaterialCommunityIcons name="link-variant" size={21} color={colors.muted} /><Text style={[styles.rowText, { color: colors.muted }]}>Invite link / Share group link</Text><Text style={[styles.soonTag, { color: colors.faint }]}>SOON</Text></Pressable>
          {group.myRole === 'owner' ? (
            <Pressable onPress={() => setAdminsOpen(true)} style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="crown-outline" size={21} color={colors.accent} /><Text style={[styles.rowText, { color: colors.text }]}>Manage admins</Text><MaterialCommunityIcons name="chevron-right" size={20} color={colors.faint} /></Pressable>
          ) : null}
          {isPrivileged ? (
            <Pressable onPress={() => setPermsOpen(true)} style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="shield-account-outline" size={21} color={colors.accent} /><Text style={[styles.rowText, { color: colors.text }]}>Group permissions</Text><MaterialCommunityIcons name="chevron-right" size={20} color={colors.faint} /></Pressable>
          ) : null}
          <View style={[styles.row, { borderBottomColor: colors.border }]}><MaterialCommunityIcons name={muted ? 'bell-off-outline' : 'bell-outline'} size={21} color={colors.accent} /><Text style={[styles.rowText, { color: colors.text }]}>Mute notifications</Text><Switch value={muted} onValueChange={toggleMute} trackColor={{ true: colors.accent, false: colors.border }} thumbColor={muted ? colors.accentText : colors.text} /></View>
          <Pressable onPress={() => setPinnedOpen(true)} style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="pin-outline" size={21} color={colors.accent} /><Text style={[styles.rowText, { color: colors.text }]}>Pinned messages</Text><MaterialCommunityIcons name="chevron-right" size={20} color={colors.faint} /></Pressable>
          <Pressable onPress={() => openChat(true)} style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="magnify" size={21} color={colors.accent} /><Text style={[styles.rowText, { color: colors.text }]}>Search in group</Text><MaterialCommunityIcons name="chevron-right" size={20} color={colors.faint} /></Pressable>
          <Pressable onPress={() => router.push({ pathname: '/groups/shared', params: { conversationId: group.conversationId, name: group.name } })} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="folder-multiple-image" size={21} color={colors.accent} /><Text style={[styles.rowText, { color: colors.text }]}>Shared media, files & links</Text><MaterialCommunityIcons name="chevron-right" size={20} color={colors.faint} /></Pressable>
        </View>

        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

        {group.myRole !== 'owner' ? (
          <Pressable onPress={leaveGroup} style={({ pressed }) => [styles.leaveBtn, { borderColor: colors.danger, opacity: busy ? 0.5 : pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="logout" size={19} color={colors.danger} /><Text style={{ color: colors.danger, fontWeight: '800' }}>Leave group</Text></Pressable>
        ) : null}

        {group.myRole === 'owner' ? (
          <Pressable onPress={deleteGroup} style={({ pressed }) => [styles.dangerBtn, { borderColor: colors.border, opacity: busy ? 0.5 : pressed ? 0.55 : 1 }]}><MaterialCommunityIcons name="delete-outline" size={20} color={colors.danger} /><Text style={{ color: colors.danger, fontWeight: '800' }}>Delete group</Text></Pressable>
        ) : null}
      </ScrollView>

      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setEditOpen(false)}>
          <Pressable onPress={() => undefined} style={[styles.sheetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sheetHeader}><Text style={[styles.sheetTitle, { color: colors.text }]}>Edit group info</Text><Pressable hitSlop={10} onPress={() => setEditOpen(false)}><MaterialCommunityIcons name="close" size={22} color={colors.muted} /></Pressable></View>
            <Text style={[styles.label, { color: colors.muted }]}>GROUP NAME</Text>
            <TextInput value={editName} onChangeText={setEditName} placeholder="Group name" placeholderTextColor={colors.faint} maxLength={80} style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]} />
            <Text style={[styles.label, { color: colors.muted }]}>DESCRIPTION</Text>
            <TextInput value={editDesc} onChangeText={setEditDesc} placeholder="What is this group about?" placeholderTextColor={colors.faint} maxLength={500} multiline style={[styles.input, styles.multiline, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]} />
            <Pressable disabled={busy || !editName.trim()} onPress={() => void saveEdit()} style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.accent, opacity: busy || !editName.trim() ? 0.5 : pressed ? 0.8 : 1 }]}>{busy ? <ActivityIndicator color={colors.accentText} /> : <Text style={{ color: colors.accentText, fontWeight: '800', fontSize: 15 }}>Save</Text>}</Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {renderPermissionModal()}
      {renderAdminsModal()}
      {renderPinnedModal()}

      {toast ? <View style={[styles.toast, { backgroundColor: colors.text }]}><Text style={{ color: colors.background, fontSize: 13, fontWeight: '700' }}>{toast}</Text></View> : null}
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
  identity: { borderWidth: 1, borderRadius: 8, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 13 }, avatarWrap: { position: 'relative' }, groupAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }, groupPhoto: { width: 56, height: 56, borderRadius: 28 }, photoBadge: { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffffff' }, photoBusy: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, identityName: { fontSize: 17, fontWeight: '800' }, identityMeta: { fontSize: 12, marginTop: 3 }, description: { fontSize: 12, marginTop: 7, lineHeight: 18 },
  sectionLabel: { fontSize: 10, fontWeight: '900', marginTop: 22, marginBottom: 9 }, card: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  row: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth }, rowText: { flex: 1, fontSize: 14, fontWeight: '600' }, soonTag: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  addMemberIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  memberRow: { minHeight: 62, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 11 }, memberCopy: { flex: 1, minWidth: 0 }, memberName: { fontSize: 14, fontWeight: '800' }, memberMeta: { fontSize: 11, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 7 }, roleBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 }, removeBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  acceptBtn: { width: 34, height: 34, borderRadius: 7, alignItems: 'center', justifyContent: 'center' }, rejectBtn: { width: 34, height: 34, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  error: { fontSize: 13, marginTop: 14 }, leaveBtn: { minHeight: 50, borderWidth: 1, borderRadius: 7, marginTop: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, dangerBtn: { minHeight: 50, borderWidth: 1, borderRadius: 7, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }, sheetCard: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 18, paddingBottom: 30 }, sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }, sheetTitle: { fontSize: 17, fontWeight: '800' }, sheetNote: { fontSize: 12, marginTop: 14 },
  label: { fontSize: 10, fontWeight: '900', marginBottom: 7, marginTop: 10 }, input: { fontSize: 15, minHeight: 44, borderWidth: 1, borderRadius: 7, paddingHorizontal: 12 }, multiline: { minHeight: 78, textAlignVertical: 'top', paddingTop: 10 }, saveBtn: { minHeight: 50, borderRadius: 8, marginTop: 18, alignItems: 'center', justifyContent: 'center' },
  permRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth }, permCopy: { flex: 1, minWidth: 0 }, permLabel: { fontSize: 13, fontWeight: '700' }, permHint: { fontSize: 10, marginTop: 2 }, segmented: { borderRadius: 8, borderWidth: 1, flexDirection: 'row', padding: 2 }, segmentBtn: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 6 }, segmentText: { fontSize: 11, fontWeight: '800' },
  adminsCard: { maxHeight: '72%' }, adminsList: { flexGrow: 0 }, adminRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth }, ownerTag: { fontSize: 10, fontWeight: '900', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  pinnedCard: { borderWidth: 1, borderRadius: 8, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  toast: { position: 'absolute', bottom: 30, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, maxWidth: '85%' },
});
