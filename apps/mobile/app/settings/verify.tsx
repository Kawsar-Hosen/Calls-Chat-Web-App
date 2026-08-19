import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/ui';
import { submitVerificationRequest, getMyVerificationRequest } from '@/api';
import { useAuth } from '@/auth';

const CATEGORIES = [
  { key: 'business', label: 'Business', icon: 'briefcase', color: '#1F66FF', desc: 'Businesses, brands, companies' },
  { key: 'personal', label: 'Personal', icon: 'person', color: '#34C759', desc: 'Public figures, creators, influencers' },
  { key: 'government', label: 'Government', icon: 'shield', color: '#FFB800', desc: 'Government officials, agencies' },
  { key: 'media', label: 'Media / Press', icon: 'newspaper', color: '#FF6B35', desc: 'News organizations, journalists' },
  { key: 'sports', label: 'Sports', icon: 'football', color: '#FF2D55', desc: 'Athletes, sports teams, leagues' },
  { key: 'music', label: 'Music', icon: 'musical-notes', color: '#AF52DE', desc: 'Musicians, bands, music labels' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: '#8E8E93', desc: 'Other notable accounts' },
];

export default function VerifyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [step, setStep] = useState<'choose' | 'form' | 'done'>('choose');
  const [category, setCategory] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState<any>(null);

  useEffect(() => {
    getMyVerificationRequest().then(r => {
      if (r) {
        setExisting(r);
        if (r.status === 'pending') setStep('done');
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!displayName.trim() || !reason.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await submitVerificationRequest(category, displayName.trim(), reason.trim());
      setStep('done');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  if (user?.isVerified) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenHeader title="Verification" back />
        <View style={styles.centerContent}>
          <Ionicons name="checkmark-circle" size={64} color="#34C759" />
          <Text style={styles.verifiedTitle}>You're Verified!</Text>
          <Text style={styles.verifiedSub}>Your account has been verified.</Text>
        </View>
      </View>
    );
  }

  if (step === 'done') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenHeader title="Verification" back />
        <View style={styles.centerContent}>
          <Ionicons name="time" size={64} color="#FFB800" />
          <Text style={styles.verifiedTitle}>Request Submitted</Text>
          <Text style={styles.verifiedSub}>
            Your verification request is being reviewed.{'\n'}
            We'll notify you once it's processed.
          </Text>
          {existing && (
            <View style={styles.statusCard}>
              <Text style={styles.statusLabel}>Status: <Text style={{ fontWeight: '700', color: existing.status === 'pending' ? '#FFB800' : existing.status === 'approved' ? '#34C759' : '#FF3B30' }}>{existing.status}</Text></Text>
              {existing.adminNotes && <Text style={styles.statusNotes}>Note: {existing.adminNotes}</Text>}
            </View>
          )}
        </View>
      </View>
    );
  }

  if (step === 'form') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenHeader title="Request Verification" back />
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.selectedCat}>
            <View style={[styles.catDot, { backgroundColor: CATEGORIES.find(c => c.key === category)?.color }]} />
            <Text style={styles.catLabel}>{CATEGORIES.find(c => c.key === category)?.label}</Text>
            <TouchableOpacity onPress={() => setStep('choose')}><Text style={styles.changeBtn}>Change</Text></TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Display Name on Account</Text>
          <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Your name as it appears" placeholderTextColor="#999" style={styles.input} />

          <Text style={styles.fieldLabel}>Why should you be verified?</Text>
          <TextInput value={reason} onChangeText={setReason} placeholder="Tell us about yourself and why you deserve verification..." placeholderTextColor="#999" style={[styles.input, styles.textArea]} multiline numberOfLines={5} textAlignVertical="top" />

          <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.5 }]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Submit Request</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Get Verified" back />
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.introTitle}>Apply for a verified badge</Text>
        <Text style={styles.introSub}>A verified badge lets people know your account is authentic and notable.</Text>

        <View style={styles.catList}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat.key} style={styles.catItem} onPress={() => { setCategory(cat.key); setStep('form'); }}>
              <View style={[styles.catIconWrap, { backgroundColor: cat.color + '15' }]}>
                <Ionicons name={cat.icon as any} size={24} color={cat.color} />
              </View>
              <View style={styles.catInfo}>
                <Text style={styles.catName}>{cat.label}</Text>
                <Text style={styles.catDesc}>{cat.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { flex: 1, paddingHorizontal: 16 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  verifiedTitle: { fontSize: 22, fontWeight: '800', marginTop: 16, color: '#191919' },
  verifiedSub: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  introTitle: { fontSize: 22, fontWeight: '800', marginTop: 16, color: '#191919' },
  introSub: { fontSize: 14, color: '#666', marginTop: 8, lineHeight: 20, marginBottom: 24 },
  catList: { gap: 8 },
  catItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E5E5E5' },
  catIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catInfo: { flex: 1, marginLeft: 12 },
  catName: { fontSize: 15, fontWeight: '700', color: '#191919' },
  catDesc: { fontSize: 12, color: '#999', marginTop: 2 },
  selectedCat: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginTop: 12, marginBottom: 20, borderWidth: 1, borderColor: '#E5E5E5' },
  catDot: { width: 12, height: 12, borderRadius: 6 },
  catLabel: { flex: 1, marginLeft: 10, fontWeight: '700', color: '#191919' },
  changeBtn: { color: '#1F66FF', fontWeight: '700', fontSize: 13 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E5E5', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#191919' },
  textArea: { height: 120, paddingTop: 12 },
  submitBtn: { backgroundColor: '#1F66FF', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  submitText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  statusCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginTop: 20, borderWidth: 1, borderColor: '#E5E5E5', width: '100%' },
  statusLabel: { fontSize: 14, color: '#666' },
  statusNotes: { fontSize: 13, color: '#999', marginTop: 8 },
});
