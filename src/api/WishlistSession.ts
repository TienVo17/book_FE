import { useSyncExternalStore } from 'react';
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
  token: string;
  revision: number;
}

const EMPTY_PENDING_BOOK_IDS = Object.freeze([]) as readonly number[];
const GUEST_SNAPSHOT: WishlistSnapshot = Object.freeze({
  items: Object.freeze([]) as readonly YeuThichItem[],
  status: 'guest',
  error: null,
  pendingBookIds: EMPTY_PENDING_BOOK_IDS,
});

let snapshot: WishlistSnapshot = GUEST_SNAPSHOT;
let sessionToken: string | null = null;
let sessionRevision = 0;
let loadFlight: Promise<readonly YeuThichItem[]> | null = null;
let loadFlightToken: string | null = null;
const listeners = new Set<() => void>();
const mutationTails = new Map<number, Promise<void>>();
const activeMutationCounts = new Map<number, number>();
const overlappingMutationRevisions = new Set<number>();
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

function readStoredToken(): string | null {
  return localStorage.getItem('jwt');
}

function beginStoredSession(): WishlistSessionIdentity | null {
  const token = readStoredToken();
  if (!token) {
    if (sessionToken !== null || snapshot.status !== 'guest') {
      sessionToken = null;
      sessionRevision += 1;
      loadFlight = null;
      loadFlightToken = null;
      mutationTails.clear();
      activeMutationCounts.clear();
      releaseMutationIdleWaiters();
      overlappingMutationRevisions.clear();
      reconciliationFlights.clear();
      mutationActivityRevision = 0;
      snapshot = GUEST_SNAPSHOT;
      listeners.forEach(listener => listener());
    }
    return null;
  }

  if (sessionToken !== token) {
    sessionToken = token;
    sessionRevision += 1;
    loadFlight = null;
    loadFlightToken = null;
    mutationTails.clear();
    activeMutationCounts.clear();
    releaseMutationIdleWaiters();
    overlappingMutationRevisions.clear();
    reconciliationFlights.clear();
    mutationActivityRevision = 0;
    publish({
      items: [],
      status: 'loading',
      error: null,
      pendingBookIds: EMPTY_PENDING_BOOK_IDS,
    });
  }

  return { token, revision: sessionRevision };
}

function isCurrentSession(identity: WishlistSessionIdentity): boolean {
  return sessionToken === identity.token &&
    sessionRevision === identity.revision &&
    readStoredToken() === identity.token;
}

function messageFrom(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : 'Không thể đồng bộ danh sách yêu thích. Vui lòng thử lại.';
}

function beginPendingBook(
  maSach: number,
  identity: WishlistSessionIdentity,
): number {
  mutationActivityRevision += 1;
  activeMutationCounts.set(maSach, (activeMutationCounts.get(maSach) ?? 0) + 1);
  if (activeMutationCounts.size > 1) {
    overlappingMutationRevisions.add(identity.revision);
  }
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
  const pendingBookIds = snapshot.pendingBookIds.filter(
    pendingId => pendingId !== maSach,
  );
  publish({ ...snapshot, pendingBookIds });
  if (activeMutationCounts.size === 0) {
    releaseMutationIdleWaiters();
  }
}

function releaseMutationIdleWaiters(): void {
  const waiters = Array.from(mutationIdleWaiters);
  mutationIdleWaiters.clear();
  waiters.forEach(resolve => resolve());
}

function waitForMutationIdle(
  identity: WishlistSessionIdentity,
): Promise<void> {
  if (!isCurrentSession(identity) || activeMutationCounts.size === 0) {
    return Promise.resolve();
  }
  return new Promise(resolve => mutationIdleWaiters.add(resolve));
}

function reconcileMutationSession(
  identity: WishlistSessionIdentity,
): Promise<boolean> {
  if (!isCurrentSession(identity)) return Promise.resolve(false);

  const existing = reconciliationFlights.get(identity.revision);
  if (existing) return existing;

  const flight = (async () => {
    while (isCurrentSession(identity)) {
      await waitForMutationIdle(identity);
      if (!isCurrentSession(identity)) return false;

      const activityAtStart = mutationActivityRevision;
      const items = await getDanhSachYeuThich();
      if (!isCurrentSession(identity)) return false;
      if (
        activeMutationCounts.size === 0 &&
        activityAtStart === mutationActivityRevision
      ) {
        publish({
          items,
          status: 'ready',
          error: null,
          pendingBookIds: snapshot.pendingBookIds,
        });
        return true;
      }
    }
    return false;
  })().finally(() => {
    if (reconciliationFlights.get(identity.revision) === flight) {
      reconciliationFlights.delete(identity.revision);
    }
  });

  reconciliationFlights.set(identity.revision, flight);
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
  return useSyncExternalStore(
    subscribeWishlist,
    getWishlistSnapshot,
    getWishlistSnapshot,
  );
}

export function isBookWishlisted(maSach: number, state = snapshot): boolean {
  return state.items.some(item => item.maSach === maSach);
}

export async function syncWishlistSession(): Promise<readonly YeuThichItem[]> {
  const identity = beginStoredSession();
  if (!identity) return GUEST_SNAPSHOT.items;

  if (loadFlight && loadFlightToken === identity.token) {
    return loadFlight;
  }

  publish({
    items: snapshot.items,
    status: 'loading',
    error: null,
    pendingBookIds: snapshot.pendingBookIds,
  });
  const activityAtStart = mutationActivityRevision;

  const flight = getDanhSachYeuThich()
    .then(items => {
      if (
        isCurrentSession(identity) &&
        activityAtStart === mutationActivityRevision
      ) {
        publish({
          items,
          status: 'ready',
          error: null,
          pendingBookIds: snapshot.pendingBookIds,
        });
      }
      return isCurrentSession(identity) ? snapshot.items : [];
    })
    .catch(error => {
      if (
        isCurrentSession(identity) &&
        activityAtStart === mutationActivityRevision
      ) {
        publish({
          items: snapshot.items,
          status: 'error',
          error: messageFrom(error),
          pendingBookIds: snapshot.pendingBookIds,
        });
      }
      throw error;
    })
    .finally(() => {
      if (loadFlight === flight) {
        loadFlight = null;
        loadFlightToken = null;
      }
    });

  loadFlight = flight;
  loadFlightToken = identity.token;
  return flight;
}

export function clearWishlistSession(): void {
  sessionToken = null;
  sessionRevision += 1;
  loadFlight = null;
  loadFlightToken = null;
  mutationTails.clear();
  activeMutationCounts.clear();
  releaseMutationIdleWaiters();
  overlappingMutationRevisions.clear();
  reconciliationFlights.clear();
  mutationActivityRevision = 0;
  snapshot = GUEST_SNAPSHOT;
  listeners.forEach(listener => listener());
}

export async function setBookWishlisted(
  maSach: number,
  desired: boolean,
): Promise<readonly YeuThichItem[]> {
  const identity = beginStoredSession();
  if (!identity) {
    throw new Error('Vui lòng đăng nhập để sử dụng tính năng yêu thích.');
  }
  if (!Number.isInteger(maSach) || maSach <= 0) {
    throw new Error('Mã sách không hợp lệ.');
  }

  const previous = mutationTails.get(maSach) ?? Promise.resolve();
  const operation = previous
    .catch(() => undefined)
    .then(async () => {
      if (!isCurrentSession(identity) || isBookWishlisted(maSach) === desired) {
        return;
      }

      const activityAtStart = beginPendingBook(maSach, identity);
      try {
        const items = desired
          ? await themYeuThich(maSach)
          : await xoaYeuThich(maSach);
        if (
          isCurrentSession(identity) &&
          !overlappingMutationRevisions.has(identity.revision) &&
          activityAtStart === mutationActivityRevision
        ) {
          publish({
            items,
            status: 'ready',
            error: null,
            pendingBookIds: snapshot.pendingBookIds,
          });
        }
      } catch (error) {
        if (isCurrentSession(identity)) {
          publish({
            items: snapshot.items,
            status: 'error',
            error: messageFrom(error),
            pendingBookIds: snapshot.pendingBookIds,
          });
        }
        throw error;
      } finally {
        if (isCurrentSession(identity)) {
          finishPendingBook(maSach);
          if (
            activeMutationCounts.size === 0 &&
            overlappingMutationRevisions.has(identity.revision)
          ) {
            try {
              await reconcileMutationSession(identity);
            } catch (error) {
              if (isCurrentSession(identity)) {
                publish({
                  items: snapshot.items,
                  status: 'error',
                  error: messageFrom(error),
                  pendingBookIds: snapshot.pendingBookIds,
                });
              }
            } finally {
              if (isCurrentSession(identity)) {
                overlappingMutationRevisions.delete(identity.revision);
              }
            }
          }
        }
      }
    });

  const tail = operation
    .then(() => undefined, () => undefined)
    .finally(() => {
      if (mutationTails.get(maSach) === tail) {
        mutationTails.delete(maSach);
      }
    });
  mutationTails.set(maSach, tail);

  await operation;
  const queued = mutationTails.get(maSach);
  if (queued && queued !== tail) await queued;
  return isCurrentSession(identity) ? snapshot.items : [];
}
