import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';
import { ScreenHeader } from '@/ui';

export default function PrivacyScreen() {
  const { user, updateProfile } = useAuth();
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const router = useRouter();
  const [lastSeen, setLastSeen] = useState(user?.lastSeenVisible ?? true);
  const [online, setOnline] = useState(user?.onlineVisible ?? true);
  const [whoCanMsg, setWhoCanMsg] = useState(user?.whoCanMessage ?? 'everyone');
  const [whoCanPosts, setWhoCanPosts] = useState(user?.whoCanSeePosts ?? 'public');
  const [receipts, setReceipts] = useState(user?.readReceipts ?? true);
  const [typing, setTyping] = useState(user?.typingIndicator ?? true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const direction = { flexDirection: isRTL ? 'row-reverse' as const : 'row' as const };
  const alignment = { textAlign: isRTL ? 'right' as const : 'left' as const };

  const persist = async (patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      await updateProfile(patch as any);
      setToast('Saved');
      setTimeout(() => setToast(null), 2000);
    } catch {}
    setSaving(false);
  };

  const toggleLastSeen = () => { const v = !lastSeen; setLastSeen(v); void persist({ lastSeenVisible: v }); };
  const toggleOnline = () => { const v = !online; setOnline(v); void persist({ onlineVisible: v }); };
  const toggleReceipts = () => { const v = !receipts; setReceipts(v); void persist({ readReceipts: v }); };
  const toggleTyping = () => { const v = !typing; setTyping(v); void persist({ typingIndicator: v }); };

  const msgOptions = [
    { value: 'everyone', label: 'Everyone', desc: 'Anyone can send you messages' },
    { value: 'friends', label: 'Friends only', desc: 'Only people you follow can message you' },
    { value: 'nobody', label: 'Nobody', desc: 'No one can send you messages' },
  ];

  const postOptions = [
    { value: 'public', label: 'Everyone', desc: 'Anyone can see your posts' },
    { value: 'friends', label: 'Friends only', desc: 'Only your friends can see posts' },
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Privacy" back />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>VISIBILITY</Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <PRow icon="eye-outline" title="Last seen" desc={lastSeen ? 'Visible to everyone' : 'Hidden from everyone'} enabled={lastSeen} onToggle={toggleLastSeen} colors={colors} alignment={alignment} direction={direction} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <PRow icon="circle-double" title="Online status" desc={online ? 'Visible to everyone' : 'Hidden from everyone'} enabled={online} onToggle={toggleOnline} colors={colors} alignment={alignment} direction={direction} />
        </View>

        <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>MESSAGES</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {msgOptions.map((opt, i) => (
            <Pressable key={opt.value} onPress={() => { setWhoCanMsg(opt.value); void persist({ whoCanMessage: opt.value }); }} style={({ pressed }) => [styles.optionRow, direction, { backgroundColor: pressed ? colors.elevated : 'transparent', borderBottomColor: i < msgOptions.length - 1 ? colors.border : 'transparent' }]}>
              <View style={[styles.radio, { borderColor: whoCanMsg === opt.value ? colors.accent : colors.faint, backgroundColor: whoCanMsg === opt.value ? colors.accent : 'transparent' }]}>
                {whoCanMsg === opt.value && <View style={styles.radioDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, alignment, { color: colors.text }]}>{opt.label}</Text>
                <Text style={[styles.optionDesc, alignment, { color: colors.muted }]}>{opt.desc}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>POSTS</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {postOptions.map((opt, i) => (
            <Pressable key={opt.value} onPress={() => { setWhoCanPosts(opt.value); void persist({ whoCanSeePosts: opt.value }); }} style={({ pressed }) => [styles.optionRow, direction, { backgroundColor: pressed ? colors.elevated : 'transparent', borderBottomColor: i < postOptions.length - 1 ? colors.border : 'transparent' }]}>
              <View style={[styles.radio, { borderColor: whoCanPosts === opt.value ? colors.accent : colors.faint, backgroundColor: whoCanPosts === opt.value ? colors.accent : 'transparent' }]}>
                {whoCanPosts === opt.value && <View style={styles.radioDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, alignment, { color: colors.text }]}>{opt.label}</Text>
                <Text style={[styles.optionDesc, alignment, { color: colors.muted }]}>{opt.desc}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionLabel, alignment, { color: colors.muted }]}>CHAT INDICATORS</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <PRow icon="check-all" title="Read receipts" desc={receipts ? 'Others see when you read messages' : 'Hidden'} enabled={receipts} onToggle={toggleReceipts} colors={colors} alignment={alignment} direction={direction} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <PRow icon="pencil-outline" title="Typing indicator" desc={typing ? 'Others see when you type' : 'Hidden'} enabled={typing} onToggle={toggleTyping} colors={colors} alignment={alignment} direction={direction} />
        </View>
      </ScrollView>

      {toast ? <View style={[styles.toast, { backgroundColor: colors.text }]}><Text style={{ color: colors.background, fontSize: 13, fontWeight: '700' }}>{toast}</Text></View> : null}
    </SafeAreaView>
  );
}

function PRow({ icon, title, desc, enabled, onToggle, colors, alignment, direction }: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  desc: string;
  enabled: boolean;
  onToggle: () => void;
  colors: any;
  alignment: any;
  direction: any;
}) {
  return (
    <Pressable onPress={onToggle} style={({ pressed }) => [styles.prow, direction, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.prowIcon, { backgroundColor: (enabled ? colors.accent : colors.faint) + '18' }]}>
        <MaterialCommunityIcons name={icon} size={18} color={enabled ? colors.accent : colors.faint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.prowTitle, alignment, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.prowDesc, alignment, { color: colors.muted }]}>{desc}</Text>
      </View>
      <View style={[styles.toggle, { backgroundColor: enabled ? colors.accent : colors.border }]}>
        <View style={[styles.toggleDot, { transform: [{ translateX: enabled ? 18 : 2 }], backgroundColor: '#FFF' }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '800', marginTop: 12, marginBottom: 4, paddingHorizontal: 4, letterSpacing: 0.5 },
  card: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 54 },
  prow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 12 },
  prowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  prowTitle: { fontSize: 14, fontWeight: '700' },
  prowDesc: { fontSize: 11, marginTop: 2 },
  toggle: { width: 40, height: 24, borderRadius: 12, padding: 2, justifyContent: 'center' },
  toggleDot: { width: 20, height: 20, borderRadius: 10 },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFF' },
  optionTitle: { fontSize: 14, fontWeight: '700' },
  optionDesc: { fontSize: 11, marginTop: 2 },
  toast: { position: 'absolute', bottom: 30, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
});
