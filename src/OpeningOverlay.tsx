import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useStore } from './store';
import { C } from './ui';

/** Shown while the SDK resolves a link (it can take a second or more). */
export function OpeningOverlay() {
  const { opening } = useStore();
  if (!opening) return null;
  return (
    <View style={st.wrap} pointerEvents="auto" accessibilityLiveRegion="polite">
      <View style={st.card}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={st.text}>
          {opening.kind === 'deferred' ? 'Checking for the link you tapped…' : 'Opening link…'}
        </Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(243,245,244,0.86)', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, paddingVertical: 22, paddingHorizontal: 28, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.line },
  text: { fontSize: 16, fontWeight: '600', color: C.ink },
});
