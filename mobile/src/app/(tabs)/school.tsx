import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Card, Pill, SectionLabel } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { FontFamily } from '@/constants/theme';
import { categoryColor, formatDate, URGENCY_COLOR } from '@/lib/helpers';
import { useData, type Communication, type Member, type Task } from '@/store/data';

type Segment = 'inbox' | 'children';

export default function SchoolScreen() {
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = useState<Segment>('inbox');
  const { communications, tasks, members, loading } = useData();

  const emails = useMemo(
    () => [...communications].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [communications]
  );
  const children = useMemo(() => members.filter((m) => m.memberType === 'child'), [members]);

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
      <View style={styles.segment}>
        <SegmentBtn label="Inbox" active={segment === 'inbox'} onPress={() => setSegment('inbox')} />
        <SegmentBtn label="By child" active={segment === 'children'} onPress={() => setSegment('children')} />
      </View>

      {segment === 'inbox' ? (
        <Inbox emails={emails} openTasks={tasks.filter((t) => !t.completed).length} />
      ) : (
        <ByChild children={children} tasks={tasks} />
      )}
    </ScrollView>
  );
}

function Inbox({ emails, openTasks }: { emails: Communication[]; openTasks: number }) {
  const unread = emails.filter((e) => !e.read).length;
  return (
    <>
      <View style={styles.summaryRow}>
        <StatChip value={emails.length} label="Messages" color={Brand.accent} />
        <StatChip value={unread} label="Unread" color={Brand.violet} />
        <StatChip value={openTasks} label="Open tasks" color={Brand.green} />
      </View>
      <SectionLabel>Inbox</SectionLabel>
      {emails.map((email) => {
        const fromName = email.from.split('<')[0].trim();
        return (
          <Link key={email.id} href={`/email/${email.id}`} asChild>
            <Pressable>
              {({ pressed }) => (
                <Card style={[styles.emailCard, pressed && styles.pressed]}>
                  <Text style={styles.emailIcon}>{email.icon}</Text>
                  <View style={styles.emailBody}>
                    <View style={styles.emailTopRow}>
                      <Text style={[styles.from, !email.read && styles.unreadFrom]} numberOfLines={1}>
                        {fromName}
                      </Text>
                      <Text style={styles.date}>{formatDate(email.date)}</Text>
                    </View>
                    <Text style={[styles.subject, !email.read && styles.unreadSubject]} numberOfLines={2}>
                      {email.subject}
                    </Text>
                    <View style={styles.emailFooter}>
                      <Pill label={email.category} color={categoryColor(email.category)} bg={`${categoryColor(email.category)}22`} />
                      {!email.read && <View style={styles.dot} />}
                    </View>
                  </View>
                </Card>
              )}
            </Pressable>
          </Link>
        );
      })}
    </>
  );
}

function ByChild({ children, tasks }: { children: Member[]; tasks: Task[] }) {
  const router = useRouter();
  return (
    <View style={{ gap: 16 }}>
      {children.map((child) => {
        const items = tasks.filter((t) => t.owner === child.name && !t.completed);
        return (
          <View key={child.name} style={{ gap: 10 }}>
            <View style={styles.childHeader}>
              <Avatar owner={child.name} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.childName}>{child.name}</Text>
                <Text style={styles.childRole}>{child.role}</Text>
              </View>
              <Pill label={`${items.length} task${items.length === 1 ? '' : 's'}`} color={Brand.accent} bg="rgba(0,194,255,0.14)" />
            </View>
            {items.length === 0 ? (
              <Card><Text style={styles.empty}>No open tasks 🎉</Text></Card>
            ) : (
              items.map((t) => (
                <Pressable
                  key={t.id}
                  disabled={!t.sourceCommId}
                  onPress={() => t.sourceCommId && router.push(`/email/${t.sourceCommId}`)}>
                  <Card style={styles.taskCard}>
                    <View style={[styles.urgBar, { backgroundColor: URGENCY_COLOR[t.priority] }]} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={styles.taskText}>{t.title}</Text>
                      {t.dueDate && (
                        <View style={styles.taskMeta}>
                          <Pill label={`Due ${formatDate(t.dueDate)}`} color={URGENCY_COLOR[t.priority]} bg={`${URGENCY_COLOR[t.priority]}22`} />
                        </View>
                      )}
                    </View>
                  </Card>
                </Pressable>
              ))
            )}
          </View>
        );
      })}
    </View>
  );
}

function SegmentBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.segBtn, active && styles.segBtnActive]} onPress={onPress}>
      <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
    </Pressable>
  );
}

function StatChip({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <Card style={styles.statChip}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.bgBase },
  segment: { flexDirection: 'row', backgroundColor: Brand.surface, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: Brand.border },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segBtnActive: { backgroundColor: Brand.accent },
  segText: { color: Brand.muted, fontWeight: '700', fontSize: 14 },
  segTextActive: { color: Brand.onAccent },
  summaryRow: { flexDirection: 'row', gap: 10 },
  statChip: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6 },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { color: Brand.muted, fontSize: 11, marginTop: 2, textAlign: 'center' },
  emailCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  pressed: { opacity: 0.7 },
  emailIcon: { fontSize: 28 },
  emailBody: { flex: 1, gap: 5 },
  emailTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  from: { color: Brand.muted, fontSize: 13, flexShrink: 1 },
  unreadFrom: { color: Brand.text, fontWeight: '700' },
  date: { color: Brand.muted, fontSize: 11 },
  subject: { color: Brand.muted, fontSize: 15, lineHeight: 20 },
  unreadSubject: { color: Brand.text, fontWeight: '600' },
  emailFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Brand.accent, marginLeft: 'auto' },
  childHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  childName: { color: Brand.text, fontSize: 18, fontFamily: FontFamily.serif },
  childRole: { color: Brand.muted, fontSize: 12, marginTop: 1 },
  empty: { color: Brand.muted, fontSize: 13 },
  taskCard: { flexDirection: 'row', gap: 12, alignItems: 'stretch', overflow: 'hidden' },
  urgBar: { width: 4, borderRadius: 2 },
  taskText: { color: Brand.text, fontSize: 14, fontWeight: '600', lineHeight: 19 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
