import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SectionLabel } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { useMembers } from '@/store/members';

const AVATARS = ['👨‍💼', '👩‍⚕️', '👦', '👧', '👶', '🧑', '👵', '👴', '🏡', '👤'];
const COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#14b8a6', '#0ea5e9', '#a855f7', '#ec4899'];

export default function EditMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getMember, addMember, updateMember, deleteMember } = useMembers();

  const isNew = id === 'new';
  const existing = isNew ? undefined : getMember(Number(id));

  const [name, setName] = useState(existing?.name ?? '');
  const [role, setRole] = useState(existing?.role ?? '');
  const [avatar, setAvatar] = useState(existing?.avatar ?? '👤');
  const [color, setColor] = useState(existing?.color ?? COLORS[0]);
  const [isChild, setIsChild] = useState(existing?.isChild ?? false);
  const [grade, setGrade] = useState(existing?.grade ?? '');
  const [schoolEmail, setSchoolEmail] = useState(existing?.schoolEmail ?? '');
  const [aliases, setAliases] = useState((existing?.aliases ?? []).join(', '));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim()) {
      setError('Enter a name.');
      return;
    }
    setBusy(true);
    setError('');
    const payload = {
      name: name.trim(),
      role: role.trim(),
      avatar,
      color,
      isChild,
      grade: grade.trim(),
      schoolEmail: schoolEmail.trim(),
      aliases: aliases
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
    };
    try {
      if (isNew) {
        await addMember(payload);
      } else if (existing) {
        await updateMember(existing.id, payload);
      }
      router.back();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save member.');
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!existing) return;
    Alert.alert('Remove member', `Remove ${existing.name} from the household?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMember(existing.id);
            router.back();
          } catch (err: any) {
            setError(err?.message ?? 'Failed to remove member.');
          }
        },
      },
    ]);
  };

  if (!isNew && !existing) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.muted}>Member not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionLabel>Name</SectionLabel>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Yusuf"
        placeholderTextColor={Brand.muted}
      />

      <SectionLabel style={styles.gap}>Role</SectionLabel>
      <TextInput
        style={styles.input}
        value={role}
        onChangeText={setRole}
        placeholder="e.g. Parent, Child 1 (9)"
        placeholderTextColor={Brand.muted}
      />

      <SectionLabel style={styles.gap}>Avatar</SectionLabel>
      <View style={styles.chipsRow}>
        {AVATARS.map((a) => (
          <Pressable
            key={a}
            onPress={() => setAvatar(a)}
            style={[styles.avatarChip, avatar === a && styles.avatarChipActive]}>
            <Text style={{ fontSize: 20 }}>{a}</Text>
          </Pressable>
        ))}
      </View>

      <SectionLabel style={styles.gap}>Colour</SectionLabel>
      <View style={styles.chipsRow}>
        {COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
          />
        ))}
      </View>

      <View style={[styles.rowBetween, styles.gap]}>
        <Text style={styles.label}>This is a child</Text>
        <Switch
          value={isChild}
          onValueChange={setIsChild}
          trackColor={{ true: Brand.accent }}
        />
      </View>

      {isChild && (
        <>
          <SectionLabel style={styles.gap}>School grade / year</SectionLabel>
          <TextInput
            style={styles.input}
            value={grade}
            onChangeText={setGrade}
            placeholder="e.g. Year 4"
            placeholderTextColor={Brand.muted}
          />

          <SectionLabel style={styles.gap}>School email address</SectionLabel>
          <Text style={styles.hint}>
            The address the school writes from — used to spot and file school emails for this child.
          </Text>
          <TextInput
            style={styles.input}
            value={schoolEmail}
            onChangeText={setSchoolEmail}
            placeholder="e.g. admin@greenwood.sch.ae"
            placeholderTextColor={Brand.muted}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <SectionLabel style={styles.gap}>Aliases</SectionLabel>
          <Text style={styles.hint}>
            Comma-separated terms that refer to this child in emails (class name, nickname).
          </Text>
          <TextInput
            style={styles.input}
            value={aliases}
            onChangeText={setAliases}
            placeholder="e.g. Year 4, Joe"
            placeholderTextColor={Brand.muted}
            autoCapitalize="none"
          />
        </>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Pressable onPress={save} disabled={busy} style={[styles.saveBtn, busy && { opacity: 0.6 }]}>
        <Text style={styles.saveText}>{busy ? 'Saving…' : isNew ? 'Add member' : 'Save changes'}</Text>
      </Pressable>

      {!isNew && (
        <Pressable onPress={remove} style={styles.removeBtn}>
          <Text style={styles.removeText}>Remove member</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 48 },
  gap: { marginTop: 16 },
  label: { color: Brand.text, fontSize: 15, fontWeight: '600' },
  muted: { color: Brand.muted },
  hint: { color: Brand.muted, fontSize: 12, marginTop: 2, marginBottom: 6 },
  input: {
    backgroundColor: Brand.surface,
    borderColor: Brand.border,
    borderWidth: 1,
    borderRadius: 12,
    color: Brand.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 6,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  avatarChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarChipActive: { borderColor: Brand.accent, backgroundColor: `${Brand.accent}22` },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotActive: { borderWidth: 3, borderColor: '#fff' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  error: { color: '#fb7185', marginTop: 12 },
  saveBtn: {
    backgroundColor: Brand.accent,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  removeBtn: { padding: 14, alignItems: 'center', marginTop: 8 },
  removeText: { color: '#fb7185', fontWeight: '600' },
});
