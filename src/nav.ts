import { createNavigationContainerRef } from '@react-navigation/native';

/** `fromLink` marks a screen opened by a deep link (ticks the navigation checklist). */
export type Stack = {
  Home: undefined;
  TestLinks: undefined;
  Inspector: undefined;
  Fingerprint: undefined;
  Settings: undefined;
  Product: { id: string; color?: string; linkId?: string; fromLink?: boolean };
  Category: { name: string; fromLink?: boolean };
  Promo: { code: string; fromLink?: boolean };
  Cart: undefined;
  Login: { next: { screen: 'Order'; id: string; fromLink?: boolean } };
  Order: { id: string; fromLink?: boolean; viaLogin?: boolean };
  Invite: { code: string; fromLink?: boolean };
  NotRecognised: { path: string; fromLink?: boolean };
};

export const navRef = createNavigationContainerRef<Stack>();
