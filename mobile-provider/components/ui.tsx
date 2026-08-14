import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { colors } from '../lib/theme';

export function Pill({
  label,
  tone = 'sky',
}: {
  label: string;
  tone?: 'sky' | 'ok' | 'warn' | 'danger' | 'muted' | 'live';
}) {
  const map = {
    sky: { bg: colors.sky100, fg: colors.sky800 },
    ok: { bg: colors.okSoft, fg: colors.okDark },
    warn: { bg: colors.warnSoft, fg: colors.warnDark },
    danger: { bg: colors.dangerSoft, fg: colors.dangerDark },
    muted: { bg: '#f1f5f9', fg: colors.muted },
    live: { bg: colors.okSoft, fg: colors.okDark },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: map.bg }]}>
      {tone === 'live' ? <View style={styles.liveDot} /> : null}
      <Text style={[styles.pillText, { color: map.fg }]}>{label}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.h1}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost' | 'ok' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const palette: Record<string, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.sky600, fg: '#fff' },
    ok: { bg: colors.ok, fg: '#fff' },
    danger: { bg: colors.dangerSoft, fg: colors.dangerDark },
    ghost: { bg: '#fff', fg: colors.sky800, border: colors.sky200 },
  };
  const p = palette[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: p.bg, borderColor: p.border || 'transparent', opacity: disabled ? 0.55 : pressed ? 0.9 : 1 },
        style,
      ]}>
      {loading ? <ActivityIndicator color={p.fg} /> : <Text style={[styles.btnText, { color: p.fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function MapPlaceholder({ label }: { label: string }) {
  return (
    <View style={styles.map}>
      <View style={styles.route} />
      <View style={styles.dot} />
      <View style={styles.pin}>
        <Text style={styles.pinText}>{label}</Text>
      </View>
      <Text style={styles.mapHint}>Mapa (placeholder) · GPS nativo en siguiente fase</Text>
    </View>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export function Row({
  title,
  right,
  onPress,
}: {
  title: string;
  right?: string | React.ReactNode;
  onPress?: () => void;
}) {
  const inner = (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{title}</Text>
      {typeof right === 'string' ? <Text style={styles.rowRight}>{right}</Text> : right}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  pillText: { fontSize: 11, fontWeight: '600' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.ok },
  card: {
    backgroundColor: '#fff',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  h1: { fontSize: 26, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  sub: { marginTop: 4, fontSize: 13, color: colors.muted },
  btn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: 48,
  },
  btnText: { fontSize: 14, fontWeight: '700' } as TextStyle,
  map: {
    height: 180,
    borderRadius: 18,
    marginBottom: 14,
    backgroundColor: colors.sky100,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  route: {
    position: 'absolute',
    left: '18%',
    top: '68%',
    width: '42%',
    height: 3,
    backgroundColor: colors.sky600,
    transform: [{ rotate: '-28deg' }],
    opacity: 0.7,
  },
  dot: {
    position: 'absolute',
    left: '18%',
    top: '66%',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.ok,
    borderWidth: 3,
    borderColor: '#fff',
  },
  pin: {
    alignSelf: 'center',
    backgroundColor: colors.sky700,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  pinText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  mapHint: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    fontSize: 10,
    color: colors.sky800,
  },
  empty: { paddingVertical: 28, alignItems: 'center' },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: 8,
  },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.ink, flex: 1 },
  rowRight: { fontSize: 12, color: colors.muted },
});
