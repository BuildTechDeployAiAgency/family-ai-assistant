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

import { Markdown } from '@/components/Markdown';
import { Brand, FontFamily } from '@/constants/theme';
import { api } from '@/lib/api';

interface Turn {
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTIONS = [
  "Whose passport expires soon?",
  "How did Bella do in her latest results?",
  'What do we need to do for Ayla?',
  "What's most urgent this week?",
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
        contentContainerStyle={{ padding: 16, paddingBottom: 16, gap: 14 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {turns.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.orb}>
              <Ionicons name="sparkles" size={26} color={Brand.accent} />
            </View>
            <Text style={styles.emptyTitle}>Ask about your family</Text>
            <Text style={styles.emptySub}>Documents, expiries, school results, tasks — grounded in your real data.</Text>
            <View style={styles.suggestWrap}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} style={styles.suggestChip} onPress={() => send(s)}>
                  <Ionicons name="arrow-forward-circle-outline" size={16} color={Brand.accent} />
                  <Text style={styles.suggestText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {turns.map((t, i) =>
          t.role === 'user' ? (
            <View key={i} style={[styles.bubble, styles.user]}>
              <Text style={styles.userText}>{t.text}</Text>
            </View>
          ) : (
            <View key={i} style={styles.assistantWrap}>
              <View style={styles.assistantLabel}>
                <Ionicons name="sparkles" size={11} color={Brand.accent} />
                <Text style={styles.assistantLabelText}>Assistant</Text>
              </View>
              <View style={[styles.bubble, styles.assistant]}>
                <Markdown text={t.text} />
              </View>
            </View>
          )
        )}

        {loading && (
          <View style={styles.assistantWrap}>
            <View style={styles.assistantLabel}>
              <Ionicons name="sparkles" size={11} color={Brand.accent} />
              <Text style={styles.assistantLabelText}>Assistant</Text>
            </View>
            <View style={[styles.bubble, styles.assistant, styles.thinking]}>
              <ActivityIndicator color={Brand.accent} size="small" />
              <Text style={styles.thinkingText}>Thinking…</Text>
            </View>
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
        <Pressable
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => send(input)}
          disabled={loading || !input.trim()}>
          <Ionicons name="arrow-up" size={20} color="#04121f" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 36 },
  orb: {
    width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,194,255,0.12)', borderWidth: 1, borderColor: 'rgba(0,194,255,0.35)',
  },
  emptyTitle: { color: Brand.text, fontSize: 20, fontFamily: FontFamily.bold },
  emptySub: { color: Brand.muted, fontSize: 14, fontFamily: FontFamily.regular, textAlign: 'center', paddingHorizontal: 24, lineHeight: 20 },
  suggestWrap: { gap: 8, marginTop: 14, width: '100%' },
  suggestChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
  },
  suggestText: { color: Brand.text, fontSize: 14, fontFamily: FontFamily.medium, flex: 1 },

  bubble: { maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 11 },
  user: {
    alignSelf: 'flex-end', backgroundColor: Brand.accent,
    borderRadius: 18, borderBottomRightRadius: 5,
  },
  userText: { color: '#04121f', fontSize: 15, lineHeight: 21, fontFamily: FontFamily.medium },

  assistantWrap: { alignSelf: 'flex-start', maxWidth: '90%', gap: 4 },
  assistantLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 4 },
  assistantLabelText: { color: Brand.muted, fontSize: 11, fontFamily: FontFamily.semibold, letterSpacing: 0.3 },
  assistant: {
    backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border,
    borderRadius: 18, borderBottomLeftRadius: 5,
  },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkingText: { color: Brand.muted, fontSize: 14, fontFamily: FontFamily.regular },

  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 8,
    backgroundColor: Brand.surface, borderTopWidth: 1, borderTopColor: Brand.border,
  },
  input: {
    flex: 1, backgroundColor: Brand.bgBase, borderWidth: 1, borderColor: Brand.border,
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 11, color: Brand.text,
    fontSize: 15, fontFamily: FontFamily.regular,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Brand.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
