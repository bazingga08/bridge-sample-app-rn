/**
 * Acme — Bridge React Native (CLI) sample.
 * Tests the full deep-link flow: native App Link / Universal Link open (proving
 * the .well-known verification), deferred match on first launch, and conversion
 * events. Inlines what @bridge/sdk-react-native does (a fetch to /v1/match).
 */
import React, {useEffect, useState, useCallback} from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity,
  Dimensions, PixelRatio, Platform, Linking, StyleSheet,
} from 'react-native';

const DEFAULT_ENDPOINT = 'https://bridge-redirect-engine.onrender.com';

function collectDevice() {
  return {
    screenWidth: Math.round(Dimensions.get('screen').width),
    pixelRatio: PixelRatio.get(),
    language: 'en',
    timezone: (Intl as any)?.DateTimeFormat?.().resolvedOptions?.().timeZone || 'XX',
  };
}

async function api(endpoint: string, path: string, body: object) {
  const res = await fetch(endpoint.replace(/\/+$/, '') + path, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  let parsed: any = null;
  try { parsed = await res.json(); } catch {}
  return {status: res.status, ok: res.ok, body: parsed};
}

export default function App(): React.JSX.Element {
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [appId, setAppId] = useState('');
  const [openedUrl, setOpenedUrl] = useState<string | null>(null);
  const [match, setMatch] = useState<any>(null);
  const [eventMsg, setEventMsg] = useState('');
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  useEffect(() => {
    Linking.getInitialURL().then(url => { if (url) setOpenedUrl(url); });
    const sub = Linking.addEventListener('url', ({url}) => setOpenedUrl(url));
    return () => sub.remove();
  }, []);

  const resolveDeferred = useCallback(async () => {
    if (!appId) { setMatch({error: 'Enter your App ID first'}); return; }
    try {
      const r = await api(endpoint, '/v1/match', {appId, platform, ...collectDevice()});
      setMatch(r.body || {error: 'HTTP ' + r.status});
    } catch (e: any) { setMatch({error: String(e.message)}); }
  }, [appId, endpoint, platform]);

  const track = useCallback(async (event: string, extra: object) => {
    if (!appId) { setEventMsg('Enter your App ID first'); return; }
    try {
      const r = await api(endpoint, '/v1/event', {appId, event, platform, ...extra});
      setEventMsg(r.ok ? '✓ "' + event + '" tracked (' + r.status + ')' : '✗ ' + r.status);
    } catch (e: any) { setEventMsg('✗ ' + e.message); }
  }, [appId, endpoint, platform]);

  return (
    <SafeAreaView style={s.bg}>
      <ScrollView contentContainerStyle={s.wrap}>
        <Text style={s.h1}>🛍️ Acme</Text>
        <Text style={s.tag}>Bridge RN-CLI sample · {platform}</Text>

        <View style={[s.card, openedUrl ? s.hit : null]}>
          <Text style={s.h2}>Opened via link</Text>
          <Text style={s.res}>
            {openedUrl
              ? '✅ App opened directly from:\n' + openedUrl + '\n\n(App Link / Universal Link verified — no browser bounce.)'
              : 'Not opened from a link this launch. Tap a Bridge link on this device to test direct-open.'}
          </Text>
        </View>

        <Text style={s.h2}>① Connect</Text>
        <View style={s.card}>
          <Text style={s.label}>Endpoint</Text>
          <TextInput style={s.input} value={endpoint} onChangeText={setEndpoint} autoCapitalize="none" />
          <Text style={s.label}>Your App ID</Text>
          <TextInput style={s.input} value={appId} onChangeText={setAppId} autoCapitalize="none"
            placeholder="Dashboard -> Get started -> App ID" placeholderTextColor="#5b6678" />
        </View>

        <Text style={s.h2}>② Deferred link (first launch)</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.btn} onPress={resolveDeferred}>
            <Text style={s.btnT}>Check for a deferred link</Text>
          </TouchableOpacity>
          <Text style={s.res}>{match ? JSON.stringify(match, null, 2) : '—'}</Text>
        </View>

        <Text style={s.h2}>③ Conversion events</Text>
        <View style={s.card}>
          <View style={s.row}>
            <TouchableOpacity style={[s.btn, s.sec, s.half]} onPress={() => track('signup', {})}>
              <Text style={s.btnT}>signup</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.half]} onPress={() => track('purchase', {value: 49.99, currency: 'USD'})}>
              <Text style={s.btnT}>purchase $49.99</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.res}>{eventMsg || '—'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: {flex: 1, backgroundColor: '#0c0e12'},
  wrap: {padding: 16, paddingBottom: 48},
  h1: {color: '#eef1f7', fontSize: 26, fontWeight: '700', textAlign: 'center', marginTop: 8},
  tag: {color: '#9aa6bd', fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 8},
  h2: {color: '#5b8cff', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 18, marginBottom: 8},
  card: {backgroundColor: '#161a22', borderColor: '#2a313e', borderWidth: 1, borderRadius: 14, padding: 14},
  hit: {borderColor: '#3fb27f', backgroundColor: '#10241b'},
  label: {color: '#9aa6bd', fontSize: 12, marginTop: 8, marginBottom: 4},
  input: {backgroundColor: '#1c212c', borderColor: '#2a313e', borderWidth: 1, borderRadius: 10, color: '#eef1f7', padding: 10, fontSize: 14},
  btn: {backgroundColor: '#5b8cff', borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 12},
  sec: {backgroundColor: '#1c212c', borderColor: '#2a313e', borderWidth: 1},
  btnT: {color: '#fff', fontWeight: '700', fontSize: 15},
  row: {flexDirection: 'row', gap: 10},
  half: {flex: 1},
  res: {color: '#cdd6e6', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, marginTop: 12, lineHeight: 17},
});
