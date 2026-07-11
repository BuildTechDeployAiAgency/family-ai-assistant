import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
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

import { Card, SectionLabel } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { api } from '@/lib/api';
import { useRecipes } from '@/store/recipes';

type Mode = 'url' | 'text' | 'photo';
type Phase = 'input' | 'extracting' | 'review';

interface Extracted {
  title: string;
  ingredients: string[];
  steps: string[];
  image: string;
  sourceUrl: string;
}

export default function RecipeImportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addRecipe } = useRecipes();

  const [mode, setMode] = useState<Mode>('url');
  const [phase, setPhase] = useState<Phase>('input');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  // Review state (editable before saving)
  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [steps, setSteps] = useState('');
  const [image, setImage] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  const extract = async (payload: object) => {
    setPhase('extracting');
    setError('');
    try {
      const result = await api.post<Extracted>('/api/ai/extract-recipe', payload);
      setTitle(result.title);
      setIngredients(result.ingredients.join('\n'));
      setSteps(result.steps.join('\n'));
      setImage(result.image || '');
      setSourceUrl(result.sourceUrl || '');
      setPhase('review');
    } catch (err: any) {
      setError(
        err?.status === 503
          ? 'AI is not configured on the server yet — add OPENROUTER_API_KEY to import recipes.'
          : err?.message ?? 'Extraction failed.'
      );
      setPhase('input');
    }
  };

  const fromUrl = () => {
    if (!/^https?:\/\//i.test(url.trim())) {
      setError('Paste a full link starting with http(s)://');
      return;
    }
    extract({ url: url.trim() });
  };

  const fromText = () => {
    if (text.trim().length < 30) {
      setError('Paste the full recipe text.');
      return;
    }
    extract({ text: text.trim() });
  };

  const fromPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Enable camera access to photograph a recipe.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.4, base64: true });
    if (!res.canceled && res.assets[0].base64) {
      extract({ imageBase64: res.assets[0].base64, mimeType: res.assets[0].mimeType || 'image/jpeg' });
    }
  };

  const save = async () => {
    if (!title.trim()) {
      setError('Give the recipe a title.');
      return;
    }
    await addRecipe({
      title: title.trim(),
      sourceUrl,
      image,
      ingredients: ingredients.split('\n').map((l) => l.trim()).filter(Boolean),
      steps: steps.split('\n').map((l) => l.trim()).filter(Boolean),
    });
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Import recipe', presentation: 'modal' }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 14 }}>
        {phase === 'input' && (
          <>
            <View style={styles.modeRow}>
              <ModeBtn label="Link" icon="link" active={mode === 'url'} onPress={() => setMode('url')} />
              <ModeBtn label="Text" icon="document-text" active={mode === 'text'} onPress={() => setMode('text')} />
              <ModeBtn label="Photo" icon="camera" active={mode === 'photo'} onPress={() => setMode('photo')} />
            </View>

            {mode === 'url' && (
              <Card style={{ gap: 12 }}>
                <SectionLabel>Recipe link</SectionLabel>
                <TextInput
                  style={styles.input}
                  value={url}
                  onChangeText={setUrl}
                  placeholder="https://…"
                  placeholderTextColor={Brand.muted}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <Pressable style={styles.primaryBtn} onPress={fromUrl}>
                  <Ionicons name="sparkles" size={18} color="#04121f" />
                  <Text style={styles.primaryText}>Import from link</Text>
                </Pressable>
              </Card>
            )}

            {mode === 'text' && (
              <Card style={{ gap: 12 }}>
                <SectionLabel>Paste the recipe</SectionLabel>
                <TextInput
                  style={[styles.input, { minHeight: 160, textAlignVertical: 'top' }]}
                  value={text}
                  onChangeText={setText}
                  placeholder="Paste a recipe from a message, note, anywhere…"
                  placeholderTextColor={Brand.muted}
                  multiline
                />
                <Pressable style={styles.primaryBtn} onPress={fromText}>
                  <Ionicons name="sparkles" size={18} color="#04121f" />
                  <Text style={styles.primaryText}>Import from text</Text>
                </Pressable>
              </Card>
            )}

            {mode === 'photo' && (
              <Card style={{ gap: 12, alignItems: 'center', paddingVertical: 24 }}>
                <Text style={{ fontSize: 40 }}>📖</Text>
                <Text style={styles.photoHint}>
                  Photograph a cookbook page or a handwritten recipe — the assistant structures it for you.
                </Text>
                <Pressable style={styles.primaryBtn} onPress={fromPhoto}>
                  <Ionicons name="camera" size={18} color="#04121f" />
                  <Text style={styles.primaryText}>Take photo</Text>
                </Pressable>
              </Card>
            )}

            {!!error && <Text style={styles.error}>{error}</Text>}
          </>
        )}

        {phase === 'extracting' && (
          <View style={styles.extracting}>
            <ActivityIndicator color={Brand.accent} size="large" />
            <Text style={styles.extractingText}>✨ Reading the recipe…</Text>
          </View>
        )}

        {phase === 'review' && (
          <>
            <Card style={{ gap: 14 }}>
              <View style={{ gap: 8 }}>
                <SectionLabel>Title</SectionLabel>
                <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor={Brand.muted} />
              </View>
              <View style={{ gap: 8 }}>
                <SectionLabel>Ingredients · one per line</SectionLabel>
                <TextInput
                  style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
                  value={ingredients}
                  onChangeText={setIngredients}
                  multiline
                />
              </View>
              <View style={{ gap: 8 }}>
                <SectionLabel>Steps · one per line</SectionLabel>
                <TextInput
                  style={[styles.input, { minHeight: 160, textAlignVertical: 'top' }]}
                  value={steps}
                  onChangeText={setSteps}
                  multiline
                />
              </View>
            </Card>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Pressable style={styles.primaryBtn} onPress={save}>
              <Ionicons name="checkmark" size={18} color="#04121f" />
              <Text style={styles.primaryText}>Save to cookbook</Text>
            </Pressable>
            <Pressable style={styles.linkBtn} onPress={() => setPhase('input')}>
              <Text style={styles.linkText}>Start over</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </>
  );
}

function ModeBtn({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.modeBtn, active && styles.modeBtnActive]}>
      <Ionicons name={icon} size={18} color={active ? '#04121f' : Brand.muted} />
      <Text style={[styles.modeText, active && { color: '#04121f' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border,
  },
  modeBtnActive: { backgroundColor: Brand.accent, borderColor: Brand.accent },
  modeText: { color: Brand.muted, fontWeight: '700', fontSize: 13 },
  input: {
    backgroundColor: Brand.bgBase, borderWidth: 1, borderColor: Brand.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, color: Brand.text, fontSize: 15,
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Brand.accent, borderRadius: 12, paddingVertical: 14, alignSelf: 'stretch',
  },
  primaryText: { color: '#04121f', fontSize: 15, fontWeight: '800' },
  photoHint: { color: Brand.muted, fontSize: 13, textAlign: 'center', lineHeight: 19, paddingHorizontal: 12 },
  error: { color: '#fb7185', fontSize: 13 },
  extracting: { alignItems: 'center', gap: 16, paddingVertical: 48 },
  extractingText: { color: Brand.muted, fontSize: 15 },
  linkBtn: { alignItems: 'center', paddingVertical: 8 },
  linkText: { color: Brand.accent, fontSize: 14, fontWeight: '600' },
});
