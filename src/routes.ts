/** Where a link's destination path takes the user inside the app. */
export type Route =
  | { screen: 'Home' }
  | { screen: 'Product'; id: string; color?: string }
  | { screen: 'Category'; name: string }
  | { screen: 'Promo'; code: string }
  | { screen: 'Cart' }
  | { screen: 'Order'; id: string }
  | { screen: 'Invite'; code: string }
  | { screen: 'NotRecognised'; path: string };

export function routeFor(path: string | undefined, params: Record<string, string> = {}): Route {
  const parts = (path ?? '/').split('/').filter(Boolean).map((p) => decodeURIComponent(p));
  const [first, second] = parts;
  if (parts.length === 0) return { screen: 'Home' };
  if (first === 'p' && second) return { screen: 'Product', id: second, color: params.color };
  if (first === 'c' && second) return { screen: 'Category', name: second };
  if (first === 'promo' && second) return { screen: 'Promo', code: second.toUpperCase() };
  if (first === 'cart' && parts.length === 1) return { screen: 'Cart' };
  if (first === 'orders' && second) return { screen: 'Order', id: second };
  if (first === 'invite' && second) return { screen: 'Invite', code: second };
  return { screen: 'NotRecognised', path: path ?? '/' };
}
