import { Camera } from 'phosphor-react-native';
import { Link, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Card, Pill, ProgressBar, SectionLabel } from '@/components/ui';
import { Brand, FontFamily } from '@/constants/theme';
import { FAMILY_MEMBERS } from '@/data/fixtures';
import { categoryColor, getDocumentStatus } from '@/lib/helpers';
import { useDocuments } from '@/store/documents';

export default function DocumentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { documents } = useDocuments();

  const docs = useMemo(
    () =>
      [...documents].sort((a, b) => {
        const ua = getDocumentStatus(a.expiryDate).urgency;
        const ub = getDocumentStatus(b.expiryDate).urgency;
        if (ua !== ub) return ua - ub;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      }),
    [documents]
  );

  const expired = docs.filter((d) => getDocumentStatus(d.expiryDate).urgency === 0).length;
  const soon = docs.filter((d) => getDocumentStatus(d.expiryDate).urgency === 1).length;

  return (
    <View style={styles.root}>
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 96, gap: 12 }}>
      <View style={styles.summaryRow}>
        <StatChip value={docs.length} label="Documents" color={Brand.accent} />
        <StatChip value={soon} label="Expiring soon" color={Brand.amber} />
        <StatChip value={expired} label="Expired" color={Brand.red} />
      </View>

      <SectionLabel>Family documents</SectionLabel>

      {docs.map((doc) => {
        const status = getDocumentStatus(doc.expiryDate);
        const member = FAMILY_MEMBERS[doc.owner as keyof typeof FAMILY_MEMBERS] ?? { name: doc.owner };
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
      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => router.push('/scan')}>
        <Camera size={22} color={Brand.onAccent} weight="fill" />
        <Text style={styles.fabText}>Scan</Text>
      </Pressable>
    </View>
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
  root: { flex: 1, backgroundColor: Brand.bgBase },
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  fab: {
    position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Brand.accent, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 999,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  fabText: { color: Brand.onAccent, fontFamily: FontFamily.bold, fontSize: 15 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  statChip: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6 },
  statValue: { fontSize: 26, fontFamily: FontFamily.serif },
  statLabel: { color: Brand.muted, fontSize: 11, marginTop: 2, textAlign: 'center', fontFamily: FontFamily.medium },
  docCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  pressed: { opacity: 0.7 },
  docBody: { flex: 1, gap: 6 },
  docTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  docName: { color: Brand.text, fontSize: 16, fontFamily: FontFamily.semibold, flexShrink: 1 },
  docMeta: { color: Brand.muted, fontSize: 13, fontFamily: FontFamily.regular },
  docFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  expiry: { color: Brand.muted, fontSize: 12 },
  progressWrap: { marginTop: 6, gap: 4 },
  progressText: { color: Brand.muted, fontSize: 11 },
});
