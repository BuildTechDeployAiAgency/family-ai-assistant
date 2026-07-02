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
import { ArrowBendUpRight, ArrowUp, Sparkle } from 'phosphor-react-native';

import { Markdown } from '@/components/Markdown';
import { Brand, FontFamily, Radius } from '@/constants/theme';
import { api } from '@/lib/api';

interface Turn {
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTIONS = [
  "Are our passports OK for the summer trip?",
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
        contentContainerStyle={{ padding: 18, paddingBottom: 18, gap: 13 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {turns.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.orb}>
              <Sparkle size={28} color="#fff" weight="fill" />
            </View>
            <Text style={styles.emptyTitle}>How can I help your family?</Text>
            <Text style={styles.emptySub}>Ask about documents, expiries, school results or tasks — answered from your real data.</Text>
            <View style={styles.suggestWrap}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} style={styles.suggestChip} onPress={() => send(s)}>
                  <ArrowBendUpRight size={16} color={Brand.accent} weight="bold" />
                  <Text style={styles.suggestText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          turns.map((t, i) =>
            t.role === 'user' ? (
              <View key={i} style={[styles.bubble, styles.user]}>
                <Text style={styles.userText}>{t.text}</Text>
              </View>
            ) : (
              <View key={i} style={styles.assistantWrap}>
                <View style={styles.aiLabel}>
                  <Sparkle size={12} color={Brand.accent} weight="fill" />
                  <Text style={styles.aiLabelText}>Concierge</Text>
                </View>
                <View style={[styles.bubble, styles.assistant]}>
                  <Markdown text={t.text} />
                </View>
              </View>
            )
          )
        )}

        {loading && (
          <View style={styles.assistantWrap}>
            <View style={styles.aiLabel}>
              <Sparkle size={12} color={Brand.accent} weight="fill" />
              <Text style={styles.aiLabelText}>Concierge</Text>
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
          placeholderTextColor={Brand.faint}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
        />
        <Pressable
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => send(input)}
          disabled={loading || !input.trim()}>
          <ArrowUp size={20} color="#fff" weight="bold" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  orb: {
    width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Brand.accent, shadowColor: Brand.accent, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
  },
  emptyTitle: { color: Brand.text, fontSize: 22, fontFamily: FontFamily.serif, textAlign: 'center', marginTop: 4 },
  emptySub: { color: Brand.muted, fontSize: 14, fontFamily: FontFamily.regular, textAlign: 'center', paddingHorizontal: 20, lineHeight: 21 },
  suggestWrap: { gap: 9, marginTop: 16, width: '100%' },
  suggestChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border,
    borderRadius: Radius.md, paddingHorizontal: 15, paddingVertical: 14,
  },
  suggestText: { color: Brand.text, fontSize: 14, fontFamily: FontFamily.medium, flex: 1 },

  bubble: { maxWidth: '86%', paddingHorizontal: 15, paddingVertical: 12 },
  user: {
    alignSelf: 'flex-end', backgroundColor: Brand.accent,
    borderRadius: 20, borderBottomRightRadius: 6,
  },
  userText: { color: Brand.onAccent, fontSize: 15, lineHeight: 21, fontFamily: FontFamily.medium },

  assistantWrap: { alignSelf: 'flex-start', maxWidth: '92%', gap: 5 },
  aiLabel: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 4 },
  aiLabelText: { color: Brand.accent, fontSize: 11, fontFamily: FontFamily.bold, letterSpacing: 0.4 },
  assistant: {
    backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border,
    borderRadius: 20, borderBottomLeftRadius: 6,
  },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkingText: { color: Brand.muted, fontSize: 14, fontFamily: FontFamily.regular },

  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 10,
    backgroundColor: Brand.surface, borderTopWidth: 1, borderTopColor: Brand.border,
  },
  input: {
    flex: 1, backgroundColor: Brand.bgBase, borderWidth: 1, borderColor: Brand.border,
    borderRadius: Radius.pill, paddingHorizontal: 17, paddingVertical: 12, color: Brand.text,
    fontSize: 15, fontFamily: FontFamily.regular,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: Brand.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
