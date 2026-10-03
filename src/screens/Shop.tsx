import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useStore } from '../store';
import type { Stack } from '../nav';
import { Banner, Button, Card, H1, H2, P, Screen, useTheme } from '../ui';

type Props<K extends keyof Stack> = NativeStackScreenProps<Stack, K>;

/** Small badge so it's obvious a deep link (not a tap in the app) opened the screen. */
function LinkBadge({ show }: { show?: boolean }) {
  return show ? <Banner tone="ok" text="Opened by a deep link" /> : null;
}

export function ProductScreen({ route, navigation }: Props<'Product'>) {
  const { id, color, linkId, fromLink } = route.params;
  const { pass, strait, cart, setCart } = useStore();
  const [bought, setBought] = useState<string>('');
  useEffect(() => {
    if (fromLink && id === '42' && color === 'red') pass('nav_product', 'Product #42 in red, from the link');
  }, [fromLink, id, color, pass]);
  return (
    <Screen>
      <LinkBadge show={fromLink} />
      <H1>Product #{id}</H1>
      <Card>
        <P>Colour: {color ?? 'default'}</P>
        <P>Price: $49.99</P>
      </Card>
      <Button
        title="Buy now ($49.99)"
        onPress={async () => {
          const ok = await strait.trackEvent('purchase', { value: 49.99, currency: 'USD', linkId });
          setBought(ok ? 'Purchase sent to Strait (202).' : 'Strait did not accept the purchase.');
          if (ok) pass('purchase_event', `purchase $49.99${linkId ? ` from ${linkId}` : ''}`);
        }}
      />
      <Button title="Add to cart" kind="ghost" onPress={() => { setCart({ ...cart, items: [...cart.items, { id, color }] }); navigation.navigate('Cart'); }} />
      {!!bought && <P>{bought}</P>}
    </Screen>
  );
}

export function CategoryScreen({ route, navigation }: Props<'Category'>) {
  const { name, fromLink } = route.params;
  return (
    <Screen>
      <LinkBadge show={fromLink} />
      <H1>Category: {name}</H1>
      {['7', '42', '108'].map((id) => (
        <Card key={id}>
          <H2>Item #{id}</H2>
          <Button title="View" kind="ghost" onPress={() => navigation.navigate('Product', { id })} />
        </Card>
      ))}
    </Screen>
  );
}

export function PromoScreen({ route, navigation }: Props<'Promo'>) {
  const { code, fromLink } = route.params;
  const { cart, setCart, pass } = useStore();
  const { C } = useTheme();
  useEffect(() => {
    setCart({ ...cart, coupon: code });
    if (fromLink && code === 'DIWALI20') pass('nav_promo', 'Coupon DIWALI20 applied from the link');
    // apply once per visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);
  return (
    <Screen>
      <LinkBadge show={fromLink} />
      <H1>Coupon applied</H1>
      <Card>
        <Text style={{ fontSize: 22, fontWeight: '700', color: C.ok }}>{code}</Text>
        <P>20% off your next order.</P>
      </Card>
      <Button title="Go to cart" onPress={() => navigation.navigate('Cart')} />
    </Screen>
  );
}

export function CartScreen() {
  const { cart } = useStore();
  return (
    <Screen>
      <H1>Cart</H1>
      <Card>
        <P>{cart.items.length} item(s)</P>
        <P>Coupon: {cart.coupon ?? 'none'}</P>
      </Card>
    </Screen>
  );
}

export function LoginScreen({ route, navigation }: Props<'Login'>) {
  const { setLoggedIn } = useStore();
  const { next } = route.params;
  return (
    <Screen>
      <H1>Log in to continue</H1>
      <P muted>The link you opened needs an account. After logging in you'll continue to order #{next.id}.</P>
      <Button
        title="Log in as test user"
        onPress={() => {
          setLoggedIn(true);
          navigation.replace('Order', { id: next.id, fromLink: next.fromLink, viaLogin: true });
        }}
      />
    </Screen>
  );
}

export function OrderScreen({ route }: Props<'Order'>) {
  const { id, fromLink, viaLogin } = route.params;
  const { pass } = useStore();
  useEffect(() => {
    if (fromLink && viaLogin) pass('nav_order_login', `Logged in, then continued to order #${id}`);
  }, [fromLink, viaLogin, id, pass]);
  return (
    <Screen>
      <LinkBadge show={fromLink} />
      <H1>Order #{id}</H1>
      <Card>
        <P>Status: Out for delivery</P>
        {viaLogin && <P muted>You logged in first, then the app continued here.</P>}
      </Card>
    </Screen>
  );
}

export function InviteScreen({ route }: Props<'Invite'>) {
  const { code, fromLink } = route.params;
  return (
    <Screen>
      <LinkBadge show={fromLink} />
      <H1>You were invited by {code}</H1>
      <Card>
        <P>Sign up to get $10 credit.</P>
      </Card>
    </Screen>
  );
}

export function NotRecognisedScreen({ route }: Props<'NotRecognised'>) {
  const { path, fromLink } = route.params;
  const { pass } = useStore();
  const { C } = useTheme();
  useEffect(() => {
    if (fromLink) pass('nav_unknown', `Unknown path ${path} handled`);
  }, [fromLink, path, pass]);
  return (
    <Screen>
      <H1>Link not recognised</H1>
      <Card>
        <P>This app has no page for:</P>
        <Text style={{ fontFamily: 'monospace', color: C.ink }}>{path}</Text>
        <P muted>Nothing crashed: unknown links land here instead of a blank screen.</P>
      </Card>
    </Screen>
  );
}
