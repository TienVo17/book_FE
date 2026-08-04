import fs from 'fs';
import path from 'path';
import {
  readCart,
  addOrUpdateItem,
  updateQuantity,
  removeItem,
  clearCart,
  getCartFingerprint,
  getCartFingerprintForItems,
} from './CartStorage';

const STORAGE_KEY = 'gioHang';

describe('CartStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('reads existing valid sachDto-shaped entries unchanged', () => {
    const existing = [
      { maSach: 1, sachDto: { tenSach: 'A', giaBan: 1000, hinhAnh: 'x.jpg' }, soLuong: 2, soLuongTonKho: 5 },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

    expect(readCart()).toEqual(existing);
  });

  it('migrates legacy flat {tenSach, giaBan} entries into the canonical sachDto shape', () => {
    const legacyFlat = [{ maSach: 2, tenSach: 'B', giaBan: 2000, soLuong: 3, hinhAnh: 'y.jpg' }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyFlat));

    expect(readCart()).toEqual([
      { maSach: 2, sachDto: { tenSach: 'B', giaBan: 2000, hinhAnh: 'y.jpg' }, soLuong: 3 },
    ]);
  });

  it('migrates a legacy flat entry with no hinhAnh into an empty string image', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ maSach: 9, tenSach: 'No image', giaBan: 500, soLuong: 1 }]));

    expect(readCart()).toEqual([
      { maSach: 9, sachDto: { tenSach: 'No image', giaBan: 500, hinhAnh: '' }, soLuong: 1 },
    ]);
  });

  it('quarantines malformed JSON without throwing, and the app can continue reading an empty cart', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');

    expect(() => readCart()).not.toThrow();
    expect(readCart()).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('quarantines a non-array JSON value without throwing', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: 'an array' }));

    expect(() => readCart()).not.toThrow();
    expect(readCart()).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('drops an individual entry that has neither a sachDto nor legacy flat name/price, without crashing the rest of the cart', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { maSach: 10, soLuong: 1 }, // unrecoverable: no name/price anywhere
        { maSach: 11, sachDto: { tenSach: 'Valid', giaBan: 100, hinhAnh: '' }, soLuong: 1 },
      ]),
    );

    expect(readCart()).toEqual([
      { maSach: 11, sachDto: { tenSach: 'Valid', giaBan: 100, hinhAnh: '' }, soLuong: 1 },
    ]);
  });

  it('merges duplicate maSach entries deterministically, summing quantity and clamping to the smallest known stock snapshot', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { maSach: 3, sachDto: { tenSach: 'C', giaBan: 100, hinhAnh: '' }, soLuong: 2, soLuongTonKho: 5 },
        { maSach: 3, sachDto: { tenSach: 'C', giaBan: 100, hinhAnh: '' }, soLuong: 4, soLuongTonKho: 5 },
        { maSach: 4, sachDto: { tenSach: 'D', giaBan: 50, hinhAnh: '' }, soLuong: 1 },
      ]),
    );

    const cart = readCart();
    expect(cart).toHaveLength(2);
    expect(cart[0]).toEqual({ maSach: 3, sachDto: { tenSach: 'C', giaBan: 100, hinhAnh: '' }, soLuong: 5, soLuongTonKho: 5 });
    expect(cart[1]).toEqual({ maSach: 4, sachDto: { tenSach: 'D', giaBan: 50, hinhAnh: '' }, soLuong: 1 });
  });

  it('never lets quantity fall below 1, even when stored as 0 or negative', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { maSach: 5, sachDto: { tenSach: 'E', giaBan: 10, hinhAnh: '' }, soLuong: 0 },
        { maSach: 6, sachDto: { tenSach: 'F', giaBan: 10, hinhAnh: '' }, soLuong: -3 },
      ]),
    );

    const cart = readCart();
    expect(cart.find((i) => i.maSach === 5)?.soLuong).toBe(1);
    expect(cart.find((i) => i.maSach === 6)?.soLuong).toBe(1);
  });

  it('dispatches exactly one cartUpdated event per same-tab mutation: addOrUpdateItem', () => {
    const spy = jest.fn();
    window.addEventListener('cartUpdated', spy);
    addOrUpdateItem({ maSach: 1, sachDto: { tenSach: 'A', giaBan: 100 }, soLuong: 1 });
    window.removeEventListener('cartUpdated', spy);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('dispatches exactly one cartUpdated event per same-tab mutation: updateQuantity', () => {
    addOrUpdateItem({ maSach: 1, sachDto: { tenSach: 'A', giaBan: 100 }, soLuong: 1 });
    const spy = jest.fn();
    window.addEventListener('cartUpdated', spy);
    updateQuantity(1, 3);
    window.removeEventListener('cartUpdated', spy);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('dispatches exactly one cartUpdated event per same-tab mutation: removeItem', () => {
    addOrUpdateItem({ maSach: 1, sachDto: { tenSach: 'A', giaBan: 100 }, soLuong: 1 });
    const spy = jest.fn();
    window.addEventListener('cartUpdated', spy);
    removeItem(1);
    window.removeEventListener('cartUpdated', spy);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('dispatches exactly one cartUpdated event per same-tab mutation: clearCart', () => {
    addOrUpdateItem({ maSach: 1, sachDto: { tenSach: 'A', giaBan: 100 }, soLuong: 1 });
    const spy = jest.fn();
    window.addEventListener('cartUpdated', spy);
    clearCart();
    window.removeEventListener('cartUpdated', spy);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch cartUpdated or write storage when addOrUpdateItem is rejected for exceeding stock', () => {
    addOrUpdateItem({ maSach: 1, sachDto: { tenSach: 'A', giaBan: 100 }, soLuong: 4, soLuongTonKho: 5 });
    const spy = jest.fn();
    window.addEventListener('cartUpdated', spy);
    const outcome = addOrUpdateItem({ maSach: 1, sachDto: { tenSach: 'A', giaBan: 100 }, soLuong: 5, soLuongTonKho: 5 });
    window.removeEventListener('cartUpdated', spy);

    expect(outcome.status).toBe('rejected-stock');
    expect(spy).not.toHaveBeenCalled();
    expect(readCart().find((i) => i.maSach === 1)?.soLuong).toBe(4);
  });

  it('read-modify-write always re-reads current storage first, so a write from another tab is not clobbered by a stale in-memory snapshot', () => {
    addOrUpdateItem({ maSach: 1, sachDto: { tenSach: 'A', giaBan: 100 }, soLuong: 1 });

    // Simulate another tab adding a second line directly to storage, bypassing CartStorage.
    const currentRaw = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
    const otherTabWrite = [
      ...currentRaw,
      { maSach: 2, sachDto: { tenSach: 'B', giaBan: 200, hinhAnh: '' }, soLuong: 1 },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(otherTabWrite));

    // This tab's in-memory belief about the cart is stale (only knows about maSach 1).
    // updateQuantity must re-read storage fresh rather than trust a stale snapshot.
    const result = updateQuantity(1, 5);

    expect(result.find((i) => i.maSach === 1)?.soLuong).toBe(5);
    expect(result.find((i) => i.maSach === 2)).toBeDefined();
    expect(result).toHaveLength(2);
  });

  it('reports a changed fingerprint when another tab modifies the cart, and a stable one when nothing changed', () => {
    addOrUpdateItem({ maSach: 1, sachDto: { tenSach: 'A', giaBan: 100 }, soLuong: 1 });
    const reviewedCart = readCart().map(item => ({ ...item, hinhAnh: 'presentation-only.jpg' }));
    const fingerprintBefore = getCartFingerprint();

    expect(getCartFingerprint()).toBe(fingerprintBefore);
    expect(getCartFingerprintForItems(reviewedCart)).toBe(fingerprintBefore);

    // Another tab mutates storage directly.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ maSach: 1, sachDto: { tenSach: 'A', giaBan: 100, hinhAnh: '' }, soLuong: 9 }]),
    );

    expect(getCartFingerprint()).not.toBe(fingerprintBefore);
    expect(getCartFingerprintForItems(reviewedCart)).toBe(fingerprintBefore);
  });

  it('buy-now style merge (addOrUpdateItem on a distinct book) preserves all existing cart lines', () => {
    addOrUpdateItem({ maSach: 1, sachDto: { tenSach: 'A', giaBan: 100 }, soLuong: 1 });
    addOrUpdateItem({ maSach: 2, sachDto: { tenSach: 'B', giaBan: 200 }, soLuong: 2 });

    const outcome = addOrUpdateItem({ maSach: 3, sachDto: { tenSach: 'C', giaBan: 300 }, soLuong: 1, soLuongTonKho: 10 });

    expect(outcome.status).toBe('added');
    expect(outcome.cart).toEqual([
      { maSach: 1, sachDto: { tenSach: 'A', giaBan: 100, hinhAnh: '' }, soLuong: 1 },
      { maSach: 2, sachDto: { tenSach: 'B', giaBan: 200, hinhAnh: '' }, soLuong: 2 },
      { maSach: 3, sachDto: { tenSach: 'C', giaBan: 300, hinhAnh: '' }, soLuong: 1, soLuongTonKho: 10 },
    ]);
  });

  it('updateQuantity clamps to the known stock snapshot and never goes below 1', () => {
    addOrUpdateItem({ maSach: 1, sachDto: { tenSach: 'A', giaBan: 100 }, soLuong: 1, soLuongTonKho: 3 });

    expect(updateQuantity(1, 99).find((i) => i.maSach === 1)?.soLuong).toBe(3);
    expect(updateQuantity(1, -5).find((i) => i.maSach === 1)?.soLuong).toBe(1);
  });
});

describe('cart storage source migration', () => {
  const testFilePattern = /\.(test|spec)\.(js|jsx|ts|tsx)$/;
  const forbiddenCallPattern = /localStorage\.(setItem|removeItem)\(\s*['"]gioHang['"]/;

  function sourceFiles(directory: string): string[] {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return sourceFiles(entryPath);
      }
      return /\.(js|jsx|ts|tsx)$/.test(entry.name) ? [entryPath] : [];
    });
  }

  it('keeps direct gioHang localStorage mutation exclusively inside CartStorage.ts', () => {
    const sourceDirectory = path.join(process.cwd(), 'src');
    const cartStoragePath = path.join(sourceDirectory, 'api', 'CartStorage.ts');

    const filesOutsideCartStorage = sourceFiles(sourceDirectory)
      .filter((filePath) => path.resolve(filePath) !== path.resolve(cartStoragePath))
      .filter((filePath) => !testFilePattern.test(filePath));

    const filesWithDirectMutation = filesOutsideCartStorage.filter((filePath) => {
      const source = fs.readFileSync(filePath, 'utf8');
      return forbiddenCallPattern.test(source);
    });

    expect(filesWithDirectMutation).toEqual([]);
  });
});
