import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Card, Pill, SectionLabel } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { categoryColor, formatDate, getDocumentStatus, URGENCY_COLOR } from '@/lib/helpers';
import { useDocuments } from '@/store/documents';
import { useEmails } from '@/store/emails';
import { useMembers } from '@/store/members';
import { useTasks } from '@/store/tasks';

const senderEmail = (from: string) => (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();
const emailDomain = (address: string) => address.split('@')[1] ?? '';

export default function MemberProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getMember } = useMembers();
  const { documents } = useDocuments();
  const { tasks } = useTasks();
  const { emails } = useEmails();

  const member = getMember(Number(id));

  if (!member) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Member not found.</Text>
      </View>
    );
  }

  const memberDocs = documents.filter((d) => d.owner.toLowerCase() === member.name.toLowerCase());
  const memberTasks = tasks.filter(
    (t) => !t.completed && (t.memberId === member.id || t.assignee.toLowerCase() === member.name.toLowerCase())
  );
  const schoolDomain = member.schoolEmail ? emailDomain(member.schoolEmail.toLowerCase()) : '';
  const memberEmails = emails
    .filter((e) => {
      if (schoolDomain && emailDomain(senderEmail(e.from)) === schoolDomain) return true;
      const terms = [member.name, ...member.aliases].filter(Boolean);
      return terms.some((t) =>
        new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(`${e.subject} ${e.body}`)
      );
    })
    .slice(0, 6);

  return (
    <>
      <Stack.Screen options={{ title: member.name }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}>
        <Card style={styles.header}>
          <Avatar owner={member.name} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{member.name}</Text>
            <Text style={styles.role}>
              {member.role || (member.isChild ? 'Child' : 'Adult')}
              {member.isChild && member.grade ? ` · ${member.grade}` : ''}
            </Text>
            {member.isChild && !!member.schoolEmail && (
              <Text style={styles.school}>🏫 {member.schoolEmail}</Text>
            )}
          </View>
          <Link href={`/settings/member/${member.id}`} asChild>
            <Pressable hitSlop={8}>
              <Ionicons name="pencil" size={18} color={Brand.muted} />
            </Pressable>
          </Link>
        </Card>

        <View style={{ gap: 10 }}>
          <SectionLabel>Open items · {memberTasks.length}</SectionLabel>
          {memberTasks.length === 0 && (
            <Card><Text style={styles.emptyText}>Nothing open 🎉</Text></Card>
          )}
          {memberTasks.map((t) => (
            <Card key={t.id} style={styles.row}>
              <View style={[styles.urgBar, { backgroundColor: URGENCY_COLOR[t.urgency] ?? Brand.muted }]} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.rowTitle}>{t.title}</Text>
                <View style={styles.metaRow}>
                  <Pill
                    label={`Due ${formatDate(t.dueDate)}`}
                    color={URGENCY_COLOR[t.urgency] ?? Brand.muted}
                    bg={`${URGENCY_COLOR[t.urgency] ?? Brand.muted}22`}
                  />
                  {t.type !== 'task' && <Pill label={t.type} color={Brand.muted} />}
                </View>
              </View>
            </Card>
          ))}
        </View>

        <View style={{ gap: 10 }}>
          <SectionLabel>Documents · {memberDocs.length}</SectionLabel>
          {memberDocs.length === 0 && (
            <Card><Text style={styles.emptyText}>No documents filed for {member.name} yet.</Text></Card>
          )}
          {memberDocs.map((d) => {
            const status = getDocumentStatus(d.expiryDate);
            return (
              <Pressable key={d.id} onPress={() => router.push(`/document/${d.id}`)}>
                <Card style={styles.row}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.rowTitle}>{d.name}</Text>
                    <View style={styles.metaRow}>
                      <Pill label={d.category} color={categoryColor(d.category)} bg={`${categoryColor(d.category)}22`} />
                      <Pill label={status.label} color={status.color} bg={status.bg} />
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Brand.muted} />
                </Card>
              </Pressable>
            );
          })}
        </View>

        {memberEmails.length > 0 && (
          <View style={{ gap: 10 }}>
            <SectionLabel>Related messages</SectionLabel>
            {memberEmails.map((e) => (
              <Pressable key={e.id} onPress={() => router.push(`/email/${e.id}`)}>
                <Card style={styles.row}>
                  <Text style={{ fontSize: 20 }}>{e.icon}</Text>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{e.subject}</Text>
                    <Text style={styles.rowMeta}>{formatDate(e.date)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Brand.muted} />
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.bgBase },
  emptyText: { color: Brand.muted, fontSize: 13 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { color: Brand.text, fontSize: 20, fontWeight: '800' },
  role: { color: Brand.muted, fontSize: 13, marginTop: 2 },
  school: { color: Brand.muted, fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  urgBar: { width: 4, borderRadius: 2, alignSelf: 'stretch' },
  rowTitle: { color: Brand.text, fontSize: 14, fontWeight: '600', lineHeight: 19 },
  rowMeta: { color: Brand.muted, fontSize: 11 },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
