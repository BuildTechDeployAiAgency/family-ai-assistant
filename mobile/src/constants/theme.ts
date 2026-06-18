/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// "Calm Concierge" — warm, light-first palette. Single clay accent, paper
// surfaces, Fraunces serif headings over Inter body. Token KEYS are kept stable
// so existing components keep compiling; values are remapped to the warm system.
export const Brand = {
  bgBase: '#F7F5F1',     // warm paper background
  surface: '#FFFFFF',    // card / paper
  surfaceAlt: '#F2EEE7', // tonal inset
  border: '#E7E1D7',     // hairline
  accent: '#B5654A',     // clay — the single signature accent
  accentSoft: '#C9805F',
  onAccent: '#FFFFFF',   // text/icon on the clay accent
  violet: '#4E6E8E',     // slate (secondary)
  magenta: '#7A6A9E',    // plum (tertiary)
  text: '#2B2A28',       // ink
  muted: '#615D56',      // secondary text
  faint: '#9C968B',      // tertiary text
  green: '#5B8A7A',      // sage / success
  amber: '#C79A3A',      // gold / warning
  red: '#B23A48',        // danger
} as const;

// Per-member colour identity (fallback when a member has no stored colour).
export const MemberPalette = ['#4E6E8E', '#B5654A', '#7A6A9E', '#5B8A7A', '#C79A3A', '#8E5B6E'];
export function memberColor(seed: string, stored?: string | null): string {
  if (stored) return stored;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return MemberPalette[h % MemberPalette.length];
}

// Corner radii (Calm Concierge: soft, generous).
export const Radius = { sm: 12, md: 16, lg: 20, xl: 28, pill: 999 } as const;

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

// Type system: Inter for body/UI, Fraunces (serif) for display headings.
// Loaded in app/_layout.tsx via useFonts.
export const FontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  serif: 'Fraunces_600SemiBold',
  serifMd: 'Fraunces_500Medium',
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
