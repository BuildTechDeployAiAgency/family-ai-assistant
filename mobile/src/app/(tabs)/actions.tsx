import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Pill, SectionLabel } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { aggregateActions, formatDate, URGENCY_COLOR } from '@/lib/helpers';

export default function ActionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const actions = useMemo(() => aggregateActions(), []);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [owner, setOwner] = useState<string>('All');
  const [urgency, setUrgency] = useState<string>('All');

  const owners = useMemo(() => ['All', ...Array.from(new Set(actions.map((a) => a.owner)))], [actions]);
  const urgencies = ['All', 'high', 'medium', 'low'];

  const visible = useMemo(
    () =>
      actions.filter(
        (a) => (owner === 'All' || a.owner === owner) && (urgency === 'All' || a.urgency === urgency)
      ),
    [actions, owner, urgency]
  );

  const toggle = (id: string) => setDone((p) => ({ ...p, [id]: !p[id] }));
  const remaining = visible.filter((a) => !done[a.id]).length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}>
      <Card style={styles.banner}>
        <View>
          <Text style={styles.bannerValue}>{remaining}</Text>
          <Text style={styles.bannerLabel}>open actions</Text>
        </View>
        <Text style={styles.bannerHint}>
          Extracted by AI from {new Set(actions.map((a) => a.emailId)).size} family communications
        </Text>
      </Card>

      <View style={{ gap: 8 }}>
        <FilterRow options={owners} value={owner} onChange={setOwner} />
        <FilterRow options={urgencies} value={urgency} onChange={setUrgency} cap />
      </View>

      <SectionLabel>To do · by priority</SectionLabel>

      {visible.length === 0 && (
        <Card><Text style={styles.noneText}>No actions match these filters.</Text></Card>
      )}

      {visible.map((a) => {
        const isDone = !!done[a.id];
        return (
          <Card key={a.id} style={[styles.actionCard, isDone && styles.doneCard]}>
            <Pressable onPress={() => toggle(a.id)} hitSlop={8} style={styles.checkbox}>
              <Ionicons
                name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                size={26}
                color={isDone ? Brand.green : Brand.muted}
              />
            </Pressable>
            <View style={styles.actionBody}>
              <Text style={[styles.actionText, isDone && styles.doneText]}>{a.action}</Text>
              <View style={styles.actionMeta}>
                <Pill label={a.owner} color={Brand.accent} bg="rgba(0,194,255,0.14)" />
                <Pill
                  label={`Due ${formatDate(a.deadline)}`}
                  color={URGENCY_COLOR[a.urgency]}
                  bg={`${URGENCY_COLOR[a.urgency]}22`}
                />
              </View>
              <Pressable onPress={() => router.push(`/email/${a.emailId}`)} hitSlop={6}>
                <Text style={styles.source} numberOfLines={1}>
                  ↪ {a.emailSubject}
                </Text>
              </Pressable>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

function FilterRow({
  options,
  value,
  onChange,
  cap,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  cap?: boolean;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map((opt) => {
        const active = opt === value;
        const label = cap && opt !== 'All' ? opt.charAt(0).toUpperCase() + opt.slice(1) : opt;
        return (
          <Pressable key={opt} onPress={() => onChange(opt)} style={[styles.filterChip, active && styles.filterChipActive]}>
            <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border,
  },
  filterChipActive: { backgroundColor: Brand.accent, borderColor: Brand.accent },
  filterText: { color: Brand.muted, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#04121f' },
  noneText: { color: Brand.muted, fontSize: 13 },
  banner: { gap: 8 },
  bannerValue: { color: Brand.accent, fontSize: 34, fontWeight: '800' },
  bannerLabel: { color: Brand.muted, fontSize: 13, marginTop: -4 },
  bannerHint: { color: Brand.muted, fontSize: 12 },
  actionCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  doneCard: { opacity: 0.55 },
  checkbox: { paddingTop: 1 },
  actionBody: { flex: 1, gap: 8 },
  actionText: { color: Brand.text, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  doneText: { textDecorationLine: 'line-through', color: Brand.muted },
  actionMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  source: { color: Brand.muted, fontSize: 12, fontStyle: 'italic' },
});
