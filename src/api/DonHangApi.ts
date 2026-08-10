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
  maHinhThucGiaoHang: number;
  phuongThucThanhToan: 'COD' | 'VNPAY';
  maCoupon?: string;
}

export interface CheckoutOrderResponse {
  maDonHang: number;
  tongTien: number;
  tongTienSanPham: number;
  soTienGiam: number;
  phiVanChuyen: number;
  tenHinhThucGiaoHang: string;
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

export interface HinhThucGiaoHangResponse {
  maHinhThucGiaoHang: number;
  tenHinhThucGiaoHang: string;
  moTa?: string | null;
  chiPhiGiaoHang: number;
}

function isHinhThucGiaoHang(value: unknown): value is HinhThucGiaoHangResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    Number.isInteger(item.maHinhThucGiaoHang) &&
    (item.maHinhThucGiaoHang as number) > 0 &&
    typeof item.tenHinhThucGiaoHang === 'string' &&
    item.tenHinhThucGiaoHang.trim().length > 0 &&
    (item.moTa === undefined || item.moTa === null || typeof item.moTa === 'string') &&
    typeof item.chiPhiGiaoHang === 'number' &&
    Number.isFinite(item.chiPhiGiaoHang) &&
    item.chiPhiGiaoHang >= 0
  );
}

/** Public delivery methods and their server-authoritative fees. */
export async function getHinhThucGiaoHang(): Promise<HinhThucGiaoHangResponse[]> {
  const raw = await publicRequest<unknown>(`${BASE}/api/hinh-thuc-giao-hang`);
  if (!Array.isArray(raw) || raw.length === 0 || !raw.every(isHinhThucGiaoHang)) {
    throw new Error('Dữ liệu hình thức giao hàng không hợp lệ.');
  }
  const ids = raw.map(item => item.maHinhThucGiaoHang);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Dữ liệu hình thức giao hàng không hợp lệ.');
  }
  return raw;
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

export interface DonHangDetailLineItem {
  maSach: number;
  tenSach: string;
  soLuong: number;
  giaBan: number;
  thanhTien: number;
}

export interface DonHangDetail {
  maDonHang: number;
  ngayTao: string;
  hoTen: string;
  soDienThoai: string;
  diaChiNhanHang: string;
  trangThaiThanhToan: number;
  trangThaiGiaoHang: number;
  phuongThucThanhToan?: 'COD' | 'VNPAY' | string | null;
  tenPhuongThucThanhToan?: string | null;
  tenHinhThucGiaoHang?: string | null;
  tongTienSanPham: number;
  soTienGiam: number;
  chiPhiGiaoHang: number;
  chiPhiThanhToan: number;
  tongTien: number;
  danhSachChiTietDonHang: DonHangDetailLineItem[];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRequiredString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string';
}

function isDonHangDetailLineItem(value: unknown): value is DonHangDetailLineItem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    Number.isSafeInteger(item.maSach) && (item.maSach as number) > 0 &&
    isRequiredString(item.tenSach) &&
    Number.isSafeInteger(item.soLuong) && (item.soLuong as number) > 0 &&
    isFiniteNumber(item.giaBan) && item.giaBan >= 0 &&
    isFiniteNumber(item.thanhTien) && item.thanhTien >= 0
  );
}

function isDonHangDetail(value: unknown): value is DonHangDetail {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const detail = value as Record<string, unknown>;
  return (
    Number.isSafeInteger(detail.maDonHang) && (detail.maDonHang as number) > 0 &&
    isRequiredString(detail.ngayTao) && !Number.isNaN(Date.parse(detail.ngayTao)) &&
    typeof detail.hoTen === 'string' &&
    typeof detail.soDienThoai === 'string' &&
    typeof detail.diaChiNhanHang === 'string' &&
    Number.isInteger(detail.trangThaiThanhToan) &&
    Number.isInteger(detail.trangThaiGiaoHang) &&
    isOptionalString(detail.phuongThucThanhToan) &&
    isOptionalString(detail.tenPhuongThucThanhToan) &&
    isOptionalString(detail.tenHinhThucGiaoHang) &&
    isFiniteNumber(detail.tongTienSanPham) && detail.tongTienSanPham >= 0 &&
    isFiniteNumber(detail.soTienGiam) && detail.soTienGiam >= 0 &&
    isFiniteNumber(detail.chiPhiGiaoHang) && detail.chiPhiGiaoHang >= 0 &&
    isFiniteNumber(detail.chiPhiThanhToan) && detail.chiPhiThanhToan >= 0 &&
    isFiniteNumber(detail.tongTien) && detail.tongTien >= 0 &&
    Array.isArray(detail.danhSachChiTietDonHang) &&
    detail.danhSachChiTietDonHang.every(isDonHangDetailLineItem)
  );
}

export interface ThongBaoResponse {
  noiDung?: string;
}

/**
 * Creates an order with the required idempotency key. The server enforces the
 * `^[A-Za-z0-9._-]+$` allow-list and a maximum length of 100 characters. The
 * response includes the server-authoritative shipping method and fee.
 */
export async function createDonHang(
  payload: CheckoutOrderRequest,
  idempotencyKey: string,
): Promise<CheckoutOrderResponse> {
  return authRequest<CheckoutOrderResponse>(`${BASE}/api/don-hang/them`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload),
  });
}

/** Order history (current user, or all orders when the caller is an admin). */
export async function getDonHangHistory(page = 0): Promise<DonHangPage> {
  return authRequest<DonHangPage>(`${BASE}/api/don-hang/findAll?page=${page}`);
}

/** Single order detail; server enforces owner/admin access. */
export async function getDonHangDetail(maDonHang: number): Promise<DonHangDetail> {
  const raw = await authRequest<unknown>(`${BASE}/api/don-hang/${maDonHang}`);
  if (!isDonHangDetail(raw)) {
    throw new Error('Dữ liệu chi tiết đơn hàng không hợp lệ.');
  }
  return raw;
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
