import { CalendarBlank, CaretRight, CheckCircle, CircleIcon, Plus, Trash } from 'phosphor-react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Pill, ProgressBar, SectionLabel } from '@/components/ui';
import { Brand, FontFamily, Radius } from '@/constants/theme';
import { REFERENCE_DATE } from '@/data/fixtures';
import { formatDate, getDaysDifference, URGENCY_COLOR } from '@/lib/helpers';
import { api } from '@/lib/api';
import { useData } from '@/store/data';

interface Step {
  id: string;
  taskId: string;
  title: string;
  detail: string | null;
  position: number;
  completed: boolean;
  status: string;
}

// Add N days to a YYYY-MM-DD string, returning YYYY-MM-DD.
function addDays(base: string, n: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const SNOOZE = [
  { label: '+1 week', days: 7 },
  { label: '+1 month', days: 30 },
  { label: '+3 months', days: 90 },
];

export default function ActionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tasks, communications, members, updateTask } = useData();
  const task = tasks.find((t) => t.id === id);

  const [steps, setSteps] = useState<Step[] | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .steps(id)
      .then(({ steps }) => alive && setSteps(steps as Step[]))
      .catch((err) => {
        console.error('Failed to load steps:', err);
        if (alive) setSteps([]);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const ownerColor = useMemo(() => {
    const m = members.find((mm) => mm.name === task?.owner);
    return m?.color ?? Brand.accent;
  }, [members, task]);

  const sourceSubject = useMemo(() => {
    if (!task?.sourceCommId) return null;
    return communications.find((c) => c.id === task.sourceCommId)?.subject ?? null;
  }, [communications, task]);

  if (!task) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Action' }} />
        <Text style={styles.muted}>Action not found.</Text>
      </View>
    );
  }

  const doneSteps = steps?.filter((s) => s.completed).length ?? 0;
  const totalSteps = steps?.length ?? 0;
  const due = task.dueDate ? getDaysDifference(task.dueDate, REFERENCE_DATE) : null;
  const dueColor = due === null ? Brand.muted : due < 0 ? Brand.red : due <= 14 ? Brand.amber : Brand.muted;
  const dueLabel =
    task.dueDate === null || task.dueDate === undefined
      ? 'No due date'
      : due! < 0
        ? `Overdue · ${formatDate(task.dueDate)}`
        : `Due ${formatDate(task.dueDate)}`;

  async function setDue(dueDate: string | null) {
    try {
      await updateTask(id, { dueDate });
    } catch {
      // optimistic store reverts; surface nothing noisy for the POC
    }
  }

  async function toggleDone() {
    try {
      await updateTask(id, { completed: !task!.completed });
    } catch {
      /* store reverts */
    }
  }

  async function toggleStep(step: Step) {
    const next = !step.completed;
    setSteps((prev) => prev?.map((s) => (s.id === step.id ? { ...s, completed: next } : s)) ?? null);
    try {
      await api.updateStep(step.id, { completed: next });
    } catch (err) {
      console.error('Failed to update step:', err);
      setSteps((prev) => prev?.map((s) => (s.id === step.id ? { ...s, completed: !next } : s)) ?? null);
    }
  }

  async function addStep() {
    const title = newTitle.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      const { step } = await api.createStep(id, title, steps?.length ?? 0);
      setSteps((prev) => [...(prev ?? []), step as Step]);
      setNewTitle('');
    } catch (err) {
      console.error('Failed to add step:', err);
    } finally {
      setAdding(false);
    }
  }

  async function removeStep(step: Step) {
    setSteps((prev) => prev?.filter((s) => s.id !== step.id) ?? null);
    try {
      await api.deleteStep(step.id);
    } catch (err) {
      console.error('Failed to remove step:', err);
      setSteps((prev) => [...(prev ?? []), step].sort((a, b) => a.position - b.position));
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Action' }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 16 }}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <Card style={{ gap: 14 }}>
          <Text style={styles.title}>{task.title}</Text>
          <View style={styles.metaRow}>
            <Pill label={task.owner} color={ownerColor} bg={`${ownerColor}22`} />
            <Pill
              label={task.priority}
              color={URGENCY_COLOR[task.priority]}
              bg={`${URGENCY_COLOR[task.priority]}22`}
            />
          </View>

          {/* Mark done */}
          <Pressable onPress={toggleDone} style={[styles.doneBtn, task.completed && styles.doneBtnOn]}>
            {task.completed ? (
              <CheckCircle size={22} color={Brand.green} weight="fill" />
            ) : (
              <CircleIcon size={22} color={Brand.faint} />
            )}
            <Text style={[styles.doneBtnText, task.completed && { color: Brand.green }]}>
              {task.completed ? 'Completed' : 'Mark as done'}
            </Text>
          </Pressable>
        </Card>

        {/* Due date */}
        <Card style={{ gap: 12 }}>
          <View style={styles.dueHeader}>
            <View style={styles.dueLeft}>
              <CalendarBlank size={18} color={dueColor} weight="bold" />
              <Text style={[styles.dueLabel, { color: dueColor }]}>{dueLabel}</Text>
            </View>
            {task.dueDate ? (
              <Pressable onPress={() => setDue(null)} hitSlop={8}>
                <Text style={styles.clearLink}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.snoozeRow}>
            {SNOOZE.map((s) => (
              <Pressable key={s.label} onPress={() => setDue(addDays(REFERENCE_DATE, s.days))} style={styles.snoozeChip}>
                <Text style={styles.snoozeText}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Steps */}
        <View style={{ gap: 12 }}>
          <View style={styles.stepsHead}>
            <SectionLabel>Steps</SectionLabel>
            {totalSteps > 0 && (
              <Text style={styles.stepsCount}>
                {doneSteps}/{totalSteps} done
              </Text>
            )}
          </View>

          {totalSteps > 0 && <ProgressBar value={totalSteps ? (doneSteps / totalSteps) * 100 : 0} />}

          {steps === null ? (
            <ActivityIndicator color={Brand.accent} style={{ marginVertical: 12 }} />
          ) : steps.length === 0 ? (
            <Card>
              <Text style={styles.muted}>No steps yet. Break this action into smaller steps below.</Text>
            </Card>
          ) : (
            steps.map((step) => (
              <Card key={step.id} style={styles.stepCard}>
                <Pressable onPress={() => toggleStep(step)} hitSlop={6} style={{ paddingTop: 1 }}>
                  {step.completed ? (
                    <CheckCircle size={24} color={Brand.green} weight="fill" />
                  ) : (
                    <CircleIcon size={24} color={Brand.faint} />
                  )}
                </Pressable>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.stepTitle, step.completed && styles.stepDone]}>{step.title}</Text>
                  {step.detail ? <Text style={styles.stepDetail}>{step.detail}</Text> : null}
                </View>
                <Pressable onPress={() => removeStep(step)} hitSlop={6} style={{ paddingTop: 2 }}>
                  <Trash size={18} color={Brand.faint} />
                </Pressable>
              </Card>
            ))
          )}

          {/* Add step */}
          <View style={styles.addRow}>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Add a step…"
              placeholderTextColor={Brand.faint}
              style={styles.addInput}
              returnKeyType="done"
              onSubmitEditing={addStep}
            />
            <Pressable
              onPress={addStep}
              disabled={!newTitle.trim() || adding}
              style={[styles.addBtn, (!newTitle.trim() || adding) && styles.addBtnDisabled]}>
              <Plus size={20} color={Brand.onAccent} weight="bold" />
            </Pressable>
          </View>
        </View>

        {/* Source communication */}
        {task.sourceCommId && sourceSubject && (
          <Pressable onPress={() => router.push(`/email/${task.sourceCommId}`)}>
            <Card style={styles.sourceCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sourceKicker}>From your inbox</Text>
                <Text style={styles.sourceSubject} numberOfLines={1}>
                  {sourceSubject}
                </Text>
              </View>
              <CaretRight size={18} color={Brand.faint} />
            </Card>
          </Pressable>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.bgBase },
  muted: { color: Brand.muted, fontSize: 14, fontFamily: FontFamily.regular, lineHeight: 20 },
  title: { color: Brand.text, fontSize: 22, fontFamily: FontFamily.serif, lineHeight: 28 },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },

  doneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: Brand.border, backgroundColor: Brand.surfaceAlt,
  },
  doneBtnOn: { borderColor: Brand.green, backgroundColor: 'rgba(62,124,90,0.10)' },
  doneBtnText: { color: Brand.text, fontSize: 15, fontFamily: FontFamily.semibold },

  dueHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dueLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dueLabel: { fontSize: 14, fontFamily: FontFamily.semibold },
  clearLink: { color: Brand.accent, fontSize: 13, fontFamily: FontFamily.semibold },
  snoozeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  snoozeChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: Brand.accentWash, borderWidth: 1, borderColor: Brand.border,
  },
  snoozeText: { color: Brand.accent, fontSize: 13, fontFamily: FontFamily.semibold },

  stepsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepsCount: { color: Brand.muted, fontSize: 12, fontFamily: FontFamily.semibold },
  stepCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepTitle: { color: Brand.text, fontSize: 15, fontFamily: FontFamily.medium, lineHeight: 20 },
  stepDone: { textDecorationLine: 'line-through', color: Brand.faint },
  stepDetail: { color: Brand.muted, fontSize: 13, fontFamily: FontFamily.regular, lineHeight: 18 },

  addRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  addInput: {
    flex: 1, backgroundColor: Brand.surface, borderWidth: 1.5, borderColor: Brand.border,
    borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: Brand.text, fontFamily: FontFamily.regular,
  },
  addBtn: {
    width: 46, height: 46, borderRadius: Radius.md, backgroundColor: Brand.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },

  sourceCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sourceKicker: { color: Brand.faint, fontSize: 11, fontFamily: FontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.6 },
  sourceSubject: { color: Brand.text, fontSize: 14, fontFamily: FontFamily.semibold, marginTop: 3 },
});
