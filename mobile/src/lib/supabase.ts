import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Public, browser-safe values only (anon/publishable key + project URL).
const url = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  console.warn('Supabase env missing: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

// Resilient storage. On web, AsyncStorage has no native module — back the
// session with window.localStorage so testers stay logged in across reloads /
// home-screen launches (the installed PWA). On native, use AsyncStorage.
// Either way, swallow errors: Expo evaluates route modules in Node (static
// analysis / RSC) where neither store exists, and that pre-eval must not crash.
const isWeb = Platform.OS === 'web';

const safeStorage = {
  getItem: async (key: string) => {
    try {
      if (isWeb) return globalThis.localStorage?.getItem(key) ?? null;
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (isWeb) globalThis.localStorage?.setItem(key, value);
      else await AsyncStorage.setItem(key, value);
    } catch {
      /* no-op */
    }
  },
  removeItem: async (key: string) => {
    try {
      if (isWeb) globalThis.localStorage?.removeItem(key);
      else await AsyncStorage.removeItem(key);
    } catch {
      /* no-op */
    }
  },
};

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
