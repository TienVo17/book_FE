/**
 * Persists the pending checkout idempotency intent (UUID key + cart
 * fingerprint) across a submit attempt, so a network failure or a lost
 * response can be retried with the exact same `Idempotency-Key` instead of
 * silently creating a duplicate order. Stored under its own localStorage key
 * (never 'gioHang' — CartStorage.ts remains the sole owner of that key).
 */

const STORAGE_KEY = 'checkoutIdempotencyIntent';
const MAX_KEY_LENGTH = 100;
const KEY_PATTERN = /^[A-Za-z0-9._-]+$/;

export interface CheckoutIntent {
  key: string;
  fingerprint: string;
}

export interface CheckoutIntentInput {
  cartFingerprint: string;
  maDiaChiGiaoHang: number;
  maHinhThucGiaoHang: number;
  phuongThucThanhToan: 'COD' | 'VNPAY';
  maCoupon?: string;
}

/**
 * Binds the pending key to the complete checkout intent, not only the cart.
 * This mirrors the backend fingerprint fields so changing address, delivery,
 * payment or coupon cannot silently reuse a key that represents another request.
 */
export function buildCheckoutIntentFingerprint(input: CheckoutIntentInput): string {
  const coupon = input.maCoupon?.trim().toUpperCase() ?? '';
  return JSON.stringify({
    cart: input.cartFingerprint,
    address: input.maDiaChiGiaoHang,
    delivery: input.maHinhThucGiaoHang,
    payment: input.phuongThucThanhToan,
    coupon,
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidIntent(value: unknown): value is CheckoutIntent {
  if (!isPlainObject(value)) return false;
  const { key, fingerprint } = value;
  return (
    typeof key === 'string' &&
    key.length > 0 &&
    key.length <= MAX_KEY_LENGTH &&
    KEY_PATTERN.test(key) &&
    typeof fingerprint === 'string'
  );
}

/**
 * Generates a fresh idempotency key. Prefers `crypto.randomUUID()` (already
 * satisfies the backend allow-list `^[A-Za-z0-9._-]+$`); falls back to a
 * manually assembled key using only allow-listed characters when
 * `randomUUID` is unavailable (older browsers / non-HTTPS contexts).
 */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let random = '';
  for (let i = 0; i < 32; i += 1) {
    random += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  const key = `fallback-${Date.now().toString(36)}-${random}`;
  return key.slice(0, MAX_KEY_LENGTH);
}

/** Reads the persisted intent. Never throws; malformed data reads as null. */
export function readIntent(): CheckoutIntent | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }

  if (!isValidIntent(parsed)) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }

  return parsed;
}

/** Persists the given intent as-is (caller decides key/fingerprint). */
export function persistIntent(intent: CheckoutIntent): CheckoutIntent {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
  return intent;
}

/**
 * Ensures a persisted intent exists whose fingerprint matches `fingerprint`.
 * - No intent yet -> creates and persists a new one.
 * - Existing intent already matches -> returned unchanged (so a retry after
 *   a network failure / lost response reuses the same key).
 * - Existing intent belongs to a stale fingerprint -> throws
 *   `CheckoutIntentStaleError` instead of silently reusing or replacing it;
 *   callers must explicitly acknowledge review before calling
 *   `startNewIntent` for the current fingerprint.
 */
export class CheckoutIntentStaleError extends Error {
  constructor(public readonly staleIntent: CheckoutIntent) {
    super('Giỏ hàng đã thay đổi kể từ lần thử đặt hàng trước.');
    this.name = 'CheckoutIntentStaleError';
  }
}

export function ensureIntent(fingerprint: string): CheckoutIntent {
  const existing = readIntent();
  if (existing && existing.fingerprint === fingerprint) {
    return existing;
  }
  if (existing && existing.fingerprint !== fingerprint) {
    throw new CheckoutIntentStaleError(existing);
  }
  return persistIntent({ key: generateIdempotencyKey(), fingerprint });
}

/** Discards any stale intent and starts a fresh one bound to `fingerprint`. */
export function startNewIntent(fingerprint: string): CheckoutIntent {
  return persistIntent({ key: generateIdempotencyKey(), fingerprint });
}

/** Clears the pending intent. Call only after a committed server response. */
export function clearIntent(): void {
  localStorage.removeItem(STORAGE_KEY);
}
