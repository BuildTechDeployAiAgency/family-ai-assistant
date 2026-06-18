import { Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import { Folders, GraduationCap, ListChecks, Sparkle, SignOut } from 'phosphor-react-native';

import { Brand, FontFamily } from '@/constants/theme';
import { useAuth } from '@/store/auth';

export default function TabsLayout() {
  const { signOut } = useAuth();
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
          height: 88,
          paddingTop: 8,
        },
        headerRight: () => (
          <Pressable onPress={signOut} hitSlop={12} style={{ marginRight: 16 }}>
            <SignOut size={22} color={Brand.faint} />
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
