import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Link, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';
import { api } from '@/api';

const TOTAL_STEPS = 5;
const GENDERS = [
  { id: 'male', label: 'Male', icon: 'gender-male' as const },
  { id: 'female', label: 'Female', icon: 'gender-female' as const },
  { id: 'other', label: 'Other', icon: 'gender-non-binary' as const },
  { id: 'undisclosed', label: 'Prefer not to say', icon: 'shield-lock-outline' as const },
];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function RegisterScreen() {
  const { register } = useAuth();
  const { t, isRTL } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const fade = useRef(new Animated.Value(1)).current;

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dobMonth, setDobMonth] = useState(0);
  const [dobDay, setDobDay] = useState(1);
  const [dobYear, setDobYear] = useState(2005);
  const [gender, setGender] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canContinue = () => {
    if (step === 1) return displayName.trim().length >= 2 && email.includes('@');
    if (step === 2) return /^[a-zA-Z0-9_]{3,32}$/.test(username) && password.length >= 8;
    if (step === 3) return true;
    if (step === 4) return gender.length > 0;
    return true;
  };

  const animateStep = (dir: 1 | -1) => {
    Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setStep((s) => Math.min(TOTAL_STEPS, Math.max(1, s + dir)));
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const goNext = () => {
    if (step < TOTAL_STEPS) animateStep(1);
  };

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
  };

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      const dob = `${String(dobMonth + 1).padStart(2, '0')}/${String(dobDay).padStart(2, '0')}/${dobYear}`;
      await register({ displayName: displayName.trim(), username: username.trim(), email: email.trim(), password, dateOfBirth: dob, gender });
      if (photoUri) {
        try { await api.uploadAvatar(photoUri); } catch {}
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('authUnableCreate')); }
    finally { setLoading(false); }
  };

  const progress = step / TOTAL_STEPS;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, isRTL && { flexDirection: 'row-reverse' }]}>
        {step > 1 ? (
          <Pressable onPress={() => animateStep(-1)} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
          </Pressable>
        ) : <View style={{ width: 44 }} />}
        <Text style={[styles.stepCounter, { color: colors.muted }]}>{step}/{TOTAL_STEPS}</Text>
        {step === 1 ? (
          <Link href="/login" asChild>
            <Pressable style={styles.backBtn}>
              <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 14 }}>Login</Text>
            </Pressable>
          </Link>
        ) : <View style={{ width: 44 }} />}
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <Animated.View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${progress * 100}%` }]} />
      </View>

      <Animated.View style={{ flex: 1, opacity: fade }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {step === 1 && (
            <View style={styles.stepContent}>
              <View style={styles.stepIconWrap}>
                <View style={[styles.stepIcon, { backgroundColor: colors.accentSoft }]}>
                  <MaterialCommunityIcons name="account-outline" size={30} color={colors.accent} />
                </View>
              </View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>What's your name?</Text>
              <Text style={[styles.stepSubtitle, { color: colors.muted }]}>This is how others will see you</Text>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.muted }]}>FULL NAME</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                  <TextInput value={displayName} onChangeText={setDisplayName} placeholder="John Doe" placeholderTextColor={colors.faint} style={[styles.input, { color: colors.text }]} autoCapitalize="words" />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.muted }]}>EMAIL</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                  <MaterialCommunityIcons name="email-outline" size={18} color={colors.faint} />
                  <TextInput value={email} onChangeText={setEmail} placeholder="you@email.com" placeholderTextColor={colors.faint} keyboardType="email-address" autoCapitalize="none" style={[styles.input, { color: colors.text }]} />
                </View>
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContent}>
              <View style={styles.stepIconWrap}>
                <View style={[styles.stepIcon, { backgroundColor: colors.accentSoft }]}>
                  <MaterialCommunityIcons name="at" size={30} color={colors.accent} />
                </View>
              </View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Choose credentials</Text>
              <Text style={[styles.stepSubtitle, { color: colors.muted }]}>Pick a username and secure password</Text>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.muted }]}>USERNAME</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                  <Text style={[styles.atPrefix, { color: colors.faint }]}>{'@'}</Text>
                  <TextInput value={username} onChangeText={setUsername} placeholder="username" placeholderTextColor={colors.faint} autoCapitalize="none" autoCorrect={false} style={[styles.input, { color: colors.text }]} />
                  {username.length > 0 && (
                    <MaterialCommunityIcons name={/^[a-zA-Z0-9_]{3,32}$/.test(username) ? 'check-circle' : 'close-circle'} size={18} color={/^[a-zA-Z0-9_]{3,32}$/.test(username) ? colors.success : colors.danger} />
                  )}
                </View>
                {username.length > 0 && !/^[a-zA-Z0-9_]{3,32}$/.test(username) && (
                  <Text style={[styles.hint, { color: colors.danger }]}>3-32 characters, letters, numbers, underscore</Text>
                )}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.muted }]}>PASSWORD</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                  <MaterialCommunityIcons name="lock-outline" size={18} color={colors.faint} />
                  <TextInput value={password} onChangeText={setPassword} placeholder="8+ characters" placeholderTextColor={colors.faint} secureTextEntry={!showPassword} style={[styles.input, { color: colors.text, flex: 1 }]} />
                  <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                    <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.faint} />
                  </Pressable>
                </View>
                {password.length > 0 && password.length < 8 && (
                  <Text style={[styles.hint, { color: colors.danger }]}>At least 8 characters</Text>
                )}
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContent}>
              <View style={styles.stepIconWrap}>
                <View style={[styles.stepIcon, { backgroundColor: colors.accentSoft }]}>
                  <MaterialCommunityIcons name="cake-variant-outline" size={30} color={colors.accent} />
                </View>
              </View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>When's your birthday?</Text>
              <Text style={[styles.stepSubtitle, { color: colors.muted }]}>This won't be public</Text>

              <View style={styles.pickerRow}>
                <View style={styles.pickerCol}>
                  <Text style={[styles.pickerLabel, { color: colors.muted }]}>Month</Text>
                  <ScrollView style={[styles.pickerScroll, { backgroundColor: colors.elevated, borderColor: colors.border }]} showsVerticalScrollIndicator={false}>
                    {MONTHS.map((m, i) => (
                      <Pressable key={m} onPress={() => setDobMonth(i)} style={[styles.pickerItem, dobMonth === i && { backgroundColor: colors.accentSoft }]}>
                        <Text style={[styles.pickerText, { color: dobMonth === i ? colors.accent : colors.text }]}>{m}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.pickerCol}>
                  <Text style={[styles.pickerLabel, { color: colors.muted }]}>Day</Text>
                  <ScrollView style={[styles.pickerScroll, { backgroundColor: colors.elevated, borderColor: colors.border }]} showsVerticalScrollIndicator={false}>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <Pressable key={d} onPress={() => setDobDay(d)} style={[styles.pickerItem, dobDay === d && { backgroundColor: colors.accentSoft }]}>
                        <Text style={[styles.pickerText, { color: dobDay === d ? colors.accent : colors.text }]}>{d}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.pickerCol}>
                  <Text style={[styles.pickerLabel, { color: colors.muted }]}>Year</Text>
                  <ScrollView style={[styles.pickerScroll, { backgroundColor: colors.elevated, borderColor: colors.border }]} showsVerticalScrollIndicator={false}>
                    {Array.from({ length: 80 }, (_, i) => 2026 - i).map((y) => (
                      <Pressable key={y} onPress={() => setDobYear(y)} style={[styles.pickerItem, dobYear === y && { backgroundColor: colors.accentSoft }]}>
                        <Text style={[styles.pickerText, { color: dobYear === y ? colors.accent : colors.text }]}>{y}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={[styles.dobPreview, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                <MaterialCommunityIcons name="calendar-outline" size={18} color={colors.accent} />
                <Text style={[styles.dobPreviewText, { color: colors.text }]}>{MONTHS[dobMonth]} {dobDay}, {dobYear}</Text>
              </View>
            </View>
          )}

          {step === 4 && (
            <View style={styles.stepContent}>
              <View style={styles.stepIconWrap}>
                <View style={[styles.stepIcon, { backgroundColor: colors.accentSoft }]}>
                  <MaterialCommunityIcons name="account-group-outline" size={30} color={colors.accent} />
                </View>
              </View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>What's your gender?</Text>
              <Text style={[styles.stepSubtitle, { color: colors.muted }]}>Select one option</Text>

              <View style={styles.genderGrid}>
                {GENDERS.map((g) => {
                  const active = gender === g.id;
                  return (
                    <Pressable
                      key={g.id}
                      onPress={() => setGender(g.id)}
                      style={({ pressed }) => [styles.genderCard, {
                        backgroundColor: active ? colors.accentSoft : colors.elevated,
                        borderColor: active ? colors.accent : colors.border,
                        opacity: pressed ? 0.7 : 1
                      }]}
                    >
                      <MaterialCommunityIcons name={g.icon} size={28} color={active ? colors.accent : colors.muted} />
                      <Text style={[styles.genderLabel, { color: active ? colors.accent : colors.text }]}>{g.label}</Text>
                      {active && <MaterialCommunityIcons name="check-circle" size={20} color={colors.accent} />}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {step === 5 && (
            <View style={styles.stepContent}>
              <View style={styles.stepIconWrap}>
                <View style={[styles.stepIcon, { backgroundColor: colors.accentSoft }]}>
                  <MaterialCommunityIcons name="camera-plus-outline" size={30} color={colors.accent} />
                </View>
              </View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Add a photo</Text>
              <Text style={[styles.stepSubtitle, { color: colors.muted }]}>Help others recognize you</Text>

              <Pressable onPress={pickPhoto} style={[styles.photoCircle, { borderColor: colors.border, backgroundColor: colors.elevated }]}>
                {photoUri ? (
                  <Animated.Image source={{ uri: photoUri }} style={styles.photoImage} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <MaterialCommunityIcons name="camera-plus-outline" size={36} color={colors.faint} />
                    <Text style={[styles.photoHint, { color: colors.faint }]}>Tap to add</Text>
                  </View>
                )}
              </Pressable>

              <View style={styles.photoBtns}>
                <Pressable onPress={pickPhoto} style={[styles.photoBtn, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                  <MaterialCommunityIcons name="image-outline" size={20} color={colors.accent} />
                  <Text style={[styles.photoBtnText, { color: colors.text }]}>Library</Text>
                </Pressable>
                <Pressable onPress={takePhoto} style={[styles.photoBtn, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                  <MaterialCommunityIcons name="camera-outline" size={20} color={colors.accent} />
                  <Text style={[styles.photoBtnText, { color: colors.text }]}>Camera</Text>
                </Pressable>
              </View>

              {photoUri && (
                <Pressable onPress={() => setPhotoUri(null)}>
                  <Text style={[styles.removePhoto, { color: colors.danger }]}>Remove photo</Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>
      </Animated.View>

      <View style={[styles.bottomSection, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {step < TOTAL_STEPS ? (
          <Pressable
            onPress={goNext}
            disabled={!canContinue()}
            style={({ pressed }) => [styles.continueBtn, { backgroundColor: canContinue() ? colors.accent : colors.border, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.continueText}>Continue</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => void submit()}
            disabled={loading}
            style={({ pressed }) => [styles.continueBtn, { backgroundColor: colors.accent, opacity: loading ? 0.6 : pressed ? 0.85 : 1 }]}
          >
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.continueText}>Create Account</Text>}
          </Pressable>
        )}

        <View style={styles.switchRow}>
          <Text style={[styles.switchText, { color: colors.muted }]}>Already have an account?</Text>
          <Link href="/login" asChild>
            <Pressable>
              <Text style={[styles.switchLink, { color: colors.accent }]}>Sign In</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepCounter: { fontSize: 13, fontWeight: '700' },
  progressTrack: { height: 3, marginHorizontal: 20, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20 },
  stepContent: { flex: 1, gap: 16 },
  stepIconWrap: { alignItems: 'center', marginBottom: 4 },
  stepIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  stepSubtitle: { fontSize: 15, textAlign: 'center', marginBottom: 8 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  atPrefix: { fontSize: 18, fontWeight: '700' },
  eyeBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 12, fontWeight: '600' },
  pickerRow: { flexDirection: 'row', gap: 10, height: 220 },
  pickerCol: { flex: 1, gap: 6 },
  pickerLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', textAlign: 'center' },
  pickerScroll: { flex: 1, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  pickerItem: { paddingVertical: 10, alignItems: 'center' },
  pickerText: { fontSize: 15, fontWeight: '600' },
  dobPreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  dobPreviewText: { fontSize: 16, fontWeight: '700' },
  genderGrid: { gap: 10 },
  genderCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, borderWidth: 1 },
  genderLabel: { flex: 1, fontSize: 15, fontWeight: '700' },
  photoCircle: { alignSelf: 'center', width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoImage: { width: 140, height: 140, borderRadius: 70 },
  photoPlaceholder: { alignItems: 'center', gap: 6 },
  photoHint: { fontSize: 12, fontWeight: '600' },
  photoBtns: { flexDirection: 'row', gap: 12 },
  photoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  photoBtnText: { fontSize: 14, fontWeight: '700' },
  removePhoto: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  bottomSection: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 18, gap: 14 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600', flex: 1 },
  continueBtn: { height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  continueText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  switchText: { fontSize: 14 },
  switchLink: { fontSize: 14, fontWeight: '800' },
});
