import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Pressable } from 'react-native';

import { Brand } from '@/constants/theme';
import { useAuth } from '@/store/auth';

export default function TabsLayout() {
  const { signOut } = useAuth();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Brand.surface },
        headerTitleStyle: { color: Brand.text, fontWeight: '700' },
        headerShadowVisible: false,
        tabBarActiveTintColor: Brand.accent,
        tabBarInactiveTintColor: Brand.muted,
        tabBarStyle: {
          backgroundColor: Brand.surface,
          borderTopColor: Brand.border,
        },
        headerRight: () => (
          <Pressable onPress={signOut} hitSlop={12} style={{ marginRight: 16 }}>
            <Ionicons name="log-out-outline" size={22} color={Brand.muted} />
          </Pressable>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Documents',
          tabBarIcon: ({ color, size }) => <Ionicons name="folder-open" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="school"
        options={{
          title: 'School',
          tabBarIcon: ({ color, size }) => <Ionicons name="school" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="actions"
        options={{
          title: 'Actions',
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-circle" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
