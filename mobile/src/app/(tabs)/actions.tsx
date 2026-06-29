import { Check, CircleIcon } from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui';
import { Brand, FontFamily, Radius } from '@/constants/theme';
import { formatDate } from '@/lib/helpers';
import { useData } from '@/store/data';

const FAMILY = '__family__';

// Almanac "Actions, by child" — tasks are owned by the kid they concern.
// Switch owner with the avatar tabs up top; sage tick on complete.
export default function ActionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tasks, members, loading, toggleTask } = useData();
  const [selected, setSelected] = useState<string>(FAMILY);

  // Resolve an owner name → identity (colour + initials) from the live roster.
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

  // Owner tabs: Family first (covers everyone incl. household-wide tasks), then
  // every individual member who owns at least one task, in roster order.
  // Household-type members are skipped — the Family sentinel already covers them.
  const ownerTabs = useMemo(() => {
    const withTasks = new Set(tasks.map((t) => t.owner));
    const ordered = members
      .filter((m) => m.memberType !== 'household' && withTasks.has(m.name))
      .map((m) => m.name);
    // Any owner string not in the roster (defensive) still gets a tab.
    tasks.forEach((t) => {
      if (!members.some((m) => m.name === t.owner) && !ordered.includes(t.owner)) ordered.push(t.owner);
    });
    return [FAMILY, ...ordered];
  }, [tasks, members]);

  const scoped = useMemo(
    () => (selected === FAMILY ? tasks : tasks.filter((t) => t.owner === selected)),
    [tasks, selected]
  );

  const open = useMemo(
    () =>
      scoped
        .filter((t) => !t.completed)
        .sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }),
    [scoped]
  );
  const done = useMemo(() => scoped.filter((t) => t.completed), [scoped]);

  const scopeLabel = selected === FAMILY ? 'Family' : selected.split(' ')[0];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Brand.accent} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
      {/* Title */}
      <View style={styles.topline}>
        <Text style={styles.title}>Actions</Text>
      </View>

      {/* Owner tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.kidtabs}>
        {ownerTabs.map((name) => {
          const isFamily = name === FAMILY;
          const id = isFamily ? { color: Brand.green, initials: 'F' } : identify(name);
          const active = selected === name;
          return (
            <Pressable key={name} onPress={() => setSelected(name)} style={styles.kidtab}>
              <View
                style={[
                  styles.kidAvatar,
                  { backgroundColor: id.color },
                  active && styles.kidAvatarActive,
                ]}>
                <Text style={styles.kidAvatarText}>{id.initials}</Text>
              </View>
              <Text style={[styles.kidName, active && styles.kidNameActive]} numberOfLines={1}>
                {isFamily ? 'Family' : name.split(' ')[0]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        {/* Open */}
        <View style={styles.row}>
          <Text style={styles.sectLabel}>{scopeLabel} · open</Text>
          {open.length > 0 && (
            <View style={styles.countTag}>
              <Text style={styles.countTagText}>{open.length} open</Text>
            </View>
          )}
        </View>

        {open.length === 0 && (
          <Card>
            <Text style={styles.empty}>Nothing open here — all clear.</Text>
          </Card>
        )}

        {open.map((t) => (
          <TaskRow
            key={t.id}
            title={t.title}
            meta={metaLine(t.dueDate, identify(t.owner).role)}
            tag={t.dueDate ? shortDue(t.dueDate) : null}
            done={false}
            onToggle={() => toggleTask(t.id, true)}
            onOpen={() => router.push(`/action/${t.id}`)}
          />
        ))}

        {/* Done */}
        {done.length > 0 && (
          <>
            <View style={[styles.row, { marginTop: 8 }]}>
              <Text style={styles.sectLabel}>Done</Text>
            </View>
            {done.map((t) => (
              <TaskRow
                key={t.id}
                title={t.title}
                meta={t.dueDate ? `Was due ${formatDate(t.dueDate)}` : 'Completed'}
                tag={null}
                done
                onToggle={() => toggleTask(t.id, false)}
                onOpen={() => router.push(`/action/${t.id}`)}
              />
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function TaskRow({
  title,
  meta,
  tag,
  done,
  onToggle,
  onOpen,
}: {
  title: string;
  meta: string;
  tag: string | null;
  done: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <Pressable onPress={onOpen}>
      {({ pressed }) => (
        <Card style={[styles.taskCard, pressed && styles.pressed]}>
          <Pressable onPress={onToggle} hitSlop={10} style={styles.checkHit}>
            {done ? (
              <View style={styles.checkDone}>
                <Check size={14} color={Brand.onAccent} weight="bold" />
              </View>
            ) : (
              <CircleIcon size={26} color={Brand.faint} weight="regular" />
            )}
          </Pressable>
          <View style={styles.taskBody}>
            <Text style={[styles.taskTitle, done && styles.struck]} numberOfLines={2}>
              {title}
            </Text>
            <Text style={styles.taskMeta} numberOfLines={1}>
              {meta}
            </Text>
          </View>
          {tag && (
            <View style={styles.dueTag}>
              <Text style={styles.dueTagText}>{tag}</Text>
            </View>
          )}
        </Card>
      )}
    </Pressable>
  );
}

// "Due Friday · St. Mary's · needs a signature" style meta — kept compact.
function metaLine(dueDate: string | null, role: string | null): string {
  const parts: string[] = [];
  if (dueDate) parts.push(`Due ${formatDate(dueDate)}`);
  if (role) parts.push(role.replace(/^Child · /, ''));
  return parts.join(' · ') || 'No due date';
}

// Short weekday/day chip, e.g. "Fri".
function shortDue(str: string): string {
  const d = new Date(str);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { weekday: 'short' });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.bgBase },

  topline: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 6 },
  title: { color: Brand.text, fontSize: 28, fontFamily: FontFamily.serif },

  kidtabs: { gap: 18, paddingHorizontal: 20, paddingVertical: 14 },
  kidtab: { alignItems: 'center', gap: 6, width: 56 },
  kidAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', opacity: 0.5 },
  kidAvatarActive: { opacity: 1, borderWidth: 2, borderColor: Brand.text },
  kidAvatarText: { color: '#fff', fontSize: 17, fontFamily: FontFamily.bold },
  kidName: { color: Brand.muted, fontSize: 12, fontFamily: FontFamily.medium },
  kidNameActive: { color: Brand.text, fontFamily: FontFamily.bold },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectLabel: {
    color: Brand.faint, fontSize: 12, fontFamily: FontFamily.bold,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  countTag: { backgroundColor: `${Brand.amber}22`, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  countTagText: { color: Brand.amber, fontSize: 12, fontFamily: FontFamily.bold },

  empty: { color: Brand.muted, fontSize: 13.5, fontFamily: FontFamily.regular },

  taskCard: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14 },
  pressed: { opacity: 0.7 },
  checkHit: { width: 26, alignItems: 'center', justifyContent: 'center' },
  checkDone: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: Brand.green,
    alignItems: 'center', justifyContent: 'center',
  },
  taskBody: { flex: 1, gap: 3 },
  taskTitle: { color: Brand.text, fontSize: 15, fontFamily: FontFamily.semibold, lineHeight: 20 },
  struck: { textDecorationLine: 'line-through', color: Brand.muted },
  taskMeta: { color: Brand.muted, fontSize: 12.5, fontFamily: FontFamily.regular },
  dueTag: {
    backgroundColor: Brand.surfaceAlt, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 5,
  },
  dueTagText: { color: Brand.muted, fontSize: 12, fontFamily: FontFamily.semibold },
});
