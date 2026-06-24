import { Camera, Check, FileText, ImageSquare } from 'phosphor-react-native';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Pill, SectionLabel } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { FontFamily } from '@/constants/theme';
import { categoryColor } from '@/lib/helpers';
import { extractFromImage, type Extraction } from '@/lib/mockExtract';
import { useData } from '@/store/data';
import { useDocuments } from '@/store/documents';

const CATEGORIES = ['Identity', 'Driving', 'Education', 'Health', 'Finance', 'Insurance', 'Travel', 'Admin'];

// Shared/household owner — stored with no member_id, returned by the API as "Family".
const FAMILY_OWNER = { name: 'Family', avatar: '🏡', color: Brand.accent };

type Phase = 'capture' | 'analyzing' | 'review';

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addDocument } = useDocuments();
  const { members } = useData();

  // Owner choices = the signed-in family's real members. The seed already includes a
  // "Family" household member; only fall back to a synthetic one if it's missing.
  const base = members.map((m) => ({ name: m.name, avatar: m.avatar, color: m.color }));
  const owners = base.some((m) => m.name === FAMILY_OWNER.name) ? base : [...base, FAMILY_OWNER];

  const [phase, setPhase] = useState<Phase>('capture');
  const [image, setImage] = useState<string | null>(null);
  const [draft, setDraft] = useState<Extraction | null>(null);

  const runExtraction = async (asset: ImagePicker.ImagePickerAsset) => {
    setImage(asset.uri);
    setPhase('analyzing');
    try {
      if (!asset.base64) throw new Error('Could not read the image data.');
      const result = await extractFromImage(asset.base64, asset.mimeType ?? 'image/jpeg');
      setDraft(result);
      setPhase('review');
    } catch (err) {
      Alert.alert('Scan failed', err instanceof Error ? err.message : 'Could not read this document.');
      setPhase('capture');
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Enable camera access to scan a document.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true });
    if (!res.canceled) runExtraction(res.assets[0]);
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ['images'], base64: true });
    if (!res.canceled) runExtraction(res.assets[0]);
  };

  const save = () => {
    if (!draft) return;
    addDocument({
      name: draft.name,
      number: draft.number,
      category: draft.category,
      owner: draft.owner,
      expiryDate: draft.expiryDate,
      progress: 0,
    });
    router.back();
  };

  const patch = (p: Partial<Extraction>) => setDraft((d) => (d ? { ...d, ...p } : d));

  return (
    <>
      <Stack.Screen options={{ title: 'Scan document', presentation: 'modal' }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}>
        {phase === 'capture' && (
          <>
            <View style={styles.hero}>
              <FileText size={48} color={Brand.accent} weight="duotone" />
              <Text style={styles.heroTitle}>Add a document</Text>
              <Text style={styles.heroSub}>
                Snap or pick a photo — the assistant reads the title, category, and expiry for you.
              </Text>
            </View>
            <Pressable style={[styles.bigBtn, styles.primaryBtn]} onPress={takePhoto}>
              <Camera size={20} color={Brand.onAccent} weight="fill" />
              <Text style={styles.primaryBtnText}>Take photo</Text>
            </Pressable>
            <Pressable style={[styles.bigBtn, styles.secondaryBtn]} onPress={pickImage}>
              <ImageSquare size={20} color={Brand.text} />
              <Text style={styles.secondaryBtnText}>Choose from library</Text>
            </Pressable>
          </>
        )}

        {phase === 'analyzing' && (
          <View style={styles.analyzing}>
            {image && <Image source={{ uri: image }} style={styles.preview} contentFit="cover" />}
            <ActivityIndicator color={Brand.accent} size="large" />
            <Text style={styles.analyzingText}>✨ Reading document…</Text>
          </View>
        )}

        {phase === 'review' && draft && (
          <>
            {image && <Image source={{ uri: image }} style={styles.preview} contentFit="cover" />}
            <View style={styles.confidenceRow}>
              <Pill
                label={`AI confidence ${(draft.confidence * 100).toFixed(0)}%`}
                color={Brand.green}
                bg="rgba(16,185,129,0.14)"
              />
              <Text style={styles.reviewHint}>Check & edit before saving</Text>
            </View>

            <Card style={{ gap: 14 }}>
              <Field label="Title">
                <TextInput
                  style={styles.input}
                  value={draft.name}
                  onChangeText={(t) => patch({ name: t })}
                  placeholderTextColor={Brand.muted}
                />
              </Field>
              <Field label="Number">
                <TextInput
                  style={styles.input}
                  value={draft.number}
                  onChangeText={(t) => patch({ number: t })}
                  placeholderTextColor={Brand.muted}
                />
              </Field>
              <Field label="Expiry date (YYYY-MM-DD)">
                <TextInput
                  style={styles.input}
                  value={draft.expiryDate}
                  onChangeText={(t) => patch({ expiryDate: t })}
                  autoCapitalize="none"
                  placeholderTextColor={Brand.muted}
                />
              </Field>

              <Field label="Category">
                <View style={styles.chipWrap}>
                  {CATEGORIES.map((c) => {
                    const active = draft.category === c;
                    return (
                      <Pressable key={c} onPress={() => patch({ category: c })}>
                        <Pill
                          label={c}
                          color={active ? Brand.onAccent : categoryColor(c)}
                          bg={active ? categoryColor(c) : `${categoryColor(c)}22`}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </Field>

              <Field label="Owner">
                <View style={styles.chipWrap}>
                  {owners.map((m) => {
                    const active = draft.owner === m.name;
                    return (
                      <Pressable key={m.name} onPress={() => patch({ owner: m.name })}>
                        <View style={[styles.ownerChip, active && { backgroundColor: m.color, borderColor: m.color }]}>
                          <Text style={styles.ownerEmoji}>{m.avatar}</Text>
                          <Text style={[styles.ownerName, active && { color: Brand.onAccent }]}>{m.name}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </Field>
            </Card>

            <Pressable style={[styles.bigBtn, styles.primaryBtn]} onPress={save}>
              <Check size={20} color={Brand.onAccent} weight="bold" />
              <Text style={styles.primaryBtnText}>Save to vault</Text>
            </Pressable>
            <Pressable style={styles.linkBtn} onPress={() => setPhase('capture')}>
              <Text style={styles.linkText}>Rescan</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  hero: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  heroTitle: { color: Brand.text, fontSize: 24, fontFamily: FontFamily.serif },
  heroSub: { color: Brand.muted, fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 12 },
  bigBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  primaryBtn: { backgroundColor: Brand.accent },
  primaryBtnText: { color: Brand.onAccent, fontSize: 16, fontFamily: FontFamily.bold },
  secondaryBtn: { backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  secondaryBtnText: { color: Brand.text, fontSize: 16, fontWeight: '700' },
  analyzing: { alignItems: 'center', gap: 16, paddingVertical: 32 },
  analyzingText: { color: Brand.muted, fontSize: 15 },
  preview: { width: '100%', height: 200, borderRadius: 14, backgroundColor: Brand.surface },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewHint: { color: Brand.muted, fontSize: 12 },
  input: {
    backgroundColor: Brand.bgBase, borderWidth: 1, borderColor: Brand.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, color: Brand.text, fontSize: 15,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ownerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: Brand.border, backgroundColor: Brand.surfaceAlt,
  },
  ownerEmoji: { fontSize: 14 },
  ownerName: { color: Brand.text, fontSize: 13, fontWeight: '600' },
  linkBtn: { alignItems: 'center', paddingVertical: 8 },
  linkText: { color: Brand.accent, fontSize: 14, fontWeight: '600' },
});
