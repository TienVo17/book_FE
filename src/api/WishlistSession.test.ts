import {
  getDanhSachYeuThich,
  themYeuThich,
  xoaYeuThich,
  type YeuThichItem,
} from './YeuThichApi';
import {
  clearWishlistSession,
  getWishlistSnapshot,
  setBookWishlisted,
  syncWishlistSession,
} from './WishlistSession';
import {
  captureAuthenticatedRequest,
  getAuthSnapshot,
  isCurrentAuthCapture,
  subscribeAuthTransition,
} from './AuthSession';

var mockAuthTransitionListener: Parameters<typeof subscribeAuthTransition>[0] | null;

jest.mock('./AuthSession', () => ({
  captureAuthenticatedRequest: jest.fn(),
  getAuthSnapshot: jest.fn(),
  isCurrentAuthCapture: jest.fn(),
  subscribeAuthTransition: jest.fn((listener) => {
    mockAuthTransitionListener = listener;
    return () => { mockAuthTransitionListener = null; };
  }),
}));

jest.mock('./YeuThichApi', () => ({
  getDanhSachYeuThich: jest.fn(),
  themYeuThich: jest.fn(),
  xoaYeuThich: jest.fn(),
}));

const mockedGetWishlist = getDanhSachYeuThich as jest.MockedFunction<typeof getDanhSachYeuThich>;
const mockedAddWishlist = themYeuThich as jest.MockedFunction<typeof themYeuThich>;
const mockedRemoveWishlist = xoaYeuThich as jest.MockedFunction<typeof xoaYeuThich>;
const mockedCaptureAuthenticatedRequest = captureAuthenticatedRequest as jest.MockedFunction<typeof captureAuthenticatedRequest>;
const mockedGetAuthSnapshot = getAuthSnapshot as jest.MockedFunction<typeof getAuthSnapshot>;
const mockedIsCurrentAuthCapture = isCurrentAuthCapture as jest.MockedFunction<typeof isCurrentAuthCapture>;
const mockedSubscribeAuthTransition = subscribeAuthTransition as jest.MockedFunction<typeof subscribeAuthTransition>;
let mockAuthUid: number | null = null;
let mockAuthToken: string | null = null;
let mockAuthRevision = 0;

const bookA: YeuThichItem = {
  maSach: 1,
  tenSach: 'Sách A',
  giaBan: 100000,
  hinhAnh: '',
};
const bookB: YeuThichItem = {
  maSach: 2,
  tenSach: 'Sách B',
  giaBan: 200000,
  hinhAnh: '',
};
const bookC: YeuThichItem = {
  maSach: 3,
  tenSach: 'Sách C',
  giaBan: 300000,
  hinhAnh: '',
};

function setJwt(signature: string): void {
  mockAuthUid = signature === 'a' ? 1 : signature === 'b' ? 2 : 1;
  mockAuthToken = `token-${signature}`;
  mockAuthRevision += 1;
}

describe('WishlistSession', () => {
  beforeEach(() => {
    localStorage.clear();
    clearWishlistSession();
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
    mockedGetWishlist.mockResolvedValue([]);
  });

  afterEach(() => {
    localStorage.clear();
    clearWishlistSession();
  });

  it('does not call the private wishlist API for a guest session', async () => {
    await expect(syncWishlistSession()).resolves.toEqual([]);

    expect(mockedGetWishlist).not.toHaveBeenCalled();
    expect(getWishlistSnapshot().status).toBe('guest');
  });

  it('clears retained account items after authenticated to unknown to guest', async () => {
    const transition = mockAuthTransitionListener;
    if (!transition) {
      throw new Error('Auth transition listener was not registered');
    }
    setJwt('a');
    mockedGetWishlist.mockResolvedValueOnce([bookA]);
    await syncWishlistSession();
    expect(getWishlistSnapshot().items).toEqual([bookA]);

    mockAuthUid = null;
    mockAuthToken = null;
    mockAuthRevision += 1;
    transition(
      { status: 'authenticated', uid: 1, username: 'reader', roles: [], capabilities: [] },
      { status: 'unknown', uid: null, username: null, roles: [], capabilities: [] },
    );
    expect(getWishlistSnapshot().items).toEqual([bookA]);

    transition(
      { status: 'unknown', uid: null, username: null, roles: [], capabilities: [] },
      { status: 'guest', uid: null, username: null, roles: [], capabilities: [] },
    );
    expect(getWishlistSnapshot()).toMatchObject({ status: 'guest', items: [] });
  });

  it('coalesces hydrate calls and publishes one authoritative snapshot', async () => {
    setJwt('a');
    let resolveLoad!: (items: YeuThichItem[]) => void;
    mockedGetWishlist.mockReturnValue(new Promise(resolve => { resolveLoad = resolve; }));

    const first = syncWishlistSession();
    const second = syncWishlistSession();
    expect(mockedGetWishlist).toHaveBeenCalledTimes(1);

    resolveLoad([bookA]);
    await expect(Promise.all([first, second])).resolves.toEqual([[bookA], [bookA]]);
    expect(getWishlistSnapshot().items).toEqual([bookA]);
    expect(getWishlistSnapshot().status).toBe('ready');
  });

  it('rejects a late token A response after exact JWT rotation', async () => {
    setJwt('a');
    let resolveA!: (items: YeuThichItem[]) => void;
    mockedGetWishlist.mockReturnValueOnce(new Promise(resolve => { resolveA = resolve; }));
    const loadA = syncWishlistSession();

    setJwt('b');
    mockedGetWishlist.mockResolvedValueOnce([bookB]);
    await expect(syncWishlistSession()).resolves.toEqual([bookB]);
    resolveA([bookA]);
    await expect(loadA).resolves.toEqual([]);

    expect(getWishlistSnapshot().items).toEqual([bookB]);
  });

  it('does not let an older hydrate overwrite a mutation snapshot', async () => {
    setJwt('a');
    let resolveLoad!: (items: YeuThichItem[]) => void;
    mockedGetWishlist.mockReturnValueOnce(new Promise(resolve => { resolveLoad = resolve; }));
    mockedAddWishlist.mockResolvedValueOnce([bookA]);

    const load = syncWishlistSession();
    const add = setBookWishlisted(1, true);
    await add;
    expect(getWishlistSnapshot().items).toEqual([bookA]);

    resolveLoad([]);
    await load;

    expect(getWishlistSnapshot().items).toEqual([bookA]);
    expect(getWishlistSnapshot().status).toBe('ready');
  });

  it('serializes same-book desired states without optimistic publication', async () => {
    setJwt('a');
    await syncWishlistSession();
    let resolveAdd!: (items: YeuThichItem[]) => void;
    mockedAddWishlist.mockReturnValue(new Promise(resolve => { resolveAdd = resolve; }));
    mockedRemoveWishlist.mockResolvedValue([]);

    const add = setBookWishlisted(1, true);
    const remove = setBookWishlisted(1, false);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockedAddWishlist).toHaveBeenCalledTimes(1);
    expect(mockedRemoveWishlist).not.toHaveBeenCalled();
    expect(getWishlistSnapshot().items).toEqual([]);
    expect(getWishlistSnapshot().pendingBookIds.includes(1)).toBe(true);

    resolveAdd([bookA]);
    await add;
    await remove;

    expect(mockedRemoveWishlist).toHaveBeenCalledWith(1);
    expect(getWishlistSnapshot().items).toEqual([]);
    expect(getWishlistSnapshot().pendingBookIds.includes(1)).toBe(false);
  });

  it('uses the latest same-uid capture when a queued desired state begins', async () => {
    setJwt('a');
    await syncWishlistSession();
    let resolveAdd!: (items: YeuThichItem[]) => void;
    mockedAddWishlist.mockReturnValue(new Promise(resolve => { resolveAdd = resolve; }));
    mockedRemoveWishlist.mockImplementation(async () => {
      const capture = captureAuthenticatedRequest();
      expect(capture?.accessToken).toBe('token-a-rotated');
      expect(capture?.revision).toBe(mockAuthRevision);
      return [];
    });

    const add = setBookWishlisted(1, true);
    await new Promise(resolve => setTimeout(resolve, 0));
    const remove = setBookWishlisted(1, false);

    resolveAdd([bookA]);
    void Promise.resolve().then(() => {
      mockAuthToken = 'token-a-rotated';
      mockAuthRevision += 1;
    });

    await expect(remove).resolves.toEqual([]);
    await expect(add).resolves.toEqual([bookA]);
    expect(mockedRemoveWishlist).toHaveBeenCalledWith(1);
  });

  it('settles each same-book caller without waiting for a later queued operation', async () => {
    setJwt('a');
    await syncWishlistSession();
    let resolveAdd!: (items: YeuThichItem[]) => void;
    let resolveRemove!: (items: YeuThichItem[]) => void;
    mockedAddWishlist.mockReturnValue(new Promise(resolve => { resolveAdd = resolve; }));
    mockedRemoveWishlist.mockReturnValue(new Promise(resolve => { resolveRemove = resolve; }));

    let addSettled = false;
    const add = setBookWishlisted(1, true).then(items => {
      addSettled = true;
      return items;
    });
    const remove = setBookWishlisted(1, false);
    await new Promise(resolve => setTimeout(resolve, 0));

    resolveAdd([bookA]);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockedRemoveWishlist).toHaveBeenCalledWith(1);
    expect(addSettled).toBe(true);

    resolveRemove([]);
    await expect(Promise.all([add, remove])).resolves.toEqual([[bookA], []]);
  });

  it('does not start queued work after switching to another account', async () => {
    setJwt('a');
    await syncWishlistSession();
    let resolveAdd!: (items: YeuThichItem[]) => void;
    mockedAddWishlist.mockReturnValue(new Promise(resolve => { resolveAdd = resolve; }));

    const add = setBookWishlisted(1, true);
    const remove = setBookWishlisted(1, false);
    await new Promise(resolve => setTimeout(resolve, 0));

    setJwt('b');
    resolveAdd([bookA]);

    await expect(Promise.all([add, remove])).resolves.toEqual([[], []]);
    expect(mockedRemoveWishlist).not.toHaveBeenCalled();
  });

  it('does not block a different book mutation behind an in-flight item', async () => {
    setJwt('a');
    await syncWishlistSession();
    let resolveBookA!: (items: YeuThichItem[]) => void;
    mockedAddWishlist
      .mockReturnValueOnce(new Promise(resolve => { resolveBookA = resolve; }))
      .mockResolvedValueOnce([bookB]);
    mockedGetWishlist.mockResolvedValue([bookA, bookB]);

    const addA = setBookWishlisted(1, true);
    const addB = setBookWishlisted(2, true);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockedAddWishlist).toHaveBeenCalledTimes(2);
    expect(getWishlistSnapshot().pendingBookIds.includes(1)).toBe(true);
    await addB;
    expect(getWishlistSnapshot().items).toEqual([]);
    expect(getWishlistSnapshot().pendingBookIds).toEqual([1]);

    resolveBookA([bookA, bookB]);
    await addA;
    expect(getWishlistSnapshot().items).toEqual([bookA, bookB]);
  });

  it('reconciles a late stale response after another book finishes', async () => {
    setJwt('a');
    await syncWishlistSession();
    let resolveBookA!: (items: YeuThichItem[]) => void;
    mockedAddWishlist
      .mockReturnValueOnce(new Promise(resolve => { resolveBookA = resolve; }))
      .mockResolvedValueOnce([bookA, bookB]);
    mockedGetWishlist.mockResolvedValue([bookA, bookB]);

    const addA = setBookWishlisted(1, true);
    const addB = setBookWishlisted(2, true);
    await new Promise(resolve => setTimeout(resolve, 0));

    await addB;
    expect(getWishlistSnapshot().items).toEqual([]);

    resolveBookA([bookA]);
    await addA;

    expect(mockedGetWishlist).toHaveBeenCalledTimes(2);
    expect(getWishlistSnapshot().items).toEqual([bookA, bookB]);
  });

  it('reconciles again when another mutation finishes during reconciliation', async () => {
    setJwt('a');
    await syncWishlistSession();
    let resolveBookA!: (items: YeuThichItem[]) => void;
    let resolveFirstReconciliation!: (items: YeuThichItem[]) => void;
    mockedAddWishlist
      .mockReturnValueOnce(new Promise(resolve => { resolveBookA = resolve; }))
      .mockResolvedValueOnce([bookA, bookB])
      .mockResolvedValueOnce([bookA, bookB, bookC]);
    mockedGetWishlist
      .mockReturnValueOnce(new Promise(resolve => {
        resolveFirstReconciliation = resolve;
      }))
      .mockResolvedValueOnce([bookA, bookB, bookC]);

    const addA = setBookWishlisted(1, true);
    const addB = setBookWishlisted(2, true);
    await new Promise(resolve => setTimeout(resolve, 0));
    await addB;
    resolveBookA([bookA]);
    await new Promise(resolve => setTimeout(resolve, 0));

    const addC = setBookWishlisted(3, true);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockedAddWishlist).toHaveBeenCalledTimes(3);
    expect(getWishlistSnapshot().pendingBookIds).toEqual([]);

    resolveFirstReconciliation([bookA, bookB]);
    await expect(Promise.all([addA, addC])).resolves.toEqual([
      [bookA, bookB, bookC],
      [bookA, bookB, bookC],
    ]);
    expect(mockedGetWishlist).toHaveBeenCalledTimes(3);
    expect(getWishlistSnapshot().items).toEqual([bookA, bookB, bookC]);
    expect(getWishlistSnapshot().status).toBe('ready');
    expect(getWishlistSnapshot().pendingBookIds).toEqual([]);
  });

  it('does not reject successful mutations when overlap reconciliation fails', async () => {
    setJwt('a');
    await syncWishlistSession();
    let resolveBookA!: (items: YeuThichItem[]) => void;
    mockedAddWishlist
      .mockReturnValueOnce(new Promise(resolve => { resolveBookA = resolve; }))
      .mockResolvedValueOnce([bookA, bookB]);
    mockedGetWishlist.mockRejectedValueOnce(new Error('Không thể làm mới'));

    const addA = setBookWishlisted(1, true);
    const addB = setBookWishlisted(2, true);
    await new Promise(resolve => setTimeout(resolve, 0));
    await addB;
    resolveBookA([bookA]);

    await expect(addA).resolves.toEqual([]);
    expect(getWishlistSnapshot().status).toBe('error');
    expect(getWishlistSnapshot().error).toBe('Không thể làm mới');
    expect(getWishlistSnapshot().items).toEqual([]);
    expect(getWishlistSnapshot().pendingBookIds).toEqual([]);
  });

  it('starts a fresh mutation round after failed overlap reconciliation', async () => {
    setJwt('a');
    await syncWishlistSession();
    let resolveBookA!: (items: YeuThichItem[]) => void;
    mockedAddWishlist
      .mockReturnValueOnce(new Promise(resolve => { resolveBookA = resolve; }))
      .mockResolvedValueOnce([bookA, bookB]);
    mockedGetWishlist.mockRejectedValueOnce(new Error('Không thể làm mới'));

    const addA = setBookWishlisted(1, true);
    const addB = setBookWishlisted(2, true);
    await new Promise(resolve => setTimeout(resolve, 0));
    await addB;
    resolveBookA([bookA]);
    await addA;

    mockedAddWishlist.mockResolvedValueOnce([bookA]);
    await expect(setBookWishlisted(1, true)).resolves.toEqual([bookA]);
    expect(getWishlistSnapshot().items).toEqual([bookA]);
    expect(getWishlistSnapshot().status).toBe('ready');
    expect(mockedGetWishlist).toHaveBeenCalledTimes(2);
  });

  it('releases pending bookkeeping when a mutation 401 rotates the same uid capture', async () => {
    setJwt('a');
    await syncWishlistSession();
    mockedAddWishlist.mockImplementationOnce(async () => {
      mockAuthToken = 'token-a-rotated';
      mockAuthRevision += 1;
      throw new Error('Phiên truy cập đã hết hạn');
    });
    mockedGetWishlist.mockResolvedValueOnce([bookA]);

    await expect(setBookWishlisted(1, true)).rejects.toThrow('Phiên truy cập đã hết hạn');
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(getWishlistSnapshot().pendingBookIds).toEqual([]);
    expect(mockedGetWishlist).toHaveBeenCalledTimes(2);
  });

  it('keeps same-uid items during token rotation while rejecting an old capture response', async () => {
    setJwt('a');
    mockedGetWishlist.mockResolvedValueOnce([bookA]);
    await syncWishlistSession();
    let resolveOld!: (items: YeuThichItem[]) => void;
    mockedGetWishlist.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
    const oldLoad = syncWishlistSession();

    mockAuthToken = 'token-a-rotated';
    mockAuthRevision += 1;
    mockedGetWishlist.mockResolvedValueOnce([bookB]);
    await expect(syncWishlistSession()).resolves.toEqual([bookB]);
    resolveOld([bookA]);
    await expect(oldLoad).resolves.toEqual([]);

    expect(getWishlistSnapshot().items).toEqual([bookB]);
  });

  it('keeps the last safe snapshot on failure and supports retry', async () => {
    setJwt('a');
    mockedGetWishlist.mockResolvedValueOnce([bookA]);
    await syncWishlistSession();
    mockedGetWishlist.mockRejectedValueOnce(new Error('Mạng không ổn định'));

    await expect(syncWishlistSession()).rejects.toThrow('Mạng không ổn định');
    expect(getWishlistSnapshot().items).toEqual([bookA]);
    expect(getWishlistSnapshot().status).toBe('error');

    mockedGetWishlist.mockResolvedValueOnce([bookA, bookB]);
    await expect(syncWishlistSession()).resolves.toEqual([bookA, bookB]);
    expect(getWishlistSnapshot().status).toBe('ready');
  });
});
