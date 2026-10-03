import type { LinkEvent } from '@strait/sdk-react-native';

export type ItemId =
  | 'msg_closed' | 'msg_background' | 'msg_foreground'
  | 'chrome_closed' | 'chrome_background'
  | 'deferred_referrer' | 'deferred_once'
  | 'fingerprint_match'
  | 'nav_product' | 'nav_promo' | 'nav_order_login' | 'nav_unknown' | 'expired_link'
  | 'purchase_event';

export interface Item {
  id: ItemId;
  title: string;
  /** Plain-language steps; shown when the item is tapped. */
  how: string[];
}

export interface Section {
  title: string;
  intro: string;
  items: Item[];
}

const SEND = 'Send yourself a test link (Test links → Share) in WhatsApp or Messages.';

export const SECTIONS: Section[] = [
  {
    title: 'Tap a link in Messages / WhatsApp',
    intro: 'Android opens this app directly, with no browser. The app then asks Strait where the short link points.',
    items: [
      { id: 'msg_closed', title: 'App was closed', how: [SEND, 'Swipe Strait Link away from recent apps.', 'Tap the link.'] },
      { id: 'msg_background', title: 'App was in the background', how: [SEND, 'Open Strait Link, then press Home.', 'Tap the link.'] },
      { id: 'msg_foreground', title: 'App was on screen', how: ['Test links → tap "Open as a link" (sends the link to Android while the app is open).'] },
    ],
  },
  {
    title: 'Tap a link inside Chrome',
    intro: 'The link loads in Chrome first; Strait then hands off to the app with the destination.',
    items: [
      { id: 'chrome_closed', title: 'App was closed', how: ['Test links → "Open via browser" (a page opens in Chrome).', 'Swipe Strait Link away from recent apps.', 'Back in Chrome, tap "Open the link".'] },
      { id: 'chrome_background', title: 'App was in the background', how: ['Test links → "Open via browser".', 'In Chrome, tap "Open the link".'] },
    ],
  },
  {
    title: 'Install first, then open (deferred)',
    intro: 'Someone taps a link without the app, installs it from Google Play, and lands on the right screen on first open.',
    items: [
      { id: 'deferred_referrer', title: 'First open lands on the tapped link', how: ['Uninstall Strait Link.', 'Tap a test link: it opens Google Play.', 'Install from Play and open the app.'] },
      { id: 'deferred_once', title: 'Happens only on the first open', how: ['After the step above passes, close and reopen the app.', 'It should NOT jump to the link again.'] },
    ],
  },
  {
    title: 'Fingerprint (used for iPhone deferred links)',
    intro: 'The app and the browser on this phone should produce the same fingerprint.',
    items: [
      { id: 'fingerprint_match', title: 'App and browser fingerprints match', how: ['Open the Fingerprint tab and tap "Check in browser".', 'Come back to the app; it compares automatically.'] },
    ],
  },
  {
    title: 'Navigation inside the app',
    intro: 'Each link must land on the right screen with the right data.',
    items: [
      { id: 'nav_product', title: 'Product link opens product #42 (red)', how: ['Open the Product test link any way above.'] },
      { id: 'nav_promo', title: 'Coupon link applies DIWALI20', how: ['Open the Coupon test link.'] },
      { id: 'nav_order_login', title: 'Order link asks to log in, then continues', how: ['Log out in Settings.', 'Open the Order test link, log in.'] },
      { id: 'nav_unknown', title: 'Unknown page shows "not recognised"', how: ['Open the Unknown page test link.'] },
      { id: 'expired_link', title: 'Expired link shows a clear message', how: ['Open the Expired test link.'] },
    ],
  },
  {
    title: 'Analytics',
    intro: 'What happened in the app reaches the Strait dashboard.',
    items: [
      { id: 'purchase_event', title: 'Purchase reaches Strait', how: ['Open any product and tap "Buy".', 'Dashboard → Analytics shows the purchase.'] },
    ],
  },
];

export const ALL_ITEMS: Item[] = SECTIONS.flatMap((s) => s.items);

export interface Result {
  passed: boolean;
  at: number;
  detail: string;
}
export type Results = Partial<Record<ItemId, Result>>;

/** Which checklist item a link event proves (if any). */
export function itemForEvent(e: LinkEvent): ItemId | null {
  if (e.kind === 'deferred') return e.route === 'install_referrer' && e.matched ? 'deferred_referrer' : null;
  if (e.route === 'app_link' && e.matched) {
    return e.appState === 'closed' ? 'msg_closed' : e.appState === 'background' ? 'msg_background' : 'msg_foreground';
  }
  if (e.route === 'custom_scheme' && e.matched) {
    return e.appState === 'closed' ? 'chrome_closed' : e.appState === 'background' ? 'chrome_background' : null;
  }
  if (!e.matched && e.reason === 'expired') return 'expired_link';
  return null;
}

export function describeEvent(e: LinkEvent): string {
  const how = { app_link: 'verified link', custom_scheme: 'Chrome hand-off', install_referrer: 'Play install referrer', fingerprint: 'fingerprint' }[e.route];
  const state = { closed: 'app was closed', background: 'app was in background', foreground: 'app was on screen' }[e.appState];
  return `${how} · ${state} · ${e.matched ? e.path ?? e.url : `not matched (${e.reason})`} · ${e.ms} ms`;
}
