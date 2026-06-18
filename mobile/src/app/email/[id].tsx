import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Pill, SectionLabel } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { categoryColor, formatDate, URGENCY_COLOR } from '@/lib/helpers';
import { useData } from '@/store/data';

export default function EmailDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { communications, tasks } = useData();

  const email = communications.find((e) => e.id === id);
  const related = tasks.filter((t) => t.sourceCommId === id);

  if (!email) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Message not found.</Text>
      </View>
    );
  }

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

        {related.length > 0 ? (
          <View style={{ gap: 12 }}>
            <SectionLabel>✨ Extracted actions</SectionLabel>
            <Card style={{ gap: 10 }}>
              {related.map((t) => (
                <View key={t.id} style={styles.actionRow}>
                  <Text style={styles.bullet}>•</Text>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.actionText, t.completed && styles.done]}>{t.title}</Text>
                    <View style={styles.actionMeta}>
                      <Pill label={t.owner} color={Brand.accent} bg="rgba(0,194,255,0.14)" />
                      {t.dueDate && (
                        <Pill label={`Due ${formatDate(t.dueDate)}`} color={URGENCY_COLOR[t.priority]} bg={`${URGENCY_COLOR[t.priority]}22`} />
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        ) : (
          <Card>
            <Text style={styles.noAi}>No actions extracted from this message.</Text>
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
  actionRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bullet: { color: Brand.accent, fontSize: 16, lineHeight: 20 },
  actionText: { color: Brand.text, fontSize: 14, fontWeight: '600', lineHeight: 19 },
  done: { textDecorationLine: 'line-through', color: Brand.muted },
  actionMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  noAi: { color: Brand.muted, fontSize: 13 },
});
