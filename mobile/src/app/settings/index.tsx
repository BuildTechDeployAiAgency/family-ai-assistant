import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, SectionLabel } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { useAuth } from '@/store/auth';
import { useMembers } from '@/store/members';

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const { members } = useMembers();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionLabel>Account</SectionLabel>
      <Card style={styles.card}>
        <Text style={styles.title}>{session?.familyName}</Text>
        <Text style={styles.muted}>{session?.email}</Text>
      </Card>

      <View style={styles.rowBetween}>
        <SectionLabel>Family members</SectionLabel>
        <Link href="/settings/member/new" asChild>
          <Pressable hitSlop={8}>
            <Ionicons name="add-circle" size={24} color={Brand.accent} />
          </Pressable>
        </Link>
      </View>

      {members.map((m) => (
        <Link key={m.id} href={`/settings/member/${m.id}`} asChild>
          <Pressable>
            <Card style={styles.memberRow}>
              <View style={[styles.avatar, { backgroundColor: `${m.color}22`, borderColor: `${m.color}66` }]}>
                <Text style={{ fontSize: 20 }}>{m.avatar}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{m.name}</Text>
                <Text style={styles.muted}>
                  {m.role || (m.isChild ? 'Child' : 'Adult')}
                  {m.isChild && m.grade ? ` · ${m.grade}` : ''}
                  {m.isChild && m.schoolEmail ? ` · ${m.schoolEmail}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Brand.muted} />
            </Card>
          </Pressable>
        </Link>
      ))}

      {members.length === 0 && (
        <Card style={styles.card}>
          <Text style={styles.muted}>No family members yet — add the household so documents and tasks can be assigned.</Text>
        </Card>
      )}

      <Pressable onPress={signOut} style={styles.signOut}>
        <Ionicons name="log-out-outline" size={18} color="#fb7185" />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  content: { padding: 16, gap: 10, paddingBottom: 48 },
  card: { gap: 2 },
  title: { color: Brand.text, fontSize: 16, fontWeight: '700' },
  muted: { color: Brand.muted, fontSize: 13 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberName: { color: Brand.text, fontSize: 15, fontWeight: '600' },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    padding: 12,
  },
  signOutText: { color: '#fb7185', fontWeight: '600' },
});
