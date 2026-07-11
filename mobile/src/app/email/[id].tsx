import { Ionicons } from '@expo/vector-icons';
import * as MailComposer from 'expo-mail-composer';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Pill, SectionLabel } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { categoryColor, formatDate, URGENCY_COLOR } from '@/lib/helpers';
import { useEmails } from '@/store/emails';
import { useMembers } from '@/store/members';
import { useTasks, type Urgency } from '@/store/tasks';

const senderAddress = (from: string) => from.match(/<([^>]+)>/)?.[1] ?? from;

export default function EmailDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { emails, analyses, analyzing, analyze, markRead } = useEmails();
  const { members } = useMembers();
  const { createTask } = useTasks();
  const [isDemo, setIsDemo] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [tasksAdded, setTasksAdded] = useState(false);

  const email = emails.find((e) => e.id === id);
  const ai = id ? analyses[id] : undefined;
  const busy = analyzing === id;

  useEffect(() => {
    if (email && !email.read) markRead(email.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email?.id]);

  if (!email) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Message not found.</Text>
      </View>
    );
  }

  const runAnalysis = async () => {
    setAnalysisError('');
    const result = await analyze(email.id);
    if (!result) {
      setAnalysisError('Could not analyze this email — is the server AI configured?');
    } else {
      setIsDemo(result.demo);
    }
  };

  const openInMail = async () => {
    if (!ai?.draftReply) return;
    const available = await MailComposer.isAvailableAsync();
    if (!available) {
      Alert.alert('No mail app', 'Set up a mail account on this phone to send replies.');
      return;
    }
    await MailComposer.composeAsync({
      recipients: [senderAddress(email.from)],
      subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
      body: ai.draftReply,
    });
  };

  const addTasksFromEmail = async () => {
    if (!ai || ai.actionItems.length === 0 || tasksAdded) return;
    for (const item of ai.actionItems) {
      const member = members.find((m) => m.name.toLowerCase() === item.owner.toLowerCase());
      const dl = ai.deadlines.find((d) => d.date === item.deadline) ?? ai.deadlines[0];
      await createTask({
        title: item.action,
        assignee: member?.name ?? item.owner ?? 'Family',
        dueDate: item.deadline || email.date,
        category: email.category,
        type: 'task',
        memberId: member?.id ?? null,
        sourceEmailId: email.id,
        urgency: (dl?.urgency as Urgency) ?? 'medium',
        notes: `From: ${email.subject}`,
        startAt: null,
        endAt: null,
      });
    }
    setTasksAdded(true);
    Alert.alert('Added', `${ai.actionItems.length} task${ai.actionItems.length === 1 ? '' : 's'} added to Actions.`);
  };

  return (
    <>
      <Stack.Screen options={{ title: email.category }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}>
        <Card style={{ gap: 10 }}>
          <View style={styles.headerRow}>
            <Text style={styles.icon}>{email.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.subject}>{email.subject}</Text>
              <Text style={styles.from}>{email.from}</Text>
            </View>
          </View>
          <View style={styles.tagRow}>
            <Pill label={email.category} color={categoryColor(email.category)} bg={`${categoryColor(email.category)}22`} />
            <Text style={styles.date}>{formatDate(email.date)}</Text>
          </View>
          <Text style={styles.body}>{email.body}</Text>
        </Card>

        {!ai && (
          <Pressable onPress={runAnalysis} disabled={busy} style={[styles.analyzeBtn, busy && { opacity: 0.6 }]}>
            {busy ? (
              <ActivityIndicator color="#04121f" />
            ) : (
              <Ionicons name="sparkles" size={18} color="#04121f" />
            )}
            <Text style={styles.analyzeText}>{busy ? 'Analyzing…' : 'Analyze with AI'}</Text>
          </Pressable>
        )}
        {!!analysisError && <Text style={styles.error}>{analysisError}</Text>}

        {ai && (
          <View style={{ gap: 12 }}>
            <View style={styles.analysisHeader}>
              <SectionLabel>✨ AI analysis</SectionLabel>
              {isDemo && <Pill label="Demo — AI offline" color={Brand.amber} bg="rgba(245,158,11,0.14)" />}
            </View>

            <Card style={{ gap: 6 }}>
              <Text style={styles.blockLabel}>Summary</Text>
              <Text style={styles.summary}>{ai.summary}</Text>
            </Card>

            {ai.events.length > 0 && (
              <Card style={{ gap: 8 }}>
                <Text style={styles.blockLabel}>Scheduled events</Text>
                {ai.events.map((ev, i) => (
                  <View key={i} style={styles.deadlineRow}>
                    <Text style={styles.deadlineItem} numberOfLines={2}>{ev.description}</Text>
                    <Pill label={ev.date} color={Brand.accent} bg="rgba(0,194,255,0.14)" />
                  </View>
                ))}
              </Card>
            )}

            {ai.actionItems.length > 0 && (
              <Card style={{ gap: 10 }}>
                <Text style={styles.blockLabel}>Action items</Text>
                {ai.actionItems.map((a, i) => (
                  <View key={i} style={styles.actionRow}>
                    <Text style={styles.bullet}>•</Text>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.actionText}>{a.action}</Text>
                      <View style={styles.actionMeta}>
                        <Pill label={a.owner} color={Brand.accent} bg="rgba(0,194,255,0.14)" />
                        <Pill label={`Due ${formatDate(a.deadline)}`} color={Brand.amber} bg="rgba(245,158,11,0.14)" />
                      </View>
                    </View>
                  </View>
                ))}
                <Pressable
                  onPress={addTasksFromEmail}
                  disabled={tasksAdded}
                  style={[styles.smallBtn, tasksAdded && { opacity: 0.5 }]}>
                  <Ionicons name={tasksAdded ? 'checkmark' : 'add'} size={16} color={Brand.accent} />
                  <Text style={styles.smallBtnText}>
                    {tasksAdded ? 'Added to Actions' : 'Create tasks from this email'}
                  </Text>
                </Pressable>
              </Card>
            )}

            {ai.deadlines.length > 0 && (
              <Card style={{ gap: 8 }}>
                <Text style={styles.blockLabel}>Key dates</Text>
                {ai.deadlines.map((d, i) => (
                  <View key={i} style={styles.deadlineRow}>
                    <Text style={styles.deadlineItem} numberOfLines={1}>{d.item}</Text>
                    <Pill label={formatDate(d.date)} color={URGENCY_COLOR[d.urgency]} bg={`${URGENCY_COLOR[d.urgency]}22`} />
                  </View>
                ))}
              </Card>
            )}

            {ai.documentsNeeded.length > 0 && (
              <Card style={{ gap: 8 }}>
                <Text style={styles.blockLabel}>Documents needed</Text>
                <View style={styles.chipWrap}>
                  {ai.documentsNeeded.map((d, i) => (
                    <Pill key={i} label={d} color={Brand.text} bg={Brand.surfaceAlt} />
                  ))}
                </View>
              </Card>
            )}

            {ai.needsReply && ai.draftReply && (
              <Card style={{ gap: 10, borderColor: Brand.violet }}>
                <Text style={[styles.blockLabel, { color: Brand.violet }]}>✍️ Suggested reply</Text>
                <Text style={styles.draft}>{ai.draftReply}</Text>
                <Pressable onPress={openInMail} style={styles.mailBtn}>
                  <Ionicons name="mail" size={16} color="#04121f" />
                  <Text style={styles.mailBtnText}>Open in Mail to send</Text>
                </Pressable>
              </Card>
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.bgBase },
  emptyText: { color: Brand.muted },
  headerRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { fontSize: 32 },
  subject: { color: Brand.text, fontSize: 18, fontWeight: '800', lineHeight: 24 },
  from: { color: Brand.muted, fontSize: 12, marginTop: 4 },
  tagRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { color: Brand.muted, fontSize: 12 },
  body: { color: '#cbd5e1', fontSize: 14, lineHeight: 21, marginTop: 4 },
  analyzeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Brand.accent, borderRadius: 14, paddingVertical: 14,
  },
  analyzeText: { color: '#04121f', fontSize: 15, fontWeight: '800' },
  error: { color: '#fb7185', fontSize: 13, textAlign: 'center' },
  analysisHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  blockLabel: { color: Brand.text, fontSize: 14, fontWeight: '700' },
  summary: { color: '#cbd5e1', fontSize: 14, lineHeight: 20 },
  actionRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bullet: { color: Brand.accent, fontSize: 16, lineHeight: 20 },
  actionText: { color: Brand.text, fontSize: 14, fontWeight: '600', lineHeight: 19 },
  actionMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  deadlineItem: { color: '#cbd5e1', fontSize: 13, flex: 1 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  draft: { color: '#cbd5e1', fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 2 },
  smallBtnText: { color: Brand.accent, fontSize: 13, fontWeight: '700' },
  mailBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Brand.violet, borderRadius: 10, paddingVertical: 12,
  },
  mailBtnText: { color: '#04121f', fontSize: 14, fontWeight: '800' },
});
