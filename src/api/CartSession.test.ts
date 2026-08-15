import {
  addServerCartItem,
  getServerCartWithCapture,
  mergeGuestCart,
  updateServerCartItem,
} from './CartApi';
import {
  addCartItem,
  claimGuestCartForAccount,
  loadCart,
  mergeGuestCartAfterLogin,
  preserveFailedLoginHandoffForLogout,
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
  CART_MERGE_INTENT_KEY,
  clearAuthenticatedSessionState,
} from './SessionCleanup';
import {
  captureAuthenticatedRequest,
  getAuthSnapshot,
  isCurrentAuthCapture,
  subscribeAuthTransition,
  type AuthSnapshot,
} from './AuthSession';

var mockAuthTransitionListener: ((previous: AuthSnapshot, next: AuthSnapshot) => void) | null;

jest.mock('./AuthSession', () => ({
  captureAuthenticatedRequest: jest.fn(),
  getAuthSnapshot: jest.fn(),
  isCurrentAuthCapture: jest.fn(),
  subscribeAuthTransition: jest.fn((listener) => {
    mockAuthTransitionListener = listener;
    return () => { mockAuthTransitionListener = null; };
  }),
}));

const mockedCaptureAuthenticatedRequest = captureAuthenticatedRequest as jest.MockedFunction<typeof captureAuthenticatedRequest>;
const mockedGetAuthSnapshot = getAuthSnapshot as jest.MockedFunction<typeof getAuthSnapshot>;
const mockedIsCurrentAuthCapture = isCurrentAuthCapture as jest.MockedFunction<typeof isCurrentAuthCapture>;
const mockedSubscribeAuthTransition = subscribeAuthTransition as jest.MockedFunction<typeof subscribeAuthTransition>;
let mockAuthUid: number | null = null;
let mockAuthToken: string | null = null;
let mockAuthRevision = 0;

jest.mock('./CartApi', () => ({
  addServerCartItem: jest.fn(),
  getServerCartWithCapture: jest.fn(),
  mergeGuestCart: jest.fn(),
  removeServerCartItem: jest.fn(),
  updateServerCartItem: jest.fn(),
}));

const mockedAddServerCartItem = addServerCartItem as jest.MockedFunction<typeof addServerCartItem>;
const mockedGetServerCart = getServerCartWithCapture as jest.MockedFunction<typeof getServerCartWithCapture>;
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
  const uid = Number(subject.replace(/^customer-/, '').replace(/^account-/, ''));
  mockAuthUid = Number.isInteger(uid) && uid > 0 ? uid : subject === 'customer-a' ? 1 : subject === 'customer-b' ? 2 : null;
  mockAuthToken = `token-${signature}`;
  mockAuthRevision += 1;
}

function clearAuth(): void {
  mockAuthUid = null;
  mockAuthToken = null;
  mockAuthRevision += 1;
}

describe('CartSession', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockAuthUid = null;
    mockAuthToken = null;
    mockAuthRevision = 0;
    mockedGetAuthSnapshot.mockImplementation(() => ({
      status: mockAuthUid === null ? 'guest' : 'authenticated',
      uid: mockAuthUid,
      username: null,
      roles: [],
      capabilities: [],
    }));
    mockedCaptureAuthenticatedRequest.mockImplementation(() => mockAuthToken === null
      ? null
      : { accessToken: mockAuthToken, revision: mockAuthRevision });
    mockedIsCurrentAuthCapture.mockImplementation(capture => Boolean(
      capture && capture.accessToken === mockAuthToken && capture.revision === mockAuthRevision,
    ));
    mockedGetServerCart.mockImplementation(async () => ({
      summary: serverCartA,
      capture: { accessToken: mockAuthToken ?? 'test-token', revision: mockAuthRevision },
    }));
    mockedAddServerCartItem.mockResolvedValue(serverCartA);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('preserves owned cart and idempotency intents while auth is retryable unknown', () => {
    mockAuthUid = 1;
    mockAuthToken = 'token-a';
    mockAuthRevision = 1;
    localStorage.setItem(CART_CACHE_OWNER_KEY, 'account:1');
    localStorage.setItem(CART_MERGE_INTENT_KEY, JSON.stringify({
      owner: 'account:1', key: 'merge-key', items: [{ maSach: 1, soLuong: 2 }],
    }));
    localStorage.setItem('nextPay', 'true');
    const checkoutIntent =
      ensureIntent('checkout-fingerprint');
    addOrUpdateItem(guestItem);
    mockedGetAuthSnapshot.mockReturnValue({
      status: 'unknown', uid: null, username: null, roles: [], capabilities: [],
    });

    expect(readCartForCurrentSession()).toEqual([]);
    expect(localStorage.getItem(CART_CACHE_OWNER_KEY)).toBe('account:1');
    expect(readPendingCartMerge()?.key).toBe('merge-key');
    expect(localStorage.getItem('nextPay')).toBe('true');
    expect(readIntent()).toEqual(checkoutIntent);
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

  it('creates one stable merge intent when the login lock claims a guest cart', async () => {
    addOrUpdateItem(guestItem);

    claimGuestCartForAccount(1, [guestItem]);
    const firstIntent = readPendingCartMerge();
    claimGuestCartForAccount(1, [guestItem]);

    expect(localStorage.getItem(CART_CACHE_OWNER_KEY)).toBe('account:1');
    expect(firstIntent).toEqual(expect.objectContaining({
      owner: 'account:1',
      items: [{ maSach: 1, soLuong: 2 }],
    }));
    expect(readPendingCartMerge()).toEqual(firstIntent);
  });

  it('persists the guest recovery intent before publishing its account owner', () => {
    addOrUpdateItem(guestItem);
    const originalSetItem = Storage.prototype.setItem;
    const writes: string[] = [];
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      writes.push(key);
      return originalSetItem.call(this, key, value);
    });

    try {
      claimGuestCartForAccount(1, [guestItem]);
    } finally {
      setItem.mockRestore();
    }

    expect(writes.indexOf(CART_MERGE_INTENT_KEY)).toBeGreaterThanOrEqual(0);
    expect(writes.indexOf(CART_MERGE_INTENT_KEY))
      .toBeLessThan(writes.indexOf(CART_CACHE_OWNER_KEY));
  });

  it('keeps the guest cart recoverable when pending-intent storage fails', () => {
    addOrUpdateItem(guestItem);
    const originalSetItem = Storage.prototype.setItem;
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === CART_MERGE_INTENT_KEY) {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    });

    try {
      expect(() => claimGuestCartForAccount(1, [guestItem])).toThrow('quota exceeded');
    } finally {
      setItem.mockRestore();
    }

    expect(localStorage.getItem(CART_CACHE_OWNER_KEY)).toBeNull();
    expect(readCart()).toEqual([guestItem]);
  });

  it('ignores a stale second-tab guest snapshot after the account owner was claimed', async () => {
    setJwt('customer-a');
    localStorage.setItem(CART_CACHE_OWNER_KEY, 'account:1');

    await mergeGuestCartAfterLogin([guestItem]);

    expect(mockedMergeGuestCart).not.toHaveBeenCalled();
    expect(readPendingCartMerge()).toBeNull();
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
    mockedGetServerCart.mockImplementation(async () => ({
      summary: serverCartA,
      capture: { accessToken: mockAuthToken ?? 'test-token', revision: mockAuthRevision },
    }));

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

  it('arms preservation only when the current account has a canonical pending merge', async () => {
    setJwt('customer-a');
    localStorage.setItem(CART_MERGE_INTENT_KEY, JSON.stringify({
      owner: 'account:1',
      key: 'retry-key',
      items: [{ maSach: 1, soLuong: 2 }],
    }));

    preserveFailedLoginHandoffForLogout();

    expect(readPendingCartMerge()).toEqual({
      owner: 'account:1',
      key: 'retry-key',
      items: [{ maSach: 1, soLuong: 2 }],
    });
    signOutCartSession();
  });

  it('does not expose account A cache or checkout intent after switching to account B', async () => {
    setJwt('customer-a');
    await loadCart();
    ensureIntent('account-a-checkout');
    expect(readCartForCurrentSession()).toEqual(serverCartA.items);

    setJwt('customer-b');
    mockedGetServerCart.mockImplementation(async () => ({
      summary: serverCartB,
      capture: { accessToken: mockAuthToken ?? 'test-token', revision: mockAuthRevision },
    }));

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
      resolveAccountA = summary => resolve({
        summary,
        capture: { accessToken: 'token-signature', revision: mockAuthRevision },
      });
    }));
    const accountALoad = loadCart();

    setJwt('customer-b');
    mockedGetServerCart.mockImplementationOnce(async () => ({ summary: serverCartB, capture: { accessToken: mockAuthToken ?? 'test-token', revision: mockAuthRevision } }));
    await expect(loadCart()).resolves.toEqual(serverCartB.items);
    resolveAccountA(serverCartA);

    await expect(accountALoad).resolves.toEqual(serverCartB.items);
    expect(readCartForCurrentSession()).toEqual(serverCartB.items);
  });

  it('ignores a stale response after the JWT rotates for the same account', async () => {
    setJwt('customer-a');
    await loadCart();
    let resolveOldToken!: (value: typeof serverCartA) => void;
    const oldCapture = { accessToken: mockAuthToken!, revision: mockAuthRevision };
    mockedGetServerCart.mockReturnValueOnce(new Promise(resolve => {
      resolveOldToken = summary => resolve({ summary, capture: oldCapture });
    }));
    const oldLoad = loadCart();

    setJwt('customer-a', 'rotated-signature');
    mockedGetServerCart.mockImplementationOnce(async () => ({ summary: serverCartB, capture: { accessToken: mockAuthToken ?? 'test-token', revision: mockAuthRevision } }));
    await expect(loadCart()).resolves.toEqual(serverCartB.items);
    resolveOldToken(serverCartA);

    await expect(oldLoad).resolves.toEqual(serverCartB.items);
    expect(readCartForCurrentSession()).toEqual(serverCartB.items);
  });

  it('does not let an older cart load overwrite a completed mutation', async () => {
    setJwt('customer-a');
    await loadCart();
    const loadCapture = { accessToken: mockAuthToken!, revision: mockAuthRevision };
    let resolveLoad!: (value: {
      summary: typeof serverCartA;
      capture: typeof loadCapture;
    }) => void;
    mockedGetServerCart.mockReturnValueOnce(new Promise(resolve => {
      resolveLoad = resolve;
    }));

    const staleLoad = loadCart();
    mockedUpdateServerCartItem.mockResolvedValueOnce(serverCartB);
    await expect(setCartItemQuantity(2, 2)).resolves.toEqual(serverCartB.items);
    resolveLoad({ summary: serverCartA, capture: loadCapture });

    await expect(staleLoad).resolves.toEqual(serverCartB.items);
    expect(readCart()).toEqual(serverCartB.items);
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
    const refreshCapture = { accessToken: mockAuthToken!, revision: mockAuthRevision };
    mockedGetServerCart.mockReturnValueOnce(new Promise(resolve => {
      resolveRefresh = summary => resolve({ summary, capture: refreshCapture });
    }));

    const refresh = refreshCartAfterCheckout();
    mockedAddServerCartItem.mockResolvedValue(serverCartB);
    await addCartItem(guestItem);
    resolveRefresh(serverCartA);

    await expect(refresh).resolves.toEqual(serverCartB.items);
    expect(readCart()).toEqual(serverCartB.items);
  });

  it('does not clear private state for an authenticated-to-unknown transition', async () => {
    setJwt('customer-a');
    await loadCart();
    localStorage.setItem(CART_MERGE_INTENT_KEY, JSON.stringify({
      owner: 'account:1', key: 'retry-key', items: [{ maSach: 1, soLuong: 2 }],
    }));
    localStorage.setItem('nextPay', 'true');
    const checkoutIntent =
      ensureIntent('checkout-fingerprint');

    mockAuthTransitionListener?.(
      { status: 'authenticated', uid: 1, username: 'customer-a', roles: [], capabilities: [] },
      { status: 'unknown', uid: null, username: null, roles: [], capabilities: [] },
    );

    expect(localStorage.getItem(CART_CACHE_OWNER_KEY)).toBe('account:1');
    expect(readPendingCartMerge()?.key).toBe('retry-key');
    expect(localStorage.getItem('nextPay')).toBe('true');
    expect(readIntent()).toEqual(checkoutIntent);
  });

  it('clears retained account state before publishing guest after a retryable unknown state', async () => {
    setJwt('customer-a');
    await loadCart();
    localStorage.setItem(CART_MERGE_INTENT_KEY, JSON.stringify({
      owner: 'account:1', key: 'retry-key', items: [{ maSach: 1, soLuong: 2 }],
    }));
    localStorage.setItem('nextPay', 'true');
    ensureIntent('checkout-fingerprint');

    mockAuthTransitionListener?.(
      { status: 'authenticated', uid: 1, username: 'customer-a', roles: [], capabilities: [] },
      { status: 'unknown', uid: null, username: null, roles: [], capabilities: [] },
    );
    mockAuthTransitionListener?.(
      { status: 'unknown', uid: null, username: null, roles: [], capabilities: [] },
      { status: 'guest', uid: null, username: null, roles: [], capabilities: [] },
    );

    expect(localStorage.getItem(CART_CACHE_OWNER_KEY)).toBeNull();
    expect(readPendingCartMerge()).toBeNull();
    expect(localStorage.getItem('nextPay')).toBeNull();
    expect(readIntent()).toBeNull();
    expect(readCart()).toEqual([]);
  });

  it('preserves a failed post-login merge exactly once during its following logout transition', async () => {
    setJwt('customer-a');
    await loadCart();
    localStorage.setItem(CART_MERGE_INTENT_KEY, JSON.stringify({
      owner: 'account:1',
      key: 'retry-key',
      items: [{ maSach: 1, soLuong: 2 }],
    }));
    localStorage.setItem('nextPay', 'true');
    preserveFailedLoginHandoffForLogout();

    mockAuthTransitionListener?.(
      { status: 'authenticated', uid: 1, username: 'customer-a', roles: [], capabilities: [] },
      { status: 'guest', uid: null, username: null, roles: [], capabilities: [] },
    );

    expect(readPendingCartMerge()).toEqual({
      owner: 'account:1',
      key: 'retry-key',
      items: [{ maSach: 1, soLuong: 2 }],
    });
    expect(localStorage.getItem('nextPay')).toBe('true');
    expect(readCart()).toEqual([]);

    mockAuthTransitionListener?.(
      { status: 'authenticated', uid: 1, username: 'customer-a', roles: [], capabilities: [] },
      { status: 'guest', uid: null, username: null, roles: [], capabilities: [] },
    );
    expect(readPendingCartMerge()).toBeNull();
    expect(localStorage.getItem('nextPay')).toBeNull();
  });

  it('clears only authenticated cache on logout and never deletes the server cart', async () => {
    setJwt('customer-a');
    await loadCart();

    signOutCartSession();

    expect(readCart()).toEqual([]);
    expect(mockedGetServerCart).toHaveBeenCalledTimes(1);
  });

  it('preserves a true guest cart when signing out an invalid session', () => {
    addOrUpdateItem(guestItem);

    signOutCartSession();

    expect(readCart()).toEqual([guestItem]);
  });

  it('uses only a positive numeric AuthSession uid for the account cache owner', async () => {
    mockAuthUid = 42;
    mockAuthToken = 'opaque-token';
    mockAuthRevision = 1;

    await loadCart();

    expect(localStorage.getItem(CART_CACHE_OWNER_KEY)).toBe('account:42');
  });

  it('clears a legacy username, token, or malformed owner rather than mapping it to an authenticated uid', () => {
    localStorage.setItem(CART_CACHE_OWNER_KEY, 'account:customer-a');
    localStorage.setItem(CART_MERGE_INTENT_KEY, JSON.stringify({
      owner: 'token:abc',
      key: 'merge-key',
      items: [{ maSach: 1, soLuong: 1 }],
    }));
    addOrUpdateItem(guestItem);

    expect(readCartForCurrentSession()).toEqual([]);
    expect(localStorage.getItem(CART_CACHE_OWNER_KEY)).toBeNull();
    expect(readPendingCartMerge()).toBeNull();
    expect(readCart()).toEqual([]);
  });

  it('does not clear or remerge an account cache when the same uid token rotates', async () => {
    mockAuthUid = 42;
    mockAuthToken = 'old-token';
    mockAuthRevision = 1;
    await loadCart();
    mockedGetServerCart.mockClear();

    mockAuthToken = 'new-token';
    mockAuthRevision = 2;

    expect(readCartForCurrentSession()).toEqual(serverCartA.items);
    expect(mockedGetServerCart).not.toHaveBeenCalled();
  });
});
