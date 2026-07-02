import { Check, Lightning, Sparkle, Key } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Pill, SectionLabel } from '@/components/ui';
import { Brand, FontFamily, Radius } from '@/constants/theme';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';

interface ModelOption {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  badge?: string;
}

const MODELS: ModelOption[] = [
  { id: 'concierge', label: 'Concierge (default)', desc: 'Balanced, grounded answers from your family data.', icon: <Sparkle size={20} color={Brand.accent} weight="fill" />, badge: 'Default' },
  { id: 'sharper', label: 'Sharper', desc: 'A stronger model for trickier questions. Slower.', icon: <Lightning size={20} color={Brand.accent} weight="fill" /> },
  { id: 'byok', label: 'Bring your own key', desc: 'Use your own provider key. Configured server-side — keys never touch this device.', icon: <Key size={20} color={Brand.faint} weight="duotone" />, badge: 'Advanced' },
];

const LANGUAGES = ['English', 'Português', 'Español'];
const LANG_TO_CODE: Record<string, string> = { English: 'en', Português: 'pt', Español: 'es' };
const CODE_TO_LANG: Record<string, string> = { en: 'English', pt: 'Português', es: 'Español' };
const TONE_LABEL: Record<string, string> = { concise: 'Concise', detailed: 'Detailed', warm: 'Warm' };

export default function PreferencesScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const [primaryParent, setPrimaryParent] = useState(true);
  const [model, setModel] = useState('concierge');
  const [language, setLanguage] = useState('English');
  const [replyStyle, setReplyStyle] = useState('Concise');
  const [savedAt, setSavedAt] = useState(0);

  // Load persisted preferences on mount.
  useEffect(() => {
    api
      .preferences()
      .then(({ preferences: p }) => {
        if (p.aiModel) setModel(p.aiModel);
        if (p.language && CODE_TO_LANG[p.language]) setLanguage(CODE_TO_LANG[p.language]);
        if (p.tone && TONE_LABEL[p.tone]) setReplyStyle(TONE_LABEL[p.tone]);
      })
      .catch(() => {});
  }, []);

  // Optimistic persist; flashes a "Saved" indicator on success.
  const save = (patch: object) => {
    api
      .updatePreferences(patch)
      .then(() => setSavedAt(Date.now()))
      .catch(() => {});
  };

  const pickLanguage = (v: string) => {
    setLanguage(v);
    save({ language: LANG_TO_CODE[v] ?? 'en' });
  };
  const pickReplyStyle = (v: string) => {
    setReplyStyle(v);
    save({ tone: v.toLowerCase() });
  };
  const pickModel = (id: string) => {
    setModel(id);
    save({ ai_model: id });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12 }}>
      <SectionLabel>Me</SectionLabel>
      <Card style={styles.card}>
        <Row label="Display name" value={session?.familyName ?? 'My Family'} />
        <View style={styles.divider} />
        <SelectRow label="Language" value={language} options={LANGUAGES} onPick={pickLanguage} />
        <View style={styles.divider} />
        <ToggleRow
          label="Primary parent"
          sub="Receives escalations & urgent pings"
          value={primaryParent}
          onChange={setPrimaryParent}
        />
      </Card>

      <SectionLabel>Communication</SectionLabel>
      <Card style={styles.card}>
        <SelectRow
          label="Reply style"
          sub="How the concierge talks to you"
          value={replyStyle}
          options={['Concise', 'Detailed', 'Warm']}
          onPick={pickReplyStyle}
        />
      </Card>

      <SectionLabel>AI model</SectionLabel>
      <View style={{ gap: 10 }}>
        {MODELS.map((m) => {
          const active = model === m.id;
          return (
            <Pressable key={m.id} onPress={() => pickModel(m.id)}>
              <Card style={[styles.modelCard, active && styles.modelCardActive]}>
                <View style={styles.modelIcon}>{m.icon}</View>
                <View style={{ flex: 1 }}>
                  <View style={styles.modelTitleRow}>
                    <Text style={styles.modelLabel}>{m.label}</Text>
                    {m.badge && (
                      <Pill
                        label={m.badge}
                        color={m.badge === 'Advanced' ? Brand.muted : Brand.accent}
                        bg={m.badge === 'Advanced' ? Brand.surfaceAlt : 'rgba(181,101,74,0.12)'}
                      />
                    )}
                  </View>
                  <Text style={styles.modelDesc}>{m.desc}</Text>
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active && <Check size={13} color={Brand.onAccent} weight="bold" />}
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.footnote}>
        {savedAt ? '✓ Saved. ' : ''}Models run server-side via OpenRouter. Your assistant only ever sees your family’s own data.
      </Text>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function ToggleRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Brand.border, true: Brand.accent }}
        thumbColor={Brand.surface}
      />
    </View>
  );
}

function SelectRow({
  label,
  sub,
  value,
  options,
  onPick,
}: {
  label: string;
  sub?: string;
  value: string;
  options: string[];
  onPick: (v: string) => void;
}) {
  const next = () => {
    const i = options.indexOf(value);
    onPick(options[(i + 1) % options.length]);
  };
  return (
    <Pressable style={styles.row} onPress={next}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <Text style={styles.rowValueAccent}>{value}</Text>
    </Pressable>
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
  rowValue: { color: Brand.muted, fontSize: 15, fontFamily: FontFamily.medium },
  rowValueAccent: { color: Brand.accent, fontSize: 15, fontFamily: FontFamily.semibold },
  divider: { height: 1, backgroundColor: Brand.border, marginLeft: 16 },

  modelCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modelCardActive: { borderColor: Brand.accent, borderWidth: 1.5 },
  modelIcon: {
    width: 38, height: 38, borderRadius: Radius.sm, backgroundColor: Brand.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  modelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modelLabel: { color: Brand.text, fontSize: 15, fontFamily: FontFamily.semibold },
  modelDesc: { color: Brand.muted, fontSize: 12, fontFamily: FontFamily.regular, marginTop: 2, lineHeight: 17 },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: Brand.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { backgroundColor: Brand.accent, borderColor: Brand.accent },
  footnote: { color: Brand.faint, fontSize: 12, fontFamily: FontFamily.regular, lineHeight: 17, paddingHorizontal: 4 },
});
