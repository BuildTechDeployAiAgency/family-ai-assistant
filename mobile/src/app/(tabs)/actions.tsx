import { CheckCircle, CircleIcon } from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Pill, SectionLabel } from '@/components/ui';
import { Brand, FontFamily } from '@/constants/theme';
import { formatDate, URGENCY_COLOR } from '@/lib/helpers';
import { useData } from '@/store/data';

export default function ActionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tasks, communications, loading, toggleTask } = useData();
  const [owner, setOwner] = useState<string>('All');
  const [urgency, setUrgency] = useState<string>('All');

  const commSubject = useMemo(() => {
    const map: Record<string, string> = {};
    communications.forEach((c) => (map[c.id] = c.subject));
    return map;
  }, [communications]);

  const owners = useMemo(() => ['All', ...Array.from(new Set(tasks.map((t) => t.owner)))], [tasks]);
  const urgencies = ['All', 'high', 'medium', 'low'];

  const visible = useMemo(
    () =>
      tasks.filter(
        (t) => (owner === 'All' || t.owner === owner) && (urgency === 'All' || t.priority === urgency)
      ),
    [tasks, owner, urgency]
  );

  const remaining = visible.filter((t) => !t.completed).length;
  const sourcedCount = new Set(tasks.filter((t) => t.sourceCommId).map((t) => t.sourceCommId)).size;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Brand.accent} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}>
      <Card style={styles.banner}>
        <View>
          <Text style={styles.bannerValue}>{remaining}</Text>
          <Text style={styles.bannerLabel}>open actions</Text>
        </View>
        <Text style={styles.bannerHint}>Tracked across {sourcedCount} family communications</Text>
      </Card>

      <View style={{ gap: 8 }}>
        <FilterRow options={owners} value={owner} onChange={setOwner} />
        <FilterRow options={urgencies} value={urgency} onChange={setUrgency} cap />
      </View>

      <SectionLabel>To do · by priority</SectionLabel>

      {visible.length === 0 && (
        <Card><Text style={styles.noneText}>No actions match these filters.</Text></Card>
      )}

      {visible.map((t) => {
        const isDone = t.completed;
        const subject = t.sourceCommId ? commSubject[t.sourceCommId] : null;
        return (
          <Card key={t.id} style={[styles.actionCard, isDone && styles.doneCard]}>
            <Pressable onPress={() => toggleTask(t.id, !isDone)} hitSlop={8} style={styles.checkbox}>
              {isDone ? (
                <CheckCircle size={26} color={Brand.green} weight="fill" />
              ) : (
                <CircleIcon size={26} color={Brand.faint} />
              )}
            </Pressable>
            <View style={styles.actionBody}>
              <Text style={[styles.actionText, isDone && styles.doneText]}>{t.title}</Text>
              <View style={styles.actionMeta}>
                <Pill label={t.owner} color={Brand.accent} bg="rgba(0,194,255,0.14)" />
                {t.dueDate && (
                  <Pill
                    label={`Due ${formatDate(t.dueDate)}`}
                    color={URGENCY_COLOR[t.priority]}
                    bg={`${URGENCY_COLOR[t.priority]}22`}
                  />
                )}
              </View>
              {subject && t.sourceCommId && (
                <Pressable onPress={() => router.push(`/email/${t.sourceCommId}`)} hitSlop={6}>
                  <Text style={styles.source} numberOfLines={1}>↪ {subject}</Text>
                </Pressable>
              )}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.bgBase },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border,
  },
  filterChipActive: { backgroundColor: Brand.accent, borderColor: Brand.accent },
  filterText: { color: Brand.muted, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: Brand.onAccent },
  noneText: { color: Brand.muted, fontSize: 13 },
  banner: { gap: 8 },
  bannerValue: { color: Brand.accent, fontSize: 36, fontFamily: FontFamily.serif },
  bannerLabel: { color: Brand.muted, fontSize: 13, marginTop: -2, fontFamily: FontFamily.medium },
  bannerHint: { color: Brand.muted, fontSize: 12, fontFamily: FontFamily.regular },
  actionCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  doneCard: { opacity: 0.55 },
  checkbox: { paddingTop: 1 },
  actionBody: { flex: 1, gap: 8 },
  actionText: { color: Brand.text, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  doneText: { textDecorationLine: 'line-through', color: Brand.muted },
  actionMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  source: { color: Brand.muted, fontSize: 12, fontStyle: 'italic' },
});
