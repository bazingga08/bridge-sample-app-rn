import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayInstallReferrer } from 'react-native-play-install-referrer';
import { createStrait, fromPlayInstallReferrer, type Strait, type LinkEvent } from '@strait/sdk-react-native';
import { DEFAULT_ENDPOINT, DEFAULT_PUBLISHABLE_KEY } from './config';
import { itemForEvent, type ItemId, type Results } from './checklist';

interface Cart {
  items: Array<{ id: string; color?: string }>;
  coupon?: string;
}

interface AppStore {
  strait: Strait;
  endpoint: string;
  publishableKey: string;
  events: LinkEvent[];
  results: Results;
  pass: (id: ItemId, detail: string) => void;
  resetResults: () => void;
  loggedIn: boolean;
  setLoggedIn: (v: boolean) => void;
  cart: Cart;
  setCart: (c: Cart) => void;
  /** Latest link event that couldn't be opened (shown as a banner). */
  notice: string | null;
  setNotice: (n: string | null) => void;
  saveConfig: (endpoint: string, key: string) => Promise<void>;
  /** A link is being resolved right now (show a loading state). */
  opening: { kind: 'direct' | 'deferred' } | null;
}

const Ctx = createContext<AppStore | null>(null);
export const useStore = (): AppStore => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
};

const K = { results: 'bl.results', loggedIn: 'bl.loggedIn', endpoint: 'bl.endpoint', key: 'bl.key' };

function makeStrait(endpoint: string, publishableKey: string): Strait {
  // Exactly the integration a customer writes: key + host + storage + referrer.
  return createStrait({
    publishableKey,
    endpoint,
    storage: AsyncStorage,
    installReferrer: fromPlayInstallReferrer(PlayInstallReferrer),
  });
}

export function StoreProvider({
  children,
  onLink,
}: {
  children: React.ReactNode;
  /** Called for every link event (App.tsx navigates). */
  onLink: (e: LinkEvent, ctx: { loggedIn: boolean; setNotice: (n: string | null) => void }) => void;
}) {
  const [config, setConfig] = useState<{ endpoint: string; key: string } | null>(null);
  const [events, setEvents] = useState<LinkEvent[]>([]);
  const [results, setResults] = useState<Results>({});
  const [loggedIn, setLoggedInState] = useState(false);
  const [cart, setCart] = useState<Cart>({ items: [] });
  const [notice, setNotice] = useState<string | null>(null);
  const [opening, setOpening] = useState<{ id: string; kind: 'direct' | 'deferred' } | null>(null);
  const resultsRef = useRef<Results>({});
  const onLinkRef = useRef(onLink);
  onLinkRef.current = onLink;
  const sessionStart = useRef(Date.now());
  const loggedInRef = useRef(false);

  const pass = useCallback((id: ItemId, detail: string) => {
    const next = { ...resultsRef.current, [id]: { passed: true, at: Date.now(), detail } };
    resultsRef.current = next;
    setResults(next);
    void AsyncStorage.setItem(K.results, JSON.stringify(next));
  }, []);

  // Load saved settings and results before starting the SDK.
  useEffect(() => {
    (async () => {
      const [r, li, ep, key] = await AsyncStorage.multiGet([K.results, K.loggedIn, K.endpoint, K.key]);
      const saved = r?.[1] ? (JSON.parse(r[1]) as Results) : {};
      resultsRef.current = saved;
      setResults(saved);
      setLoggedInState(li?.[1] === '1');
      loggedInRef.current = li?.[1] === '1';
      setConfig({ endpoint: ep?.[1] || DEFAULT_ENDPOINT, key: key?.[1] || DEFAULT_PUBLISHABLE_KEY });
    })();
  }, []);

  const strait = useMemo(() => (config ? makeStrait(config.endpoint, config.key) : null), [config]);

  useEffect(() => {
    if (!strait) return;
    let sawDeferred = false;
    let safety: ReturnType<typeof setTimeout> | undefined;
    const offStart = strait.onLinkStart((s) => {
      setOpening({ id: s.id, kind: s.kind });
      // Never leave the overlay up if something goes wrong.
      clearTimeout(safety);
      safety = setTimeout(() => setOpening(null), 15_000);
    });
    const off = strait.onLink((e) => {
      setOpening((cur) => (cur?.id === e.id ? null : cur));
      if (e.kind === 'deferred') sawDeferred = true;
      setEvents((prev) => [e, ...prev].slice(0, 100));
      const item = itemForEvent(e);
      if (item) pass(item, `${e.route} · ${e.appState} · ${e.path ?? e.reason ?? ''}`);
      onLinkRef.current(e, { loggedIn: loggedInRef.current, setNotice });
    });
    void strait.start().then(() => {
      // "Only once": a later launch after a deferred match must not re-route.
      const prior = resultsRef.current.deferred_referrer;
      if (prior?.passed && prior.at < sessionStart.current && !sawDeferred) {
        pass('deferred_once', 'App reopened after the deferred match; no second deferred link.');
      }
    });
    return () => {
      off();
      offStart();
      clearTimeout(safety);
      strait.stop();
    };
  }, [strait, pass]);

  const value: AppStore | null = strait && config
    ? {
        strait,
        endpoint: config.endpoint,
        publishableKey: config.key,
        events,
        results,
        pass,
        resetResults: () => {
          resultsRef.current = {};
          setResults({});
          void AsyncStorage.removeItem(K.results);
        },
        loggedIn,
        setLoggedIn: (v) => {
          loggedInRef.current = v;
          setLoggedInState(v);
          void AsyncStorage.setItem(K.loggedIn, v ? '1' : '0');
        },
        cart,
        setCart,
        notice,
        setNotice,
        opening: opening ? { kind: opening.kind } : null,
        saveConfig: async (endpoint, key) => {
          await AsyncStorage.multiSet([[K.endpoint, endpoint], [K.key, key]]);
          setConfig({ endpoint, key });
        },
      }
    : null;

  if (!value) return null;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
