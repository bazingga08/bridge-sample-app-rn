import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';

export const C = {
  bg: '#f3f5f4',
  card: '#ffffff',
  ink: '#15211d',
  muted: '#5d6e68',
  line: '#dde3e0',
  accent: '#0b6b57',
  accentSoft: '#dcefe8',
  ok: '#1d7a46',
  okBg: '#e1f2e7',
  bad: '#b4281f',
  badBg: '#fbe3e0',
  idle: '#8a9893',
  idleBg: '#eef1ef',
  warnBg: '#fbf0d9',
  warn: '#8a5800',
};

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={s.screen}>
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={s.h1}>{children}</Text>;
}
export function H2({ children }: { children: React.ReactNode }) {
  return <Text style={s.h2}>{children}</Text>;
}
export function P({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <Text style={[s.p, muted && { color: C.muted }]}>{children}</Text>;
}
export function Mono({ children }: { children: React.ReactNode }) {
  return <Text style={s.mono} selectable>{children}</Text>;
}

export function Pill({ state }: { state: 'passed' | 'failed' | 'idle' }) {
  const map = {
    passed: { t: 'PASSED', c: C.ok, b: C.okBg },
    failed: { t: 'FAILED', c: C.bad, b: C.badBg },
    idle: { t: 'NOT YET', c: C.idle, b: C.idleBg },
  }[state];
  return (
    <View style={[s.pill, { backgroundColor: map.b }]}>
      <Text style={[s.pillText, { color: map.c }]}>{map.t}</Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  kind = 'primary',
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.btn, kind === 'ghost' && s.btnGhost, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
    >
      <Text style={[s.btnText, kind === 'ghost' && { color: C.accent }]}>{title}</Text>
    </Pressable>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <View style={s.row}>{children}</View>;
}

export function Banner({ text, tone = 'warn' }: { text: string; tone?: 'warn' | 'ok' }) {
  return (
    <View style={[s.banner, { backgroundColor: tone === 'ok' ? C.okBg : C.warnBg }]}>
      <Text style={{ color: tone === 'ok' ? C.ok : C.warn, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  screen: { padding: 16, gap: 14, paddingBottom: 48 },
  card: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 14, gap: 8 },
  h1: { fontSize: 24, fontWeight: '800', color: C.ink },
  h2: { fontSize: 17, fontWeight: '700', color: C.ink },
  p: { fontSize: 14, lineHeight: 20, color: C.ink },
  mono: { fontFamily: 'monospace', fontSize: 12.5, color: C.ink },
  pill: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  btn: { backgroundColor: C.accent, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14, alignItems: 'center' },
  btnGhost: { backgroundColor: C.accentSoft },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  banner: { borderRadius: 10, padding: 12 },
});
