import { CircleNotch } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, SectionLabel } from '@/components/ui';
import { Brand, FontFamily, Radius } from '@/constants/theme';

const LEAD_OPTIONS = [7, 14, 30];

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();

  const [docExpiry, setDocExpiry] = useState(true);
  const [leadDays, setLeadDays] = useState(14);
  const [schoolTasks, setSchoolTasks] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [quietHours, setQuietHours] = useState(true);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12 }}>
      <View style={styles.notice}>
        <CircleNotch size={14} color={Brand.muted} />
        <Text style={styles.noticeText}>Preview — push notifications aren’t live yet (delivery is being built).</Text>
      </View>

      <SectionLabel>By type</SectionLabel>
      <Card style={styles.card}>
        <ToggleRow label="Document expiry" sub="Reminders before anything expires" value={docExpiry} onChange={setDocExpiry} />
        {docExpiry && (
          <>
            <View style={styles.divider} />
            <View style={styles.leadRow}>
              <Text style={styles.rowSub}>Remind me</Text>
              <View style={styles.leadChips}>
                {LEAD_OPTIONS.map((d) => {
                  const active = leadDays === d;
                  return (
                    <Pressable key={d} onPress={() => setLeadDays(d)} style={[styles.chip, active && styles.chipActive]}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{d} days</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        )}
        <View style={styles.divider} />
        <ToggleRow label="School tasks & deadlines" sub="Per-child tasks from school comms" value={schoolTasks} onChange={setSchoolTasks} />
        <View style={styles.divider} />
        <ToggleRow label="Daily digest" sub="Morning summary of what matters" value={dailyDigest} onChange={setDailyDigest} time="08:00" />
        <View style={styles.divider} />
        <ToggleRow label="Weekly digest" sub="Sunday week-ahead overview" value={weeklyDigest} onChange={setWeeklyDigest} />
        <View style={styles.divider} />
        <ToggleRow label="Urgent only" sub="Overrides quiet hours" value={urgentOnly} onChange={setUrgentOnly} />
      </Card>

      <SectionLabel>Quiet hours</SectionLabel>
      <Card style={styles.card}>
        <ToggleRow
          label="Pause notifications"
          sub={quietHours ? '21:00 → 07:00' : 'Off'}
          value={quietHours}
          onChange={setQuietHours}
        />
      </Card>

      <Text style={styles.footnote}>
        Reminders are computed from your real documents, tasks and school communications.
      </Text>
    </ScrollView>
  );
}

function ToggleRow({
  label,
  sub,
  value,
  onChange,
  time,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  time?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      {time && value && <Text style={styles.time}>{time}</Text>}
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Brand.border, true: Brand.accent }}
        thumbColor={Brand.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  notice: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Brand.surfaceAlt, borderRadius: Radius.sm, padding: 10,
  },
  noticeText: { color: Brand.muted, fontSize: 12, fontFamily: FontFamily.medium, flex: 1 },
  card: { padding: 0 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16 },
  rowLabel: { color: Brand.text, fontSize: 15, fontFamily: FontFamily.semibold },
  rowSub: { color: Brand.muted, fontSize: 12, fontFamily: FontFamily.regular, marginTop: 1 },
  time: { color: Brand.accent, fontSize: 14, fontFamily: FontFamily.semibold },
  divider: { height: 1, backgroundColor: Brand.border, marginLeft: 16 },

  leadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, paddingTop: 2 },
  leadChips: { flexDirection: 'row', gap: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill,
    backgroundColor: Brand.surfaceAlt, borderWidth: 1, borderColor: Brand.border,
  },
  chipActive: { backgroundColor: Brand.accent, borderColor: Brand.accent },
  chipText: { color: Brand.muted, fontSize: 12, fontFamily: FontFamily.semibold },
  chipTextActive: { color: Brand.onAccent },
  footnote: { color: Brand.faint, fontSize: 12, fontFamily: FontFamily.regular, lineHeight: 17, paddingHorizontal: 4 },
});
