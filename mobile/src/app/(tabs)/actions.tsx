import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Pill, SectionLabel } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { addEventToCalendar } from '@/lib/calendar';
import { formatDate, URGENCY_COLOR } from '@/lib/helpers';
import { useTasks, type Task } from '@/store/tasks';

const TYPE_ICON: Record<Task['type'], keyof typeof Ionicons.glyphMap> = {
  task: 'checkmark-circle-outline',
  reminder: 'alarm-outline',
  meeting: 'calendar-outline',
};

export default function ActionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tasks, toggleComplete } = useTasks();
  const [owner, setOwner] = useState<string>('All');
  const [urgency, setUrgency] = useState<string>('All');

  const owners = useMemo(
    () => ['All', ...Array.from(new Set(tasks.map((t) => t.assignee)))],
    [tasks]
  );
  const urgencies = ['All', 'high', 'medium', 'low'];

  const URGENCY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const visible = useMemo(
    () =>
      tasks
        .filter(
          (t) => (owner === 'All' || t.assignee === owner) && (urgency === 'All' || t.urgency === urgency)
        )
        .sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          const byUrg = (URGENCY_RANK[a.urgency] ?? 1) - (URGENCY_RANK[b.urgency] ?? 1);
          if (byUrg !== 0) return byUrg;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }),
    [tasks, owner, urgency]
  );

  const remaining = tasks.filter((t) => !t.completed).length;

  const addMeetingToCalendar = async (task: Task) => {
    const start = task.startAt ? new Date(task.startAt) : new Date(`${task.dueDate}T09:00:00`);
    const end = task.endAt ? new Date(task.endAt) : new Date(start.getTime() + 60 * 60 * 1000);
    try {
      const ok = await addEventToCalendar({ title: task.title, notes: task.notes, startDate: start, endDate: end });
      Alert.alert(
        ok ? 'Added to calendar' : 'Calendar unavailable',
        ok ? `"${task.title}" is in your phone's calendar.` : 'Allow calendar access in Settings to add events.'
      );
    } catch (err) {
      console.error('Add to calendar failed:', err);
      Alert.alert('Calendar error', 'Could not add the event to your calendar.');
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 96, gap: 12 }}>
        <Card style={styles.banner}>
          <View>
            <Text style={styles.bannerValue}>{remaining}</Text>
            <Text style={styles.bannerLabel}>open items</Text>
          </View>
          <Text style={styles.bannerHint}>Tasks, reminders and meetings for the household</Text>
        </Card>

        <View style={{ gap: 8 }}>
          <FilterRow options={owners} value={owner} onChange={setOwner} />
          <FilterRow options={urgencies} value={urgency} onChange={setUrgency} cap />
        </View>

        <SectionLabel>To do · by priority</SectionLabel>

        {visible.length === 0 && (
          <Card>
            <Text style={styles.noneText}>
              Nothing here yet — tap + to add a task, reminder or meeting, or scan a document.
            </Text>
          </Card>
        )}

        {visible.map((t) => {
          return (
            <Card key={t.id} style={[styles.actionCard, t.completed && styles.doneCard]}>
              <Pressable onPress={() => toggleComplete(t.id)} hitSlop={8} style={styles.checkbox}>
                <Ionicons
                  name={t.completed ? 'checkmark-circle' : 'ellipse-outline'}
                  size={26}
                  color={t.completed ? Brand.green : Brand.muted}
                />
              </Pressable>
              <View style={styles.actionBody}>
                <View style={styles.titleRow}>
                  <Ionicons name={TYPE_ICON[t.type] ?? TYPE_ICON.task} size={14} color={Brand.muted} />
                  <Text style={[styles.actionText, t.completed && styles.doneText]}>{t.title}</Text>
                </View>
                <View style={styles.actionMeta}>
                  <Pill label={t.assignee} color={Brand.accent} bg="rgba(0,194,255,0.14)" />
                  <Pill
                    label={`Due ${formatDate(t.dueDate)}`}
                    color={URGENCY_COLOR[t.urgency] ?? Brand.muted}
                    bg={`${URGENCY_COLOR[t.urgency] ?? Brand.muted}22`}
                  />
                  {t.type !== 'task' && (
                    <Pill label={t.type === 'reminder' ? 'Reminder' : 'Meeting'} color={Brand.muted} />
                  )}
                </View>
                {!!t.notes && (
                  <Text style={styles.notes} numberOfLines={2}>
                    {t.notes}
                  </Text>
                )}
                {t.type === 'meeting' && !t.completed && (
                  <Pressable onPress={() => addMeetingToCalendar(t)} style={styles.calBtn} hitSlop={6}>
                    <Ionicons name="calendar" size={14} color={Brand.accent} />
                    <Text style={styles.calBtnText}>Add to calendar</Text>
                  </Pressable>
                )}
                {!!t.sourceEmailId && (
                  <Pressable onPress={() => router.push(`/email/${t.sourceEmailId}`)} hitSlop={6}>
                    <Text style={styles.source} numberOfLines={1}>
                      ↪ From a school email
                    </Text>
                  </Pressable>
                )}
              </View>
            </Card>
          );
        })}
      </ScrollView>
      <Pressable style={[styles.fab, { bottom: insets.bottom + 16 }]} onPress={() => router.push('/create')}>
        <Ionicons name="add" size={26} color="#04121f" />
      </Pressable>
    </View>
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
  root: { flex: 1, backgroundColor: Brand.bgBase },
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  fab: {
    position: 'absolute', right: 16, width: 56, height: 56, borderRadius: 28,
    backgroundColor: Brand.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border,
  },
  filterChipActive: { backgroundColor: Brand.accent, borderColor: Brand.accent },
  filterText: { color: Brand.muted, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#04121f' },
  noneText: { color: Brand.muted, fontSize: 13, lineHeight: 19 },
  banner: { gap: 8 },
  bannerValue: { color: Brand.accent, fontSize: 34, fontWeight: '800' },
  bannerLabel: { color: Brand.muted, fontSize: 13, marginTop: -4 },
  bannerHint: { color: Brand.muted, fontSize: 12 },
  actionCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  doneCard: { opacity: 0.55 },
  checkbox: { paddingTop: 1 },
  actionBody: { flex: 1, gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: Brand.text, fontSize: 15, fontWeight: '600', lineHeight: 20, flex: 1 },
  doneText: { textDecorationLine: 'line-through', color: Brand.muted },
  actionMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  notes: { color: Brand.muted, fontSize: 13, lineHeight: 18 },
  calBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  calBtnText: { color: Brand.accent, fontSize: 13, fontWeight: '600' },
  source: { color: Brand.muted, fontSize: 12, fontStyle: 'italic' },
});
