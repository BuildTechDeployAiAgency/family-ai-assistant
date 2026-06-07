import { Link } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Pill, SectionLabel } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { INITIAL_EMAILS, MOCK_AI_RESPONSES } from '@/data/fixtures';
import { categoryColor, formatDate } from '@/lib/helpers';

export default function SchoolScreen() {
  const insets = useSafeAreaInsets();

  const emails = useMemo(
    () => [...INITIAL_EMAILS].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    []
  );

  const unread = emails.filter((e) => !e.read).length;
  const analyzed = emails.filter((e) => MOCK_AI_RESPONSES[e.id]).length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}>
      <View style={styles.summaryRow}>
        <StatChip value={emails.length} label="Messages" color={Brand.accent} />
        <StatChip value={unread} label="Unread" color={Brand.violet} />
        <StatChip value={analyzed} label="AI analyzed" color={Brand.green} />
      </View>

      <SectionLabel>Inbox</SectionLabel>

      {emails.map((email) => {
        const fromName = email.from.split('<')[0].trim();
        const hasAi = !!MOCK_AI_RESPONSES[email.id];
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
    </ScrollView>
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
});
