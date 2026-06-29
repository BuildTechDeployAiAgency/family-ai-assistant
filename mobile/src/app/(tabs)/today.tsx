import { ArrowRight, CaretRight, Camera, SealWarning } from 'phosphor-react-native';
import { Link, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, SectionLabel } from '@/components/ui';
import { Brand, FontFamily, Radius } from '@/constants/theme';
import { REFERENCE_DATE } from '@/data/fixtures';
import { categoryColor, formatDate, getDaysDifference, getDocumentStatus } from '@/lib/helpers';
import { useAuth } from '@/store/auth';
import { useData } from '@/store/data';
import { useDocuments } from '@/store/documents';

// Almanac "Today" — anticipatory home. One dark focus card sets the single most
// useful thing; sticky-note reminders are owned by the child; recently filed
// keeps the vault one tap away. Camera is a thumb-reach FAB.
export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const { documents, loading: docsLoading } = useDocuments();
  const { tasks, members, loading: dataLoading } = useData();

  // Resolve an owner name → identity (colour + initials) from the live roster,
  // falling back to a derived initial so unknown owners still render.
  const identify = useMemo(() => {
    const map = new Map(members.map((m) => [m.name, m]));
    return (name: string) => {
      const m = map.get(name);
      return {
        color: m?.color ?? Brand.accent,
        initials: m?.initials ?? (name ? name[0].toUpperCase() : '?'),
        role: m?.role ?? null,
      };
    };
  }, [members]);

  // Soonest-expiring document with a real expiry date → the focus card.
  const focus = useMemo(() => {
    const dated = documents
      .filter((d) => getDocumentStatus(d.expiryDate).urgency <= 1)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    return dated[0] ?? null;
  }, [documents]);

  // Open, dated tasks, soonest first → sticky reminders.
  const reminders = useMemo(
    () =>
      tasks
        .filter((t) => !t.completed)
        .sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }),
    [tasks]
  );

  // Most-recently-added documents (store prepends new docs) → recently filed.
  const recent = useMemo(() => documents.slice(0, 3), [documents]);

  const greetName = useMemo(() => {
    const adult = members.find((m) => m.memberType === 'adult');
    return adult?.name ?? session?.familyName ?? 'there';
  }, [members, session]);

  const today = new Date(REFERENCE_DATE).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  if (docsLoading || dataLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Brand.accent} size="large" />
      </View>
    );
  }

  const me = identify(greetName);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
        {/* Greeting */}
        <View style={styles.topline}>
          <View style={{ flex: 1 }}>
            <Text style={styles.date}>{today}</Text>
            <Text style={styles.greet}>Good morning, {greetName}</Text>
          </View>
          <View style={[styles.me, { backgroundColor: me.color }]}>
            <Text style={styles.meText}>{me.initials}</Text>
          </View>
        </View>

        {/* Focus card */}
        {focus ? (
          <Link href={`/document/${focus.id}`} asChild>
            <Pressable>
              {({ pressed }) => <FocusCard doc={focus} pressed={pressed} identify={identify} />}
            </Pressable>
          </Link>
        ) : (
          <Card style={styles.focusEmpty}>
            <Text style={styles.focusEmptyText}>Nothing needs attention right now. Nicely on top of it.</Text>
          </Card>
        )}

        {/* On your plate */}
        {reminders.length > 0 && (
          <>
            <View style={styles.row}>
              <SectionLabel>On your plate</SectionLabel>
              {reminders.length > 2 && (
                <Link href="/actions" asChild>
                  <Pressable hitSlop={8}>
                    <Text style={styles.rowLink}>{reminders.length - 2} more</Text>
                  </Pressable>
                </Link>
              )}
            </View>
            <View style={styles.stickyWrap}>
              {reminders.slice(0, 2).map((t) => {
                const who = identify(t.owner);
                return (
                  <Link key={t.id} href={`/action/${t.id}`} asChild>
                    <Pressable>
                      {({ pressed }) => (
                        <View style={[styles.sticky, pressed && styles.pressed]}>
                          <View style={styles.stickyWho}>
                            <View style={[styles.dot, { backgroundColor: who.color }]}>
                              <Text style={styles.dotText}>{who.initials}</Text>
                            </View>
                            <Text style={styles.whoText}>
                              {t.owner}
                              {who.role ? ` · ${who.role.replace(/^Child · /, '')}` : ''}
                            </Text>
                          </View>
                          <Text style={styles.stickyTask}>{t.title}</Text>
                          {t.dueDate && <Text style={styles.stickyDue}>Due {formatDate(t.dueDate)}</Text>}
                        </View>
                      )}
                    </Pressable>
                  </Link>
                );
              })}
            </View>
          </>
        )}

        {/* Recently filed */}
        {recent.length > 0 && (
          <>
            <View style={styles.row}>
              <SectionLabel>Recently filed</SectionLabel>
              <Link href="/" asChild>
                <Pressable hitSlop={8}>
                  <Text style={styles.rowLink}>Vault</Text>
                </Pressable>
              </Link>
            </View>
            <Card style={styles.filedCard}>
              {recent.map((doc, i) => {
                const cat = categoryColor(doc.category);
                const status = getDocumentStatus(doc.expiryDate);
                return (
                  <Link key={doc.id} href={`/document/${doc.id}`} asChild>
                    <Pressable>
                      {({ pressed }) => (
                        <View style={[styles.filedItem, i > 0 && styles.filedDivider, pressed && styles.pressed]}>
                          <View style={[styles.filedIcon, { backgroundColor: `${cat}1A` }]}>
                            <Text style={[styles.filedInitial, { color: cat }]}>{doc.category[0]}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.filedName} numberOfLines={1}>
                              {doc.owner} — {doc.name}
                            </Text>
                            <Text style={styles.filedMeta} numberOfLines={1}>
                              {doc.category} · {status.label}
                            </Text>
                          </View>
                          <CaretRight size={18} color={Brand.faint} />
                        </View>
                      )}
                    </Pressable>
                  </Link>
                );
              })}
            </Card>
          </>
        )}
      </ScrollView>

      <Pressable style={[styles.fab, { bottom: insets.bottom + 16 }]} onPress={() => router.push('/scan')}>
        <Camera size={24} color={Brand.onAccent} weight="fill" />
      </Pressable>
    </View>
  );
}

function FocusCard({
  doc,
  pressed,
  identify,
}: {
  doc: { id: string; name: string; owner: string; expiryDate: string };
  pressed: boolean;
  identify: (name: string) => { color: string; initials: string; role: string | null };
}) {
  const days = getDaysDifference(doc.expiryDate, REFERENCE_DATE);
  const expired = days < 0;
  const hint = expired
    ? 'It lapsed already — worth sorting as soon as you can.'
    : 'Renewals can take a few weeks. Start now and you stay comfortable.';
  return (
    <View style={[styles.focus, pressed && styles.pressed]}>
      <SealWarning size={120} color="rgba(255,255,255,0.06)" weight="fill" style={styles.focusCorner} />
      <Text style={styles.focusKicker}>Worth a look today</Text>
      <Text style={styles.focusTitle}>
        {doc.owner}'s {doc.name.toLowerCase()}{'\n'}
        {expired ? `expired ${Math.abs(days)} days ago` : `expires in ${days} days`}
      </Text>
      <Text style={styles.focusBody}>{hint}</Text>
      <View style={styles.focusGo}>
        <Text style={styles.focusGoText}>Open {doc.name.toLowerCase()}</Text>
        <ArrowRight size={15} color="#fff" weight="bold" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.bgBase },
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.bgBase },

  topline: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14 },
  date: { color: Brand.muted, fontSize: 13, fontFamily: FontFamily.semibold },
  greet: { color: Brand.text, fontSize: 24, fontFamily: FontFamily.serif, marginTop: 2 },
  me: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  meText: { color: Brand.onAccent, fontSize: 16, fontFamily: FontFamily.bold },

  focus: {
    backgroundColor: Brand.text, borderRadius: Radius.lg, padding: 18,
    marginHorizontal: 20, marginBottom: 18, overflow: 'hidden',
  },
  focusCorner: { position: 'absolute', right: -18, top: -18 },
  focusKicker: { color: '#B9C2E8', fontSize: 11.5, fontFamily: FontFamily.bold, letterSpacing: 1, textTransform: 'uppercase' },
  focusTitle: { color: Brand.surface, fontSize: 22, fontFamily: FontFamily.serif, marginTop: 9, marginBottom: 6, lineHeight: 27 },
  focusBody: { color: '#D9D7CE', fontSize: 13.5, fontFamily: FontFamily.regular, lineHeight: 19 },
  focusGo: {
    flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginTop: 14,
    backgroundColor: Brand.accent, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 999,
  },
  focusGoText: { color: '#fff', fontSize: 13.5, fontFamily: FontFamily.semibold },
  focusEmpty: { marginHorizontal: 20, marginBottom: 18 },
  focusEmptyText: { color: Brand.muted, fontSize: 14, fontFamily: FontFamily.medium, lineHeight: 20 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 11 },
  rowLink: { color: Brand.accent, fontSize: 12.5, fontFamily: FontFamily.semibold },

  stickyWrap: { gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  sticky: {
    backgroundColor: '#FCF4D9', borderRadius: Radius.md, padding: 14,
    borderWidth: 1, borderColor: '#F0E4B8',
  },
  stickyWho: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  dot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  dotText: { color: '#fff', fontSize: 9, fontFamily: FontFamily.bold },
  whoText: { color: Brand.muted, fontSize: 12, fontFamily: FontFamily.bold },
  stickyTask: { color: Brand.text, fontSize: 14.5, fontFamily: FontFamily.semibold },
  stickyDue: { color: Brand.muted, fontSize: 12, fontFamily: FontFamily.regular, marginTop: 3 },

  filedCard: { padding: 4, marginHorizontal: 20 },
  filedItem: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13, paddingHorizontal: 10 },
  filedDivider: { borderTopWidth: 1, borderTopColor: Brand.border },
  filedIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  filedInitial: { fontSize: 18, fontFamily: FontFamily.bold },
  filedName: { color: Brand.text, fontSize: 14.5, fontFamily: FontFamily.semibold },
  filedMeta: { color: Brand.faint, fontSize: 12.5, fontFamily: FontFamily.regular, marginTop: 2 },

  pressed: { opacity: 0.7 },
  fab: {
    position: 'absolute', right: 18, width: 58, height: 58, borderRadius: 20,
    backgroundColor: Brand.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
});
