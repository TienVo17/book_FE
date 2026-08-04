import { authRequest, publicRequest } from './Request';
import { apiUrl } from './ApiUrl';

const BASE = apiUrl('');

export interface CheckoutOrderItem {
  maSach: number;
  soLuong: number;
}

export interface CheckoutOrderRequest {
  items: CheckoutOrderItem[];
  maDiaChiGiaoHang: number;
  phuongThucThanhToan: 'COD' | 'VNPAY';
  maCoupon?: string;
}

export interface CheckoutOrderResponse {
  maDonHang: number;
  tongTien: number;
  tongTienSanPham: number;
  soTienGiam: number;
  maCoupon?: string | null;
  phuongThucThanhToan: 'COD' | 'VNPAY';
  trangThaiThanhToan: number;
  hoTen: string;
  soDienThoai: string;
  diaChiNhanHang: string;
}

export interface VNPayUrlResponse {
  paymentUrl: string;
}

export interface DonHangListItem {
  maDonHang: number;
  ngayTao: string;
  diaChiNhanHang: string;
  phuongThucThanhToan?: 'COD' | 'VNPAY' | string;
  tenPhuongThucThanhToan?: string;
  trangThaiThanhToan: number;
  trangThaiGiaoHang: number;
  tongTien: number;
}

export interface DonHangPage {
  content: DonHangListItem[];
  totalPages: number;
  totalElements: number;
}

export interface ThongBaoResponse {
  noiDung?: string;
}

/**
 * Creates an order. When `idempotencyKey` is provided it is sent as the
 * `Idempotency-Key` header (allow-list `^[A-Za-z0-9._-]+$`, max 100 chars is
 * enforced server-side); omitting it preserves the legacy non-idempotent
 * behavior. The CheckoutOrderResponse JSON shape is unchanged either way.
 */
export async function createDonHang(
  payload: CheckoutOrderRequest,
  idempotencyKey?: string,
): Promise<CheckoutOrderResponse> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  return authRequest<CheckoutOrderResponse>(`${BASE}/api/don-hang/them`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}

/** Order history (current user, or all orders when the caller is an admin). */
export async function getDonHangHistory(page = 0): Promise<DonHangPage> {
  return authRequest<DonHangPage>(`${BASE}/api/don-hang/findAll?page=${page}`);
}

/** Single order detail; server enforces owner/admin access. */
export async function getDonHangDetail(maDonHang: number): Promise<unknown> {
  return authRequest<unknown>(`${BASE}/api/don-hang/${maDonHang}`);
}

/** Cancels an order the current user owns (or any order, for an admin). */
export async function cancelDonHang(maDonHang: number): Promise<ThongBaoResponse> {
  return authRequest<ThongBaoResponse>(`${BASE}/api/don-hang/huy/${maDonHang}`, {
    method: 'POST',
  });
}

/** Creates a VNPay payment link for an already-created order. */
export async function createVNPayPaymentUrl(maDonHang: number): Promise<VNPayUrlResponse> {
  return authRequest<VNPayUrlResponse>(`${BASE}/api/don-hang/submitOrder?maDonHang=${maDonHang}`);
}

/** Advances an order's delivery status by one step (admin action). */
export async function capNhatTrangThaiGiaoHang(maDonHang: number): Promise<unknown> {
  return authRequest<unknown>(`${BASE}/api/don-hang/cap-nhat-trang-thai-giao-hang/${maDonHang}`, {
    method: 'POST',
  });
}

/**
 * VNPay redirects the browser back to this endpoint after the user pays; it
 * is a public callback (VNPay's redirect, not an authenticated fetch from our
 * SPA) and must not carry an Authorization header. `queryString` must be the
 * raw `window.location.search` (including the leading `?`) forwarded as-is.
 */
export async function getVNPayCallbackResult(queryString: string): Promise<string> {
  return publicRequest<string>(`${BASE}/api/don-hang/vnpay-payment${queryString}`);
}
