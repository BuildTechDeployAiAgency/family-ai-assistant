import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
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

import { Brand } from '@/constants/theme';
import { api } from '@/lib/api';

interface Turn {
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTIONS = [
  "What's Ahmed's passport expiry?",
  "Yusuf's latest school result?",
  'Anything to pay for the kids this week?',
  'Which documents expire soon?',
];

export default function AskScreen() {
  const insets = useSafeAreaInsets();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const send = async (question: string) => {
    const q = question.trim();
    if (!q || loading) return;
    setInput('');
    setTurns((prev) => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const { answer } = await api.ask(q);
      setTurns((prev) => [...prev, { role: 'assistant', text: answer }]);
    } catch (err) {
      setTurns((prev) => [
        ...prev,
        { role: 'assistant', text: err instanceof Error ? err.message : 'Something went wrong.' },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 16, paddingBottom: 16, gap: 12 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {turns.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="sparkles" size={40} color={Brand.accent} />
            <Text style={styles.emptyTitle}>Ask about your family</Text>
            <Text style={styles.emptySub}>Documents, expiries, school results, tasks — grounded in your real data.</Text>
            <View style={styles.suggestWrap}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} style={styles.suggestChip} onPress={() => send(s)}>
                  <Text style={styles.suggestText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {turns.map((t, i) => (
          <View
            key={i}
            style={[styles.bubble, t.role === 'user' ? styles.user : styles.assistant]}>
            <Text style={[styles.bubbleText, t.role === 'user' && { color: '#04121f' }]}>{t.text}</Text>
          </View>
        ))}

        {loading && (
          <View style={[styles.bubble, styles.assistant, styles.thinking]}>
            <ActivityIndicator color={Brand.accent} size="small" />
            <Text style={styles.thinkingText}>Thinking…</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask anything…"
          placeholderTextColor={Brand.muted}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
        />
        <Pressable style={styles.sendBtn} onPress={() => send(input)} disabled={loading}>
          <Ionicons name="arrow-up" size={20} color="#04121f" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  emptyTitle: { color: Brand.text, fontSize: 20, fontWeight: '800' },
  emptySub: { color: Brand.muted, fontSize: 14, textAlign: 'center', paddingHorizontal: 24, lineHeight: 20 },
  suggestWrap: { gap: 8, marginTop: 12, width: '100%' },
  suggestChip: {
    backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  suggestText: { color: Brand.text, fontSize: 14 },
  bubble: { maxWidth: '85%', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  user: { alignSelf: 'flex-end', backgroundColor: Brand.accent },
  assistant: { alignSelf: 'flex-start', backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  bubbleText: { color: Brand.text, fontSize: 15, lineHeight: 21 },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkingText: { color: Brand.muted, fontSize: 14 },
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 8,
    backgroundColor: Brand.surface, borderTopWidth: 1, borderTopColor: Brand.border,
  },
  input: {
    flex: 1, backgroundColor: Brand.bgBase, borderWidth: 1, borderColor: Brand.border,
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, color: Brand.text, fontSize: 15,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Brand.accent,
    alignItems: 'center', justifyContent: 'center',
  },
});
