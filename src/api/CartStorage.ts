/**
 * CartStorage is the ONLY module allowed to read/write localStorage['gioHang'].
 * Every other module (pages, hooks, utils) must go through the functions
 * exported here. A source-scan test in CartStorage.test.ts enforces this.
 *
 * Canonical persisted shape (kept for backward compatibility with the
 * de-facto shape already produced by the app before this consolidation):
 *
 *   {
 *     maSach: number;
 *     sachDto: { tenSach: string; giaBan: number; hinhAnh: string };
 *     soLuong: number;
 *     soLuongTonKho?: number; // stock snapshot at the time the line was added
 *   }
 *
 * Event contract (documented, single source of truth):
 * - Every mutation performed through this module (addOrUpdateItem that
 *   actually changes storage, updateQuantity, removeItem, clearCart,
 *   writeCart) dispatches exactly one same-tab `cartUpdated` CustomEvent.
 *   This module never dispatches a synthetic `storage` event: that was the
 *   previous inconsistency (some call sites faked a `storage` event to get
 *   same-tab reactivity while others used a real `cartUpdated` event).
 * - Cross-tab changes are observed by consumers via the browser's native
 *   `storage` event, which fires automatically in other tabs/windows when
 *   `localStorage` changes (never in the tab that made the change). Callers
 *   that need to react to another tab's edits should add their own
 *   `window.addEventListener('storage', ...)` listener; this module does not
 *   need to (and cannot) dispatch that event itself.
 */

const STORAGE_KEY = 'gioHang';
const CART_UPDATED_EVENT = 'cartUpdated';

export interface CartItemBook {
  tenSach: string;
  giaBan: number;
  hinhAnh: string;
}

export interface CartItem {
  maSach: number;
  sachDto: CartItemBook;
  soLuong: number;
  soLuongTonKho?: number;
}

export type AddOrUpdateOutcome =
  | { status: 'added'; cart: CartItem[]; item: CartItem }
  | { status: 'merged'; cart: CartItem[]; item: CartItem }
  | { status: 'rejected-stock'; cart: CartItem[]; currentQuantity: number; soLuongTonKho: number };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toFiniteNumber(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Normalizes one raw storage entry into the canonical CartItem shape.
 * - Entries already shaped as `{ sachDto: {...} }` pass through with field
 *   coercion/defaulting.
 * - Legacy flat entries (`GioHangModel`: `{maSach, tenSach, giaBan, soLuong,
 *   hinhAnh?}`) are migrated deterministically into the sachDto shape rather
 *   than dropped, so existing users keep their cart contents.
 * - Anything else that cannot be attributed a name/price safely is dropped
 *   (returns null) so a single corrupt line cannot crash the whole cart.
 * Quantity is always normalized to an integer >= 1.
 */
function normalizeEntry(raw: unknown): CartItem | null {
  if (!isPlainObject(raw)) return null;

  const maSach = toFiniteNumber(raw.maSach);
  if (maSach === undefined) return null;

  let sachDto: CartItemBook | null = null;
  if (isPlainObject(raw.sachDto)) {
    const dto = raw.sachDto;
    sachDto = {
      tenSach: typeof dto.tenSach === 'string' ? dto.tenSach : '',
      giaBan: toFiniteNumber(dto.giaBan) ?? 0,
      hinhAnh: typeof dto.hinhAnh === 'string' ? dto.hinhAnh : '',
    };
  } else if (typeof raw.tenSach === 'string' && toFiniteNumber(raw.giaBan) !== undefined) {
    // Legacy flat GioHangModel shape.
    sachDto = {
      tenSach: raw.tenSach,
      giaBan: toFiniteNumber(raw.giaBan) as number,
      hinhAnh: typeof raw.hinhAnh === 'string' ? raw.hinhAnh : '',
    };
  }

  if (!sachDto) return null;

  const rawQuantity = toFiniteNumber(raw.soLuong);
  const soLuong = rawQuantity !== undefined && rawQuantity >= 1 ? Math.floor(rawQuantity) : 1;

  const soLuongTonKho = toFiniteNumber(raw.soLuongTonKho) ?? toFiniteNumber((raw as Record<string, unknown>).soLuongTon);

  const item: CartItem = { maSach, sachDto, soLuong };
  if (soLuongTonKho !== undefined) {
    item.soLuongTonKho = soLuongTonKho;
  }
  return item;
}

/**
 * Merges entries that share the same maSach (e.g. corrupted/duplicate
 * writes) into a single deterministic line: quantities are summed, the
 * first-seen position is kept, and the merged quantity is clamped to the
 * smallest known stock snapshot among the duplicates (never below 1).
 */
function mergeDuplicates(items: CartItem[]): CartItem[] {
  const order: number[] = [];
  const byMaSach = new Map<number, CartItem>();

  for (const item of items) {
    const existing = byMaSach.get(item.maSach);
    if (!existing) {
      order.push(item.maSach);
      byMaSach.set(item.maSach, { ...item });
      continue;
    }

    const mergedQuantitySum = existing.soLuong + item.soLuong;
    const stocks = [existing.soLuongTonKho, item.soLuongTonKho].filter(
      (s): s is number => typeof s === 'number',
    );
    const cap = stocks.length > 0 ? Math.min(...stocks) : undefined;
    const soLuong = Math.max(1, cap !== undefined ? Math.min(mergedQuantitySum, cap) : mergedQuantitySum);

    byMaSach.set(item.maSach, {
      ...existing,
      soLuong,
      soLuongTonKho: cap,
    });
  }

  return order.map((maSach) => byMaSach.get(maSach) as CartItem);
}

function parseStoredCart(): CartItem[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Malformed JSON cannot be repaired safely; quarantine it so the rest of
    // the app keeps working instead of throwing on every cart read.
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }

  if (!Array.isArray(parsed)) {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }

  const normalized = parsed
    .map(normalizeEntry)
    .filter((item): item is CartItem => item !== null);

  return mergeDuplicates(normalized);
}

function persistAndNotify(items: CartItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

/** Fresh read + normalize. Never throws. Does not dispatch any event. */
export function readCart(): CartItem[] {
  return parseStoredCart();
}

/**
 * Low-level primitive: replaces the whole cart with the given items
 * (normalized/deduped) and dispatches one `cartUpdated` event. Prefer the
 * more specific mutators (addOrUpdateItem/updateQuantity/removeItem) when
 * possible, since they re-read storage fresh before mutating; writeCart
 * trusts the array it is given.
 */
export function writeCart(items: CartItem[]): CartItem[] {
  const normalized = mergeDuplicates(
    items.map(normalizeEntry).filter((item): item is CartItem => item !== null),
  );
  persistAndNotify(normalized);
  return normalized;
}

/** Removes the cart entirely and notifies same-tab listeners. */
export function clearCart(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

/**
 * Adds a book to the cart or merges quantity into an existing line. Always
 * re-reads storage first so a concurrent write from another tab is not
 * clobbered by a stale in-memory snapshot. When a stock snapshot is known
 * and the resulting quantity would exceed it, the cart is left unchanged and
 * `rejected-stock` is returned so the caller can show a message; no storage
 * write happens and no event is dispatched in that case (nothing changed).
 */
export function addOrUpdateItem(input: {
  maSach: number;
  sachDto: { tenSach: string; giaBan: number; hinhAnh?: string };
  soLuong: number;
  soLuongTonKho?: number;
}): AddOrUpdateOutcome {
  const current = readCart();
  const requestedQuantity = Math.max(1, Math.floor(input.soLuong) || 1);
  const existing = current.find((item) => item.maSach === input.maSach);
  const stock = input.soLuongTonKho;

  if (existing) {
    const mergedQuantity = existing.soLuong + requestedQuantity;
    if (typeof stock === 'number' && mergedQuantity > stock) {
      return {
        status: 'rejected-stock',
        cart: current,
        currentQuantity: existing.soLuong,
        soLuongTonKho: stock,
      };
    }

    const updatedItem: CartItem = {
      ...existing,
      soLuong: mergedQuantity,
      soLuongTonKho: stock ?? existing.soLuongTonKho,
    };
    const updated = current.map((item) => (item.maSach === input.maSach ? updatedItem : item));
    persistAndNotify(updated);
    return { status: 'merged', cart: updated, item: updatedItem };
  }

  if (typeof stock === 'number' && requestedQuantity > stock) {
    return { status: 'rejected-stock', cart: current, currentQuantity: 0, soLuongTonKho: stock };
  }

  const newItem: CartItem = {
    maSach: input.maSach,
    sachDto: {
      tenSach: input.sachDto.tenSach,
      giaBan: input.sachDto.giaBan,
      hinhAnh: input.sachDto.hinhAnh ?? '',
    },
    soLuong: requestedQuantity,
  };
  if (stock !== undefined) {
    newItem.soLuongTonKho = stock;
  }
  const updated = [...current, newItem];
  persistAndNotify(updated);
  return { status: 'added', cart: updated, item: newItem };
}

/**
 * Sets the absolute quantity for a line (not additive). Re-reads storage
 * fresh first. Quantity is floored to an integer and never allowed below 1;
 * when a stock snapshot is known for that line, quantity is capped to it.
 */
export function updateQuantity(maSach: number, soLuong: number): CartItem[] {
  const current = readCart();
  const requested = Math.max(1, Math.floor(soLuong) || 1);
  const updated = current.map((item) => {
    if (item.maSach !== maSach) return item;
    const finalQuantity = typeof item.soLuongTonKho === 'number'
      ? Math.min(requested, Math.max(1, item.soLuongTonKho))
      : requested;
    return { ...item, soLuong: finalQuantity };
  });
  persistAndNotify(updated);
  return updated;
}

/** Removes one line from the cart. Re-reads storage fresh first. */
export function removeItem(maSach: number): CartItem[] {
  const current = readCart();
  const updated = current.filter((item) => item.maSach !== maSach);
  persistAndNotify(updated);
  return updated;
}

/**
 * A cheap, deterministic fingerprint of the current cart contents. Two
 * fingerprints taken at different times differ if and only if the persisted
 * cart changed in between (including changes made by another tab), which is
 * enough for checkout to detect a stale review before submit.
 */
export function getCartFingerprint(): string {
  return JSON.stringify(readCart());
}

/**
 * Produces the same canonical fingerprint for an already loaded cart. UI code
 * uses this immediately before checkout to prove the reviewed React state still
 * matches the latest persisted cart, without including presentation-only fields
 * such as an asynchronously loaded top-level image URL.
 */
export function getCartFingerprintForItems(items: CartItem[]): string {
  const normalized = mergeDuplicates(
    items.map(normalizeEntry).filter((item): item is CartItem => item !== null),
  );
  return JSON.stringify(normalized);
}
