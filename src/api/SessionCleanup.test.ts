import { addOrUpdateItem, readCart } from './CartStorage';
import { ensureIntent, readIntent } from './CheckoutIntent';
import {
  CART_CACHE_OWNER_KEY,
  CART_MERGE_INTENT_KEY,
  clearAuthenticatedPrivateState,
} from './SessionCleanup';

const guestItem = {
  maSach: 1,
  sachDto: { tenSach: 'Giỏ khách', giaBan: 100000, hinhAnh: '' },
  soLuong: 1,
};

describe('SessionCleanup', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('cleans authenticated private state without changing the auth token or emitting the old auth event', () => {
    localStorage.setItem('jwt', 'new-auth-memory-owner-must-not-touch-this');
    localStorage.setItem(CART_CACHE_OWNER_KEY, 'account:42');
    localStorage.setItem(CART_MERGE_INTENT_KEY, JSON.stringify({
      owner: 'account:42',
      key: 'pending-key',
      items: [{ maSach: 1, soLuong: 1 }],
    }));
    localStorage.setItem('nextPay', 'true');
    ensureIntent('checkout');
    addOrUpdateItem(guestItem);
    const authListener = jest.fn();
    window.addEventListener('authSessionChanged', authListener);

    clearAuthenticatedPrivateState();

    window.removeEventListener('authSessionChanged', authListener);
    expect(localStorage.getItem('jwt')).toBe('new-auth-memory-owner-must-not-touch-this');
    expect(authListener).not.toHaveBeenCalled();
    expect(localStorage.getItem(CART_CACHE_OWNER_KEY)).toBeNull();
    expect(localStorage.getItem(CART_MERGE_INTENT_KEY)).toBeNull();
    expect(localStorage.getItem('nextPay')).toBeNull();
    expect(readIntent()).toBeNull();
    expect(readCart()).toEqual([]);
  });

  it('leaves an unowned guest cart intact while discarding private checkout state', () => {
    addOrUpdateItem(guestItem);
    ensureIntent('checkout');

    clearAuthenticatedPrivateState();

    expect(readCart()).toEqual([guestItem]);
    expect(readIntent()).toBeNull();
  });

  it('can preserve a replayable merge and next-pay handoff without auth coupling', () => {
    localStorage.setItem(CART_CACHE_OWNER_KEY, 'account:42');
    localStorage.setItem(CART_MERGE_INTENT_KEY, JSON.stringify({
      owner: 'account:42',
      key: 'pending-key',
      items: [{ maSach: 1, soLuong: 1 }],
    }));
    localStorage.setItem('nextPay', 'true');
    addOrUpdateItem(guestItem);

    clearAuthenticatedPrivateState({
      preservePendingMerge: true,
      preserveNextPay: true,
    });

    expect(localStorage.getItem(CART_MERGE_INTENT_KEY)).not.toBeNull();
    expect(localStorage.getItem('nextPay')).toBe('true');
    expect(readCart()).toEqual([]);
  });
});
