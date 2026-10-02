/**
 * Bridge Link — Deep Link Debugger / test harness.
 *
 * A throwaway-data sample app whose ONLY job is to make every deep-link signal
 * visible so we can verify Bridge end-to-end on real Play Store / TestFlight
 * builds. It surfaces, with full provenance, every way a link reaches an app:
 *
 *   1. Direct open      — a verified Universal Link / App Link (https) or a
 *                         custom scheme (bridgelink://) handed to us by the OS
 *                         via React Native `Linking`. Proves the .well-known
 *                         association (assetlinks.json / apple-app-site-association).
 *   2. Install Referrer — the DETERMINISTIC Android deferred path. Google Play
 *                         passes back `bridge_link=lnk_…` set by the store
 *                         fallback URL. Read once, post-install, via the Play
 *                         Install Referrer API. (Android only.)
 *   3. Fingerprint match— the SERVER deferred path (the iOS moat: no clipboard
 *                         paste banner). We POST the device fingerprint to
 *                         /v1/match and the engine matches a recent click.
 *
 * For each it shows: the raw value, the parsed pieces, the source, timestamps,
 * the exact request body we send, the response status + latency + JSON, and a
 * single chronological event log you can Share. Nothing here is secret.
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity,
  Dimensions, PixelRatio, Platform, Linking, StyleSheet, Share, Alert,
} from 'react-native';

// Optional native module (Android only; require guarded so iOS/dev never crash).
let PlayInstallReferrer: {
  getInstallReferrerInfo: (cb: (info: any, err: any) => void) => void;
} | null = null;
try {
  PlayInstallReferrer = require('react-native-play-install-referrer').PlayInstallReferrer;
} catch {
  PlayInstallReferrer = null;
}

// Debug builds talk to a local engine (`npm run dev` in redirect-engine, port 3000),
// reached over USB via `adb reverse tcp:3000 tcp:3000`; its in-memory dev tenant
// has the fixed publishable key `bk_pub_test_localdev`. Release builds use the
// hosted engine + the dogfood workspace's (bridge-dev) publishable key. Both
// are editable in the Config section at runtime.
const DEFAULT_ENDPOINT = __DEV__
  ? 'http://localhost:3000'
  : 'https://bridge-redirect-engine.onrender.com';
const DEFAULT_PUBLISHABLE_KEY = __DEV__ ? 'bk_pub_test_localdev' : 'bk_pub_live_62406c705fed406db90c1deeecdb183b';

const PLATFORM: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';

// ── helpers ────────────────────────────────────────────────────────────────

type Kind = 'link' | 'referrer' | 'api' | 'event' | 'info' | 'error';
type LogEntry = {id: number; ts: number; kind: Kind; title: string; detail?: any};

const ICON: Record<Kind, string> = {
  link: '🔗', referrer: '📲', api: '🌐', event: '📈', info: 'ℹ️', error: '⚠️',
};
const KIND_COLOR: Record<Kind, string> = {
  link: '#3fb27f', referrer: '#b07cff', api: '#5b8cff', event: '#ffae57',
  info: '#9aa6bd', error: '#ff6b6b',
};

function clock(ts: number): string {
  const d = new Date(ts);
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}
function epochToLocal(secs?: string | number): string {
  const n = typeof secs === 'string' ? parseInt(secs, 10) : secs;
  if (!n || Number.isNaN(n) || n <= 0) return '—';
  return new Date(n * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC');
}

/** Parse scheme://host/path?query#hash without relying on a URL polyfill. */
function parseUrl(raw: string) {
  const out: any = {scheme: '', host: '', path: '', query: '', hash: '', params: {} as Record<string, string>};
  if (!raw) return out;
  const hashAt = raw.indexOf('#');
  if (hashAt >= 0) { out.hash = raw.slice(hashAt + 1); raw = raw.slice(0, hashAt); }
  const schemeAt = raw.indexOf(':');
  if (schemeAt >= 0) { out.scheme = raw.slice(0, schemeAt); raw = raw.slice(schemeAt + 1); }
  if (raw.startsWith('//')) {
    raw = raw.slice(2);
    const slashAt = raw.search(/[/?]/);
    if (slashAt >= 0) { out.host = raw.slice(0, slashAt); raw = raw.slice(slashAt); }
    else { out.host = raw; raw = ''; }
  }
  const qAt = raw.indexOf('?');
  if (qAt >= 0) { out.path = raw.slice(0, qAt); out.query = raw.slice(qAt + 1); }
  else { out.path = raw; }
  out.params = parseKeyVals(out.query);
  return out;
}

/** Parse `a=b&c=d` (used for both URL query strings and the install referrer). */
function parseKeyVals(s: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!s) return params;
  for (const pair of s.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const k = eq >= 0 ? pair.slice(0, eq) : pair;
    const v = eq >= 0 ? pair.slice(eq + 1) : '';
    try { params[decodeURIComponent(k)] = decodeURIComponent(v); }
    catch { params[k] = v; }
  }
  return params;
}

function collectDevice() {
  return {
    platform: PLATFORM,
    osVersion: String(Platform.Version),
    screenWidth: Math.round(Dimensions.get('screen').width),
    screenHeight: Math.round(Dimensions.get('screen').height),
    pixelRatio: PixelRatio.get(),
    fontScale: PixelRatio.getFontScale(),
    language: ((Intl as any)?.DateTimeFormat?.().resolvedOptions?.().locale || 'en').slice(0, 2),
    timezone: (Intl as any)?.DateTimeFormat?.().resolvedOptions?.().timeZone || 'XX',
  };
}

/** The exact fingerprint fields the engine hashes (+ server-observed IP). */
function fingerprintPayload(d: ReturnType<typeof collectDevice>) {
  return {screenWidth: d.screenWidth, pixelRatio: d.pixelRatio, language: d.language, timezone: d.timezone};
}

// ── component ──────────────────────────────────────────────────────────────

export default function App(): React.JSX.Element {
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [publishableKey, setPublishableKey] = useState(DEFAULT_PUBLISHABLE_KEY);
  const [showConfig, setShowConfig] = useState(false);

  const [openedUrl, setOpenedUrl] = useState<string | null>(null);
  const [openSource, setOpenSource] = useState<'cold' | 'warm' | null>(null);
  const [referrer, setReferrer] = useState<any>(null);
  const [matchResp, setMatchResp] = useState<any>(null);
  const [referrerResp, setReferrerResp] = useState<any>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const seq = useRef(0);

  const device = useMemo(collectDevice, []);

  const addLog = useCallback((kind: Kind, title: string, detail?: any) => {
    seq.current += 1;
    setLog(prev => [{id: seq.current, ts: Date.now(), kind, title, detail}, ...prev].slice(0, 200));
  }, []);

  // ── HTTP with timing, fully logged ──
  const api = useCallback(async (path: string, body: object) => {
    const url = endpoint.replace(/\/+$/, '') + path;
    const started = Date.now();
    addLog('api', `→ POST ${path}`, {request: body});
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      });
      let parsed: any = null;
      try { parsed = await res.json(); } catch {}
      const ms = Date.now() - started;
      addLog('api', `← ${res.status} ${path} (${ms}ms)`, {status: res.status, ms, response: parsed});
      return {status: res.status, ok: res.ok, ms, body: parsed};
    } catch (e: any) {
      const ms = Date.now() - started;
      addLog('error', `✗ ${path} failed (${ms}ms)`, {error: String(e?.message || e)});
      return {status: 0, ok: false, ms, body: {error: String(e?.message || e)}};
    }
  }, [endpoint, addLog]);

  // ── Source 1: direct open (Universal/App Link or custom scheme) ──
  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (url) {
        setOpenedUrl(url); setOpenSource('cold');
        addLog('link', 'Cold start from link', {url, parsed: parseUrl(url)});
      } else {
        addLog('info', 'Launched without a link this session', {});
      }
    });
    const sub = Linking.addEventListener('url', ({url}) => {
      setOpenedUrl(url); setOpenSource('warm');
      addLog('link', 'Link while running (warm)', {url, parsed: parseUrl(url)});
    });
    return () => sub.remove();
  }, [addLog]);

  // ── Source 2: Android Install Referrer (deterministic deferred) ──
  const fetchReferrer = useCallback(() => {
    if (PLATFORM !== 'android') { addLog('info', 'Install Referrer is Android-only', {}); return; }
    if (!PlayInstallReferrer) { addLog('error', 'Install Referrer native module not linked', {}); return; }
    addLog('referrer', 'Querying Play Install Referrer…', {});
    PlayInstallReferrer.getInstallReferrerInfo((info, err) => {
      if (err || !info) {
        setReferrer({error: String(err?.message || err || 'no info')});
        addLog('error', 'Install Referrer error', {error: String(err?.message || err)});
        return;
      }
      const parsed = parseKeyVals(info.installReferrer || '');
      const data = {
        raw: info.installReferrer,
        params: parsed,
        bridgeLinkId: parsed.bridge_link || null,
        referrerClick: epochToLocal(info.referrerClickTimestampSeconds),
        installBegin: epochToLocal(info.installBeginTimestampSeconds),
        googlePlayInstant: info.googlePlayInstant,
        installVersion: info.installVersion,
      };
      setReferrer(data);
      addLog('referrer', 'Install Referrer received', data);
    });
  }, [addLog]);

  useEffect(() => { fetchReferrer(); }, [fetchReferrer]);

  // ── Source 3: server fingerprint match (the iOS moat) ──
  const runMatch = useCallback(async () => {
    const r = await api('/v1/match', {publishableKey, platform: PLATFORM, ...fingerprintPayload(device)});
    setMatchResp({status: r.status, ms: r.ms, body: r.body});
  }, [api, publishableKey, device]);

  // resolve the deterministic referrer link id against the engine
  const resolveReferrer = useCallback(async () => {
    const linkId = referrer?.bridgeLinkId;
    if (!linkId) { addLog('info', 'No bridge_link id in the referrer to resolve', {}); return; }
    const r = await api('/v1/referrer', {publishableKey, linkId, platform: PLATFORM});
    setReferrerResp({status: r.status, ms: r.ms, body: r.body});
  }, [api, publishableKey, referrer]);

  const track = useCallback(async (event: string, extra: object) => {
    await api('/v1/event', {publishableKey, event, platform: PLATFORM, ...extra});
  }, [api, publishableKey]);

  const shareLog = useCallback(() => {
    const dump = {
      capturedAt: new Date(Date.now()).toISOString(),
      endpoint, publishableKey, device,
      fingerprintSent: fingerprintPayload(device),
      openedUrl, openSource,
      openedUrlParsed: openedUrl ? parseUrl(openedUrl) : null,
      installReferrer: referrer,
      matchResponse: matchResp,
      referrerResolveResponse: referrerResp,
      log: log.map(e => ({t: clock(e.ts), kind: e.kind, title: e.title, detail: e.detail})),
    };
    Share.share({message: JSON.stringify(dump, null, 2)}).catch(() => {});
  }, [endpoint, publishableKey, device, openedUrl, openSource, referrer, matchResp, referrerResp, log]);

  const urlParsed = openedUrl ? parseUrl(openedUrl) : null;
  const isHttps = urlParsed?.scheme === 'https';

  return (
    <SafeAreaView style={s.bg}>
      <ScrollView contentContainerStyle={s.wrap}>
        <Text style={s.h1}>🌉 Bridge Link</Text>
        <Text style={s.tag}>Deep Link Debugger · {PLATFORM} · OS {String(Platform.Version)}</Text>

        {/* ── SOURCE 1: direct open ─────────────────────────────────────── */}
        <SectionTitle>① OPENED VIA LINK (direct)</SectionTitle>
        <View style={[s.card, openedUrl ? s.hit : null]}>
          {openedUrl ? (
            <>
              <Badge color={isHttps ? '#3fb27f' : '#b07cff'}
                text={isHttps ? `Verified ${PLATFORM === 'ios' ? 'Universal' : 'App'} Link (https)` : `Custom scheme (${urlParsed?.scheme}://)`} />
              <Badge color="#5b8cff" text={openSource === 'cold' ? 'Cold start' : 'Warm (already running)'} />
              <KV k="Raw URL" v={openedUrl} mono wrap />
              <KV k="scheme" v={urlParsed?.scheme || '—'} />
              <KV k="host" v={urlParsed?.host || '—'} />
              <KV k="path" v={urlParsed?.path || '—'} />
              {Object.keys(urlParsed?.params || {}).length > 0 && (
                <KV k="query params" v={JSON.stringify(urlParsed?.params, null, 2)} mono wrap />
              )}
              <Text style={s.note}>
                {isHttps
                  ? 'Source: the OS opened this https link straight into the app, so the .well-known association is verified (no browser bounce).'
                  : 'Source: opened via the custom scheme (e.g. Bridge’s intent:// hand-off from a browser). Not a verified App Link.'}
              </Text>
            </>
          ) : (
            <Text style={s.res}>Not opened from a link this session. Tap a Bridge link (from Notes/chat) to test direct open.</Text>
          )}
        </View>

        {/* ── SOURCE 2: install referrer ───────────────────────────────── */}
        <SectionTitle>② ANDROID INSTALL REFERRER (deterministic deferred)</SectionTitle>
        <View style={s.card}>
          {PLATFORM !== 'android' ? (
            <Text style={s.res}>Android-only. On iOS the deferred path is the fingerprint match (§④).</Text>
          ) : referrer?.error ? (
            <>
              <Badge color="#ff6b6b" text="No referrer / error" />
              <KV k="detail" v={referrer.error} mono wrap />
              <Text style={s.note}>Expected when the app was sideloaded (not installed from a Play link). Real deferred installs carry bridge_link here.</Text>
            </>
          ) : referrer ? (
            <>
              <Badge color={referrer.bridgeLinkId ? '#b07cff' : '#9aa6bd'}
                text={referrer.bridgeLinkId ? 'bridge_link present' : 'organic install (no bridge_link)'} />
              <KV k="raw referrer" v={referrer.raw || '(empty)'} mono wrap />
              <KV k="parsed" v={JSON.stringify(referrer.params, null, 2)} mono wrap />
              <KV k="bridge_link id" v={referrer.bridgeLinkId || '—'} mono />
              <KV k="referrer click" v={referrer.referrerClick} />
              <KV k="install begin" v={referrer.installBegin} />
              <KV k="play instant" v={String(referrer.googlePlayInstant)} />
              <Row>
                <Btn label="Re-read referrer" onPress={fetchReferrer} secondary />
                <Btn label="Resolve via /v1/referrer" onPress={resolveReferrer} disabled={!referrer.bridgeLinkId} />
              </Row>
              {referrerResp && <KV k="resolve response" v={`HTTP ${referrerResp.status} (${referrerResp.ms}ms)\n` + JSON.stringify(referrerResp.body, null, 2)} mono wrap />}
            </>
          ) : (
            <Text style={s.res}>Reading…</Text>
          )}
        </View>

        {/* ── SOURCE 3: device fingerprint ─────────────────────────────── */}
        <SectionTitle>③ DEVICE FINGERPRINT (what we send to /v1/match)</SectionTitle>
        <View style={s.card}>
          <KV k="full device" v={JSON.stringify(device, null, 2)} mono wrap />
          <KV k="fingerprint payload" v={JSON.stringify(fingerprintPayload(device), null, 2)} mono wrap />
          <Text style={s.note}>Engine hashes screenWidth · pixelRatio · language · timezone + the server-observed IP (never client-reported, anti-spoof).</Text>
        </View>

        {/* ── SOURCE 4: fingerprint match ──────────────────────────────── */}
        <SectionTitle>④ DEFERRED MATCH /v1/match (server, no clipboard — the moat)</SectionTitle>
        <View style={s.card}>
          <Btn label="Run match" onPress={runMatch} />
          {matchResp ? (
            <>
              <Badge color={matchResp.body?.matched ? '#3fb27f' : '#9aa6bd'}
                text={matchResp.body?.matched ? `matched via ${matchResp.body?.matchMethod}` : `no match (${matchResp.body?.matchMethod || 'none'})`} />
              <KV k="response" v={`HTTP ${matchResp.status} (${matchResp.ms}ms)\n` + JSON.stringify(matchResp.body, null, 2)} mono wrap />
            </>
          ) : <Text style={s.res}>—</Text>}
        </View>

        {/* ── conversions ──────────────────────────────────────────────── */}
        <SectionTitle>⑤ CONVERSION EVENTS /v1/event</SectionTitle>
        <View style={s.card}>
          <Row>
            <Btn label="signup" onPress={() => track('signup', {})} secondary />
            <Btn label="purchase $49.99" onPress={() => track('purchase', {value: 49.99, currency: 'USD'})} />
          </Row>
          <Text style={s.note}>Responses appear in the event log below (202 = accepted).</Text>
        </View>

        {/* ── config ───────────────────────────────────────────────────── */}
        <SectionTitle>⚙️ CONFIG</SectionTitle>
        <View style={s.card}>
          <TouchableOpacity onPress={() => setShowConfig(v => !v)}>
            <Text style={s.link}>{showConfig ? '▾ hide' : '▸ edit endpoint / publishable key'}</Text>
          </TouchableOpacity>
          {showConfig && (
            <>
              <Text style={s.label}>Endpoint</Text>
              <TextInput style={s.input} value={endpoint} onChangeText={setEndpoint} autoCapitalize="none" />
              <Text style={s.label}>Publishable key (Dashboard → Get started)</Text>
              <TextInput style={s.input} value={publishableKey} onChangeText={setPublishableKey} autoCapitalize="none" />
            </>
          )}
          <KV k="endpoint" v={endpoint} mono wrap />
          <KV k="publishableKey" v={publishableKey || '— not set —'} mono wrap />
        </View>

        {/* ── timeline ─────────────────────────────────────────────────── */}
        <SectionTitle>🪵 EVENT LOG ({log.length})</SectionTitle>
        <Row>
          <Btn label="Share full dump" onPress={shareLog} />
          <Btn label="Clear" onPress={() => setLog([])} secondary />
        </Row>
        <View style={[s.card, {marginTop: 10}]}>
          {log.length === 0 ? <Text style={s.res}>—</Text> : log.map(e => (
            <View key={e.id} style={s.logRow}>
              <Text style={[s.logTitle, {color: KIND_COLOR[e.kind]}]}>{ICON[e.kind]} {e.title}</Text>
              <Text style={s.logTs}>{clock(e.ts)}</Text>
              {e.detail && Object.keys(e.detail).length > 0 && (
                <Text style={s.logDetail}>{JSON.stringify(e.detail, null, 2)}</Text>
              )}
            </View>
          ))}
        </View>
        <Text style={[s.tag, {marginTop: 18}]}>Bridge Link · test/debug build · no production data</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── tiny UI atoms ────────────────────────────────────────────────────────

function SectionTitle({children}: {children: React.ReactNode}) {
  return <Text style={s.h2}>{children}</Text>;
}
function KV({k, v, mono, wrap}: {k: string; v: string; mono?: boolean; wrap?: boolean}) {
  return (
    <View style={s.kv}>
      <Text style={s.kvK}>{k}</Text>
      <Text selectable style={[s.kvV, mono ? s.monoT : null]} numberOfLines={wrap ? undefined : 1}>{v}</Text>
    </View>
  );
}
function Badge({text, color}: {text: string; color: string}) {
  return <View style={[s.badge, {borderColor: color}]}><Text style={[s.badgeT, {color}]}>{text}</Text></View>;
}
function Row({children}: {children: React.ReactNode}) { return <View style={s.row}>{children}</View>; }
function Btn({label, onPress, secondary, disabled}: {label: string; onPress: () => void; secondary?: boolean; disabled?: boolean}) {
  return (
    <TouchableOpacity style={[s.btn, secondary && s.sec, disabled && s.disabled, {flex: 1}]} onPress={onPress} disabled={disabled}>
      <Text style={s.btnT}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  bg: {flex: 1, backgroundColor: '#0c0e12'},
  wrap: {padding: 16, paddingBottom: 56},
  h1: {color: '#eef1f7', fontSize: 26, fontWeight: '700', textAlign: 'center', marginTop: 8},
  tag: {color: '#9aa6bd', fontSize: 12, textAlign: 'center', marginTop: 4},
  h2: {color: '#5b8cff', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 20, marginBottom: 8},
  card: {backgroundColor: '#161a22', borderColor: '#2a313e', borderWidth: 1, borderRadius: 14, padding: 14},
  hit: {borderColor: '#3fb27f', backgroundColor: '#10241b'},
  res: {color: '#cdd6e6', fontSize: 13, lineHeight: 18},
  note: {color: '#7e8aa0', fontSize: 11, marginTop: 10, lineHeight: 16, fontStyle: 'italic'},
  label: {color: '#9aa6bd', fontSize: 12, marginTop: 10, marginBottom: 4},
  input: {backgroundColor: '#1c212c', borderColor: '#2a313e', borderWidth: 1, borderRadius: 10, color: '#eef1f7', padding: 10, fontSize: 13},
  link: {color: '#5b8cff', fontSize: 13, fontWeight: '600'},
  kv: {marginTop: 10},
  kvK: {color: '#7e8aa0', fontSize: 11, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5},
  kvV: {color: '#eef1f7', fontSize: 13, lineHeight: 18},
  monoT: {fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12},
  badge: {alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6, marginRight: 6},
  badgeT: {fontSize: 11, fontWeight: '700'},
  btn: {backgroundColor: '#5b8cff', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 12},
  sec: {backgroundColor: '#1c212c', borderColor: '#2a313e', borderWidth: 1},
  disabled: {opacity: 0.4},
  btnT: {color: '#fff', fontWeight: '700', fontSize: 14},
  row: {flexDirection: 'row', gap: 10},
  logRow: {borderBottomColor: '#222936', borderBottomWidth: 1, paddingVertical: 8},
  logTitle: {fontSize: 13, fontWeight: '600'},
  logTs: {color: '#5b6678', fontSize: 10, marginTop: 1},
  logDetail: {color: '#9aa6bd', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11, marginTop: 5, lineHeight: 15},
});
