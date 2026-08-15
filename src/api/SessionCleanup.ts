import { clearCart } from './CartStorage';
import { clearIntent } from './CheckoutIntent';

export const CART_CACHE_OWNER_KEY = 'cartCacheOwner';
export const CART_MERGE_INTENT_KEY = 'cartMergeIntent';
export interface PrivateStateCleanupOptions {
  readonly preservePendingMerge?: boolean;
  readonly preserveNextPay?: boolean;
}

export function getCartCacheOwner(): string | null {
  return localStorage.getItem(CART_CACHE_OWNER_KEY);
}

export function setCartCacheOwner(owner: string): void {
  localStorage.setItem(CART_CACHE_OWNER_KEY, owner);
}

/**
 * Removes only session-private cart and checkout state. Auth credentials and
 * auth notifications belong exclusively to AuthSession.
 */
export function clearAuthenticatedPrivateState(
  options: PrivateStateCleanupOptions = {},
): void {
  const hadOwnedCart = Boolean(getCartCacheOwner());
  // Ownership must disappear before CartStorage synchronously notifies listeners.
  localStorage.removeItem(CART_CACHE_OWNER_KEY);
  if (hadOwnedCart) {
    clearCart();
  }
  if (!options.preservePendingMerge) {
    localStorage.removeItem(CART_MERGE_INTENT_KEY);
  }
  if (!options.preserveNextPay) {
    localStorage.removeItem('nextPay');
  }
  clearIntent();
}

/**
 * @deprecated Use clearAuthenticatedPrivateState. The legacy parameters are
 * retained for existing callers, but this function never reads, removes, or
 * signals JWT/auth state.
 */
export function clearAuthenticatedSessionState(
  _removeJwt = true,
  preservePendingMerge = false,
  preserveNextPay = false,
): void {
  clearAuthenticatedPrivateState({ preservePendingMerge, preserveNextPay });
}
