import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useStore } from './store';
import { useTheme } from './ui';

/** Shown while the SDK resolves a link (it can take a second or more). */
export function OpeningOverlay() {
  const { opening } = useStore();
  const { C } = useTheme();
  if (!opening) return null;
  return (
    <View style={[st.wrap, { backgroundColor: C.scrim }]} pointerEvents="auto" accessibilityLiveRegion="polite">
      <View style={[st.card, { backgroundColor: C.card, borderColor: C.line }]}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={[st.text, { color: C.ink }]}>
          {opening.kind === 'deferred' ? 'Checking for the link you tapped…' : 'Opening link…'}
        </Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 16, paddingVertical: 22, paddingHorizontal: 28, alignItems: 'center', gap: 12, borderWidth: 1 },
  text: { fontSize: 16, fontWeight: '600' },
});
