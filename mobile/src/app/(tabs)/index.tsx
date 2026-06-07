import { Link } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Card, Pill, ProgressBar, SectionLabel } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { FAMILY_MEMBERS, INITIAL_DOCUMENTS } from '@/data/fixtures';
import { categoryColor, getDocumentStatus } from '@/lib/helpers';

export default function DocumentsScreen() {
  const insets = useSafeAreaInsets();

  const docs = useMemo(
    () =>
      [...INITIAL_DOCUMENTS].sort((a, b) => {
        const ua = getDocumentStatus(a.expiryDate).urgency;
        const ub = getDocumentStatus(b.expiryDate).urgency;
        if (ua !== ub) return ua - ub;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      }),
    []
  );

  const expired = docs.filter((d) => getDocumentStatus(d.expiryDate).urgency === 0).length;
  const soon = docs.filter((d) => getDocumentStatus(d.expiryDate).urgency === 1).length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}>
      <View style={styles.summaryRow}>
        <StatChip value={docs.length} label="Documents" color={Brand.accent} />
        <StatChip value={soon} label="Expiring soon" color={Brand.amber} />
        <StatChip value={expired} label="Expired" color={Brand.red} />
      </View>

      <SectionLabel>Family documents</SectionLabel>

      {docs.map((doc) => {
        const status = getDocumentStatus(doc.expiryDate);
        const member = FAMILY_MEMBERS[doc.owner];
        return (
          <Link key={doc.id} href={`/document/${doc.id}`} asChild>
            <Pressable>
              {({ pressed }) => (
                <Card style={[styles.docCard, pressed && styles.pressed]}>
                  <Avatar owner={doc.owner} />
                  <View style={styles.docBody}>
                    <View style={styles.docTitleRow}>
                      <Text style={styles.docName} numberOfLines={1}>
                        {doc.name}
                      </Text>
                      <Pill label={status.label} color={status.color} bg={status.bg} />
                    </View>
                    <Text style={styles.docMeta} numberOfLines={1}>
                      {member.name} · {doc.number}
                    </Text>
                    <View style={styles.docFooter}>
                      <Pill label={doc.category} color={categoryColor(doc.category)} bg={`${categoryColor(doc.category)}22`} />
                      <Text style={styles.expiry}>Exp {doc.expiryDate}</Text>
                    </View>
                    {doc.progress > 0 && doc.progress < 100 && (
                      <View style={styles.progressWrap}>
                        <ProgressBar value={doc.progress} />
                        <Text style={styles.progressText}>{doc.progress}% renewed</Text>
                      </View>
                    )}
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
  docCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  pressed: { opacity: 0.7 },
  docBody: { flex: 1, gap: 6 },
  docTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  docName: { color: Brand.text, fontSize: 16, fontWeight: '700', flexShrink: 1 },
  docMeta: { color: Brand.muted, fontSize: 13 },
  docFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  expiry: { color: Brand.muted, fontSize: 12 },
  progressWrap: { marginTop: 6, gap: 4 },
  progressText: { color: Brand.muted, fontSize: 11 },
});
