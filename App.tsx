/**
 * Strait Link — a debuggable "customer" app for testing every deep-link case.
 * It integrates Strait only through the public SDK (@strait/sdk-react-native),
 * the same way any app would. See README.md.
 */
import React from 'react';
import { StatusBar } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { LinkEvent } from '@strait/sdk-react-native';
import { navRef, type Stack } from './src/nav';
import { routeFor } from './src/routes';
import { StoreProvider } from './src/store';
import { OpeningOverlay } from './src/OpeningOverlay';
import { useTheme } from './src/ui';
import { HomeScreen } from './src/screens/Home';
import { FingerprintScreen, InspectorScreen, SettingsScreen, TestLinksScreen } from './src/screens/Tools';
import {
  CartScreen, CategoryScreen, InviteScreen, LoginScreen, NotRecognisedScreen,
  OrderScreen, ProductScreen, PromoScreen,
} from './src/screens/Shop';

const S = createNativeStackNavigator<Stack>();

const REASONS: Record<string, string> = {
  expired: 'This link has expired.',
  not_found: 'This link does not exist (or belongs to another app).',
  password_protected: 'This link is password-protected; open it in the browser.',
  network: 'Could not reach Strait to open this link. Check your connection.',
  no_match: '',
};

/** Navigation requested before the stack is ready is replayed on ready. */
let pending: (() => void) | null = null;
const go = (fn: () => void) => (navRef.isReady() ? fn() : (pending = fn));

function handleLink(e: LinkEvent, ctx: { loggedIn: boolean; setNotice: (n: string | null) => void }) {
  if (!e.matched) {
    // A deferred check that found nothing is normal (organic install): stay quiet.
    const msg = REASONS[e.reason ?? ''] ?? `Link could not be opened (${e.reason}).`;
    if (msg) {
      ctx.setNotice(msg);
      go(() => navRef.navigate('Home'));
    }
    return;
  }
  const r = routeFor(e.path, e.params);
  go(() => {
    switch (r.screen) {
      case 'Home':
        return navRef.navigate('Home');
      case 'Product':
        return navRef.navigate('Product', { id: r.id, color: r.color, linkId: e.linkId, fromLink: true });
      case 'Category':
        return navRef.navigate('Category', { name: r.name, fromLink: true });
      case 'Promo':
        return navRef.navigate('Promo', { code: r.code, fromLink: true });
      case 'Cart':
        return navRef.navigate('Cart');
      case 'Order':
        return ctx.loggedIn
          ? navRef.navigate('Order', { id: r.id, fromLink: true })
          : navRef.navigate('Login', { next: { screen: 'Order', id: r.id, fromLink: true } });
      case 'Invite':
        return navRef.navigate('Invite', { code: r.code, fromLink: true });
      case 'NotRecognised':
        return navRef.navigate('NotRecognised', { path: r.path, fromLink: true });
    }
  });
}

export default function App(): React.JSX.Element {
  const { C, dark } = useTheme();
  const base = dark ? DarkTheme : DefaultTheme;
  const navTheme: Theme = {
    ...base,
    colors: { ...base.colors, primary: C.accentText, background: C.bg, card: C.card, text: C.ink, border: C.line },
  };
  return (
    <StoreProvider onLink={handleLink}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={C.card} />
      <NavigationContainer
        ref={navRef}
        theme={navTheme}
        onReady={() => {
          pending?.();
          pending = null;
        }}
      >
        <S.Navigator screenOptions={{ headerTintColor: C.ink }}>
          <S.Screen name="Home" component={HomeScreen} options={{ title: 'Strait Link' }} />
          <S.Screen name="TestLinks" component={TestLinksScreen} options={{ title: 'Test links' }} />
          <S.Screen name="Inspector" component={InspectorScreen} options={{ title: 'Link Inspector' }} />
          <S.Screen name="Fingerprint" component={FingerprintScreen} options={{ title: 'Fingerprint' }} />
          <S.Screen name="Settings" component={SettingsScreen} />
          <S.Screen name="Product" component={ProductScreen} />
          <S.Screen name="Category" component={CategoryScreen} />
          <S.Screen name="Promo" component={PromoScreen} options={{ title: 'Coupon' }} />
          <S.Screen name="Cart" component={CartScreen} />
          <S.Screen name="Login" component={LoginScreen} options={{ title: 'Log in' }} />
          <S.Screen name="Order" component={OrderScreen} />
          <S.Screen name="Invite" component={InviteScreen} />
          <S.Screen name="NotRecognised" component={NotRecognisedScreen} options={{ title: 'Not recognised' }} />
        </S.Navigator>
      </NavigationContainer>
      <OpeningOverlay />
    </StoreProvider>
  );
}
