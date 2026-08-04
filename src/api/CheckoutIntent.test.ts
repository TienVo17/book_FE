import {
  CheckoutIntentStaleError,
  buildCheckoutIntentFingerprint,
  clearIntent,
  ensureIntent,
  readIntent,
  startNewIntent,
} from './CheckoutIntent';

const STORAGE_KEY = 'checkoutIdempotencyIntent';

describe('CheckoutIntent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('persists a new key and reuses it while the reviewed fingerprint is unchanged', () => {
    const first = ensureIntent('cart-a');
    const retry = ensureIntent('cart-a');

    expect(first.key).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(first.key.length).toBeLessThanOrEqual(100);
    expect(retry).toEqual(first);
    expect(readIntent()).toEqual(first);
  });

  it('requires explicit review before replacing an intent for a changed fingerprint', () => {
    const previous = ensureIntent('cart-a');

    expect(() => ensureIntent('cart-b')).toThrow(CheckoutIntentStaleError);
    expect(readIntent()).toEqual(previous);

    const reviewed = startNewIntent('cart-b');
    expect(reviewed.fingerprint).toBe('cart-b');
    expect(reviewed.key).not.toBe(previous.key);
  });

  it('changes the complete intent fingerprint when address, payment or normalized coupon changes', () => {
    const base = {
      cartFingerprint: '[{"maSach":1,"soLuong":1}]',
      maDiaChiGiaoHang: 5,
      phuongThucThanhToan: 'COD' as const,
      maCoupon: ' save10 ',
    };

    const fingerprint = buildCheckoutIntentFingerprint(base);
    expect(buildCheckoutIntentFingerprint({ ...base, maCoupon: 'SAVE10' })).toBe(fingerprint);
    expect(buildCheckoutIntentFingerprint({ ...base, maDiaChiGiaoHang: 6 })).not.toBe(fingerprint);
    expect(buildCheckoutIntentFingerprint({ ...base, phuongThucThanhToan: 'VNPAY' })).not.toBe(fingerprint);
    expect(buildCheckoutIntentFingerprint({ ...base, maCoupon: 'SAVE20' })).not.toBe(fingerprint);
  });

  it('quarantines malformed persisted data and clears only after an explicit success call', () => {
    localStorage.setItem(STORAGE_KEY, '{broken');
    expect(readIntent()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    const pending = ensureIntent('cart-a');
    expect(readIntent()).toEqual(pending);

    clearIntent();
    expect(readIntent()).toBeNull();
  });
});
