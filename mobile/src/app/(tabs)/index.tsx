import {
  Airplane,
  Bank,
  Camera,
  CarProfile,
  FileText,
  FolderOpen,
  GraduationCap,
  Heartbeat,
  IdentificationCard,
  MagnifyingGlass,
  ShieldCheck,
} from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, SkeletonGrid } from '@/components/States';
import { Brand, FontFamily, Radius } from '@/constants/theme';
import { categoryColor, getDocumentStatus } from '@/lib/helpers';
import { useDocuments } from '@/store/documents';
import { useData } from '@/store/data';

// Category → Phosphor icon (falls back to a document glyph).
const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string; weight?: any }>> = {
  Identity: IdentificationCard,
  Driving: CarProfile,
  Health: Heartbeat,
  Education: GraduationCap,
  Finance: Bank,
  Insurance: ShieldCheck,
  Travel: Airplane,
};
function categoryIcon(category: string) {
  return CATEGORY_ICONS[category] ?? FileText;
}

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { documents, loading } = useDocuments();
  const { members } = useData();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const ownerColor = useMemo(() => {
    const map = new Map(members.map((m) => [m.name, m.color]));
    return (name: string) => map.get(name) ?? Brand.accent;
  }, [members]);

  const categories = useMemo(() => {
    const set = new Set(documents.map((d) => d.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [documents]);

  const docs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents
      .filter((d) => (category === 'All' || d.category === category))
      .filter(
        (d) =>
          !q ||
          d.name.toLowerCase().includes(q) ||
          d.owner.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const ua = getDocumentStatus(a.expiryDate).urgency;
        const ub = getDocumentStatus(b.expiryDate).urgency;
        if (ua !== ub) return ua - ub;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      });
  }, [documents, query, category]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled">
        {/* Search */}
        <View style={styles.searchBar}>
          <MagnifyingGlass size={18} color={Brand.faint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${documents.length} documents…`}
            placeholderTextColor={Brand.faint}
            style={styles.searchInput}
          />
        </View>

        {/* Category filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}>
          {categories.map((c) => {
            const active = c === category;
            const label = c === 'All' ? `All ${documents.length}` : c;
            return (
              <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, active && styles.chipOn]}>
                <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Grid */}
        {loading ? (
          <SkeletonGrid count={6} />
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="Your vault is empty"
            body="Snap your first document and I'll file it for you in seconds."
            actionLabel="Scan a document"
            onAction={() => router.push('/scan')}
          />
        ) : docs.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No documents match.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {docs.map((doc) => {
              const status = getDocumentStatus(doc.expiryDate);
              const cat = categoryColor(doc.category);
              const Icon = categoryIcon(doc.category);
              const oc = ownerColor(doc.owner);
              return (
                <Pressable
                  key={doc.id}
                  style={styles.cardWrap}
                  onPress={() => router.push(`/document/${doc.id}`)}>
                  {({ pressed }) => (
                    <View style={[styles.vcard, pressed && styles.pressed]}>
                      <View style={styles.vcardTop}>
                        <View style={[styles.vIcon, { backgroundColor: `${cat}1A` }]}>
                          <Icon size={19} color={cat} weight="fill" />
                        </View>
                        <View style={[styles.expiryTag, { backgroundColor: status.bg }]}>
                          <Text style={[styles.expiryText, { color: status.color }]} numberOfLines={1}>
                            {status.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.vTitle} numberOfLines={2}>
                        {doc.name}
                      </Text>
                      <View style={styles.vOwner}>
                        <View style={[styles.ownerDot, { backgroundColor: oc }]}>
                          <Text style={styles.ownerInitial}>{doc.owner[0]?.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.ownerName} numberOfLines={1}>
                          {doc.owner}
                        </Text>
                      </View>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Pressable style={[styles.fab, { bottom: insets.bottom + 16 }]} onPress={() => router.push('/scan')}>
        <Camera size={22} color={Brand.onAccent} weight="fill" />
        <Text style={styles.fabText}>Scan</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.bgBase },
  screen: { flex: 1, backgroundColor: Brand.bgBase },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 18, marginTop: 8, marginBottom: 14,
    backgroundColor: Brand.surface, borderWidth: 1.5, borderColor: Brand.border,
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 15, color: Brand.text, fontFamily: FontFamily.regular, padding: 0 },

  chipsRow: { gap: 8, paddingHorizontal: 18, paddingBottom: 14 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: Brand.surfaceAlt, borderWidth: 1, borderColor: Brand.border,
  },
  chipOn: { backgroundColor: Brand.accent, borderColor: Brand.accent },
  chipText: { color: Brand.muted, fontSize: 13, fontFamily: FontFamily.semibold },
  chipTextOn: { color: Brand.onAccent },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 18 },
  cardWrap: { width: '48%', marginBottom: 13 },
  vcard: {
    backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border,
    borderRadius: Radius.md, padding: 14, gap: 10, minHeight: 142, justifyContent: 'flex-start',
  },
  pressed: { opacity: 0.7 },
  vcardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  vIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  expiryTag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, flexShrink: 1 },
  expiryText: { fontSize: 10.5, fontFamily: FontFamily.bold },
  vTitle: { color: Brand.text, fontSize: 14.5, fontFamily: FontFamily.semibold, lineHeight: 19 },
  vOwner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 'auto' },
  ownerDot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  ownerInitial: { color: '#fff', fontSize: 9, fontFamily: FontFamily.bold },
  ownerName: { color: Brand.faint, fontSize: 12, fontFamily: FontFamily.medium },

  emptyWrap: { padding: 40, alignItems: 'center' },
  emptyText: { color: Brand.muted, fontSize: 14, fontFamily: FontFamily.regular },

  fab: {
    position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Brand.accent, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 999,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  fabText: { color: Brand.onAccent, fontFamily: FontFamily.bold, fontSize: 15 },
});
