import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
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
import { useAuth } from '@/store/auth';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      // gate in root layout redirects to /(tabs) once session is set
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="home" size={30} color="#04121f" />
          </View>
          <Text style={styles.title}>Family AI</Text>
          <Text style={styles.subtitle}>Your household, organized.</Text>
        </View>

        <View style={styles.form}>
          <Field label="Email">
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@family.com"
              placeholderTextColor={Brand.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </Field>
          <Field label="Password">
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={Brand.muted}
              secureTextEntry
            />
          </Field>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={[styles.btn, busy && styles.btnBusy]} onPress={onSubmit} disabled={busy}>
            {busy ? <ActivityIndicator color="#04121f" /> : <Text style={styles.btnText}>Sign in</Text>}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>New here? </Text>
            <Link href="/(auth)/register" style={styles.link}>
              Create an account
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Brand.bgBase },
  container: { paddingHorizontal: 24, gap: 40 },
  brand: { alignItems: 'center', gap: 8 },
  logo: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: Brand.accent,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  title: { color: Brand.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: Brand.muted, fontSize: 15 },
  form: { gap: 18 },
  label: { color: Brand.muted, fontSize: 13, fontWeight: '700' },
  input: {
    backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, color: Brand.text, fontSize: 16,
  },
  error: { color: Brand.red, fontSize: 13 },
  btn: {
    backgroundColor: Brand.accent, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  btnBusy: { opacity: 0.7 },
  btnText: { color: '#04121f', fontSize: 16, fontWeight: '800' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  footerText: { color: Brand.muted, fontSize: 14 },
  link: { color: Brand.accent, fontSize: 14, fontWeight: '700' },
});
