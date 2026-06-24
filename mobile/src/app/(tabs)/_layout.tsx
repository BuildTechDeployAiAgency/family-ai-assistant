import { Tabs, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Folders, GraduationCap, ListChecks, Sparkle, UserCircle } from 'phosphor-react-native';

import { Brand, FontFamily } from '@/constants/theme';

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Reserve room for the iOS home indicator so labels aren't clipped by the
  // bottom edge in the installed PWA (a fixed height would sit under it).
  const bottomInset = Math.max(insets.bottom, 8);
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Brand.bgBase },
        headerTitleStyle: { color: Brand.text, fontFamily: FontFamily.serif, fontSize: 20 },
        headerShadowVisible: false,
        tabBarActiveTintColor: Brand.accent,
        tabBarInactiveTintColor: Brand.faint,
        tabBarLabelStyle: { fontFamily: FontFamily.semibold, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: Brand.surface,
          borderTopColor: Brand.border,
          height: 60 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
        },
        headerRight: () => (
          <Pressable onPress={() => router.push('/profile')} hitSlop={12} style={{ marginRight: 16 }}>
            <UserCircle size={28} color={Brand.accent} weight="duotone" />
          </Pressable>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Documents',
          tabBarIcon: ({ color, size, focused }) => <Folders color={color} size={size} weight={focused ? 'fill' : 'regular'} />,
        }}
      />
      <Tabs.Screen
        name="school"
        options={{
          title: 'School',
          tabBarIcon: ({ color, size, focused }) => <GraduationCap color={color} size={size} weight={focused ? 'fill' : 'regular'} />,
        }}
      />
      <Tabs.Screen
        name="actions"
        options={{
          title: 'Actions',
          tabBarIcon: ({ color, size, focused }) => <ListChecks color={color} size={size} weight={focused ? 'fill' : 'regular'} />,
        }}
      />
      <Tabs.Screen
        name="ask"
        options={{
          title: 'Ask',
          tabBarIcon: ({ color, size, focused }) => <Sparkle color={color} size={size} weight={focused ? 'fill' : 'regular'} />,
        }}
      />
    </Tabs>
  );
}
