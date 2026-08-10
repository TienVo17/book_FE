import {
  createDonHang,
  getDonHangHistory,
  getDonHangDetail,
  cancelDonHang,
  createVNPayPaymentUrl,
  getVNPayCallbackResult,
  getHinhThucGiaoHang,
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
      maHinhThucGiaoHang: 1,
      phuongThucThanhToan: 'COD' as const,
    };

    it('POSTs to /api/don-hang/them with auth and the required idempotency key', async () => {
      await createDonHang(payload, 'checkout-key');

      const [url, options] = requestOf();
      expect(url).toBe(`${BASE}/api/don-hang/them`);
      expect(options.method).toBe('POST');
      expect(options.body).toBe(JSON.stringify(payload));
      const headers = new Headers(options.headers);
      expect(headers.get('Authorization')).toMatch(/^Bearer /);
      expect(headers.get('Idempotency-Key')).toBe('checkout-key');
    });

    it('sends the Idempotency-Key header when a key is provided', async () => {
      await createDonHang(payload, 'abc-123.DEF_456');

      const [, options] = requestOf();
      const headers = new Headers(options.headers);
      expect(headers.get('Idempotency-Key')).toBe('abc-123.DEF_456');
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

  describe('getHinhThucGiaoHang', () => {
    it('GETs the public delivery method reference data without an Authorization header', async () => {
      global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify([
        {
          maHinhThucGiaoHang: 2,
          tenHinhThucGiaoHang: 'Tự lấy hàng tại cửa hàng',
          moTa: 'Nhận tại cửa hàng',
          chiPhiGiaoHang: 0,
        },
      ]), { status: 200, headers: { 'Content-Type': 'application/json' } }));

      const result = await getHinhThucGiaoHang();

      const [url, options] = requestOf();
      expect(url).toBe(`${BASE}/api/hinh-thuc-giao-hang`);
      expect(options?.headers ? new Headers(options.headers).has('Authorization') : false).toBe(false);
      expect(result).toHaveLength(1);
    });

    it('accepts a valid method when its optional description is omitted', async () => {
      global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify([
        { maHinhThucGiaoHang: 1, tenHinhThucGiaoHang: 'Giao tận nơi', chiPhiGiaoHang: 10000 },
      ]), { status: 200, headers: { 'Content-Type': 'application/json' } }));

      await expect(getHinhThucGiaoHang()).resolves.toHaveLength(1);
    });

    it.each<unknown>([
      [{ maHinhThucGiaoHang: 1, tenHinhThucGiaoHang: 'Giao tận nơi', chiPhiGiaoHang: '10000' }],
      [{ maHinhThucGiaoHang: 0, tenHinhThucGiaoHang: 'Giao tận nơi', chiPhiGiaoHang: 10000 }],
      [{ maHinhThucGiaoHang: 1, tenHinhThucGiaoHang: '   ', chiPhiGiaoHang: 10000 }],
      [
        { maHinhThucGiaoHang: 1, tenHinhThucGiaoHang: 'Giao tận nơi', chiPhiGiaoHang: 10000 },
        { maHinhThucGiaoHang: 1, tenHinhThucGiaoHang: 'Trùng mã', chiPhiGiaoHang: 0 },
      ],
    ])('rejects invalid reference data instead of showing a wrong shipping total', async invalidBody => {
      global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify(invalidBody), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      await expect(getHinhThucGiaoHang()).rejects.toThrow('Dữ liệu hình thức giao hàng không hợp lệ.');
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
    it('GETs /api/don-hang/{id}, via authRequest and returns the typed detail contract', async () => {
      const detail = {
        maDonHang: 42,
        ngayTao: '2026-08-10T08:00:00Z',
        hoTen: 'Nguyễn Văn A',
        soDienThoai: '0900000000',
        diaChiNhanHang: '1 Đường Sách',
        trangThaiThanhToan: 0,
        trangThaiGiaoHang: 0,
        phuongThucThanhToan: 'COD',
        tenPhuongThucThanhToan: 'Thanh toán khi nhận hàng',
        tenHinhThucGiaoHang: 'Giao hàng tận nơi',
        tongTienSanPham: 200000,
        soTienGiam: 10000,
        chiPhiGiaoHang: 10000,
        chiPhiThanhToan: 0,
        tongTien: 200000,
        danhSachChiTietDonHang: [{
          maSach: 3,
          tenSach: 'Sách kiểm thử',
          soLuong: 2,
          giaBan: 100000,
          thanhTien: 200000,
        }],
      };
      global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify(detail), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const result = await getDonHangDetail(42);

      const [url, options] = requestOf();
      expect(url).toBe(`${BASE}/api/don-hang/42`);
      expect(new Headers(options.headers).get('Authorization')).toMatch(/^Bearer /);
      expect(result.danhSachChiTietDonHang[0]).toEqual(expect.objectContaining({
        tenSach: 'Sách kiểm thử',
        giaBan: 100000,
        thanhTien: 200000,
      }));
    });

    it.each([
      {},
      { maDonHang: 42, danhSachChiTietDonHang: null },
      {
        maDonHang: 42,
        ngayTao: 'not-a-date',
        hoTen: '',
        soDienThoai: '',
        diaChiNhanHang: '',
        trangThaiThanhToan: 0,
        trangThaiGiaoHang: 0,
        tongTienSanPham: 0,
        soTienGiam: 0,
        chiPhiGiaoHang: 0,
        chiPhiThanhToan: 0,
        tongTien: 0,
        danhSachChiTietDonHang: [],
      },
    ])('rejects malformed detail payloads instead of crashing the page', async invalidBody => {
      global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify(invalidBody), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      await expect(getDonHangDetail(42)).rejects.toThrow(
        'Dữ liệu chi tiết đơn hàng không hợp lệ.',
      );
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
