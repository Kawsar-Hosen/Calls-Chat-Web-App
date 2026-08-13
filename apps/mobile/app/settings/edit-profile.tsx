import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { prepareAvatarImage } from '@/api';
import { useAuth } from '@/auth';
import { COUNTRIES, findCountryByCode, searchCountries, type Country } from '@/countries';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';
import { Avatar, ErrorText, PrimaryButton } from '@/ui';

export default function EditProfileScreen() {
  const { user, updateProfile, uploadAvatar } = useAuth();
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [country, setCountry] = useState<Country | null>(() => findCountryByCode(user?.phoneCode));
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { if (user) { setDisplayName(user.displayName); setUsername(user.username); setBio(user.bio ?? ''); setEmail(user.email ?? ''); setCountry(findCountryByCode(user.phoneCode)); setPhone(user.phone ?? ''); } }, [user]);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
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
    if (!permission.granted) { setError('Photo permission is required to upload a profile picture.'); return; }
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
            <Pressable onPress={() => void choosePhoto()} style={({ pressed }) => [styles.photoButton, direction, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}><MaterialCommunityIcons name="image-outline" size={17} color={colors.accent} /><Text style={{ color: colors.accent, fontWeight: '800', fontSize: 13 }}>{uploading ? `Uploading… ${progress}%` : 'Upload photo'}</Text></Pressable>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, direction]}><View style={[styles.cardIcon, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="account-outline" size={18} color={colors.accent} /></View><Text style={[styles.cardTitle, alignment, { color: colors.text }]}>Profile</Text></View>
            <ClearField value={displayName} onChangeText={setDisplayName} placeholder="Display name" textAlign={isRTL ? 'right' : 'left'} />
            <ClearField value={username} onChangeText={setUsername} placeholder="Username" autoCapitalize="none" autoCorrect={false} textAlign={isRTL ? 'right' : 'left'} />
            <View style={[styles.usernameHint, direction]}>{usernameValid ? <MaterialCommunityIcons name="check-circle" size={13} color={colors.success} /> : <MaterialCommunityIcons name="information-outline" size={13} color={colors.faint} />}<Text style={[styles.fieldHint, { color: usernameValid ? colors.success : colors.muted }]}>3–32 characters, letters, numbers and underscore</Text></View>
            <ClearField value={bio} onChangeText={setBio} placeholder="A short bio" multiline maxLength={500} textAlign={isRTL ? 'right' : 'left'} style={{ minHeight: 78, paddingTop: 14, textAlignVertical: 'top' }} />
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
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 11 }, cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 2 }, cardIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, cardTitle: { fontSize: 15, fontWeight: '800' }, cardSub: { fontSize: 12, lineHeight: 17, marginBottom: 2 },
  inputWrap: { minHeight: 50, borderWidth: 1, borderRadius: 12, paddingLeft: 14, paddingRight: 6, alignItems: 'center', gap: 4, flexDirection: 'row' }, input: { flex: 1, minHeight: 48, fontSize: 15, paddingVertical: 0 }, clearBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  usernameHint: { alignItems: 'center', gap: 6, paddingHorizontal: 4, marginTop: -2 }, fieldHint: { fontSize: 11, fontWeight: '600' },
  countryPick: { minHeight: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, alignItems: 'center', gap: 10 }, countryPickText: { flex: 1, fontSize: 14, fontWeight: '700' }, countryFlag: { fontSize: 22 }, phoneValue: { alignItems: 'center', gap: 7, paddingHorizontal: 4 }, removeBtn: { minHeight: 30, borderWidth: 1, borderRadius: 15, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', gap: 5, flexDirection: 'row' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'flex-end' }, sheetCard: { borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, paddingBottom: 28, maxHeight: '82%' }, sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, sheetTitle: { fontSize: 17, fontWeight: '800' }, searchBar: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8 }, searchInput: { flex: 1, fontSize: 15 }, countryList: { flexGrow: 0, marginTop: 4 }, countryRow: { minHeight: 54, borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center', gap: 12, paddingHorizontal: 6 }, countryName: { flex: 1, fontSize: 14, fontWeight: '600' }, countryCode: { fontSize: 13, fontWeight: '800' }, sectionLabel: { fontSize: 10, fontWeight: '900', marginVertical: 10 }, emptySearch: { textAlign: 'center', paddingVertical: 40, fontSize: 13 },
  toast: { position: 'absolute', bottom: 30, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, maxWidth: '85%' },
});
