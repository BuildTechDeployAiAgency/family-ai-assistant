import { CloudSlash, type IconProps } from 'phosphor-react-native';
import { ComponentType, ReactNode, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Brand, FontFamily, Radius } from '@/constants/theme';

// Almanac "in-between states" — the moments most apps skip: loading, empty,
// offline/error. Loading mirrors the real row shape (no bare spinner); empty
// invites the first action; error reassures before it apologises.
// Mockup: documentation/designs/ui-exploration-almanac/03-states.html.

// ── Shimmer primitive ───────────────────────────────────────────────────────
// A soft opacity pulse on a tonal block. Cheaper than a moving-gradient shimmer
// and reads as "loading" without jitter. Respects the warm inset colour.
export function Shimmer({ style }: { style?: StyleProp<ViewStyle> }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[styles.shimmer, { opacity: pulse }, style]} />;
}

// ── Loading: row skeletons ──────────────────────────────────────────────────
// Mirrors an icon + two-line list row. Use to replace the ActivityIndicator on
// the Today / Actions list surfaces so there's no layout jump on load.
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.rowsCard}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.skRow, i > 0 && styles.skDivider]}>
          <Shimmer style={styles.skIcon} />
          <View style={{ flex: 1, gap: 7 }}>
            <Shimmer style={{ height: 13, width: `${62 - (i % 3) * 8}%`, borderRadius: 6 }} />
            <Shimmer style={{ height: 11, width: `${38 - (i % 2) * 6}%`, borderRadius: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Loading: card-grid skeletons ────────────────────────────────────────────
// Mirrors the 2-up Vault card shape.
export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.gridCard}>
          <View style={styles.gridCardTop}>
            <Shimmer style={styles.gridIcon} />
            <Shimmer style={{ height: 18, width: 54, borderRadius: 999 }} />
          </View>
          <Shimmer style={{ height: 14, width: '80%', borderRadius: 6, marginTop: 12 }} />
          <Shimmer style={{ height: 12, width: '50%', borderRadius: 6, marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

// ── Empty: illustrated, invites the first action ────────────────────────────
export function EmptyState({
  icon: Icon,
  title,
  body,
  actionLabel,
  onAction,
  style,
}: {
  icon: ComponentType<IconProps>;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.empty, style]}>
      <View style={styles.emptyGlyph}>
        <Icon size={30} color={Brand.accent} weight="duotone" />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={({ pressed }) => [styles.emptyBtn, pressed && styles.pressed]}>
          <Text style={styles.emptyBtnText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ── Error / offline: reassure, then offer a retry ───────────────────────────
export function ErrorCard({
  title = "You're offline",
  body = "Your files are safe. I'll answer the moment you're back on signal.",
  icon: Icon = CloudSlash,
  onRetry,
  style,
}: {
  title?: string;
  body?: string;
  icon?: ComponentType<IconProps>;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.errCard, style]}>
      <View style={styles.errIcon}>
        <Icon size={20} color={Brand.red} weight="fill" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.errTitle}>{title}</Text>
        <Text style={styles.errBody}>{body}</Text>
        {onRetry ? (
          <Pressable onPress={onRetry} style={({ pressed }) => [styles.errBtn, pressed && styles.pressed]}>
            <Text style={styles.errBtnText}>Try again</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ── Toast: warm, specific confirmation ──────────────────────────────────────
export function Toast({ kind, children }: { kind: 'ok' | 'bad'; children: ReactNode }) {
  const ok = kind === 'ok';
  return (
    <View style={[styles.toast, { backgroundColor: ok ? `${Brand.green}18` : `${Brand.red}18` }]}>
      <Text style={[styles.toastText, { color: ok ? Brand.green : Brand.red }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shimmer: { backgroundColor: Brand.surfaceAlt, borderRadius: 12 },

  rowsCard: {
    backgroundColor: Brand.surface, borderColor: Brand.border, borderWidth: 1,
    borderRadius: Radius.lg, padding: 4, marginHorizontal: 20,
  },
  skRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13, paddingHorizontal: 10 },
  skDivider: { borderTopWidth: 1, borderTopColor: Brand.border },
  skIcon: { width: 42, height: 42, borderRadius: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 18 },
  gridCard: {
    width: '48%', marginBottom: 13, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border,
    borderRadius: Radius.md, padding: 14, minHeight: 142,
  },
  gridCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  gridIcon: { width: 38, height: 38, borderRadius: 11 },

  empty: {
    alignItems: 'center', paddingVertical: 36, paddingHorizontal: 28, gap: 9,
  },
  emptyGlyph: {
    width: 60, height: 60, borderRadius: 18, backgroundColor: Brand.accentWash,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { color: Brand.text, fontSize: 18, fontFamily: FontFamily.serif, textAlign: 'center' },
  emptyBody: { color: Brand.muted, fontSize: 13.5, fontFamily: FontFamily.regular, textAlign: 'center', lineHeight: 19 },
  emptyBtn: {
    marginTop: 8, backgroundColor: Brand.accent, borderRadius: 999,
    paddingHorizontal: 18, paddingVertical: 12,
  },
  emptyBtnText: { color: Brand.onAccent, fontSize: 14, fontFamily: FontFamily.semibold },

  errCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: Brand.surface, borderColor: Brand.border, borderWidth: 1,
    borderRadius: Radius.lg, padding: 16, marginHorizontal: 20,
  },
  errIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: `${Brand.red}1A`,
    alignItems: 'center', justifyContent: 'center',
  },
  errTitle: { color: Brand.text, fontSize: 14.5, fontFamily: FontFamily.semibold },
  errBody: { color: Brand.muted, fontSize: 13, fontFamily: FontFamily.regular, marginTop: 3, lineHeight: 18 },
  errBtn: {
    alignSelf: 'flex-start', marginTop: 11, backgroundColor: Brand.surfaceAlt,
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: Brand.border,
  },
  errBtnText: { color: Brand.text, fontSize: 13, fontFamily: FontFamily.semibold },

  toast: { borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12 },
  toastText: { fontSize: 13.5, fontFamily: FontFamily.semibold },

  pressed: { opacity: 0.7 },
});
