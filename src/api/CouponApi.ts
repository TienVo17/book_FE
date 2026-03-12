import { authRequest } from './Request';
import { CouponModel, KetQuaKiemTraCoupon } from '../models/CouponModel';

const BASE = 'http://localhost:8080';

// User-facing: kiểm tra mã giảm giá
export async function kiemTraCoupon(ma: string, tongTien: number): Promise<KetQuaKiemTraCoupon> {
  return authRequest<KetQuaKiemTraCoupon>(`${BASE}/api/coupon/kiem-tra`, {
    method: 'POST',
    body: JSON.stringify({ ma, tongTien }),
  });
}

// Admin CRUD
export async function getAllCoupons(): Promise<CouponModel[]> {
  return authRequest<CouponModel[]>(`${BASE}/api/admin/coupon`);
}

export async function themCoupon(coupon: CouponModel) {
  return authRequest(`${BASE}/api/admin/coupon`, {
    method: 'POST',
    body: JSON.stringify(coupon),
  });
}

export async function capNhatCoupon(coupon: CouponModel) {
  return authRequest(`${BASE}/api/admin/coupon/${coupon.maCoupon}`, {
    method: 'PUT',
    body: JSON.stringify(coupon),
  });
}

export async function xoaCoupon(id: number) {
  return authRequest(`${BASE}/api/admin/coupon/${id}`, { method: 'DELETE' });
}
