/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// BTD dark-first palette. The app is dark-only (userInterfaceStyle: dark),
// but both keys are defined so template components keep compiling.
export const Brand = {
  bgBase: '#0f172a',
  surface: '#0d1226',
  surfaceAlt: '#161d35',
  border: '#2a3555',
  accent: '#00c2ff',
  violet: '#686df3',
  magenta: '#a93f9e',
  text: '#ffffff',
  muted: '#8fa3c0',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
} as const;

export const Colors = {
  light: {
    text: Brand.text,
    background: Brand.bgBase,
    backgroundElement: Brand.surface,
    backgroundSelected: Brand.surfaceAlt,
    textSecondary: Brand.muted,
  },
  dark: {
    text: Brand.text,
    background: Brand.bgBase,
    backgroundElement: Brand.surface,
    backgroundSelected: Brand.surfaceAlt,
    textSecondary: Brand.muted,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

// Brand typeface (BTD = Inter). Loaded in app/_layout.tsx via useFonts.
export const FontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
