import {
  createDonHang,
  getDonHangHistory,
  getDonHangDetail,
  cancelDonHang,
  createVNPayPaymentUrl,
  getVNPayCallbackResult,
} from './DonHangApi';
import { apiUrl } from './ApiUrl';

const BASE = apiUrl('');

function createJwt(expirationOffsetMs: number): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor((Date.now() + expirationOffsetMs) / 1000) }));
  return `header.${payload}.signature`;
}

function requestOf(callIndex = 0): [string, RequestInit] {
  return (global.fetch as jest.Mock).mock.calls[callIndex] as [string, RequestInit];
}

describe('DonHangApi', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.setItem('jwt', createJwt(60_000));
    global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  });

  afterEach(() => {
    localStorage.clear();
    global.fetch = originalFetch;
  });

  describe('createDonHang', () => {
    const payload = {
      items: [{ maSach: 1, soLuong: 2 }],
      maDiaChiGiaoHang: 5,
      phuongThucThanhToan: 'COD' as const,
    };

    it('POSTs to /api/don-hang/them with a Bearer token from authRequest (no hand-rolled header)', async () => {
      await createDonHang(payload);

      const [url, options] = requestOf();
      expect(url).toBe(`${BASE}/api/don-hang/them`);
      expect(options.method).toBe('POST');
      expect(options.body).toBe(JSON.stringify(payload));
      const headers = new Headers(options.headers);
      expect(headers.get('Authorization')).toMatch(/^Bearer /);
    });

    it('sends the Idempotency-Key header when a key is provided', async () => {
      await createDonHang(payload, 'abc-123.DEF_456');

      const [, options] = requestOf();
      const headers = new Headers(options.headers);
      expect(headers.get('Idempotency-Key')).toBe('abc-123.DEF_456');
    });

    it('omits the Idempotency-Key header when no key is provided (legacy behavior)', async () => {
      await createDonHang(payload);

      const [, options] = requestOf();
      const headers = new Headers(options.headers);
      expect(headers.has('Idempotency-Key')).toBe(false);
    });

    it('throws with the server-provided message on 409 conflict', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Yêu cầu xung đột' }), { status: 409 }),
      );

      await expect(createDonHang(payload, 'same-key')).rejects.toMatchObject({
        status: 409,
        message: 'Yêu cầu xung đột',
      });
    });
  });

  describe('getDonHangHistory', () => {
    it('GETs /api/don-hang/findAll with the given page, via authRequest', async () => {
      await getDonHangHistory(2);

      const [url, options] = requestOf();
      expect(url).toBe(`${BASE}/api/don-hang/findAll?page=2`);
      expect(new Headers(options.headers).get('Authorization')).toMatch(/^Bearer /);
    });

    it('defaults to page 0 when no page is given', async () => {
      await getDonHangHistory();
      expect(requestOf()[0]).toBe(`${BASE}/api/don-hang/findAll?page=0`);
    });
  });

  describe('getDonHangDetail', () => {
    it('GETs /api/don-hang/{id}, via authRequest', async () => {
      await getDonHangDetail(42);

      const [url, options] = requestOf();
      expect(url).toBe(`${BASE}/api/don-hang/42`);
      expect(new Headers(options.headers).get('Authorization')).toMatch(/^Bearer /);
    });
  });

  describe('cancelDonHang', () => {
    it('POSTs /api/don-hang/huy/{id}, via authRequest', async () => {
      await cancelDonHang(7);

      const [url, options] = requestOf();
      expect(url).toBe(`${BASE}/api/don-hang/huy/7`);
      expect(options.method).toBe('POST');
      expect(new Headers(options.headers).get('Authorization')).toMatch(/^Bearer /);
    });
  });

  describe('createVNPayPaymentUrl', () => {
    it('GETs /api/don-hang/submitOrder with maDonHang, via authRequest', async () => {
      await createVNPayPaymentUrl(99);

      const [url, options] = requestOf();
      expect(url).toBe(`${BASE}/api/don-hang/submitOrder?maDonHang=99`);
      expect(new Headers(options.headers).get('Authorization')).toMatch(/^Bearer /);
    });
  });

  describe('getVNPayCallbackResult', () => {
    it('GETs the public /api/don-hang/vnpay-payment callback with the raw query string and no Authorization header', async () => {
      global.fetch = jest.fn().mockResolvedValue(new Response('ordersuccess', { status: 200 }));

      const result = await getVNPayCallbackResult('?vnp_ResponseCode=00&vnp_OrderInfo=1');

      const [url, options] = requestOf();
      expect(url).toBe(`${BASE}/api/don-hang/vnpay-payment?vnp_ResponseCode=00&vnp_OrderInfo=1`);
      expect(options?.headers ? new Headers(options.headers).has('Authorization') : false).toBe(false);
      expect(result).toBe('ordersuccess');
    });

    it('throws the typed API error when the public callback responds with an error schema', async () => {
      global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({
        status: 400,
        code: 'VNPAY_CALLBACK_INVALID',
        message: 'Kết quả thanh toán không hợp lệ.',
        path: '/api/don-hang/vnpay-payment',
        traceId: 'trace-vnpay',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } }));

      await expect(getVNPayCallbackResult('?bad=true')).rejects.toMatchObject({
        status: 400,
        code: 'VNPAY_CALLBACK_INVALID',
        traceId: 'trace-vnpay',
      });
    });
  });
});
