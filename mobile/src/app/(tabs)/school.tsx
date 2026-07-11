import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Card, Pill, SectionLabel } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { categoryColor, formatDate, URGENCY_COLOR } from '@/lib/helpers';
import { useEmails, type EmailRecord } from '@/store/emails';
import { useMembers, type Member } from '@/store/members';
import { useTasks } from '@/store/tasks';

type Segment = 'inbox' | 'children';

const senderEmail = (from: string) => (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();
const emailDomain = (address: string) => address.split('@')[1] ?? '';

// A child "matches" an email when it comes from their school's address, or
// their name/alias appears in the subject or body.
function childMatches(email: EmailRecord, child: Member): boolean {
  if (child.schoolEmail) {
    const schoolDomain = emailDomain(child.schoolEmail.toLowerCase());
    if (schoolDomain && emailDomain(senderEmail(email.from)) === schoolDomain) return true;
  }
  const text = `${email.subject} ${email.body}`;
  const terms = [child.name, ...child.aliases].filter(Boolean);
  return terms.some((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text));
}

export default function SchoolScreen() {
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = useState<Segment>('inbox');
  const { emails, analyses } = useEmails();
  const { children } = useMembers();

  const schoolDomains = useMemo(
    () => children.map((c) => emailDomain(c.schoolEmail.toLowerCase())).filter(Boolean),
    [children]
  );

  const isSchoolEmail = (e: EmailRecord) =>
    schoolDomains.includes(emailDomain(senderEmail(e.from))) || e.category === 'Education';

  // School emails float to the top; everything else follows by date.
  const sorted = useMemo(
    () =>
      [...emails].sort((a, b) => {
        const sa = isSchoolEmail(a) ? 0 : 1;
        const sb = isSchoolEmail(b) ? 0 : 1;
        if (sa !== sb) return sa - sb;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [emails, schoolDomains]
  );

  const needsSchoolEmail = children.length > 0 && children.every((c) => !c.schoolEmail);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}>
      <View style={styles.segment}>
        <SegmentBtn label="Inbox" active={segment === 'inbox'} onPress={() => setSegment('inbox')} />
        <SegmentBtn label="By child" active={segment === 'children'} onPress={() => setSegment('children')} />
      </View>

      {needsSchoolEmail && (
        <Link href="/settings" asChild>
          <Pressable>
            <Card style={styles.bannerCard}>
              <Ionicons name="school" size={20} color={Brand.amber} />
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Which address does the school write from?</Text>
                <Text style={styles.bannerSub}>
                  Set each child's school email in Settings so school messages float to the top and file under the
                  right child.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Brand.muted} />
            </Card>
          </Pressable>
        </Link>
      )}

      {children.length === 0 && (
        <Link href="/settings" asChild>
          <Pressable>
            <Card style={styles.bannerCard}>
              <Ionicons name="people" size={20} color={Brand.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Add your children in Settings</Text>
                <Text style={styles.bannerSub}>School tracking works per child — add them to get started.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Brand.muted} />
            </Card>
          </Pressable>
        </Link>
      )}

      {segment === 'inbox' ? (
        <Inbox emails={sorted} analyses={analyses} isSchool={isSchoolEmail} />
      ) : (
        <ByChild />
      )}
    </ScrollView>
  );
}

function Inbox({
  emails,
  analyses,
  isSchool,
}: {
  emails: EmailRecord[];
  analyses: Record<string, unknown>;
  isSchool: (e: EmailRecord) => boolean;
}) {
  const unread = emails.filter((e) => !e.read).length;
  const analyzed = emails.filter((e) => analyses[e.id]).length;
  return (
    <>
      <View style={styles.summaryRow}>
        <StatChip value={emails.length} label="Messages" color={Brand.accent} />
        <StatChip value={unread} label="Unread" color={Brand.violet} />
        <StatChip value={analyzed} label="AI analyzed" color={Brand.green} />
      </View>
      <SectionLabel>Inbox · school first</SectionLabel>
      {emails.length === 0 && (
        <Card>
          <Text style={styles.empty}>No messages yet.</Text>
        </Card>
      )}
      {emails.map((email) => {
        const fromName = email.from.split('<')[0].trim();
        const hasAi = !!analyses[email.id];
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
                      {isSchool(email) && <Pill label="🏫 School" color={Brand.amber} bg="rgba(245,158,11,0.14)" />}
                      <Pill label={email.category} color={categoryColor(email.category)} bg={`${categoryColor(email.category)}22`} />
                      {hasAi && <Pill label="✨ AI ready" color={Brand.green} bg="rgba(16,185,129,0.14)" />}
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

function ByChild() {
  const router = useRouter();
  const { children } = useMembers();
  const { emails } = useEmails();
  const { tasks, toggleComplete } = useTasks();

  if (children.length === 0) {
    return (
      <Card>
        <Text style={styles.empty}>No children set up yet — add them in Settings.</Text>
      </Card>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      {children.map((child) => {
        const childOpenTasks = tasks.filter(
          (t) => !t.completed && (t.memberId === child.id || t.assignee === child.name)
        );
        const childEmails = emails.filter((e) => childMatches(e, child)).slice(0, 4);
        return (
          <View key={child.id} style={{ gap: 10 }}>
            <Pressable style={styles.childHeader} onPress={() => router.push(`/member/${child.id}`)}>
              <Avatar owner={child.name} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.childName}>{child.name}</Text>
                <Text style={styles.childRole}>
                  {child.role}
                  {child.grade ? ` · ${child.grade}` : ''}
                </Text>
              </View>
              <Pill
                label={`${childOpenTasks.length} task${childOpenTasks.length === 1 ? '' : 's'}`}
                color={Brand.accent}
                bg="rgba(0,194,255,0.14)"
              />
            </Pressable>

            {childOpenTasks.length === 0 ? (
              <Card>
                <Text style={styles.empty}>No open tasks 🎉</Text>
              </Card>
            ) : (
              childOpenTasks.map((t) => (
                <Card key={t.id} style={styles.taskCard}>
                  <View style={[styles.urgBar, { backgroundColor: URGENCY_COLOR[t.urgency] ?? Brand.muted }]} />
                  <Pressable onPress={() => toggleComplete(t.id)} hitSlop={8}>
                    <Ionicons name="ellipse-outline" size={22} color={Brand.muted} />
                  </Pressable>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={styles.taskText}>{t.title}</Text>
                    <View style={styles.taskMeta}>
                      <Pill
                        label={`Due ${formatDate(t.dueDate)}`}
                        color={URGENCY_COLOR[t.urgency] ?? Brand.muted}
                        bg={`${URGENCY_COLOR[t.urgency] ?? Brand.muted}22`}
                      />
                      {!!t.sourceEmailId && (
                        <Pressable onPress={() => router.push(`/email/${t.sourceEmailId}`)} hitSlop={6}>
                          <Text style={styles.taskSource}>↪ source email</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </Card>
              ))
            )}

            {childEmails.length > 0 && (
              <View style={{ gap: 6 }}>
                {childEmails.map((e) => (
                  <Pressable key={e.id} onPress={() => router.push(`/email/${e.id}`)}>
                    <Text style={styles.childEmailLink} numberOfLines={1}>
                      ✉️ {e.subject}
                    </Text>
                  </Pressable>
                ))}
              </View>
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
  segment: { flexDirection: 'row', backgroundColor: Brand.surface, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: Brand.border },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segBtnActive: { backgroundColor: Brand.accent },
  segText: { color: Brand.muted, fontWeight: '700', fontSize: 14 },
  segTextActive: { color: '#04121f' },
  bannerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: 'rgba(245,158,11,0.4)' },
  bannerTitle: { color: Brand.text, fontSize: 14, fontWeight: '700' },
  bannerSub: { color: Brand.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
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
  emailFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Brand.accent, marginLeft: 'auto' },
  childHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  childName: { color: Brand.text, fontSize: 17, fontWeight: '800' },
  childRole: { color: Brand.muted, fontSize: 12, marginTop: 1 },
  empty: { color: Brand.muted, fontSize: 13 },
  taskCard: { flexDirection: 'row', gap: 12, alignItems: 'center', overflow: 'hidden' },
  urgBar: { width: 4, borderRadius: 2, alignSelf: 'stretch' },
  taskText: { color: Brand.text, fontSize: 14, fontWeight: '600', lineHeight: 19 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  taskSource: { color: Brand.muted, fontSize: 11, fontStyle: 'italic' },
  childEmailLink: { color: Brand.muted, fontSize: 12, paddingLeft: 4 },
});
