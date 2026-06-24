import { Link, useRouter } from 'expo-router';
import { CaretRight, Folders, BellRinging, Brain, SlidersHorizontal, SignOut, Plus } from 'phosphor-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Card, SectionLabel } from '@/components/ui';
import { Brand, FontFamily, Radius } from '@/constants/theme';
import { useAuth } from '@/store/auth';
import { useData } from '@/store/data';
import { useDocuments } from '@/store/documents';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { members } = useData();
  const { documents } = useDocuments();

  const family = members.filter((m) => m.memberType !== 'household');
  const initial = (session?.familyName ?? session?.email ?? 'F').trim().charAt(0).toUpperCase();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12 }}>
      {/* User header */}
      <Card style={styles.userCard}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{session?.familyName ?? 'My Family'}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>
            {session?.email ?? ''}
          </Text>
        </View>
      </Card>

      {/* Family members */}
      <SectionLabel>Family</SectionLabel>
      <Card style={styles.membersCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersRow}>
          {family.map((m) => (
            <Pressable
              key={m.id || m.name}
              style={({ pressed }) => [styles.member, pressed && styles.memberPressed]}
              onPress={() => router.push(`/profile/member/${m.id}`)}>
              <Avatar owner={m.name} size={52} emoji={m.avatar} color={m.color} />
              <Text style={styles.memberName}>{m.name}</Text>
              <Text style={styles.memberRole} numberOfLines={1}>
                {m.role}
              </Text>
            </Pressable>
          ))}
          {/* Add member */}
          <Pressable
            style={({ pressed }) => [styles.member, pressed && styles.memberPressed]}
            onPress={() => router.push('/profile/member/new')}>
            <View style={styles.addCircle}>
              <Plus size={24} color={Brand.accent} weight="bold" />
            </View>
            <Text style={styles.memberName}>Add</Text>
            <Text style={styles.memberRole} numberOfLines={1}>
              {family.length === 0 ? 'Add a member' : 'Parent / child'}
            </Text>
          </Pressable>
        </ScrollView>
      </Card>

      {/* Quick links */}
      <SectionLabel>Manage</SectionLabel>
      <Card style={styles.linksCard}>
        <Link href="/(tabs)" asChild>
          <LinkRow
            icon={<Folders size={20} color={Brand.accent} weight="duotone" />}
            title="All documents"
            sub={`${documents.length} in the vault`}
          />
        </Link>
        <View style={styles.divider} />
        <Link href="/profile/preferences" asChild>
          <LinkRow
            icon={<SlidersHorizontal size={20} color={Brand.accent} weight="duotone" />}
            title="Preferences & AI model"
            sub="Display, language, assistant model"
          />
        </Link>
        <View style={styles.divider} />
        <Link href="/profile/memory" asChild>
          <LinkRow
            icon={<Brain size={20} color={Brand.accent} weight="duotone" />}
            title="What I've learned"
            sub="Facts the assistant remembers"
          />
        </Link>
        <View style={styles.divider} />
        <Link href="/profile/notifications" asChild>
          <LinkRow
            icon={<BellRinging size={20} color={Brand.accent} weight="duotone" />}
            title="Notifications"
            sub="Reminders, digests, quiet hours"
          />
        </Link>
      </Card>

      <Pressable style={styles.signOut} onPress={signOut}>
        <SignOut size={18} color={Brand.red} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

function LinkRow({
  icon,
  title,
  sub,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.linkRow} onPress={onPress}>
      <View style={styles.linkIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.linkTitle}>{title}</Text>
        <Text style={styles.linkSub}>{sub}</Text>
      </View>
      <CaretRight size={18} color={Brand.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  userAvatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Brand.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { color: Brand.onAccent, fontSize: 24, fontFamily: FontFamily.serif },
  userName: { color: Brand.text, fontSize: 20, fontFamily: FontFamily.serif },
  userEmail: { color: Brand.muted, fontSize: 13, fontFamily: FontFamily.regular, marginTop: 2 },

  membersCard: { padding: 12 },
  membersRow: { gap: 16, paddingHorizontal: 4 },
  member: { alignItems: 'center', width: 72, gap: 4 },
  memberPressed: { opacity: 0.6 },
  memberName: { color: Brand.text, fontSize: 13, fontFamily: FontFamily.semibold, marginTop: 2 },
  memberRole: { color: Brand.faint, fontSize: 10, fontFamily: FontFamily.medium, textAlign: 'center' },
  addCircle: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: Brand.accent,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.surfaceAlt,
  },

  linksCard: { padding: 0 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  linkIcon: {
    width: 38, height: 38, borderRadius: Radius.sm, backgroundColor: Brand.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  linkTitle: { color: Brand.text, fontSize: 15, fontFamily: FontFamily.semibold },
  linkSub: { color: Brand.muted, fontSize: 12, fontFamily: FontFamily.regular, marginTop: 1 },
  divider: { height: 1, backgroundColor: Brand.border, marginLeft: 68 },

  signOut: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, marginTop: 8,
  },
  signOutText: { color: Brand.red, fontSize: 15, fontFamily: FontFamily.semibold },
});
