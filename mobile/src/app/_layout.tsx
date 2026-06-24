import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Fraunces_500Medium, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Brand, FontFamily } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/store/auth';
import { DocumentsProvider } from '@/store/documents';
import { DataProvider } from '@/store/data';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
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
        headerStyle: { backgroundColor: Brand.bgBase },
        headerTintColor: Brand.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: FontFamily.serif, fontSize: 18, color: Brand.text },
        headerBackButtonDisplayMode: 'minimal', // bare chevron — no "(tabs)" back title
        headerBackTitle: '',
        contentStyle: { backgroundColor: Brand.bgBase },
      }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="profile/index" options={{ title: 'Profile' }} />
      <Stack.Screen name="profile/preferences" options={{ title: 'Preferences' }} />
      <Stack.Screen name="profile/notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="profile/memory" options={{ title: "What I've learned" }} />
      <Stack.Screen name="profile/member/[id]" options={{ title: 'Edit member' }} />
      <Stack.Screen name="document/[id]" options={{ title: 'Document' }} />
      <Stack.Screen name="email/[id]" options={{ title: 'Communication' }} />
      <Stack.Screen name="scan" options={{ presentation: 'modal', title: 'Scan document' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.bgBase }}>
        <ActivityIndicator color={Brand.accent} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={navTheme}>
          <StatusBar style="dark" />
          <AuthProvider>
            <DataProvider>
              <DocumentsProvider>
                <RootNav />
              </DocumentsProvider>
            </DataProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
