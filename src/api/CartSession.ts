import {
  addServerCartItem,
  CartMergeItem,
  getServerCart,
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
  CART_MERGE_INTENT_KEY,
  clearAuthenticatedSessionState,
  getCartCacheOwner,
  setCartCacheOwner,
} from './SessionCleanup';

interface JwtPayload {
  exp?: number;
  sub?: string;
}

interface PendingCartMerge {
  owner: string;
  key: string;
  items: CartMergeItem[];
}

interface AuthenticatedSession {
  owner: string;
  token: string;
}

let localMutationRevision = 0;
let authenticatedMutationQueue: Promise<void> = Promise.resolve();
const mergeFlights = new Map<string, Promise<ServerCartMergeResponse | null>>();

function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function tokenFingerprint(token: string): string {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function getAuthenticatedSession(): AuthenticatedSession | null {
  const token = localStorage.getItem('jwt');
  if (!token) return null;
  const payload = parseJwtPayload(token);
  if (!payload?.exp || payload.exp * 1000 <= Date.now()) {
    clearAuthenticatedSessionState(true);
    return null;
  }
  return {
    owner: payload.sub ? `account:${payload.sub}` : `token:${tokenFingerprint(token)}`,
    token,
  };
}

function getAuthenticatedOwner(): string | null {
  return getAuthenticatedSession()?.owner ?? null;
}

function isCurrentSession(session: AuthenticatedSession): boolean {
  const current = getAuthenticatedSession();
  return current?.owner === session.owner && current.token === session.token;
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

export function readPendingCartMerge(): PendingCartMerge | null {
  const raw = localStorage.getItem(CART_MERGE_INTENT_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingCartMerge>;
    if (
      typeof value.owner !== 'string' ||
      typeof value.key !== 'string' ||
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

function cacheServerSummary(
  session: AuthenticatedSession,
  summary: ServerCartSummary,
): CartItem[] {
  if (
    !isCurrentSession(session) ||
    getCartCacheOwner() !== session.owner
  ) {
    return readCartForCurrentSession();
  }
  return writeCart(summary.items);
}

function transitionToOwner(owner: string, preserveGuestSnapshot: boolean): void {
  const previousOwner = getCartCacheOwner();
  if (previousOwner === owner) return;

  if (previousOwner || !preserveGuestSnapshot) {
    clearAuthenticatedSessionState(false);
  } else {
    localStorage.removeItem(CART_MERGE_INTENT_KEY);
    clearIntent();
  }
  setCartCacheOwner(owner);
}

function cartItemsToMerge(items: CartItem[]): CartMergeItem[] {
  const mergeItems = items
    .filter(isCartItem)
    .map(item => ({ maSach: item.maSach, soLuong: item.soLuong }));
  if (mergeItems.length > MAX_CART_LINES) {
    throw new Error(
      `Giỏ hàng khách chỉ hỗ trợ tối đa ${MAX_CART_LINES} loại sách. Vui lòng xóa bớt sản phẩm trước khi đăng nhập.`,
    );
  }
  return mergeItems;
}

function mergeFlightKey(session: AuthenticatedSession, items: CartMergeItem[]): string {
  const canonical = [...items].sort((left, right) => left.maSach - right.maSach);
  return `${session.owner}:${tokenFingerprint(session.token)}:${JSON.stringify(canonical)}`;
}

async function queueAuthenticatedMutation<T>(operation: () => Promise<T>): Promise<T> {
  const previous = authenticatedMutationQueue;
  let release!: () => void;
  authenticatedMutationQueue = new Promise<void>(resolve => {
    release = resolve;
  });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}

async function withCrossTabMergeLock<T>(
  session: AuthenticatedSession,
  operation: () => Promise<T>,
): Promise<T> {
  const lockManager = navigator.locks;
  if (!lockManager) return operation();
  return lockManager.request(
    `bookstore-cart-merge:${session.owner}`,
    operation,
  );
}

export async function waitForCartMutations(): Promise<void> {
  await authenticatedMutationQueue;
}

export function readGuestCartSnapshot(): CartItem[] {
  return getCartCacheOwner() ? [] : readCart();
}

export function readCartForCurrentSession(): CartItem[] {
  const owner = getAuthenticatedOwner();
  if (!owner) {
    if (getCartCacheOwner()) {
      clearAuthenticatedSessionState(false);
    }
    return readCart();
  }

  const cachedOwner = getCartCacheOwner();
  if (cachedOwner !== owner) {
    // A cache owned by another account must be removed immediately. With no
    // owner metadata yet, leave the bytes untouched for loadCart() to treat as
    // the legacy/guest snapshot and merge before assigning an owner.
    if (cachedOwner) {
      transitionToOwner(owner, false);
    }
    return [];
  }
  return readCart();
}

export async function mergeGuestCartAfterLogin(
  guestSnapshot: CartItem[],
): Promise<ServerCartMergeResponse | null> {
  const session = getAuthenticatedSession();
  if (!session) {
    throw new Error('Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại.');
  }
  const { owner } = session;

  const items = cartItemsToMerge(guestSnapshot);
  const flightKey = mergeFlightKey(session, items);
  const existingFlight = mergeFlights.get(flightKey);
  if (existingFlight) return existingFlight;

  const flight = withCrossTabMergeLock(session, async () => {
    const previousOwner = getCartCacheOwner();
    let pending = readPendingCartMerge();
    const canReplayPending = pending?.owner === owner;
    transitionToOwner(owner, previousOwner === null);

    pending = canReplayPending ? pending : readPendingCartMerge();
    if (canReplayPending && pending) {
      persistPendingCartMerge(pending);
    }
    if (pending && pending.owner !== owner) {
      localStorage.removeItem(CART_MERGE_INTENT_KEY);
      pending = null;
    }

    if (!pending && items.length > 0) {
      pending = { owner, key: generateIdempotencyKey(), items };
      persistPendingCartMerge(pending);
    }

    if (!pending) {
      const summary = await getServerCart();
      cacheServerSummary(session, summary);
      return null;
    }

    const submittedIntent = pending;
    const response = await mergeGuestCart(submittedIntent.items, submittedIntent.key);
    const authoritative = await getServerCart();
    cacheServerSummary(session, authoritative);
    const currentPending = readPendingCartMerge();
    if (
      isCurrentSession(session) &&
      currentPending?.owner === submittedIntent.owner &&
      currentPending.key === submittedIntent.key
    ) {
      localStorage.removeItem(CART_MERGE_INTENT_KEY);
    }
    return response;
  });

  mergeFlights.set(flightKey, flight);
  try {
    return await flight;
  } finally {
    if (mergeFlights.get(flightKey) === flight) {
      mergeFlights.delete(flightKey);
    }
  }
}

export async function loadCart(): Promise<CartItem[]> {
  const session = getAuthenticatedSession();
  if (!session) {
    return readCartForCurrentSession();
  }
  const { owner } = session;

  const previousOwner = getCartCacheOwner();
  if (previousOwner === null) {
    const guestSnapshot = readCart();
    await mergeGuestCartAfterLogin(guestSnapshot);
    return readCartForCurrentSession();
  }
  if (previousOwner !== owner) {
    transitionToOwner(owner, false);
  }

  const pending = readPendingCartMerge();
  if (pending?.owner === owner) {
    await mergeGuestCartAfterLogin([]);
    return readCartForCurrentSession();
  }

  const summary = await getServerCart();
  return cacheServerSummary(session, summary);
}

async function prepareAuthenticatedMutation(
  initialSession: AuthenticatedSession,
): Promise<AuthenticatedSession | null> {
  if (!isCurrentSession(initialSession)) return null;
  if (getCartCacheOwner() !== initialSession.owner || readPendingCartMerge()) {
    await loadCart();
  }
  return isCurrentSession(initialSession) ? initialSession : null;
}

async function cacheMutationResponse(
  session: AuthenticatedSession,
  operationRevision: number,
  summary: ServerCartSummary,
): Promise<CartItem[]> {
  if (operationRevision === localMutationRevision) {
    return cacheServerSummary(session, summary);
  }
  return readCartForCurrentSession();
}

export async function addCartItem(input: CartItem): Promise<CartItem[]> {
  const initialSession = getAuthenticatedSession();
  if (!initialSession) {
    const outcome: AddOrUpdateOutcome = addOrUpdateItem(input);
    if (outcome.status === 'rejected-limit') {
      throw new Error(
        `Giỏ hàng chỉ hỗ trợ tối đa ${outcome.maxLines} loại sách. Vui lòng xóa bớt sản phẩm trước khi thêm mới.`,
      );
    }
    return outcome.cart;
  }

  return queueAuthenticatedMutation(async () => {
    const session = await prepareAuthenticatedMutation(initialSession);
    if (!session) return readCartForCurrentSession();
    const revision = ++localMutationRevision;
    const summary = await addServerCartItem(input.maSach, input.soLuong);
    return cacheMutationResponse(session, revision, summary);
  });
}

export async function setCartItemQuantity(maSach: number, soLuong: number): Promise<CartItem[]> {
  const initialSession = getAuthenticatedSession();
  if (!initialSession) {
    return updateQuantity(maSach, soLuong);
  }

  return queueAuthenticatedMutation(async () => {
    const session = await prepareAuthenticatedMutation(initialSession);
    if (!session) return readCartForCurrentSession();
    const revision = ++localMutationRevision;
    const summary = await updateServerCartItem(maSach, soLuong);
    return cacheMutationResponse(session, revision, summary);
  });
}

export async function removeCartItem(maSach: number): Promise<CartItem[]> {
  const initialSession = getAuthenticatedSession();
  if (!initialSession) {
    return removeItem(maSach);
  }

  return queueAuthenticatedMutation(async () => {
    const session = await prepareAuthenticatedMutation(initialSession);
    if (!session) return readCartForCurrentSession();
    const revision = ++localMutationRevision;
    const summary = await removeServerCartItem(maSach);
    return cacheMutationResponse(session, revision, summary);
  });
}

export async function refreshCartAfterCheckout(): Promise<CartItem[]> {
  const session = getAuthenticatedSession();
  if (!session) return readCartForCurrentSession();

  const revision = localMutationRevision;
  const fingerprint = getCartFingerprint();
  const summary = await getServerCart();
  if (
    !isCurrentSession(session) ||
    revision !== localMutationRevision ||
    fingerprint !== getCartFingerprint()
  ) {
    return readCartForCurrentSession();
  }
  return cacheServerSummary(session, summary);
}

export function signOutCartSession(): void {
  clearAuthenticatedSessionState(true);
}
