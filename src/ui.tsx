import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme, type ViewStyle } from 'react-native';
import { colors, radius, space } from './strait-tokens';

type Palette = (typeof colors)['light' | 'dark'];

/** App colours, mapped from the Strait design tokens (strait-tokens.ts). */
function palette(t: Palette) {
  return {
    bg: t['bg-subtle'],
    card: t.surface,
    ink: t.text,
    muted: t['text-muted'],
    line: t.border,
    control: t['border-control'],
    accent: t.brand, // a fill: buttons, progress, spinner
    onAccent: t['on-brand'],
    accentText: t['brand-text'], // orange for text
    accentSoft: t['brand-subtle'],
    accentBorder: t['brand-border'],
    ok: t.success,
    okBg: t['success-bg'],
    bad: t.danger,
    badBg: t['danger-bg'],
    idle: t['text-subtle'],
    idleBg: t['bg-muted'],
    warnBg: t['warning-bg'],
    warn: t.warning,
    scrim: `${t['bg-subtle']}DB`, // page colour at 86% (behind overlays)
  };
}
export type Colors = ReturnType<typeof palette>;

function makeStyles(C: Colors) {
  return StyleSheet.create({
    screen: { padding: space[4], gap: 14, paddingBottom: space[12] },
    card: { backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 14, gap: space[2] },
    h1: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.3, color: C.ink },
    h2: { fontSize: 17, lineHeight: 23, fontWeight: '600', color: C.ink },
    p: { fontSize: 14, lineHeight: 21, color: C.ink },
    mono: { fontFamily: 'monospace', fontSize: 12.5, color: C.ink },
    pill: { borderRadius: radius.full, paddingHorizontal: space[2], paddingVertical: 2, alignSelf: 'flex-start' },
    pillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    btn: { backgroundColor: C.accent, borderRadius: radius.md, borderWidth: 1, borderColor: C.accent, paddingVertical: 11, paddingHorizontal: 14, alignItems: 'center' },
    btnGhost: { backgroundColor: C.accentSoft, borderColor: C.accentBorder },
    btnText: { color: C.onAccent, fontWeight: '600', fontSize: 14 },
    row: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap' },
    banner: { borderRadius: radius.md, padding: space[3] },
    input: { fontFamily: 'monospace', fontSize: 12.5, color: C.ink, borderWidth: 1, borderColor: C.control, borderRadius: radius.md, padding: 10, backgroundColor: C.card },
  });
}

function build(t: Palette, dark: boolean) {
  const C = palette(t);
  return { C, s: makeStyles(C), dark };
}
const built = { light: build(colors.light, false), dark: build(colors.dark, true) };

/** Colours + styles for the current system theme (light or dark). */
export function useTheme() {
  return useColorScheme() === 'dark' ? built.dark : built.light;
}

export function Screen({ children }: { children: React.ReactNode }) {
  const { C, s } = useTheme();
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={s.screen}>
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { s } = useTheme();
  return <View style={[s.card, style]}>{children}</View>;
}

export function H1({ children }: { children: React.ReactNode }) {
  const { s } = useTheme();
  return <Text style={s.h1}>{children}</Text>;
}
export function H2({ children }: { children: React.ReactNode }) {
  const { s } = useTheme();
  return <Text style={s.h2}>{children}</Text>;
}
export function P({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  const { C, s } = useTheme();
  return <Text style={[s.p, muted && { color: C.muted }]}>{children}</Text>;
}
export function Mono({ children }: { children: React.ReactNode }) {
  const { s } = useTheme();
  return <Text style={s.mono} selectable>{children}</Text>;
}

export function Pill({ state }: { state: 'passed' | 'failed' | 'idle' }) {
  const { C, s } = useTheme();
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
  const { C, s } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.btn, kind === 'ghost' && s.btnGhost, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
    >
      <Text style={[s.btnText, kind === 'ghost' && { color: C.accentText }]}>{title}</Text>
    </Pressable>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  const { s } = useTheme();
  return <View style={s.row}>{children}</View>;
}

export function Banner({ text, tone = 'warn' }: { text: string; tone?: 'warn' | 'ok' }) {
  const { C, s } = useTheme();
  return (
    <View style={[s.banner, { backgroundColor: tone === 'ok' ? C.okBg : C.warnBg }]}>
      <Text style={{ color: tone === 'ok' ? C.ok : C.warn, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}
