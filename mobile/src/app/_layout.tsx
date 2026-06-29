import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import { BricolageGrotesque_500Medium, BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import { CaretLeft } from 'phosphor-react-native';
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
        // Always-present back control. The native chevron is hidden when the
        // stack has no history (e.g. a PWA deep-load via SPA fallback), so we
        // render our own and fall back to home when there's nothing to pop.
        headerLeft: () => (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            hitSlop={12}
            style={{ paddingRight: 16 }}>
            <CaretLeft size={24} color={Brand.accent} weight="bold" />
          </Pressable>
        ),
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
  // On web, fonts are provided purely via CSS @font-face (src/global.css). Calling
  // useFonts on web registers broken FontFace objects that shadow the CSS faces,
  // so load through expo-font on native only and treat web as always-ready.
  const [nativeFontsLoaded] = useFonts(
    Platform.OS === 'web'
      ? {}
      : {
          HankenGrotesk_400Regular,
          HankenGrotesk_500Medium,
          HankenGrotesk_600SemiBold,
          HankenGrotesk_700Bold,
          BricolageGrotesque_500Medium,
          BricolageGrotesque_600SemiBold,
        }
  );
  const fontsLoaded = Platform.OS === 'web' ? true : nativeFontsLoaded;

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
