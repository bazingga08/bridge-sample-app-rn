import { describe, expect, it } from '@jest/globals';
import { routeFor } from '../src/routes';
import { itemForEvent } from '../src/checklist';
import type { LinkEvent } from '@strait/sdk-react-native';

const ev = (over: Partial<LinkEvent>): LinkEvent => ({
  id: 'e', kind: 'direct', route: 'app_link', appState: 'closed', matched: true, ms: 1, at: 1, ...over,
});

describe('routeFor', () => {
  it('maps destination paths to screens', () => {
    expect(routeFor('/p/42', { color: 'red' })).toEqual({ screen: 'Product', id: '42', color: 'red' });
    expect(routeFor('/c/shoes')).toEqual({ screen: 'Category', name: 'shoes' });
    expect(routeFor('/promo/diwali20')).toEqual({ screen: 'Promo', code: 'DIWALI20' });
    expect(routeFor('/cart')).toEqual({ screen: 'Cart' });
    expect(routeFor('/orders/1001')).toEqual({ screen: 'Order', id: '1001' });
    expect(routeFor('/invite/ANU')).toEqual({ screen: 'Invite', code: 'ANU' });
    expect(routeFor('/')).toEqual({ screen: 'Home' });
    expect(routeFor('/something/else')).toEqual({ screen: 'NotRecognised', path: '/something/else' });
  });
});

describe('itemForEvent', () => {
  it('ticks the right scenario', () => {
    expect(itemForEvent(ev({ appState: 'closed' }))).toBe('msg_closed');
    expect(itemForEvent(ev({ appState: 'background' }))).toBe('msg_background');
    expect(itemForEvent(ev({ appState: 'foreground' }))).toBe('msg_foreground');
    expect(itemForEvent(ev({ route: 'custom_scheme', appState: 'closed' }))).toBe('chrome_closed');
    expect(itemForEvent(ev({ route: 'custom_scheme', appState: 'background' }))).toBe('chrome_background');
    expect(itemForEvent(ev({ kind: 'deferred', route: 'install_referrer' }))).toBe('deferred_referrer');
    expect(itemForEvent(ev({ kind: 'deferred', route: 'fingerprint', matched: false }))).toBeNull();
    expect(itemForEvent(ev({ matched: false, reason: 'expired' }))).toBe('expired_link');
    expect(itemForEvent(ev({ matched: false, reason: 'not_found' }))).toBeNull();
  });
});
