import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Card, Pill, ProgressBar, SectionLabel } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { DEFAULT_RENEWAL_PLANS, FAMILY_MEMBERS } from '@/data/fixtures';
import { FontFamily } from '@/constants/theme';
import { categoryColor, getDocumentStatus } from '@/lib/helpers';
import { useDocuments } from '@/store/documents';

export default function DocumentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { getDocument } = useDocuments();
  const doc = getDocument(id);

  if (!doc) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Document not found.</Text>
      </View>
    );
  }

  const status = getDocumentStatus(doc.expiryDate);
  const member = FAMILY_MEMBERS[doc.owner as keyof typeof FAMILY_MEMBERS] ?? { name: doc.owner, role: 'Family' };
  const plan = DEFAULT_RENEWAL_PLANS[doc.name] ?? [];

  return (
    <>
      <Stack.Screen options={{ title: doc.name }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}>
        <Card style={styles.header}>
          <View style={styles.headerTop}>
            <Avatar owner={doc.owner} size={52} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{doc.name}</Text>
              <Text style={styles.meta}>{member.name} · {member.role}</Text>
            </View>
            <Pill label={status.label} color={status.color} bg={status.bg} />
          </View>
          <View style={styles.kv}>
            <KV label="Number" value={doc.number} />
            <KV label="Category" value={doc.category} valueColor={categoryColor(doc.category)} />
            <KV label="Expiry" value={doc.expiryDate} />
          </View>
          {doc.progress > 0 && (
            <View style={{ gap: 6 }}>
              <ProgressBar value={doc.progress} />
              <Text style={styles.progressText}>{doc.progress}% through renewal</Text>
            </View>
          )}
        </Card>

        {plan.length > 0 && (
          <View style={{ gap: 12 }}>
            <SectionLabel>Renewal plan · {plan.length} steps</SectionLabel>
            {plan.map((step, i) => (
              <Card key={i} style={styles.step}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDetails}>{step.details}</Text>
                  <View style={styles.stepFooter}>
                    <Pill label={step.fee} color={Brand.green} bg="rgba(16,185,129,0.14)" />
                    <Pill label={step.location} color={Brand.muted} />
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

function KV({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={[styles.kvValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.bgBase },
  emptyText: { color: Brand.muted },
  header: { gap: 16 },
  headerTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  title: { color: Brand.text, fontSize: 22, fontFamily: FontFamily.serif },
  meta: { color: Brand.muted, fontSize: 13, marginTop: 2 },
  kv: { gap: 8 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between' },
  kvLabel: { color: Brand.muted, fontSize: 13 },
  kvValue: { color: Brand.text, fontSize: 13, fontWeight: '600' },
  progressText: { color: Brand.muted, fontSize: 12 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,194,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { color: Brand.accent, fontWeight: '800' },
  stepTitle: { color: Brand.text, fontSize: 15, fontWeight: '700' },
  stepDetails: { color: Brand.muted, fontSize: 13, lineHeight: 19 },
  stepFooter: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 2 },
});
