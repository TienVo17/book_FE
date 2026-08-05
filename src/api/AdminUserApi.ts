import { authRequest } from './Request';
import { apiUrl } from './ApiUrl';

const BASE = apiUrl('');

export interface QuyenModel {
  maQuyen: number;
  tenQuyen: string;
}

export function getQuyenAdmin(): Promise<QuyenModel[]> {
  return authRequest(`${BASE}/api/admin/quyen/findAll`);
}

export function phanQuyenNguoiDung(userId: number | undefined, quyenIds: number[]): Promise<unknown> {
  return authRequest(`${BASE}/api/admin/user/phan-quyen`, {
    method: 'POST',
    body: JSON.stringify({ userId, quyenIds }),
  });
}
