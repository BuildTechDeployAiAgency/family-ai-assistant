import { Brain, Plus, TrashSimple } from 'phosphor-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Pill, SectionLabel } from '@/components/ui';
import { Brand, FontFamily, Radius } from '@/constants/theme';
import { api } from '@/lib/api';

interface MemoryItem {
  id: string;
  fact: string;
  kind: string;
  salience: number;
  source: 'user' | 'inferred';
  status: string;
}

export default function MemoryScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const { memory } = await api.memory();
      setItems(memory as MemoryItem[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load memory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    const fact = input.trim();
    if (!fact || adding) return;
    setAdding(true);
    setError('');
    try {
      const { memory } = await api.addMemory(fact);
      setItems((prev) => [memory as MemoryItem, ...prev]);
      setInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add.');
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id: string) => {
    const prev = items;
    setItems((cur) => cur.filter((m) => m.id !== id));
    try {
      await api.deleteMemory(id);
    } catch {
      setItems(prev); // revert
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}>
        <Card style={styles.intro}>
          <View style={styles.introIcon}>
            <Brain size={20} color={Brand.accent} weight="duotone" />
          </View>
          <Text style={styles.introText}>
            What your assistant remembers about the family. It uses these when answering. Edit or remove anything that’s
            wrong — it learns from you.
          </Text>
        </Card>

        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Add something to remember…"
            placeholderTextColor={Brand.faint}
            onSubmitEditing={add}
            returnKeyType="done"
            multiline
          />
          <Pressable style={[styles.addBtn, (!input.trim() || adding) && styles.addBtnOff]} onPress={add} disabled={!input.trim() || adding}>
            {adding ? <ActivityIndicator size="small" color={Brand.onAccent} /> : <Plus size={20} color={Brand.onAccent} weight="bold" />}
          </Pressable>
        </View>

        {error ? <Text style={styles.err}>{error}</Text> : null}

        <SectionLabel>Memories</SectionLabel>
        {loading ? (
          <ActivityIndicator color={Brand.accent} style={{ marginTop: 20 }} />
        ) : items.length === 0 ? (
          <Card>
            <Text style={styles.empty}>Nothing remembered yet. Add a fact above, or just keep using the assistant — it learns as you go.</Text>
          </Card>
        ) : (
          items.map((m) => (
            <Card key={m.id} style={styles.item}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.factText}>{m.fact}</Text>
                <Pill
                  label={m.source === 'inferred' ? 'Learned' : 'You added'}
                  color={m.source === 'inferred' ? Brand.violet : Brand.muted}
                  bg={m.source === 'inferred' ? 'rgba(78,110,142,0.12)' : Brand.surfaceAlt}
                />
              </View>
              <Pressable hitSlop={10} onPress={() => remove(m.id)} style={styles.del}>
                <TrashSimple size={18} color={Brand.faint} />
              </Pressable>
            </Card>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  intro: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  introIcon: { width: 38, height: 38, borderRadius: Radius.sm, backgroundColor: Brand.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  introText: { flex: 1, color: Brand.muted, fontSize: 13, fontFamily: FontFamily.regular, lineHeight: 19 },

  addRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  input: {
    flex: 1, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12, color: Brand.text, fontSize: 15, fontFamily: FontFamily.regular, maxHeight: 120,
  },
  addBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: Brand.accent, alignItems: 'center', justifyContent: 'center' },
  addBtnOff: { opacity: 0.4 },
  err: { color: Brand.red, fontSize: 13, fontFamily: FontFamily.medium },

  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  factText: { color: Brand.text, fontSize: 15, fontFamily: FontFamily.medium, lineHeight: 21 },
  del: { padding: 4 },
  empty: { color: Brand.muted, fontSize: 14, fontFamily: FontFamily.regular, lineHeight: 20 },
});
