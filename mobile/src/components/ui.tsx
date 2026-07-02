import { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Brand, FontFamily, Radius } from '@/constants/theme';
import { FAMILY_MEMBERS, type MemberKey } from '@/data/fixtures';

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Pill({
  label,
  color = Brand.muted,
  bg,
  style,
}: {
  label: string;
  color?: string;
  bg?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: bg ?? 'rgba(143,163,192,0.14)' }, style]}>
      <Text style={[styles.pillText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const FALLBACK_MEMBER = { name: 'Family', role: 'Household', avatar: '🙂', color: '#8fa3c0', initials: 'F' };

export function Avatar({
  owner,
  size = 40,
  emoji,
  color,
}: {
  owner?: MemberKey | string;
  size?: number;
  emoji?: string; // live override (e.g. an edited member's avatar)
  color?: string; // live override
}) {
  const base = FAMILY_MEMBERS[owner as MemberKey] ?? FALLBACK_MEMBER;
  const av = emoji ?? base.avatar;
  const col = color ?? base.color;
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${col}22`,
          borderColor: `${col}66`,
        },
      ]}>
      <Text style={{ fontSize: size * 0.5 }}>{av}</Text>
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct}%` }]} />
    </View>
  );
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Brand.surface,
    borderColor: Brand.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 16,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: Brand.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Brand.accent,
  },
  sectionLabel: {
    color: Brand.faint,
    fontSize: 12,
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
