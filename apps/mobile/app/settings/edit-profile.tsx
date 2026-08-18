import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, prepareAvatarImage } from '@/api';
import { useAuth } from '@/auth';
import { COUNTRIES, findCountryByCode, searchCountries, type Country } from '@/countries';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';
import { Avatar, ConfirmSheet, ErrorText, PrimaryButton } from '@/ui';
import type { LocationResult, SocialLink } from '@/types';

const SOCIAL_PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: 'instagram' as const, color: '#E1306C', buildUrl: (u: string) => `https://instagram.com/${u}` },
  { id: 'twitter', label: 'X / Twitter', icon: 'twitter' as const, color: '#1DA1F2', buildUrl: (u: string) => `https://x.com/${u}` },
  { id: 'facebook', label: 'Facebook', icon: 'facebook' as const, color: '#1877F2', buildUrl: (u: string) => `https://facebook.com/${u}` },
  { id: 'youtube', label: 'YouTube', icon: 'youtube' as const, color: '#FF0000', buildUrl: (u: string) => `https://youtube.com/@${u}` },
  { id: 'tiktok', label: 'TikTok', icon: 'music-note' as const, color: '#000000', buildUrl: (u: string) => `https://tiktok.com/@${u}` },
  { id: 'snapchat', label: 'Snapchat', icon: 'ghost' as const, color: '#FFFC00', buildUrl: (u: string) => `https://snapchat.com/add/${u}` },
  { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin' as const, color: '#0A66C2', buildUrl: (u: string) => `https://linkedin.com/in/${u}` },
  { id: 'github', label: 'GitHub', icon: 'github' as const, color: '#333333', buildUrl: (u: string) => `https://github.com/${u}` },
  { id: 'discord', label: 'Discord', icon: 'chat' as const, color: '#5865F2', buildUrl: (u: string) => u },
  { id: 'telegram', label: 'Telegram', icon: 'send' as const, color: '#26A5E4', buildUrl: (u: string) => `https://t.me/${u}` },
  { id: 'twitch', label: 'Twitch', icon: 'twitch' as const, color: '#9146FF', buildUrl: (u: string) => `https://twitch.tv/${u}` },
  { id: 'pinterest', label: 'Pinterest', icon: 'pinterest' as const, color: '#BD081C', buildUrl: (u: string) => `https://pinterest.com/${u}` },
  { id: 'spotify', label: 'Spotify', icon: 'spotify' as const, color: '#1DB954', buildUrl: (u: string) => u },
];

export default function EditProfileScreen() {
  const { user, updateProfile, uploadAvatar, uploadCover, deleteAvatar, deleteCover } = useAuth();
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [customStatus, setCustomStatus] = useState(user?.customStatus ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [website, setWebsite] = useState(user?.website ?? '');
  const [accentColor, setAccentColor] = useState(user?.accentColor ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [country, setCountry] = useState<Country | null>(() => findCountryByCode(user?.phoneCode));
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [socialOpen, setSocialOpen] = useState(false);
  const [socialPlatform, setSocialPlatform] = useState(SOCIAL_PLATFORMS[0]);
  const [socialUsername, setSocialUsername] = useState('');

  const [locQuery, setLocQuery] = useState('');
  const [locResults, setLocResults] = useState<LocationResult[]>([]);
  const [locSearching, setLocSearching] = useState(false);
  const locTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ title: string; message: string; icon: string; iconColor: string; onConfirm: () => void }>({ title: '', message: '', icon: 'alert', iconColor: '', onConfirm: () => {} });

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName); setUsername(user.username); setBio(user.bio ?? '');
      setCustomStatus(user.customStatus ?? ''); setLocation(user.location ?? ''); setWebsite(user.website ?? '');
      setAccentColor(user.accentColor ?? ''); setEmail(user.email ?? '');
      setCountry(findCountryByCode(user.phoneCode)); setPhone(user.phone ?? '');
      if (user.id) api.getSocialLinks(user.id).then(setSocialLinks).catch(() => {});
    }
  }, [user]);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); if (locTimer.current) clearTimeout(locTimer.current); }, []);
  if (!user) return null;

  const alignment = { textAlign: isRTL ? 'right' as const : 'left' as const };
  const direction = { flexDirection: isRTL ? 'row-reverse' as const : 'row' as const };

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Photo permission is required.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.82 });
    if (result.canceled || !result.assets[0]?.uri) return;
    setUploading(true); setProgress(0); setError('');
    try {
      const resizedUri = await prepareAvatarImage(result.assets[0].uri);
      await uploadAvatar(resizedUri, (pct) => setProgress(pct));
      showToast('Photo updated');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to upload photo'); }
    finally { setUploading(false); }
  };

  const removeAvatar = () => {
    if (!user?.avatarUrl) return;
    setConfirmData({ title: 'Remove photo', message: 'Are you sure you want to delete your profile picture?', icon: 'camera-off', iconColor: colors.danger, onConfirm: async () => { try { await deleteAvatar(); showToast('Photo removed'); } catch {} setConfirmOpen(false); } });
    setConfirmOpen(true);
  };

  const removeCover = () => {
    if (!user?.coverUrl) return;
    setConfirmData({ title: 'Remove cover', message: 'Are you sure you want to delete your cover photo?', icon: 'image-off', iconColor: colors.danger, onConfirm: async () => { try { await deleteCover(); showToast('Cover removed'); } catch {} setConfirmOpen(false); } });
    setConfirmOpen(true);
  };

  const chooseCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Photo permission is required.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.85 });
    if (result.canceled || !result.assets[0]?.uri) return;
    setCoverUploading(true); setCoverProgress(0); setError('');
    try {
      await uploadCover(result.assets[0].uri, (pct) => setCoverProgress(pct));
      showToast('Cover photo updated');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to upload cover'); }
    finally { setCoverUploading(false); }
  };

  const save = async () => {
    const emailClean = email.trim();
    if (emailClean && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailClean)) { setError('Enter a valid email address'); return; }
    const phoneClean = phone.trim().replace(/[^\d]/g, '');
    if ((country?.code || phoneClean) && !phoneClean) { setError('Enter your phone number after choosing the country code'); return; }
    if (phoneClean && !country) { setError('Choose a country code first'); return; }
    setSaving(true); setError('');
    try {
      await updateProfile({
        displayName: displayName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        customStatus: customStatus.trim() || null,
        location: location.trim() || null,
        website: website.trim() || null,
        accentColor: accentColor || null,
        email: emailClean,
        phoneCode: phoneClean ? country!.code : null,
        phone: phoneClean || null,
      });
      showToast('Profile saved');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save profile'); }
    finally { setSaving(false); }
  };

  const removeNumber = () => { setPhone(''); setCountry(null); };

  const search = searchCountries(countryQuery);
  const hasNumber = !!(country && phone.trim());
  const usernameValid = /^[a-zA-Z0-9_]{3,32}$/.test(username.trim());

  const onLocationChange = useCallback((text: string) => {
    setLocation(text);
    if (locTimer.current) clearTimeout(locTimer.current);
    if (text.trim().length < 2) { setLocResults([]); return; }
    locTimer.current = setTimeout(() => {
      setLocSearching(true);
      api.searchLocations(text.trim()).then((r) => { setLocResults(r); setLocSearching(false); }).catch(() => setLocSearching(false));
    }, 500);
  }, []);

  const openAddSocial = (platform: typeof SOCIAL_PLATFORMS[number]) => {
    setSocialPlatform(platform);
    setSocialUsername('');
    setSocialOpen(true);
  };

  const saveSocial = async () => {
    if (!socialUsername.trim()) return;
    try {
      const link = await api.saveSocialLink({
        platform: socialPlatform.id,
        username: socialUsername.trim(),
        url: socialPlatform.buildUrl(socialUsername.trim()),
        sortOrder: socialLinks.length,
      });
      setSocialLinks((prev) => {
        const filtered = prev.filter((l) => l.platform !== socialPlatform.id);
        return [...filtered, link];
      });
      setSocialOpen(false);
      showToast(`${socialPlatform.label} linked`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Failed to save link'); }
  };

  const removeSocial = async (link: SocialLink) => {
    setConfirmData({ title: `Remove ${link.platform}?`, message: 'This link will be removed from your profile.', icon: 'link-variant-remove', iconColor: colors.danger, onConfirm: async () => { try { await api.deleteSocialLink(link.id); setSocialLinks((prev) => prev.filter((l) => l.id !== link.id)); } catch {} setConfirmOpen(false); } });
    setConfirmOpen(true);
  };

  const renderCountryList = (list: Country[]) => list.map((item) => (
    <Pressable key={`${item.code}-${item.name}`} onPress={() => { setCountry(item); setCountryOpen(false); }} style={({ pressed }) => [styles.countryRow, direction, { backgroundColor: pressed ? colors.elevated : colors.surface, borderColor: colors.border }]}>
      <Text style={styles.countryFlag}>{item.flag}</Text>
      <Text numberOfLines={1} style={[styles.countryName, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{item.name}</Text>
      <Text style={[styles.countryCode, { color: colors.muted }]}>{item.code}</Text>
      {country?.code === item.code ? <MaterialCommunityIcons name="check" size={19} color={colors.accent} /> : null}
    </Pressable>
  ));

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} /></Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Edit profile</Text>
          <View style={{ width: 38 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.photoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable accessibilityLabel="Upload photo" onPress={() => void choosePhoto()} style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}>
              <Avatar name={user.displayName} uri={user.avatarUrl} size={96} />
              <View style={[styles.camera, { backgroundColor: colors.accent, borderColor: colors.surface }]}><MaterialCommunityIcons name={uploading ? 'progress-clock' : 'camera'} size={16} color={colors.accentText} /></View>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => void choosePhoto()} style={({ pressed }) => [styles.photoButton, direction, { borderColor: colors.border, opacity: pressed ? 0.6 : 1, flex: 1 }]}><MaterialCommunityIcons name="image-outline" size={17} color={colors.accent} /><Text style={{ color: colors.accent, fontWeight: '800', fontSize: 13 }}>{uploading ? `Uploading… ${progress}%` : 'Upload photo'}</Text></Pressable>
              {user.avatarUrl ? (
                <Pressable onPress={removeAvatar} style={({ pressed }) => [styles.photoButton, direction, { borderColor: colors.danger + '40', opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="trash-can-outline" size={17} color={colors.danger} /></Pressable>
              ) : null}
            </View>
          </View>

          <View style={[styles.coverCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.coverLabel, { color: colors.muted }]}>Cover photo</Text>
            <Pressable onPress={() => void chooseCover()} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
              {user.coverUrl ? (
                <Image source={{ uri: user.coverUrl }} style={styles.coverPreview} />
              ) : (
                <View style={[styles.coverPreview, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
                  <MaterialCommunityIcons name="image-outline" size={32} color={colors.faint} />
                  <Text style={{ color: colors.faint, fontSize: 12, marginTop: 4 }}>Tap to upload cover</Text>
                </View>
              )}
            </Pressable>
            {coverUploading ? <Text style={[styles.uploadingText, { color: colors.muted }]}>Uploading… {coverProgress}%</Text> : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => void chooseCover()} style={({ pressed }) => [styles.photoButton, direction, { borderColor: colors.border, opacity: pressed ? 0.6 : 1, flex: 1 }]}>
                <MaterialCommunityIcons name="image-outline" size={17} color={colors.accent} />
                <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 13 }}>{coverUploading ? `Uploading… ${coverProgress}%` : user.coverUrl ? 'Change cover' : 'Upload cover'}</Text>
              </Pressable>
              {user.coverUrl ? (
                <Pressable onPress={removeCover} style={({ pressed }) => [styles.photoButton, direction, { borderColor: colors.danger + '40', opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="trash-can-outline" size={17} color={colors.danger} /></Pressable>
              ) : null}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, direction]}><View style={[styles.cardIcon, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="account-outline" size={18} color={colors.accent} /></View><Text style={[styles.cardTitle, alignment, { color: colors.text }]}>Profile</Text></View>
            <ClearField value={displayName} onChangeText={setDisplayName} placeholder="Display name" textAlign={isRTL ? 'right' : 'left'} />
            <ClearField value={username} onChangeText={setUsername} placeholder="Username" autoCapitalize="none" autoCorrect={false} textAlign={isRTL ? 'right' : 'left'} />
            <View style={[styles.usernameHint, direction]}>{usernameValid ? <MaterialCommunityIcons name="check-circle" size={13} color={colors.success} /> : <MaterialCommunityIcons name="information-outline" size={13} color={colors.faint} />}<Text style={[styles.fieldHint, { color: usernameValid ? colors.success : colors.muted }]}>3–32 characters, letters, numbers and underscore</Text></View>
            <ClearField value={bio} onChangeText={setBio} placeholder="A short bio" multiline maxLength={500} textAlign={isRTL ? 'right' : 'left'} style={{ minHeight: 78, paddingTop: 14, textAlignVertical: 'top' }} />
            <ClearField value={customStatus} onChangeText={setCustomStatus} placeholder="Custom status (e.g. Gaming)" maxLength={100} textAlign={isRTL ? 'right' : 'left'} />
            <ClearField value={website} onChangeText={setWebsite} placeholder="Website URL" maxLength={200} autoCapitalize="none" autoCorrect={false} textAlign={isRTL ? 'right' : 'left'} />
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, direction]}><View style={[styles.cardIcon, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.accent} /></View><Text style={[styles.cardTitle, alignment, { color: colors.text }]}>Location</Text></View>
            <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="magnify" size={16} color={colors.faint} />
              <TextInput
                value={location}
                onChangeText={onLocationChange}
                placeholder="Search location..."
                placeholderTextColor={colors.faint}
                style={[styles.input, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
                maxLength={120}
              />
              {locSearching ? <ActivityIndicator size="small" color={colors.accent} /> : null}
              {location ? <Pressable hitSlop={10} onPress={() => { setLocation(''); setLocResults([]); }} style={[styles.clearBtn, { backgroundColor: colors.elevated }]}><MaterialCommunityIcons name="close" size={13} color={colors.muted} /></Pressable> : null}
            </View>
            {locResults.length > 0 ? (
              <View style={[styles.locDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {locResults.map((loc, i) => (
                  <Pressable key={i} onPress={() => { setLocation(loc.display_name); setLocResults([]); }} style={({ pressed }) => [styles.locItem, { backgroundColor: pressed ? colors.elevated : 'transparent', borderBottomColor: colors.border }]}>
                    <MaterialCommunityIcons name="map-marker" size={14} color={colors.accent} />
                    <Text numberOfLines={2} style={[styles.locText, { color: colors.text }]}>{loc.display_name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, direction]}><View style={[styles.cardIcon, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="link-variant" size={18} color={colors.accent} /></View><Text style={[styles.cardTitle, alignment, { color: colors.text }]}>Social Links</Text></View>
            {socialLinks.length > 0 ? (
              <View style={styles.socialList}>
                {socialLinks.map((link) => {
                  const platform = SOCIAL_PLATFORMS.find((p) => p.id === link.platform);
                  return (
                    <View key={link.id} style={[styles.socialItem, direction, { borderColor: colors.border }]}>
                      <View style={[styles.socialIconWrap, { backgroundColor: (platform?.color || colors.accent) + '18' }]}>
                        <MaterialCommunityIcons name={platform?.icon || 'link'} size={18} color={platform?.color || colors.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.socialPlatform, { color: colors.text }]}>{platform?.label || link.platform}</Text>
                        <Text style={[styles.socialUsername, { color: colors.muted }]} numberOfLines={1}>@{link.username}</Text>
                      </View>
                      <Pressable onPress={() => removeSocial(link)} hitSlop={8}>
                        <MaterialCommunityIcons name="close-circle" size={20} color={colors.faint} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ) : <Text style={[styles.cardSub, alignment, { color: colors.muted }]}>Add links to your social profiles.</Text>}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.socialAddRow}>
              {SOCIAL_PLATFORMS.filter((p) => !socialLinks.find((l) => l.platform === p.id)).slice(0, 8).map((p) => (
                <Pressable key={p.id} onPress={() => openAddSocial(p)} style={({ pressed }) => [styles.socialAddBtn, { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
                  <MaterialCommunityIcons name={p.icon} size={16} color={p.color} />
                  <Text style={{ color: colors.text, fontSize: 11, fontWeight: '600' }}>{p.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, direction]}><View style={[styles.cardIcon, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="palette-outline" size={18} color={colors.accent} /></View><Text style={[styles.cardTitle, alignment, { color: colors.text }]}>Accent Color</Text></View>
            <View style={styles.colorRow}>
              {['', '#4D82FF', '#FF6B6B', '#51CF66', '#FFD43B', '#CC5DE8', '#FF922B', '#20C997', '#F06595', '#748FFC', '#63E6BE', '#E599F7', '#FFEC99'].map((c) => (
                <Pressable key={c || 'none'} onPress={() => setAccentColor(c)} style={[styles.colorDot, { backgroundColor: c || colors.background, borderColor: accentColor === c ? colors.text : colors.border, borderWidth: accentColor === c ? 2.5 : 1 }]} />
              ))}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, direction]}><View style={[styles.cardIcon, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="phone-outline" size={18} color={colors.accent} /></View><Text style={[styles.cardTitle, alignment, { color: colors.text }]}>Phone number</Text></View>
            <Text style={[styles.cardSub, alignment, { color: colors.muted }]}>Add your number so friends can find you. No verification required.</Text>
            <Pressable onPress={() => setCountryOpen(true)} style={({ pressed }) => [styles.countryPick, direction, { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
              <Text style={styles.countryFlag}>{country?.flag ?? '🌍'}</Text>
              <Text numberOfLines={1} style={[styles.countryPickText, { color: colors.text }]}>{country ? `${country.name} ${country.code}` : 'Choose country code'}</Text>
              <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-down'} size={19} color={colors.faint} />
            </Pressable>
            <ClearField value={phone} onChangeText={(text) => setPhone(text.replace(/[^\d]/g, ''))} placeholder="Phone number" keyboardType="phone-pad" maxLength={18} textAlign={isRTL ? 'right' : 'left'} />
            {hasNumber ? (
              <View style={[styles.phoneValue, direction]}><MaterialCommunityIcons name="phone-check" size={15} color={colors.success} /><Text style={{ color: colors.success, fontSize: 12, fontWeight: '800' }}>{country!.code} {phone}</Text><View style={{ flex: 1 }} /><Pressable onPress={removeNumber} hitSlop={8} style={[styles.removeBtn, { borderColor: colors.border }]}><MaterialCommunityIcons name="trash-can-outline" size={13} color={colors.danger} /><Text style={{ color: colors.danger, fontSize: 12, fontWeight: '800' }}>Remove</Text></Pressable></View>
            ) : null}
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, direction]}><View style={[styles.cardIcon, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="email-outline" size={18} color={colors.accent} /></View><Text style={[styles.cardTitle, alignment, { color: colors.text }]}>Email</Text></View>
            <Text style={[styles.cardSub, alignment, { color: colors.muted }]}>Changing your email updates your sign-in email.</Text>
            <ClearField value={email} onChangeText={setEmail} placeholder="Email address" autoCapitalize="none" keyboardType="email-address" autoCorrect={false} textAlign={isRTL ? 'right' : 'left'} />
          </View>

          {error ? <ErrorText>{error}</ErrorText> : null}
          <PrimaryButton title="Save changes" icon="check" loading={saving} disabled={!displayName.trim() || !usernameValid} onPress={() => void save()} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={countryOpen} transparent animationType="slide" onRequestClose={() => setCountryOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setCountryOpen(false)}>
          <Pressable onPress={() => undefined} style={[styles.sheetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.sheetHeader, direction]}><Text style={[styles.sheetTitle, { color: colors.text }]}>Choose country</Text><Pressable hitSlop={10} onPress={() => setCountryOpen(false)}><MaterialCommunityIcons name="close" size={22} color={colors.muted} /></Pressable></View>
            <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}><MaterialCommunityIcons name="magnify" size={18} color={colors.faint} /><TextInput autoFocus value={countryQuery} onChangeText={setCountryQuery} placeholder="Search country" placeholderTextColor={colors.faint} style={[styles.searchInput, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]} /></View>
            <ScrollView style={styles.countryList} keyboardShouldPersistTaps="handled">
              {countryQuery.trim() ? (
                search.all.length || search.popular.length ? (
                  <>
                    {search.popular.length ? <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>POPULAR</Text> : null}
                    {renderCountryList(search.popular)}
                    {search.all.length ? <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>ALL COUNTRIES</Text> : null}
                    {renderCountryList(search.all)}
                  </>
                ) : <Text style={[styles.emptySearch, { color: colors.muted }]}>No country found.</Text>
              ) : (
                <>
                  <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>POPULAR</Text>
                  {renderCountryList(COUNTRIES.filter((item) => search.popular.includes(item)))}
                  <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>ALL COUNTRIES</Text>
                  {renderCountryList(COUNTRIES.filter((item) => !search.popular.includes(item)))}
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={socialOpen} transparent animationType="slide" onRequestClose={() => setSocialOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSocialOpen(false)}>
          <Pressable onPress={() => undefined} style={[styles.sheetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.sheetHeader, direction]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name={socialPlatform.icon} size={22} color={socialPlatform.color} />
                <Text style={[styles.sheetTitle, { color: colors.text }]}>Add {socialPlatform.label}</Text>
              </View>
              <Pressable hitSlop={10} onPress={() => setSocialOpen(false)}><MaterialCommunityIcons name="close" size={22} color={colors.muted} /></Pressable>
            </View>
            <Text style={[styles.fieldHint, { color: colors.muted, marginBottom: 10 }]}>Enter your username or link</Text>
            <ClearField value={socialUsername} onChangeText={setSocialUsername} placeholder={`${socialPlatform.label} username`} autoCapitalize="none" autoCorrect={false} textAlign={isRTL ? 'right' : 'left'} />
            {socialUsername.trim() ? (
              <Text style={{ color: colors.faint, fontSize: 12, marginTop: 6 }}>URL: {socialPlatform.buildUrl(socialUsername.trim())}</Text>
            ) : null}
            <PrimaryButton title={`Link ${socialPlatform.label}`} icon="check" loading={false} disabled={!socialUsername.trim()} onPress={() => void saveSocial()} />
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmSheet visible={confirmOpen} title={confirmData.title} message={confirmData.message} icon={confirmData.icon as any} iconColor={confirmData.iconColor} onConfirm={confirmData.onConfirm} onCancel={() => setConfirmOpen(false)} confirmLabel="Delete" />

      {toast ? <View style={[styles.toast, { backgroundColor: colors.text }]}><Text style={{ color: colors.background, fontSize: 13, fontWeight: '700' }}>{toast}</Text></View> : null}
    </SafeAreaView>
  );
}

function ClearField(props: TextInputProps) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const value = typeof props.value === 'string' ? props.value : '';
  return (
    <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }, isRTL ? { flexDirection: 'row-reverse' } : null]}>
      <TextInput placeholderTextColor={colors.faint} {...props} style={[styles.input, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }, props.style]} />
      {value ? (
        <Pressable accessibilityLabel="Clear field" hitSlop={10} onPress={() => props.onChangeText?.('')} style={[styles.clearBtn, { backgroundColor: colors.elevated }]}>
          <MaterialCommunityIcons name="close" size={13} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 }, iconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  photoCard: { borderWidth: 1, borderRadius: 16, padding: 20, alignItems: 'center', gap: 14 }, camera: { position: 'absolute', right: -1, bottom: -1, width: 30, height: 30, borderRadius: 15, borderWidth: 3, alignItems: 'center', justifyContent: 'center' }, photoButton: { minHeight: 38, borderWidth: 1, borderRadius: 10, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', gap: 7 },
  coverCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 }, coverLabel: { fontSize: 12, fontWeight: '600' }, coverPreview: { width: '100%', height: 120, borderRadius: 10, overflow: 'hidden', resizeMode: 'cover' }, uploadingText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 11 }, cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 2 }, cardIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, cardTitle: { fontSize: 15, fontWeight: '800' }, cardSub: { fontSize: 12, lineHeight: 17, marginBottom: 2 },
  inputWrap: { minHeight: 50, borderWidth: 1, borderRadius: 12, paddingLeft: 14, paddingRight: 6, alignItems: 'center', gap: 4, flexDirection: 'row' }, input: { flex: 1, minHeight: 48, fontSize: 15, paddingVertical: 0 }, clearBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 }, colorDot: { width: 30, height: 30, borderRadius: 15 },
  usernameHint: { alignItems: 'center', gap: 6, paddingHorizontal: 4, marginTop: -2 }, fieldHint: { fontSize: 11, fontWeight: '600' },
  countryPick: { minHeight: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, alignItems: 'center', gap: 10 }, countryPickText: { flex: 1, fontSize: 14, fontWeight: '700' }, countryFlag: { fontSize: 22 }, phoneValue: { alignItems: 'center', gap: 7, paddingHorizontal: 4 }, removeBtn: { minHeight: 30, borderWidth: 1, borderRadius: 15, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', gap: 5, flexDirection: 'row' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'flex-end' }, sheetCard: { borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, paddingBottom: 28, maxHeight: '82%' }, sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, sheetTitle: { fontSize: 17, fontWeight: '800' }, searchBar: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8 }, searchInput: { flex: 1, fontSize: 15 }, countryList: { flexGrow: 0, marginTop: 4 }, countryRow: { minHeight: 54, borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center', gap: 12, paddingHorizontal: 6 }, countryName: { flex: 1, fontSize: 14, fontWeight: '600' }, countryCode: { fontSize: 13, fontWeight: '800' }, sectionLabel: { fontSize: 10, fontWeight: '900', marginVertical: 10 }, emptySearch: { textAlign: 'center', paddingVertical: 40, fontSize: 13 },
  toast: { position: 'absolute', bottom: 30, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, maxWidth: '85%' },
  socialList: { gap: 8 }, socialItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth }, socialIconWrap: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, socialPlatform: { fontSize: 13, fontWeight: '700' }, socialUsername: { fontSize: 12, marginTop: 1 },
  socialAddRow: { flexDirection: 'row', gap: 8, marginTop: 10 }, socialAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  locDropdown: { borderWidth: 1, borderRadius: 12, marginTop: 6, overflow: 'hidden' }, locItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth }, locText: { flex: 1, fontSize: 13, lineHeight: 17 },
});
