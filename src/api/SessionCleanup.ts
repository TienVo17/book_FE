import { clearCart } from './CartStorage';
import { clearIntent } from './CheckoutIntent';

export const CART_CACHE_OWNER_KEY = 'cartCacheOwner';
export const CART_MERGE_INTENT_KEY = 'cartMergeIntent';
export const AUTH_SESSION_CHANGED_EVENT = 'authSessionChanged';

export function notifyAuthSessionChanged(): void {
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}

export function getCartCacheOwner(): string | null {
  return localStorage.getItem(CART_CACHE_OWNER_KEY);
}

export function setCartCacheOwner(owner: string): void {
  localStorage.setItem(CART_CACHE_OWNER_KEY, owner);
}

export function clearAuthenticatedSessionState(
  removeJwt = true,
  preservePendingMerge = false,
  preserveNextPay = false,
): void {
  const hadOwnedCart = Boolean(getCartCacheOwner());
  // Remove ownership before clearCart dispatches its synchronous cartUpdated
  // event. Listeners may call readCartForCurrentSession(), which must observe a
  // completed transition instead of recursively starting this cleanup again.
  localStorage.removeItem(CART_CACHE_OWNER_KEY);
  if (hadOwnedCart) {
    clearCart();
  }
  if (!preservePendingMerge) {
    localStorage.removeItem(CART_MERGE_INTENT_KEY);
  }
  if (!preserveNextPay) {
    localStorage.removeItem('nextPay');
  }
  clearIntent();
  if (removeJwt) {
    localStorage.removeItem('jwt');
    notifyAuthSessionChanged();
  }
}
