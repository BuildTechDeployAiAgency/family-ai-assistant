import { Check, Trash, UserPlus } from 'phosphor-react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Card, SectionLabel } from '@/components/ui';
import { Brand, FontFamily, Radius } from '@/constants/theme';
import { useData } from '@/store/data';

const EMOJIS = ['👨‍💻', '👩', '👧', '👦', '👶', '🧑', '👴', '👵', '🧔', '👩‍🦰', '🐶', '🐱'];
const COLORS = ['#4E6E8E', '#B5654A', '#7A6A9E', '#5B8A7A', '#C79A3A', '#8E5B6E', '#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#a855f7', '#14b8a6'];

const DOB_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function MemberScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { members, addMember, updateMember, removeMember } = useData();

  const creating = id === 'new';
  const member = useMemo(() => members.find((m) => m.id === id), [members, id]);

  const [name, setName] = useState(member?.name ?? '');
  const [memberType, setMemberType] = useState<'adult' | 'child'>(
    member?.memberType === 'adult' ? 'adult' : 'child'
  );
  const [role, setRole] = useState(member?.role ?? '');
  const [grade, setGrade] = useState(member?.grade ?? '');
  const [dob, setDob] = useState(member?.dateOfBirth ?? '');
  const [emoji, setEmoji] = useState(member?.avatar ?? '🧑');
  const [color, setColor] = useState(member?.color ?? Brand.accent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit mode but the id doesn't resolve → genuinely not found.
  if (!creating && !member) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Brand.accent} />
        <Text style={styles.notFound}>Member not found.</Text>
      </View>
    );
  }

  const dobValid = !dob.trim() || DOB_RE.test(dob.trim());
  const dirty =
    creating ||
    name.trim() !== member!.name ||
    role !== (member!.role ?? '') ||
    (grade ?? '') !== (member!.grade ?? '') ||
    (dob ?? '') !== (member!.dateOfBirth ?? '') ||
    emoji !== member!.avatar ||
    color !== member!.color;

  const canRemove = !creating && member!.memberType !== 'household';

  const save = async () => {
    if (!name.trim() || !dobValid || saving) return;
    setError('');
    setSaving(true);
    try {
      if (creating) {
        await addMember({
          name: name.trim(),
          memberType,
          role: role.trim() || null,
          grade: grade.trim() || null,
          dateOfBirth: dob.trim() || null,
          avatar: emoji,
          color,
        });
      } else {
        await updateMember(member!.id, {
          name: name.trim(),
          role: role.trim() || null,
          grade: grade.trim() || null,
          dateOfBirth: dob.trim() || null,
          avatar: emoji,
          color,
        });
      }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!member || deleting) return;
    setError('');
    setDeleting(true);
    try {
      await removeMember(member.id);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove member.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: creating ? 'Add member' : 'Edit member' }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 14 }}
        keyboardShouldPersistTaps="handled">
        {/* Mini-profile header */}
        <Card style={styles.header}>
          <Avatar owner={name || 'New'} size={76} emoji={emoji} color={color} />
          <Text style={styles.headerName}>{name.trim() || (creating ? 'New member' : member!.name)}</Text>
          <Text style={styles.headerMeta}>
            {[role.trim() || (creating ? (memberType === 'adult' ? 'Parent' : 'Child') : member!.memberType),
              member?.age != null ? `${member.age} yrs` : null]
              .filter(Boolean)
              .join('  ·  ')}
          </Text>
        </Card>

        {/* Who is this? — only when adding */}
        {creating && (
          <>
            <SectionLabel>Who is this?</SectionLabel>
            <View style={styles.typeRow}>
              {(['adult', 'child'] as const).map((t) => {
                const on = memberType === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setMemberType(t)}
                    style={[styles.typeBtn, on && styles.typeBtnOn]}>
                    <Text style={[styles.typeTxt, on && styles.typeTxtOn]}>{t === 'adult' ? 'Parent / Adult' : 'Child'}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Avatar */}
        <SectionLabel>Avatar</SectionLabel>
        <Card style={styles.pickCard}>
          <View style={styles.emojiWrap}>
            {EMOJIS.map((e) => (
              <Pressable
                key={e}
                onPress={() => setEmoji(e)}
                style={[styles.emojiBtn, emoji === e && { borderColor: Brand.accent, backgroundColor: Brand.surfaceAlt }]}>
                <Text style={styles.emojiTxt}>{e}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.swatchWrap}>
            {COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchOn]}>
                {color === c && <Check size={14} color="#fff" weight="bold" />}
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Details */}
        <SectionLabel>Details</SectionLabel>
        <Card style={styles.formCard}>
          <Field label="Name" value={name} onChangeText={setName} placeholder="Name" autoFocus={creating} />
          <View style={styles.divider} />
          <Field label="Role" value={role} onChangeText={setRole} placeholder="e.g. Parent · Child" />
          <View style={styles.divider} />
          <Field label="Grade / stage" value={grade} onChangeText={setGrade} placeholder="e.g. Year 5 (optional)" />
          <View style={styles.divider} />
          <Field
            label="Date of birth"
            value={dob}
            onChangeText={setDob}
            placeholder="YYYY-MM-DD (optional)"
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
          />
          {!dobValid && <Text style={styles.fieldErr}>Use the format YYYY-MM-DD.</Text>}
        </Card>

        {error ? <Text style={styles.saveErr}>{error}</Text> : null}

        <Pressable
          style={[styles.saveBtn, (!dirty || !name.trim() || !dobValid || saving) && styles.saveBtnDisabled]}
          onPress={save}
          disabled={!dirty || !name.trim() || !dobValid || saving}>
          {saving ? (
            <ActivityIndicator color={Brand.onAccent} size="small" />
          ) : (
            <>
              {creating ? <UserPlus size={18} color={Brand.onAccent} weight="bold" /> : <Check size={18} color={Brand.onAccent} weight="bold" />}
              <Text style={styles.saveTxt}>{creating ? 'Add member' : 'Save changes'}</Text>
            </>
          )}
        </Pressable>

        {/* Remove — inline two-step confirm (no blocking dialog, works on web) */}
        {canRemove && (
          confirmDelete ? (
            <View style={styles.confirmRow}>
              <Pressable style={[styles.confirmBtn, styles.confirmCancel]} onPress={() => setConfirmDelete(false)} disabled={deleting}>
                <Text style={styles.confirmCancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.confirmBtn, styles.confirmRemove]} onPress={remove} disabled={deleting}>
                {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmRemoveTxt}>Remove {member!.name}</Text>}
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.removeBtn} onPress={() => setConfirmDelete(true)}>
              <Trash size={17} color={Brand.red} />
              <Text style={styles.removeTxt}>Remove member</Text>
            </Pressable>
          )
        )}
      </ScrollView>
    </>
  );
}

function Field({
  label,
  ...props
}: { label: string } & ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={Brand.faint} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Brand.bgBase },
  notFound: { color: Brand.muted, fontSize: 14, fontFamily: FontFamily.regular },

  header: { alignItems: 'center', gap: 8, paddingVertical: 22 },
  headerName: { color: Brand.text, fontSize: 24, fontFamily: FontFamily.serif },
  headerMeta: { color: Brand.muted, fontSize: 13, fontFamily: FontFamily.medium },

  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Brand.border,
    alignItems: 'center', backgroundColor: Brand.surface,
  },
  typeBtnOn: { borderColor: Brand.accent, backgroundColor: Brand.surfaceAlt },
  typeTxt: { color: Brand.muted, fontSize: 14, fontFamily: FontFamily.semibold },
  typeTxtOn: { color: Brand.accent },

  pickCard: { gap: 14 },
  emojiWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn: {
    width: 44, height: 44, borderRadius: Radius.sm, borderWidth: 1, borderColor: Brand.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.bgBase,
  },
  emojiTxt: { fontSize: 22 },
  swatchWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  swatchOn: { borderWidth: 2, borderColor: Brand.text },

  formCard: { padding: 0 },
  field: { paddingHorizontal: 16, paddingVertical: 12 },
  fieldLabel: { color: Brand.muted, fontSize: 12, fontFamily: FontFamily.semibold, marginBottom: 6 },
  input: {
    backgroundColor: Brand.bgBase, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.md,
    paddingHorizontal: 13, paddingVertical: 11, color: Brand.text, fontSize: 15, fontFamily: FontFamily.regular,
  },
  fieldErr: { color: Brand.red, fontSize: 12, fontFamily: FontFamily.medium, paddingHorizontal: 16, paddingBottom: 12 },
  divider: { height: 1, backgroundColor: Brand.border, marginLeft: 16 },

  saveErr: { color: Brand.red, fontSize: 13, fontFamily: FontFamily.medium, textAlign: 'center' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Brand.accent, borderRadius: Radius.md, paddingVertical: 15,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveTxt: { color: Brand.onAccent, fontSize: 15, fontFamily: FontFamily.bold },

  removeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, marginTop: 2,
  },
  removeTxt: { color: Brand.red, fontSize: 14, fontFamily: FontFamily.semibold },
  confirmRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  confirmCancel: { borderWidth: 1, borderColor: Brand.border, backgroundColor: Brand.surface },
  confirmCancelTxt: { color: Brand.text, fontSize: 14, fontFamily: FontFamily.semibold },
  confirmRemove: { backgroundColor: Brand.red },
  confirmRemoveTxt: { color: '#fff', fontSize: 14, fontFamily: FontFamily.bold },
});
