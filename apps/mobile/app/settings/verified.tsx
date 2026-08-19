import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/auth';
import { useTheme } from '@/theme';
import { ScreenHeader } from '@/ui';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/components/VerifiedBadge';
import { getMyVerificationRequest, type VerificationRequest } from '@/api';

export default function VerifiedBadgeScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyVerificationRequest()
      .then(setRequest)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  const isVerified = user.isVerified;
  const category = user.verifiedCategory || request?.category || null;
  const color = CATEGORY_COLORS[category || ''] || CATEGORY_COLORS.other;
  const label = CATEGORY_LABELS[category || ''] || 'Other';

  const formattedDate = user.verifiedAt
    ? new Date(user.verifiedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Verified Badge" back />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : isVerified ? (
          <>
            {/* Verified Hero */}
            <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.heroIcon, { backgroundColor: color + '15' }]}>
                <MaterialCommunityIcons name="check-decagram" size={64} color={color} />
              </View>
              <Text style={[styles.heroTitle, { color: colors.text }]}>You're Verified</Text>
              <Text style={[styles.heroSubtitle, { color: colors.muted }]}>
                Your account has been verified by XYTEEE
              </Text>

              {/* Category pill */}
              <View style={[styles.categoryPill, { backgroundColor: color + '18' }]}>
                <MaterialCommunityIcons name="shield-check" size={16} color={color} />
                <Text style={[styles.categoryText, { color }]}>{label}</Text>
              </View>
            </View>

            {/* Details card */}
            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.muted }]}>Account</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{user.displayName} @{user.username}</Text>
              </View>
              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.muted }]}>Verification type</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.miniDot, { backgroundColor: color }]} />
                  <Text style={[styles.detailValue, { color }]}>{label}</Text>
                </View>
              </View>
              {formattedDate ? (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.muted }]}>Verified on</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formattedDate}</Text>
                </View>
              ) : null}
            </View>

            {/* Info */}
            <View style={[styles.infoCard, { backgroundColor: color + '08', borderColor: color + '20' }]}>
              <MaterialCommunityIcons name="information-outline" size={18} color={color} />
              <Text style={[styles.infoText, { color: colors.muted }]}>
                Your verified badge is visible on your profile, posts, comments, and messages. Others can tap the badge to see your verification details.
              </Text>
            </View>
          </>
        ) : request?.status === 'pending' ? (
          /* Pending state */
          <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.heroIcon, { backgroundColor: colors.accentSoft }]}>
              <MaterialCommunityIcons name="clock-outline" size={64} color={colors.accent} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Request Pending</Text>
            <Text style={[styles.heroSubtitle, { color: colors.muted }]}>
              Your verification request is being reviewed. We'll notify you once it's processed.
            </Text>
            {request?.created_at ? (
              <Text style={[styles.pendingDate, { color: colors.faint }]}>
                Submitted {new Date(request.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
            ) : null}
          </View>
        ) : (
          /* Not verified state */
          <>
            <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.heroIcon, { backgroundColor: colors.accentSoft }]}>
                <MaterialCommunityIcons name="shield-check-outline" size={64} color={colors.accent} />
              </View>
              <Text style={[styles.heroTitle, { color: colors.text }]}>Get Verified</Text>
              <Text style={[styles.heroSubtitle, { color: colors.muted }]}>
                Verification confirms your identity and adds a badge to your profile, posts, and messages.
              </Text>
            </View>

            {/* Benefits */}
            <View style={[styles.benefitsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {[
                { icon: 'check-decagram', text: 'Colored badge on your profile & posts', color: '#1F66FF' },
                { icon: 'account-check', text: 'Builds trust with other users', color: '#34C759' },
                { icon: 'shield-star', text: 'Higher visibility in search results', color: '#FFB800' },
              ].map((b, i) => (
                <View key={i} style={[styles.benefitRow, { borderBottomColor: i < 2 ? colors.border : 'transparent' }]}>
                  <View style={[styles.benefitIcon, { backgroundColor: b.color + '15' }]}>
                    <MaterialCommunityIcons name={b.icon as any} size={18} color={b.color} />
                  </View>
                  <Text style={[styles.benefitText, { color: colors.text }]}>{b.text}</Text>
                </View>
              ))}
            </View>

            {/* CTA */}
            <Pressable onPress={() => router.push('/settings/verify')} style={({ pressed }) => [styles.ctaBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}>
              <MaterialCommunityIcons name="shield-plus" size={20} color="#FFFFFF" />
              <Text style={styles.ctaText}>Request Verification</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },

  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    marginTop: 8,
  },
  heroIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '700',
  },

  detailCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  infoCard: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },

  pendingDate: {
    fontSize: 12,
    marginTop: 12,
  },

  benefitsCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  benefitIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },

  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
