/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// "Almanac" — warm bulletin-board palette. Single confident COBALT accent on
// warm cream paper, Bricolage Grotesque display over Hanken Grotesk body.
// Token KEYS are kept stable so existing components keep compiling; values are
// remapped to the Almanac system (replaces the old Calm Concierge clay theme).
export const Brand = {
  bgBase: '#F1EFE7',     // warm cream paper
  surface: '#FCFBF7',    // raised paper card
  surfaceAlt: '#ECEAE0', // tonal inset / wells
  border: '#E2DFD3',     // hairline
  accent: '#2A4FC4',     // cobalt — the single signature accent
  accentSoft: '#3A5FD0',
  accentWash: '#E5E9F8', // cobalt tint (chips, source cards, focus rings)
  onAccent: '#FCFBF7',   // text/icon on cobalt
  marker: '#FBE08A',     // warm highlighter swipe behind key facts
  violet: '#7A6A9E',     // plum (member identity fallback)
  magenta: '#2F8F9E',    // teal (member identity fallback)
  text: '#20211B',       // warm near-black ink
  muted: '#54564C',      // secondary text
  faint: '#8A8B7F',      // tertiary text
  green: '#3E7C5A',      // sage / success
  amber: '#B6831A',      // amber / warning
  red: '#BC4A2E',        // brick / danger
} as const;

// Per-member colour identity (fallback when a member has no stored colour).
export const MemberPalette = ['#2A4FC4', '#B6831A', '#3E7C5A', '#BC4A2E', '#7A6A9E', '#2F8F9E'];
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

// Type system: Hanken Grotesk for body/UI, Bricolage Grotesque for display.
// Key `serif` is kept for source compatibility but now maps to the friendly
// Bricolage display grotesque (Almanac uses no serif). Loaded in app/_layout.tsx.
export const FontFamily = {
  regular: 'HankenGrotesk_400Regular',
  medium: 'HankenGrotesk_500Medium',
  semibold: 'HankenGrotesk_600SemiBold',
  bold: 'HankenGrotesk_700Bold',
  serif: 'BricolageGrotesque_600SemiBold',
  serifMd: 'BricolageGrotesque_500Medium',
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
