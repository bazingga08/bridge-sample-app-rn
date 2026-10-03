import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Share, Text, TextInput, View } from 'react-native';
import { describeEvent } from '../checklist';
import { BROWSER_LINK_PAGE, FINGERPRINT_PAGE, PRIVACY_POLICY_URL, TEST_LINKS } from '../config';
import { useStore } from '../store';
import { Button, Card, H1, H2, Mono, P, Pill, Row, Screen, useTheme } from '../ui';

/**
 * Open a page in the browser. The pages live on GitHub Pages, which this app
 * doesn't claim, so Android opens them in the browser (a page on the link
 * domain would open this app instead).
 */
const openInBrowser = (url: string) => Linking.openURL(url);

export function TestLinksScreen() {
  const { endpoint } = useStore();
  return (
    <Screen>
      <H1>Test links</H1>
      <P muted>
        Real short links on the live Strait server. Share one to yourself to test taps from
        Messages, or open it here.
      </P>
      {TEST_LINKS.map((l) => {
        const url = `${endpoint.replace(/\/+$/, '')}/${l.slug}`;
        return (
          <Card key={l.slug}>
            <H2>{l.label}</H2>
            <P muted>Opens: {l.opens}</P>
            <Mono>{url}</Mono>
            <Row>
              <Button title="Share" onPress={() => Share.share({ message: url })} />
              <Button title="Open as a link" kind="ghost" onPress={() => Linking.openURL(url)} />
              <Button title="Open via browser" kind="ghost" onPress={() => openInBrowser(`${BROWSER_LINK_PAGE}?u=${encodeURIComponent(url)}`)} />
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}

export function InspectorScreen() {
  const { events, strait } = useStore();
  // Open reports the SDK couldn't send yet (offline): it retries on its own.
  const [pending, setPending] = useState<number | null>(null);
  const refresh = useCallback(() => void strait.pendingOpenReports().then(setPending, () => setPending(null)), [strait]);
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && setTimeout(refresh, 1500));
    return () => sub.remove();
  }, [refresh, events.length]);
  return (
    <Screen>
      <H1>Link Inspector</H1>
      <P muted>Every link the app has received this session, newest first, as reported by the Strait SDK.</P>
      <Card>
        <H2>Analytics reports</H2>
        <P>Every open is reported to Strait. Waiting to send (offline): {pending ?? '…'}</P>
        <Button title="Send now" kind="ghost" onPress={() => void strait.flushOpenReports().then(refresh)} />
      </Card>
      {events.length === 0 && <P>No links yet. Open a test link to see it here.</P>}
      {events.map((e) => (
        <Card key={e.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <H2>{e.kind === 'deferred' ? 'Deferred link' : 'Direct link'}</H2>
            <Pill state={e.matched ? 'passed' : 'failed'} />
          </View>
          <P>{describeEvent(e)}</P>
          {e.rawUrl && <KV k="App received" v={e.rawUrl} />}
          {e.url && <KV k="Destination" v={e.url} />}
          {e.linkId && <KV k="Link ID" v={e.linkId} />}
          <KV k="Open ID" v={e.id} />
          <KV k="Route · app state" v={`${e.route} · ${e.appState}`} />
          <KV k="Time" v={new Date(e.at).toLocaleTimeString()} />
        </Card>
      ))}
    </Screen>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  const { C } = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ fontSize: 11.5, color: C.muted, fontWeight: '700', letterSpacing: 0.4 }}>{k.toUpperCase()}</Text>
      <Mono>{v}</Mono>
    </View>
  );
}

type Fp = { extHash?: string; inputs?: Record<string, string | number> } | null;

export function FingerprintScreen() {
  const { strait, endpoint, publishableKey, pass } = useStore();
  const [mine, setMine] = useState<Fp>(null);
  const [cmp, setCmp] = useState<{ match?: boolean; web?: Fp; differences?: string[] } | null>(null);
  const [error, setError] = useState('');

  const compare = useCallback(async () => {
    try {
      const r = (await strait.compareFingerprint()) as typeof cmp;
      setCmp(r);
      if (r?.match) pass('fingerprint_match', `Both sides: ${r.web?.extHash}`);
    } catch (e) {
      setError(String(e));
    }
  }, [strait, pass]);

  useEffect(() => {
    strait
      .reportFingerprint()
      .then((r) => setMine(r as Fp))
      .catch((e) => setError(String(e)));
    // When the user comes back from the browser check, compare automatically.
    const sub = AppState.addEventListener('change', (st) => st === 'active' && void compare());
    return () => sub.remove();
  }, [strait, compare]);

  return (
    <Screen>
      <H1>Fingerprint check</H1>
      <P muted>
        For iPhone deferred links, Strait matches the fingerprint taken in the browser at the tap
        with the one the app sends on first open. Here both are taken on this phone, on the same
        network, and compared.
      </P>
      <Card>
        <H2>This app</H2>
        <Mono>{mine?.extHash ?? 'reading…'}</Mono>
        {mine?.inputs && <Mono>{JSON.stringify(mine.inputs)}</Mono>}
      </Card>
      <Button
        title="Check in browser"
        onPress={() =>
          // Hosted off the link domain: this app claims every path on the link
          // domain, so a page there would open the app instead of the browser.
          openInBrowser(`${FINGERPRINT_PAGE}?k=${encodeURIComponent(publishableKey)}&e=${encodeURIComponent(endpoint)}`)
        }
      />
      <Button title="Compare now" kind="ghost" onPress={() => void compare()} />
      {cmp && (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <H2>Browser</H2>
            <Pill state={cmp.match ? 'passed' : cmp.web ? 'failed' : 'idle'} />
          </View>
          <Mono>{cmp.web?.extHash ?? 'Not checked yet: tap "Check in browser".'}</Mono>
          {cmp.web?.inputs && <Mono>{JSON.stringify(cmp.web.inputs)}</Mono>}
          {!!cmp.differences?.length && <P>Different: {cmp.differences.join(', ')}</P>}
          {cmp.match && <P>Match: an iPhone-style deferred link would be found for this device.</P>}
        </Card>
      )}
      {!!error && <P>{error}</P>}
    </Screen>
  );
}

export function SettingsScreen() {
  const { endpoint, publishableKey, saveConfig, loggedIn, setLoggedIn, resetResults } = useStore();
  const [ep, setEp] = useState(endpoint);
  const [key, setKey] = useState(publishableKey);
  const [saved, setSaved] = useState(false);
  const { C, s } = useTheme();
  return (
    <Screen>
      <H1>Settings</H1>
      <Card>
        <H2>Strait setup</H2>
        <P muted>The link host and your workspace's publishable key (Dashboard → Get started).</P>
        <Text style={{ color: C.muted }}>Link host</Text>
        <TextInput style={s.input} value={ep} onChangeText={setEp} autoCapitalize="none" />
        <Text style={{ color: C.muted }}>Publishable key</Text>
        <TextInput style={s.input} value={key} onChangeText={setKey} autoCapitalize="none" />
        <Button
          title={saved ? 'Saved' : 'Save'}
          onPress={async () => {
            await saveConfig(ep.trim(), key.trim());
            setSaved(true);
          }}
        />
      </Card>
      <Card>
        <H2>Account</H2>
        <P>{loggedIn ? 'Logged in as test user.' : 'Logged out.'}</P>
        <Button title={loggedIn ? 'Log out' : 'Log in'} kind="ghost" onPress={() => setLoggedIn(!loggedIn)} />
      </Card>
      <Card>
        <H2>Checklist</H2>
        <Button title="Reset all results" kind="ghost" onPress={resetResults} />
      </Card>
      <Card>
        <H2>About</H2>
        <P muted>What this app and the Strait service collect, and why.</P>
        <Button title="Privacy policy" kind="ghost" onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} />
      </Card>
    </Screen>
  );
}

