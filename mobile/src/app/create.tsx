import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, SectionLabel } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/helpers';
import { scheduleLocalReminder } from '@/lib/notifications';
import { useMembers } from '@/store/members';
import { useTasks, type TaskType, type Urgency } from '@/store/tasks';

const TYPES: { key: TaskType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'task', label: 'Task', icon: 'checkmark-circle-outline' },
  { key: 'reminder', label: 'Reminder', icon: 'alarm-outline' },
  { key: 'meeting', label: 'Meeting', icon: 'calendar-outline' },
];

const URGENCIES: Urgency[] = ['high', 'medium', 'low'];
const CATEGORIES = ['Admin', 'Education', 'Health', 'Finance', 'Sports', 'Travel', 'Activities'];
const CHANNELS = [
  { key: 'push', label: 'Notification' },
  { key: 'call', label: 'Phone call · coming soon' },
] as const;

const toDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const inOneHour = () => {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
};

export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { members } = useMembers();
  const { createTask } = useTasks();

  const [type, setType] = useState<TaskType>('task');
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [category, setCategory] = useState('Admin');
  const [urgency, setUrgency] = useState<Urgency>('medium');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [remindAt, setRemindAt] = useState(inOneHour());
  const [startAt, setStartAt] = useState(inOneHour());
  const [endAt, setEndAt] = useState(() => {
    const d = inOneHour();
    d.setHours(d.getHours() + 1);
    return d;
  });
  const [channel, setChannel] = useState<'push' | 'call'>('push');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!title.trim()) {
      setError('Give it a title.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const effectiveDue =
        type === 'reminder' ? toDateStr(remindAt) : type === 'meeting' ? toDateStr(startAt) : toDateStr(dueDate);

      const task = await createTask({
        title: title.trim(),
        assignee: assignee || 'Family',
        dueDate: effectiveDue,
        category,
        type,
        memberId: members.find((m) => m.name === assignee)?.id ?? null,
        sourceEmailId: null,
        urgency,
        notes: notes.trim(),
        startAt: type === 'meeting' ? startAt.toISOString() : null,
        endAt: type === 'meeting' ? endAt.toISOString() : null,
      });

      if (type === 'reminder') {
        // Server reminder row (authoritative for the call channel) + local
        // notification on this device for the push channel.
        await api
          .post('/api/reminders', { taskId: task.id, remindAt: remindAt.toISOString(), channel })
          .catch((err) => console.error('Failed to schedule server reminder:', err));
        if (channel === 'push') {
          await scheduleLocalReminder('⏰ ' + title.trim(), notes.trim() || 'Family AI reminder', remindAt);
        }
      }

      router.back();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'New item', presentation: 'modal' }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 14 }}>
        <View style={styles.typeRow}>
          {TYPES.map((t) => {
            const active = type === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setType(t.key)}
                style={[styles.typeChip, active && styles.typeChipActive]}>
                <Ionicons name={t.icon} size={18} color={active ? '#04121f' : Brand.muted} />
                <Text style={[styles.typeText, active && styles.typeTextActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Card style={{ gap: 14 }}>
          <Field label="Title">
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={
                type === 'meeting' ? 'e.g. Parent-teacher meeting' : type === 'reminder' ? 'e.g. Pay school fees' : 'e.g. Sign consent form'
              }
              placeholderTextColor={Brand.muted}
            />
          </Field>

          <Field label="For">
            <View style={styles.chipWrap}>
              {members.map((m) => {
                const active = assignee === m.name;
                return (
                  <Pressable key={m.id} onPress={() => setAssignee(active ? '' : m.name)}>
                    <View style={[styles.ownerChip, active && { backgroundColor: m.color, borderColor: m.color }]}>
                      <Text style={{ fontSize: 14 }}>{m.avatar}</Text>
                      <Text style={[styles.ownerName, active && { color: '#04121f' }]}>{m.name}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          {type === 'task' && (
            <Field label="Due date">
              <DateTimeField value={dueDate} mode="date" onChange={setDueDate} />
            </Field>
          )}

          {type === 'reminder' && (
            <>
              <Field label="Remind me on">
                <DateTimeField value={remindAt} mode="date" onChange={setRemindAt} />
              </Field>
              <Field label="At time">
                <DateTimeField value={remindAt} mode="time" onChange={setRemindAt} />
              </Field>
              <Field label="How">
                <View style={styles.chipWrap}>
                  {CHANNELS.map((c) => {
                    const active = channel === c.key;
                    return (
                      <Pressable key={c.key} onPress={() => setChannel(c.key)}>
                        <View style={[styles.ownerChip, active && styles.channelActive]}>
                          <Text style={[styles.ownerName, active && { color: '#04121f' }]}>{c.label}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
                {channel === 'call' && (
                  <Text style={styles.hint}>
                    Phone-call reminders are being set up — this schedules the call with the assistant service, which
                    currently logs it. You'll also want a notification meanwhile.
                  </Text>
                )}
              </Field>
            </>
          )}

          {type === 'meeting' && (
            <>
              <Field label="Date">
                <DateTimeField
                  value={startAt}
                  mode="date"
                  onChange={(d) => {
                    setStartAt(d);
                    const end = new Date(d);
                    end.setHours(d.getHours() + 1);
                    setEndAt((prev) => (prev <= d ? end : prev));
                  }}
                />
              </Field>
              <Field label="Starts">
                <DateTimeField value={startAt} mode="time" onChange={setStartAt} />
              </Field>
              <Field label="Ends">
                <DateTimeField value={endAt} mode="time" onChange={setEndAt} />
              </Field>
            </>
          )}

          <Field label="Priority">
            <View style={styles.chipWrap}>
              {URGENCIES.map((u) => {
                const active = urgency === u;
                return (
                  <Pressable key={u} onPress={() => setUrgency(u)}>
                    <View style={[styles.ownerChip, active && styles.channelActive]}>
                      <Text style={[styles.ownerName, active && { color: '#04121f' }]}>
                        {u.charAt(0).toUpperCase() + u.slice(1)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <Field label="Category">
            <View style={styles.chipWrap}>
              {CATEGORIES.map((c) => {
                const active = category === c;
                return (
                  <Pressable key={c} onPress={() => setCategory(c)}>
                    <View style={[styles.ownerChip, active && styles.channelActive]}>
                      <Text style={[styles.ownerName, active && { color: '#04121f' }]}>{c}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <Field label="Notes (optional)">
            <TextInput
              style={[styles.input, { minHeight: 60 }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Anything useful for later"
              placeholderTextColor={Brand.muted}
            />
          </Field>
        </Card>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable onPress={save} disabled={busy} style={[styles.saveBtn, busy && { opacity: 0.6 }]}>
          <Ionicons name="checkmark" size={20} color="#04121f" />
          <Text style={styles.saveText}>
            {busy ? 'Saving…' : type === 'reminder' ? 'Schedule reminder' : type === 'meeting' ? 'Save meeting' : 'Add task'}
          </Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

// Cross-platform date/time field: iOS renders the compact inline control,
// Android opens the native dialog on press.
function DateTimeField({
  value,
  mode,
  onChange,
}: {
  value: Date;
  mode: 'date' | 'time';
  onChange: (d: Date) => void;
}) {
  const [show, setShow] = useState(false);

  if (Platform.OS === 'ios') {
    return (
      <View style={{ alignItems: 'flex-start' }}>
        <DateTimePicker
          value={value}
          mode={mode}
          display="compact"
          themeVariant="dark"
          onChange={(_, d) => d && onChange(d)}
        />
      </View>
    );
  }

  const label =
    mode === 'date'
      ? formatDate(value.toISOString())
      : value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <Pressable onPress={() => setShow(true)} style={styles.dateBtn}>
        <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={16} color={Brand.accent} />
        <Text style={styles.dateBtnText}>{label}</Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={value}
          mode={mode}
          onChange={(_, d) => {
            setShow(false);
            if (d) onChange(d);
          }}
        />
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border,
  },
  typeChipActive: { backgroundColor: Brand.accent, borderColor: Brand.accent },
  typeText: { color: Brand.muted, fontWeight: '700', fontSize: 13 },
  typeTextActive: { color: '#04121f' },
  input: {
    backgroundColor: Brand.bgBase, borderWidth: 1, borderColor: Brand.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, color: Brand.text, fontSize: 15,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ownerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1, borderColor: Brand.border, backgroundColor: Brand.surfaceAlt,
  },
  ownerName: { color: Brand.text, fontSize: 13, fontWeight: '600' },
  channelActive: { backgroundColor: Brand.accent, borderColor: Brand.accent },
  hint: { color: Brand.muted, fontSize: 12, lineHeight: 17, marginTop: 6 },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
    backgroundColor: Brand.surfaceAlt, borderWidth: 1, borderColor: Brand.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  dateBtnText: { color: Brand.text, fontSize: 14, fontWeight: '600' },
  error: { color: '#fb7185' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Brand.accent, borderRadius: 14, paddingVertical: 16,
  },
  saveText: { color: '#04121f', fontSize: 16, fontWeight: '800' },
});
