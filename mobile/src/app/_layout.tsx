import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Brand } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/store/auth';
import { ChatProvider } from '@/store/chat';
import { DocumentsProvider } from '@/store/documents';
import { EmailsProvider } from '@/store/emails';
import { MembersProvider } from '@/store/members';
import { RecipesProvider } from '@/store/recipes';
import { TasksProvider } from '@/store/tasks';

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Brand.bgBase,
    card: Brand.surface,
    text: Brand.text,
    border: Brand.border,
    primary: Brand.accent,
  },
};

function RootNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.bgBase }}>
        <ActivityIndicator color={Brand.accent} size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Brand.surface },
        headerTintColor: Brand.text,
        contentStyle: { backgroundColor: Brand.bgBase },
      }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="document/[id]" options={{ title: 'Document' }} />
      <Stack.Screen name="email/[id]" options={{ title: 'Communication' }} />
      <Stack.Screen name="scan" options={{ presentation: 'modal', title: 'Scan document' }} />
      <Stack.Screen name="create" options={{ presentation: 'modal', title: 'New item' }} />
      <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
      <Stack.Screen name="settings/member/[id]" options={{ title: 'Family member' }} />
      <Stack.Screen name="member/[id]" options={{ title: 'Profile' }} />
      <Stack.Screen name="recipes/index" options={{ title: 'Recipes' }} />
      <Stack.Screen name="recipes/[id]" options={{ title: 'Recipe' }} />
      <Stack.Screen name="recipes/import" options={{ presentation: 'modal', title: 'Import recipe' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={navTheme}>
          <StatusBar style="light" />
          <AuthProvider>
            <MembersProvider>
              <DocumentsProvider>
                <TasksProvider>
                  <EmailsProvider>
                    <RecipesProvider>
                      <ChatProvider>
                        <RootNav />
                      </ChatProvider>
                    </RecipesProvider>
                  </EmailsProvider>
                </TasksProvider>
              </DocumentsProvider>
            </MembersProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
