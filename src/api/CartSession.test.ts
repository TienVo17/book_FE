import {
  addServerCartItem,
  getServerCart,
  mergeGuestCart,
  updateServerCartItem,
} from './CartApi';
import {
  addCartItem,
  loadCart,
  mergeGuestCartAfterLogin,
  readCartForCurrentSession,
  readPendingCartMerge,
  refreshCartAfterCheckout,
  setCartItemQuantity,
  signOutCartSession,
  waitForCartMutations,
} from './CartSession';
import { addOrUpdateItem, readCart } from './CartStorage';
import { ensureIntent, readIntent } from './CheckoutIntent';
import {
  CART_CACHE_OWNER_KEY,
  clearAuthenticatedSessionState,
} from './SessionCleanup';

jest.mock('./CartApi', () => ({
  addServerCartItem: jest.fn(),
  getServerCart: jest.fn(),
  mergeGuestCart: jest.fn(),
  removeServerCartItem: jest.fn(),
  updateServerCartItem: jest.fn(),
}));

const mockedAddServerCartItem = addServerCartItem as jest.MockedFunction<typeof addServerCartItem>;
const mockedGetServerCart = getServerCart as jest.MockedFunction<typeof getServerCart>;
const mockedMergeGuestCart = mergeGuestCart as jest.MockedFunction<typeof mergeGuestCart>;
const mockedUpdateServerCartItem = updateServerCartItem as jest.MockedFunction<typeof updateServerCartItem>;

const guestItem = {
  maSach: 1,
  sachDto: { tenSach: 'Giỏ khách', giaBan: 100000, hinhAnh: '' },
  soLuong: 2,
  soLuongTonKho: 10,
};
const serverCartA = {
  items: [{
    maSach: 2,
    sachDto: { tenSach: 'Giỏ A', giaBan: 200000, hinhAnh: '' },
    soLuong: 1,
    soLuongTonKho: 5,
  }],
  tongSoLuong: 1,
  tongTien: 200000,
};
const serverCartB = {
  items: [{
    maSach: 3,
    sachDto: { tenSach: 'Giỏ B', giaBan: 300000, hinhAnh: '' },
    soLuong: 1,
    soLuongTonKho: 4,
  }],
  tongSoLuong: 1,
  tongTien: 300000,
};

function setJwt(subject: string, signature = 'signature'): void {
  const payload = btoa(JSON.stringify({
    exp: Math.floor((Date.now() + 60_000) / 1000),
    sub: subject,
  }));
  localStorage.setItem('jwt', `header.${payload}.${signature}`);
}

describe('CartSession', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockedGetServerCart.mockResolvedValue(serverCartA);
    mockedAddServerCartItem.mockResolvedValue(serverCartA);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('keeps guest cart mutations local and never calls the server', async () => {
    await addCartItem(guestItem);

    expect(readCart()).toEqual([guestItem]);
    expect(mockedAddServerCartItem).not.toHaveBeenCalled();
  });

  it('uses the backend as source of truth for authenticated mutations', async () => {
    setJwt('customer-a');

    const result = await addCartItem(guestItem);

    expect(mockedAddServerCartItem).toHaveBeenCalledWith(1, 2);
    expect(result).toEqual(serverCartA.items);
    expect(readCart()).toEqual(serverCartA.items);
    expect(readCartForCurrentSession()).toEqual(serverCartA.items);
  });

  it('coalesces concurrent merge calls into one server request', async () => {
    addOrUpdateItem(guestItem);
    const snapshot = readCart();
    setJwt('customer-a');
    let resolveMerge!: (value: {
      items: typeof serverCartA.items;
      tongSoLuong: number;
      tongTien: number;
      mergedCount: number;
      adjustedItems: never[];
      removedItems: never[];
    }) => void;
    mockedMergeGuestCart.mockReturnValue(new Promise(resolve => {
      resolveMerge = resolve;
    }));

    const first = mergeGuestCartAfterLogin(snapshot);
    const second = mergeGuestCartAfterLogin(snapshot);
    expect(mockedMergeGuestCart).toHaveBeenCalledTimes(1);

    resolveMerge({
      ...serverCartA,
      mergedCount: 1,
      adjustedItems: [],
      removedItems: [],
    });
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(mockedMergeGuestCart).toHaveBeenCalledTimes(1);
  });

  it('rejects a guest merge above the backend 100-line contract without persisting a poisoned intent', async () => {
    const tooMany = Array.from({ length: 101 }, (_, index) => ({
      ...guestItem,
      maSach: index + 1,
    }));
    setJwt('customer-a');

    await expect(mergeGuestCartAfterLogin(tooMany)).rejects.toThrow('tối đa 100 loại sách');
    expect(mockedMergeGuestCart).not.toHaveBeenCalled();
    expect(readPendingCartMerge()).toBeNull();
  });

  it('reuses the same merge key and payload after a lost response', async () => {
    addOrUpdateItem(guestItem);
    const snapshot = readCart();
    setJwt('customer-a');
    mockedMergeGuestCart.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(mergeGuestCartAfterLogin(snapshot)).rejects.toThrow('Failed to fetch');
    const pending = readPendingCartMerge();
    expect(pending).not.toBeNull();
    expect(pending?.items).toEqual([{ maSach: 1, soLuong: 2 }]);

    mockedMergeGuestCart.mockResolvedValue({
      ...serverCartA,
      mergedCount: 1,
      adjustedItems: [],
      removedItems: [],
    });
    mockedGetServerCart.mockResolvedValue(serverCartA);

    await mergeGuestCartAfterLogin(snapshot);

    expect(mockedMergeGuestCart).toHaveBeenNthCalledWith(1, pending?.items, pending?.key);
    expect(mockedMergeGuestCart).toHaveBeenNthCalledWith(2, pending?.items, pending?.key);
    expect(readPendingCartMerge()).toBeNull();
    expect(readCart()).toEqual(serverCartA.items);
  });

  it('replays a preserved merge intent with the same key after login handoff fails', async () => {
    addOrUpdateItem(guestItem);
    const snapshot = readCart();
    setJwt('customer-a');
    mockedMergeGuestCart.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(mergeGuestCartAfterLogin(snapshot)).rejects.toThrow('Failed to fetch');
    const pending = readPendingCartMerge();
    localStorage.setItem('nextPay', 'true');
    clearAuthenticatedSessionState(true, true, true);
    expect(localStorage.getItem('nextPay')).toBe('true');

    setJwt('customer-a');
    mockedMergeGuestCart.mockResolvedValue({
      ...serverCartA,
      mergedCount: 1,
      adjustedItems: [],
      removedItems: [],
    });
    await mergeGuestCartAfterLogin(snapshot);

    expect(mockedMergeGuestCart).toHaveBeenNthCalledWith(2, pending?.items, pending?.key);
    expect(readPendingCartMerge()).toBeNull();
  });

  it('does not expose account A cache or checkout intent after switching to account B', async () => {
    setJwt('customer-a');
    await loadCart();
    ensureIntent('account-a-checkout');
    expect(readCartForCurrentSession()).toEqual(serverCartA.items);

    setJwt('customer-b');
    mockedGetServerCart.mockResolvedValue(serverCartB);

    expect(readCartForCurrentSession()).toEqual([]);
    expect(readIntent()).toBeNull();
    await expect(loadCart()).resolves.toEqual(serverCartB.items);
    expect(readCart()).toEqual(serverCartB.items);
  });

  it('finishes owner cleanup before cartUpdated listeners read the new session', async () => {
    setJwt('customer-a');
    await loadCart();
    setJwt('customer-b');
    const observedOwners: Array<string | null> = [];
    const listener = () => {
      observedOwners.push(localStorage.getItem(CART_CACHE_OWNER_KEY));
      readCartForCurrentSession();
    };
    window.addEventListener('cartUpdated', listener);

    expect(() => readCartForCurrentSession()).not.toThrow();

    window.removeEventListener('cartUpdated', listener);
    expect(observedOwners).toEqual([null]);
  });

  it('ignores an account A load response after switching to account B', async () => {
    setJwt('customer-a');
    let resolveAccountA!: (value: typeof serverCartA) => void;
    mockedGetServerCart.mockReturnValueOnce(new Promise(resolve => {
      resolveAccountA = resolve;
    }));
    const accountALoad = loadCart();

    setJwt('customer-b');
    mockedGetServerCart.mockResolvedValueOnce(serverCartB);
    await expect(loadCart()).resolves.toEqual(serverCartB.items);
    resolveAccountA(serverCartA);

    await expect(accountALoad).resolves.toEqual(serverCartB.items);
    expect(readCartForCurrentSession()).toEqual(serverCartB.items);
  });

  it('ignores a stale response after the JWT rotates for the same account', async () => {
    setJwt('customer-a');
    await loadCart();
    let resolveOldToken!: (value: typeof serverCartA) => void;
    mockedGetServerCart.mockReturnValueOnce(new Promise(resolve => {
      resolveOldToken = resolve;
    }));
    const oldLoad = loadCart();

    setJwt('customer-a', 'rotated-signature');
    mockedGetServerCart.mockResolvedValueOnce(serverCartB);
    await expect(loadCart()).resolves.toEqual(serverCartB.items);
    resolveOldToken(serverCartA);

    await expect(oldLoad).resolves.toEqual(serverCartB.items);
    expect(readCartForCurrentSession()).toEqual(serverCartB.items);
  });

  it('serializes authenticated mutations and exposes an idle boundary', async () => {
    setJwt('customer-a');
    await loadCart();
    let resolveFirst!: (value: typeof serverCartA) => void;
    mockedUpdateServerCartItem
      .mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve; }))
      .mockResolvedValueOnce(serverCartB);

    const first = setCartItemQuantity(2, 2);
    const second = setCartItemQuantity(2, 3);
    let idle = false;
    const idlePromise = waitForCartMutations().then(() => { idle = true; });

    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockedUpdateServerCartItem).toHaveBeenCalledTimes(1);
    expect(idle).toBe(false);
    resolveFirst(serverCartA);
    await first;
    await second;
    await idlePromise;

    expect(mockedUpdateServerCartItem).toHaveBeenCalledTimes(2);
    expect(idle).toBe(true);
    expect(readCart()).toEqual(serverCartB.items);
  });

  it('does not overwrite a newer cart mutation with a stale checkout refresh response', async () => {
    setJwt('customer-a');
    await loadCart();
    let resolveRefresh!: (value: typeof serverCartA) => void;
    mockedGetServerCart.mockReturnValueOnce(new Promise(resolve => { resolveRefresh = resolve; }));

    const refresh = refreshCartAfterCheckout();
    mockedAddServerCartItem.mockResolvedValue(serverCartB);
    await addCartItem(guestItem);
    resolveRefresh(serverCartA);

    await expect(refresh).resolves.toEqual(serverCartB.items);
    expect(readCart()).toEqual(serverCartB.items);
  });

  it('clears only authenticated cache on logout and never deletes the server cart', async () => {
    setJwt('customer-a');
    await loadCart();

    signOutCartSession();

    expect(localStorage.getItem('jwt')).toBeNull();
    expect(readCart()).toEqual([]);
    expect(mockedGetServerCart).toHaveBeenCalledTimes(1);
  });

  it('preserves a true guest cart when signing out an invalid session', () => {
    addOrUpdateItem(guestItem);

    signOutCartSession();

    expect(readCart()).toEqual([guestItem]);
  });
});
