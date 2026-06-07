import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Pill, SectionLabel } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { INITIAL_EMAILS, MOCK_AI_RESPONSES } from '@/data/fixtures';
import { categoryColor, formatDate, URGENCY_COLOR } from '@/lib/helpers';

export default function EmailDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const email = INITIAL_EMAILS.find((e) => e.id === id);

  if (!email) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Message not found.</Text>
      </View>
    );
  }

  const ai = MOCK_AI_RESPONSES[email.id];

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

        {ai ? (
          <View style={{ gap: 12 }}>
            <SectionLabel>✨ AI analysis</SectionLabel>

            <Card style={{ gap: 6 }}>
              <Text style={styles.blockLabel}>Summary</Text>
              <Text style={styles.summary}>{ai.summary}</Text>
            </Card>

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
              <Card style={{ gap: 8, borderColor: Brand.violet }}>
                <Text style={[styles.blockLabel, { color: Brand.violet }]}>✍️ Suggested reply</Text>
                <Text style={styles.draft}>{ai.draftReply}</Text>
              </Card>
            )}
          </View>
        ) : (
          <Card>
            <Text style={styles.noAi}>No AI analysis for this message yet.</Text>
          </Card>
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
  noAi: { color: Brand.muted, fontSize: 13 },
});
