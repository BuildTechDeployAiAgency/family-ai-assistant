import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useChat, type AgentAction } from '@/store/chat';
import { useTasks } from '@/store/tasks';

const SUGGESTIONS = [
  'Remind me tomorrow at 8am to pay the school fees',
  'What documents expire this month?',
  'Add a meeting with the teacher next Tuesday at 3pm',
  "What's on the family's plate this week?",
];

const ACTION_ICON: Record<AgentAction['type'], keyof typeof Ionicons.glyphMap> = {
  task: 'checkmark-circle',
  reminder: 'alarm',
  meeting: 'calendar',
};

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { messages, sending, send } = useChat();
  const { refresh: refreshTasks } = useTasks();
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Keep the latest message in view.
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages.length, sending]);

  const submit = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || sending) return;
    setInput('');
    const actions = await send(value);
    if (actions.length > 0) refreshTasks();
  };

  const micHint = () =>
    Alert.alert(
      'Voice input coming soon',
      'Talking to the assistant needs a development build of the app — in Expo Go, type your request instead.'
    );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 16 }}>
        {messages.length === 0 && (
          <View style={styles.hero}>
            <Text style={styles.heroEmoji}>🤖</Text>
            <Text style={styles.heroTitle}>Hi, I'm Nori</Text>
            <Text style={styles.heroSub}>
              Ask me to create tasks, schedule reminders and meetings, or check what's coming up for the family.
            </Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} onPress={() => submit(s)} style={styles.suggestion}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {messages.map((m) => (
          <View key={m.id} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={m.role === 'user' ? styles.userText : styles.aiText}>{m.content}</Text>
            {!!m.actions?.length && (
              <View style={styles.actionsWrap}>
                {m.actions.map((a) => (
                  <Pressable
                    key={a.id}
                    onPress={() => router.push('/(tabs)/actions')}
                    style={styles.actionChip}>
                    <Ionicons name={ACTION_ICON[a.type]} size={13} color={Brand.green} />
                    <Text style={styles.actionChipText} numberOfLines={1}>
                      {a.type === 'reminder' ? 'Reminder set' : a.type === 'meeting' ? 'Meeting added' : 'Task added'} · {a.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ))}

        {sending && (
          <View style={[styles.bubble, styles.aiBubble, styles.typing]}>
            <ActivityIndicator size="small" color={Brand.accent} />
            <Text style={styles.aiText}>Thinking…</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Pressable onPress={micHint} style={styles.micBtn}>
          <Ionicons name="mic-off-outline" size={20} color={Brand.muted} />
        </Pressable>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask Nori anything…"
          placeholderTextColor={Brand.muted}
          multiline
          onSubmitEditing={() => submit()}
        />
        <Pressable
          onPress={() => submit()}
          disabled={sending || !input.trim()}
          style={[styles.sendBtn, (sending || !input.trim()) && { opacity: 0.4 }]}>
          <Ionicons name="arrow-up" size={20} color="#04121f" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  hero: { alignItems: 'center', gap: 8, paddingVertical: 28, paddingHorizontal: 8 },
  heroEmoji: { fontSize: 44 },
  heroTitle: { color: Brand.text, fontSize: 22, fontWeight: '800' },
  heroSub: { color: Brand.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  suggestions: { gap: 8, marginTop: 14, alignSelf: 'stretch' },
  suggestion: {
    backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
  },
  suggestionText: { color: Brand.accent, fontSize: 13, fontWeight: '600' },
  bubble: { maxWidth: '86%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Brand.accent, borderBottomRightRadius: 4 },
  aiBubble: {
    alignSelf: 'flex-start', backgroundColor: Brand.surface, borderWidth: 1,
    borderColor: Brand.border, borderBottomLeftRadius: 4,
  },
  userText: { color: '#04121f', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  aiText: { color: Brand.text, fontSize: 14, lineHeight: 20 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionsWrap: { gap: 6 },
  actionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  actionChipText: { color: Brand.green, fontSize: 12, fontWeight: '600', flexShrink: 1 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingTop: 10,
    backgroundColor: Brand.surface, borderTopWidth: 1, borderTopColor: Brand.border,
  },
  micBtn: { padding: 10 },
  input: {
    flex: 1, maxHeight: 110, backgroundColor: Brand.bgBase, borderWidth: 1, borderColor: Brand.border,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, color: Brand.text, fontSize: 14,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Brand.accent,
    alignItems: 'center', justifyContent: 'center',
  },
});
