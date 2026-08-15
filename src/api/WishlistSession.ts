import { useSyncExternalStore } from 'react';
import {
  captureAuthenticatedRequest,
  getAuthSnapshot,
  isCurrentAuthCapture,
  subscribeAuthTransition,
  type AuthenticatedRequestCapture,
} from './AuthSession';
import {
  getDanhSachYeuThich,
  themYeuThich,
  xoaYeuThich,
  type YeuThichItem,
} from './YeuThichApi';

export type WishlistStatus = 'guest' | 'loading' | 'ready' | 'error';

export interface WishlistSnapshot {
  items: readonly YeuThichItem[];
  status: WishlistStatus;
  error: string | null;
  pendingBookIds: readonly number[];
}

interface WishlistSessionIdentity {
  uid: number;
  capture: AuthenticatedRequestCapture;
  epoch: number;
}

const EMPTY_PENDING_BOOK_IDS = Object.freeze([]) as readonly number[];
const GUEST_SNAPSHOT: WishlistSnapshot = Object.freeze({
  items: Object.freeze([]) as readonly YeuThichItem[],
  status: 'guest',
  error: null,
  pendingBookIds: EMPTY_PENDING_BOOK_IDS,
});

let snapshot: WishlistSnapshot = GUEST_SNAPSHOT;
let sessionUid: number | null = null;
let retainedUnknownUid: number | null = null;
let sessionEpoch = 0;
let loadFlight: Promise<readonly YeuThichItem[]> | null = null;
let loadFlightCapture: AuthenticatedRequestCapture | null = null;
const listeners = new Set<() => void>();
const mutationTails = new Map<number, Promise<void>>();
const activeMutationCounts = new Map<number, number>();
const overlappingMutationEpochs = new Set<number>();
const reconciliationFlights = new Map<number, Promise<boolean>>();
const mutationIdleWaiters = new Set<() => void>();
let mutationActivityRevision = 0;

function freezeItems(items: YeuThichItem[]): readonly YeuThichItem[] {
  return Object.freeze(items.map(item => Object.freeze({ ...item })));
}

function publish(next: WishlistSnapshot): void {
  snapshot = Object.freeze({
    ...next,
    items: freezeItems([...next.items]),
    pendingBookIds: Object.freeze([...next.pendingBookIds]),
  });
  listeners.forEach(listener => listener());
}

function resetToGuest(): void {
  if (sessionUid === null && snapshot.status === 'guest') return;
  sessionUid = null;
  sessionEpoch += 1;
  loadFlight = null;
  loadFlightCapture = null;
  mutationTails.clear();
  activeMutationCounts.clear();
  releaseMutationIdleWaiters();
  overlappingMutationEpochs.clear();
  reconciliationFlights.clear();
  mutationActivityRevision = 0;
  snapshot = GUEST_SNAPSHOT;
  listeners.forEach(listener => listener());
}

function beginAuthSession(): WishlistSessionIdentity | null {
  const auth = getAuthSnapshot();
  if (auth.status !== 'authenticated') {
    if (auth.status === 'guest' && (sessionUid !== null || snapshot.status !== 'guest')) {
      resetToGuest();
    }
    return null;
  }
  if (typeof auth.uid !== 'number' || !Number.isInteger(auth.uid) || auth.uid <= 0) {
    resetToGuest();
    return null;
  }
  const capture = captureAuthenticatedRequest();
  if (!capture) return null;

  if (sessionUid !== auth.uid) {
    sessionUid = auth.uid;
    sessionEpoch += 1;
    loadFlight = null;
    loadFlightCapture = null;
    mutationTails.clear();
    activeMutationCounts.clear();
    releaseMutationIdleWaiters();
    overlappingMutationEpochs.clear();
    reconciliationFlights.clear();
    mutationActivityRevision = 0;
    publish({ items: [], status: 'loading', error: null, pendingBookIds: EMPTY_PENDING_BOOK_IDS });
  }
  return { uid: auth.uid, capture, epoch: sessionEpoch };
}

function isCurrentEpoch(identity: WishlistSessionIdentity): boolean {
  const auth = getAuthSnapshot();
  return auth.status === 'authenticated' && auth.uid === identity.uid &&
    sessionUid === identity.uid && sessionEpoch === identity.epoch;
}

function isCurrentSession(identity: WishlistSessionIdentity): boolean {
  return isCurrentEpoch(identity) && isCurrentAuthCapture(identity.capture);
}

/**
 * Queued work captures its token when it is enqueued, but only runs once the
 * previous operation for the same book settles. Rotating the access token of the
 * same account in between must not silently drop the requested desired state, so
 * the operation re-reads the token while the immutable account identity holds.
 */
function withCurrentCapture(identity: WishlistSessionIdentity): WishlistSessionIdentity | null {
  if (!isCurrentEpoch(identity)) return null;
  const capture = captureAuthenticatedRequest();
  return capture ? { ...identity, capture } : null;
}

function messageFrom(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : 'Không thể đồng bộ danh sách yêu thích. Vui lòng thử lại.';
}

function beginPendingBook(maSach: number, identity: WishlistSessionIdentity): number {
  mutationActivityRevision += 1;
  activeMutationCounts.set(maSach, (activeMutationCounts.get(maSach) ?? 0) + 1);
  if (activeMutationCounts.size > 1) overlappingMutationEpochs.add(identity.epoch);
  const pendingBookIds = snapshot.pendingBookIds.includes(maSach)
    ? snapshot.pendingBookIds
    : [...snapshot.pendingBookIds, maSach];
  publish({ ...snapshot, pendingBookIds });
  return mutationActivityRevision;
}

function finishPendingBook(maSach: number): void {
  mutationActivityRevision += 1;
  const remaining = (activeMutationCounts.get(maSach) ?? 1) - 1;
  if (remaining > 0) {
    activeMutationCounts.set(maSach, remaining);
    return;
  }
  activeMutationCounts.delete(maSach);
  publish({ ...snapshot, pendingBookIds: snapshot.pendingBookIds.filter(id => id !== maSach) });
  if (activeMutationCounts.size === 0) releaseMutationIdleWaiters();
}

function releaseMutationIdleWaiters(): void {
  const waiters = Array.from(mutationIdleWaiters);
  mutationIdleWaiters.clear();
  waiters.forEach(resolve => resolve());
}

function waitForMutationIdle(identity: WishlistSessionIdentity): Promise<void> {
  if (!isCurrentSession(identity) || activeMutationCounts.size === 0) return Promise.resolve();
  return new Promise(resolve => mutationIdleWaiters.add(resolve));
}

function reconcileMutationSession(identity: WishlistSessionIdentity): Promise<boolean> {
  if (!isCurrentSession(identity)) return Promise.resolve(false);
  const existing = reconciliationFlights.get(identity.epoch);
  if (existing) return existing;

  const flight = (async () => {
    while (isCurrentSession(identity)) {
      await waitForMutationIdle(identity);
      if (!isCurrentSession(identity)) return false;
      const activityAtStart = mutationActivityRevision;
      const items = await getDanhSachYeuThich();
      if (!isCurrentSession(identity)) return false;
      if (activeMutationCounts.size === 0 && activityAtStart === mutationActivityRevision) {
        publish({ items, status: 'ready', error: null, pendingBookIds: snapshot.pendingBookIds });
        return true;
      }
    }
    return false;
  })().finally(() => {
    if (reconciliationFlights.get(identity.epoch) === flight) reconciliationFlights.delete(identity.epoch);
  });
  reconciliationFlights.set(identity.epoch, flight);
  return flight;
}

export function subscribeWishlist(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getWishlistSnapshot(): WishlistSnapshot {
  return snapshot;
}

export function useWishlist(): WishlistSnapshot {
  return useSyncExternalStore(subscribeWishlist, getWishlistSnapshot, getWishlistSnapshot);
}

export function isBookWishlisted(maSach: number, state = snapshot): boolean {
  return state.items.some(item => item.maSach === maSach);
}

export async function syncWishlistSession(): Promise<readonly YeuThichItem[]> {
  const identity = beginAuthSession();
  if (!identity) return GUEST_SNAPSHOT.items;
  if (loadFlight && loadFlightCapture &&
    loadFlightCapture.revision === identity.capture.revision &&
    loadFlightCapture.accessToken === identity.capture.accessToken) {
    return loadFlight;
  }

  publish({ items: snapshot.items, status: 'loading', error: null, pendingBookIds: snapshot.pendingBookIds });
  const activityAtStart = mutationActivityRevision;
  const flight = getDanhSachYeuThich()
    .then(items => {
      if (isCurrentSession(identity) && activityAtStart === mutationActivityRevision) {
        publish({ items, status: 'ready', error: null, pendingBookIds: snapshot.pendingBookIds });
      }
      return isCurrentSession(identity) ? snapshot.items : [];
    })
    .catch(error => {
      if (isCurrentSession(identity) && activityAtStart === mutationActivityRevision) {
        publish({ items: snapshot.items, status: 'error', error: messageFrom(error), pendingBookIds: snapshot.pendingBookIds });
      }
      throw error;
    })
    .finally(() => {
      if (loadFlight === flight) {
        loadFlight = null;
        loadFlightCapture = null;
      }
    });
  loadFlight = flight;
  loadFlightCapture = identity.capture;
  return flight;
}

export function clearWishlistSession(): void {
  resetToGuest();
}

// AuthSession invokes this before publishing uid/logout/unknown transitions.
// Matching uid deliberately retains the current server-authoritative items.
subscribeAuthTransition((previous, next) => {
  const directPreviousUid = previous.status === 'authenticated' ? previous.uid : null;
  const previousUid = directPreviousUid ?? retainedUnknownUid;
  const nextUid = next.status === 'authenticated' ? next.uid : null;

  if (next.status === 'unknown') {
    retainedUnknownUid = previousUid;
    return;
  }
  retainedUnknownUid = null;
  if (previousUid !== null && previousUid !== nextUid) {
    resetToGuest();
  }
});

export async function setBookWishlisted(maSach: number, desired: boolean): Promise<readonly YeuThichItem[]> {
  const queuedIdentity = beginAuthSession();
  if (!queuedIdentity) throw new Error('Vui lòng đăng nhập để sử dụng tính năng yêu thích.');
  if (!Number.isInteger(maSach) || maSach <= 0) throw new Error('Mã sách không hợp lệ.');

  const previous = mutationTails.get(maSach) ?? Promise.resolve();
  const operation = previous.catch(() => undefined).then(async () => {
    const identity = withCurrentCapture(queuedIdentity);
    if (!identity || isBookWishlisted(maSach) === desired) return;

    const activityAtStart = beginPendingBook(maSach, identity);
    try {
      const items = desired ? await themYeuThich(maSach) : await xoaYeuThich(maSach);
      if (isCurrentSession(identity) && !overlappingMutationEpochs.has(identity.epoch) && activityAtStart === mutationActivityRevision) {
        publish({ items, status: 'ready', error: null, pendingBookIds: snapshot.pendingBookIds });
      }
    } catch (error) {
      if (isCurrentSession(identity)) {
        publish({ items: snapshot.items, status: 'error', error: messageFrom(error), pendingBookIds: snapshot.pendingBookIds });
      }
      throw error;
    } finally {
      if (isCurrentEpoch(identity)) {
        finishPendingBook(maSach);
        if (!isCurrentSession(identity)) {
          const replacement = beginAuthSession();
          if (replacement) {
            void syncWishlistSession().catch(() => undefined);
          }
        } else if (activeMutationCounts.size === 0 && overlappingMutationEpochs.has(identity.epoch)) {
          try {
            await reconcileMutationSession(identity);
          } catch (error) {
            if (isCurrentSession(identity)) {
              publish({ items: snapshot.items, status: 'error', error: messageFrom(error), pendingBookIds: snapshot.pendingBookIds });
            }
          } finally {
            if (isCurrentSession(identity)) overlappingMutationEpochs.delete(identity.epoch);
          }
        }
      }
    }
  });
  const tail = operation.then(() => undefined, () => undefined).finally(() => {
    if (mutationTails.get(maSach) === tail) mutationTails.delete(maSach);
  });
  mutationTails.set(maSach, tail);
  await operation;
  return isCurrentEpoch(queuedIdentity) ? snapshot.items : [];
}
