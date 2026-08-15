import {
  addServerCartItem,
  getServerCart,
  mergeGuestCart,
  removeServerCartItem,
  updateServerCartItem,
} from './CartApi';
import { apiUrl } from './ApiUrl';

jest.mock('./AuthSession', () => ({
  __esModule: true,
  captureAuthenticatedRequest: () => ({ accessToken: 'test-access-token', revision: 1 }),
  isCurrentAuthCapture: () => true,
  refreshForRequest: () => Promise.resolve(false),
  invalidateAuthCapture: () => false,
}));

const serverSummary = {
  items: [{
    maSach: 7,
    tenSach: 'Sách kiểm thử',
    giaBan: 125000,
    soLuong: 2,
    soLuongTon: 9,
    hinhAnh: 'cover.jpg',
    isActive: true,
  }],
  tongSoLuong: 2,
  tongTien: 250000,
};

describe('CartApi', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn().mockImplementation(() => Promise.resolve(
      new Response(JSON.stringify(serverSummary), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));
  });

  afterEach(() => {
    localStorage.clear();
    global.fetch = originalFetch;
  });

  it('maps the backend summary into the canonical CartItem shape', async () => {
    await expect(getServerCart()).resolves.toEqual({
      items: [{
        maSach: 7,
        sachDto: { tenSach: 'Sách kiểm thử', giaBan: 125000, hinhAnh: 'cover.jpg' },
        soLuong: 2,
        soLuongTonKho: 9,
      }],
      tongSoLuong: 2,
      tongTien: 250000,
    });

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(apiUrl('/api/gio-hang'));
    expect(new Headers(options.headers).get('Authorization')).toMatch(/^Bearer /);
  });

  it('uses the server cart mutation contracts', async () => {
    await addServerCartItem(7, 2);
    await updateServerCartItem(7, 4);
    await removeServerCartItem(7);

    const calls = (global.fetch as jest.Mock).mock.calls as Array<[string, RequestInit]>;
    expect(calls[0][0]).toBe(apiUrl('/api/gio-hang/items'));
    expect(calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ maSach: 7, soLuong: 2 }) });
    expect(calls[1][0]).toBe(apiUrl('/api/gio-hang/items/7'));
    expect(calls[1][1]).toMatchObject({ method: 'PUT', body: JSON.stringify({ soLuong: 4 }) });
    expect(calls[2][0]).toBe(apiUrl('/api/gio-hang/items/7'));
    expect(calls[2][1].method).toBe('DELETE');
  });

  it('sends a stable merge payload with the required idempotency key', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({
      ...serverSummary,
      mergedCount: 1,
      adjustedItems: [],
      removedItems: [],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await mergeGuestCart([
      { maSach: 7, soLuong: 2 },
      { maSach: 3, soLuong: 1 },
    ], 'merge-key-123');

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(apiUrl('/api/gio-hang/merge'));
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({
      items: [
        { maSach: 7, soLuong: 2 },
        { maSach: 3, soLuong: 1 },
      ],
    }));
    expect(new Headers(options.headers).get('Idempotency-Key')).toBe('merge-key-123');
  });

  it('rejects malformed server data instead of poisoning the local cache', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({
      ...serverSummary,
      items: [{ ...serverSummary.items[0], soLuong: 0 }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(getServerCart()).rejects.toThrow('Dữ liệu giỏ hàng từ máy chủ không hợp lệ.');
  });
});
