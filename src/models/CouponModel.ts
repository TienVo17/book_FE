export interface CouponModel {
  maCoupon?: number;
  ma: string;
  loai?: string;
  giaTriGiam?: number;
  giaTriToiThieu?: number;
  hanSuDung?: string;
  soLuongToiDa?: number;
  daSuDung?: number;
  isActive?: boolean;
}

export interface KetQuaKiemTraCoupon {
  hopLe: boolean;
  soTienGiam: number;
  thongBao: string;
}
