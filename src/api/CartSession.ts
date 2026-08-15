import {
  addServerCartItem,
  CartMergeItem,
  getServerCartWithCapture,
  mergeGuestCart,
  removeServerCartItem,
  ServerCartMergeResponse,
  ServerCartSummary,
  updateServerCartItem,
} from './CartApi';
import {
  AddOrUpdateOutcome,
  CartItem,
  MAX_CART_LINES,
  addOrUpdateItem,
  getCartFingerprint,
  readCart,
  removeItem,
  updateQuantity,
  writeCart,
} from './CartStorage';
import { generateIdempotencyKey, clearIntent } from './CheckoutIntent';
import {
  captureAuthenticatedRequest,
  getAuthSnapshot,
  isCurrentAuthCapture,
  subscribeAuthTransition,
  type AuthenticatedRequestCapture,
} from './AuthSession';
import {
  CART_MERGE_INTENT_KEY,
  clearAuthenticatedPrivateState,
  getCartCacheOwner,
  setCartCacheOwner,
} from './SessionCleanup';

interface PendingCartMerge {
  owner: string;
  key: string;
  items: CartMergeItem[];
}

interface AuthenticatedSession {
  owner: string;
  capture: AuthenticatedRequestCapture;
}

let localMutationRevision = 0;
let authenticatedMutationQueue: Promise<void> = Promise.resolve();
const mergeFlights = new Map<string, Promise<ServerCartMergeResponse | null>>();
let failedLoginHandoffOwner: string | null = null;
let retainedUnknownOwner: string | null = null;

function canonicalOwner(uid: number | null): string | null {
  return typeof uid === 'number' && Number.isInteger(uid) && uid > 0
    ? `account:${uid}`
    : null;
}

function getAuthenticatedSession(): AuthenticatedSession | null {
  const snapshot = getAuthSnapshot();
  if (snapshot.status !== 'authenticated') return null;
  const owner = canonicalOwner(snapshot.uid);
  const capture = captureAuthenticatedRequest();
  return owner && capture ? { owner, capture } : null;
}

function isCurrentSession(session: AuthenticatedSession): boolean {
  const snapshot = getAuthSnapshot();
  return snapshot.status === 'authenticated' &&
    canonicalOwner(snapshot.uid) === session.owner &&
    isCurrentAuthCapture(session.capture);
}

function isCanonicalOwner(value: unknown): value is string {
  return typeof value === 'string' && /^account:[1-9]\d*$/.test(value);
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<CartItem>;
  return Number.isInteger(item.maSach) && typeof item.maSach === 'number' && item.maSach > 0 &&
    Number.isInteger(item.soLuong) && typeof item.soLuong === 'number' && item.soLuong > 0;
}

function isMergeItem(value: unknown): value is CartMergeItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<CartMergeItem>;
  return Number.isInteger(item.maSach) && typeof item.maSach === 'number' && item.maSach > 0 &&
    Number.isInteger(item.soLuong) && typeof item.soLuong === 'number' && item.soLuong > 0;
}

function normalizeStoredOwner(): string | null {
  const owner = getCartCacheOwner();
  if (owner !== null && !isCanonicalOwner(owner)) {
    clearAuthenticatedPrivateState();
    return null;
  }
  return owner;
}

export function readPendingCartMerge(): PendingCartMerge | null {
  const raw = localStorage.getItem(CART_MERGE_INTENT_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingCartMerge>;
    if (
      !isCanonicalOwner(value.owner) ||
      typeof value.key !== 'string' || !value.key ||
      !Array.isArray(value.items) ||
      !value.items.every(isMergeItem)
    ) {
      throw new Error('invalid pending merge');
    }
    return value as PendingCartMerge;
  } catch {
    localStorage.removeItem(CART_MERGE_INTENT_KEY);
    return null;
  }
}

function persistPendingCartMerge(intent: PendingCartMerge): void {
  localStorage.setItem(CART_MERGE_INTENT_KEY, JSON.stringify(intent));
}

/**
 * Arms one logout transition to retain a valid merge retry and checkout handoff
 * after a post-login merge failure. It applies only to the failed owner and is
 * consumed by that transition; normal logout and account switching still clear
 * every private value.
 */
export function preserveFailedLoginHandoffForLogout(): void {
  const session = getAuthenticatedSession();
  const pending = readPendingCartMerge();
  if (!session || !pending || pending.owner !== session.owner) {
    failedLoginHandoffOwner = null;
    return;
  }
  failedLoginHandoffOwner = session.owner;
}

function cacheServerSummary(session: AuthenticatedSession, summary: ServerCartSummary): CartItem[] {
  if (!isCurrentSession(session) || normalizeStoredOwner() !== session.owner) {
    return readCartForCurrentSession();
  }
  return writeCart(summary.items);
}

async function fetchAndCacheServerCart(owner: string): Promise<CartItem[]> {
  const mutationRevisionAtStart = localMutationRevision;
  const result = await getServerCartWithCapture();
  if (mutationRevisionAtStart !== localMutationRevision) {
    return readCartForCurrentSession();
  }
  return cacheServerSummary({ owner, capture: result.capture }, result.summary);
}

function transitionToOwner(owner: string, preserveGuestSnapshot: boolean): void {
  const previousOwner = normalizeStoredOwner();
  if (previousOwner === owner) return;

  if (previousOwner || !preserveGuestSnapshot) {
    clearAuthenticatedPrivateState();
  } else {
    localStorage.removeItem(CART_MERGE_INTENT_KEY);
    clearIntent();
  }
  setCartCacheOwner(owner);
}

function cartItemsToMerge(items: CartItem[]): CartMergeItem[] {
  const mergeItems = items.filter(isCartItem).map(item => ({ maSach: item.maSach, soLuong: item.soLuong }));
  if (mergeItems.length > MAX_CART_LINES) {
    throw new Error(`Giỏ hàng khách chỉ hỗ trợ tối đa ${MAX_CART_LINES} loại sách. Vui lòng xóa bớt sản phẩm trước khi đăng nhập.`);
  }
  return mergeItems;
}

function mergeFlightKey(session: AuthenticatedSession, items: CartMergeItem[]): string {
  const canonical = [...items].sort((left, right) => left.maSach - right.maSach);
  return `${session.owner}:${session.capture.revision}:${session.capture.accessToken}:${JSON.stringify(canonical)}`;
}

async function queueAuthenticatedMutation<T>(operation: () => Promise<T>): Promise<T> {
  const previous = authenticatedMutationQueue;
  let release!: () => void;
  authenticatedMutationQueue = new Promise<void>(resolve => { release = resolve; });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}

export async function waitForCartMutations(): Promise<void> {
  await authenticatedMutationQueue;
}

export function readGuestCartSnapshot(): CartItem[] {
  return normalizeStoredOwner() ? [] : readCart();
}

/**
 * Runs inside AuthSession's login lock before the authenticated snapshot is
 * published, so exactly one tab converts the shared guest cart into a stable
 * account-scoped merge intent.
 */
export function claimGuestCartForAccount(
  uid: number,
  guestSnapshot: CartItem[],
): void {
  const owner = canonicalOwner(uid);
  if (!owner) {
    throw new Error('Tài khoản đăng nhập không có mã định danh hợp lệ.');
  }
  const previousOwner = normalizeStoredOwner();
  const existing = readPendingCartMerge();
  if (previousOwner === owner || existing?.owner === owner) {
    return;
  }
  if (previousOwner !== null) {
    transitionToOwner(owner, false);
    return;
  }

  const items = cartItemsToMerge(guestSnapshot);
  const pending = items.length > 0
    ? {
      owner,
      key: generateIdempotencyKey(),
      items,
    }
    : null;

  clearIntent();
  if (pending) {
    // Persist the recovery intent first. If owner publication fails, a retry can
    // still recover the exact guest payload instead of silently losing it.
    persistPendingCartMerge(pending);
  } else {
    localStorage.removeItem(CART_MERGE_INTENT_KEY);
  }
  setCartCacheOwner(owner);
}

export function readCartForCurrentSession(): CartItem[] {
  const auth = getAuthSnapshot();
  if (auth.status === 'unknown') {
    return [];
  }

  const session = getAuthenticatedSession();
  if (!session) {
    if (normalizeStoredOwner()) {
      clearAuthenticatedPrivateState();
    }
    return readCart();
  }

  const cachedOwner = normalizeStoredOwner();
  if (cachedOwner !== session.owner) {
    if (cachedOwner) transitionToOwner(session.owner, false);
    return [];
  }
  return readCart();
}

export async function mergeGuestCartAfterLogin(guestSnapshot: CartItem[]): Promise<ServerCartMergeResponse | null> {
  const session = getAuthenticatedSession();
  if (!session) throw new Error('Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại.');
  const { owner } = session;
  const items = cartItemsToMerge(guestSnapshot);
  const flightKey = mergeFlightKey(session, items);
  const existingFlight = mergeFlights.get(flightKey);
  if (existingFlight) return existingFlight;

  const flight = (async () => {
    if (!isCurrentSession(session)) return null;
    const previousOwner = normalizeStoredOwner();
    let pending = readPendingCartMerge();
    const canReplayPending = pending?.owner === owner;
    const claimedGuestCart = previousOwner === null;
    transitionToOwner(owner, claimedGuestCart);

    pending = canReplayPending ? pending : readPendingCartMerge();
    if (canReplayPending && pending) persistPendingCartMerge(pending);
    if (pending && pending.owner !== owner) {
      localStorage.removeItem(CART_MERGE_INTENT_KEY);
      pending = null;
    }
    if (!pending && claimedGuestCart && items.length > 0) {
      pending = { owner, key: generateIdempotencyKey(), items };
      persistPendingCartMerge(pending);
    }
    if (!pending) {
      await fetchAndCacheServerCart(owner);
      return null;
    }

    const submittedIntent = pending;
    const response = await mergeGuestCart(submittedIntent.items, submittedIntent.key);
    await fetchAndCacheServerCart(owner);
    const currentPending = readPendingCartMerge();
    if (isCurrentSession(session) && currentPending?.owner === submittedIntent.owner && currentPending.key === submittedIntent.key) {
      localStorage.removeItem(CART_MERGE_INTENT_KEY);
    }
    return response;
  })();

  mergeFlights.set(flightKey, flight);
  try {
    return await flight;
  } finally {
    if (mergeFlights.get(flightKey) === flight) mergeFlights.delete(flightKey);
  }
}

export async function loadCart(): Promise<CartItem[]> {
  const session = getAuthenticatedSession();
  if (!session) return readCartForCurrentSession();
  const previousOwner = normalizeStoredOwner();
  if (previousOwner === null) {
    const guestSnapshot = readCart();
    await mergeGuestCartAfterLogin(guestSnapshot);
    return readCartForCurrentSession();
  }
  if (previousOwner !== session.owner) transitionToOwner(session.owner, false);

  const pending = readPendingCartMerge();
  if (pending?.owner === session.owner) {
    await mergeGuestCartAfterLogin([]);
    return readCartForCurrentSession();
  }
  return fetchAndCacheServerCart(session.owner);
}

async function prepareAuthenticatedMutation(initialSession: AuthenticatedSession): Promise<AuthenticatedSession | null> {
  if (!isCurrentSession(initialSession)) return null;
  if (normalizeStoredOwner() !== initialSession.owner || readPendingCartMerge()) await loadCart();
  return isCurrentSession(initialSession) ? initialSession : null;
}

async function cacheMutationResponse(session: AuthenticatedSession, operationRevision: number, summary: ServerCartSummary): Promise<CartItem[]> {
  return operationRevision === localMutationRevision ? cacheServerSummary(session, summary) : readCartForCurrentSession();
}

export async function addCartItem(input: CartItem): Promise<CartItem[]> {
  const initialSession = getAuthenticatedSession();
  if (!initialSession) {
    const outcome: AddOrUpdateOutcome = addOrUpdateItem(input);
    if (outcome.status === 'rejected-limit') {
      throw new Error(`Giỏ hàng chỉ hỗ trợ tối đa ${outcome.maxLines} loại sách. Vui lòng xóa bớt sản phẩm trước khi thêm mới.`);
    }
    return outcome.cart;
  }
  return queueAuthenticatedMutation(async () => {
    const session = await prepareAuthenticatedMutation(initialSession);
    if (!session) return readCartForCurrentSession();
    const revision = ++localMutationRevision;
    return cacheMutationResponse(session, revision, await addServerCartItem(input.maSach, input.soLuong));
  });
}

export async function setCartItemQuantity(maSach: number, soLuong: number): Promise<CartItem[]> {
  const initialSession = getAuthenticatedSession();
  if (!initialSession) return updateQuantity(maSach, soLuong);
  return queueAuthenticatedMutation(async () => {
    const session = await prepareAuthenticatedMutation(initialSession);
    if (!session) return readCartForCurrentSession();
    const revision = ++localMutationRevision;
    return cacheMutationResponse(session, revision, await updateServerCartItem(maSach, soLuong));
  });
}

export async function removeCartItem(maSach: number): Promise<CartItem[]> {
  const initialSession = getAuthenticatedSession();
  if (!initialSession) return removeItem(maSach);
  return queueAuthenticatedMutation(async () => {
    const session = await prepareAuthenticatedMutation(initialSession);
    if (!session) return readCartForCurrentSession();
    const revision = ++localMutationRevision;
    return cacheMutationResponse(session, revision, await removeServerCartItem(maSach));
  });
}

export async function refreshCartAfterCheckout(): Promise<CartItem[]> {
  const session = getAuthenticatedSession();
  if (!session) return readCartForCurrentSession();
  const revision = localMutationRevision;
  const fingerprint = getCartFingerprint();
  const result = await getServerCartWithCapture();
  const responseSession = { owner: session.owner, capture: result.capture };
  if (!isCurrentSession(responseSession) || revision !== localMutationRevision || fingerprint !== getCartFingerprint()) {
    return readCartForCurrentSession();
  }
  return cacheServerSummary(responseSession, result.summary);
}

/** Cleans cart/private checkout state; AuthSession owns logout credentials. */
export function signOutCartSession(): void {
  failedLoginHandoffOwner = null;
  clearAuthenticatedPrivateState();
}

// AuthSession invokes transition subscribers before publishing the new snapshot.
// Equal owners preserve the account render cache across token rotation.
subscribeAuthTransition((previous, next) => {
  const directPreviousOwner = previous.status === 'authenticated'
    ? canonicalOwner(previous.uid)
    : null;
  const previousOwner = directPreviousOwner ?? retainedUnknownOwner;
  const nextOwner = next.status === 'authenticated' ? canonicalOwner(next.uid) : null;

  if (next.status === 'unknown') {
    retainedUnknownOwner = previousOwner;
    return;
  }
  retainedUnknownOwner = null;
  if (previousOwner === null || previousOwner === nextOwner) {
    return;
  }

  const preserveFailedHandoff = next.status === 'guest' &&
    failedLoginHandoffOwner === previousOwner &&
    readPendingCartMerge()?.owner === previousOwner;
  failedLoginHandoffOwner = null;
  clearAuthenticatedPrivateState({
    preservePendingMerge: preserveFailedHandoff,
    preserveNextPay: preserveFailedHandoff,
  });
});
