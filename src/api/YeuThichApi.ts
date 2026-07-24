import { authRequest } from './Request';

import { apiUrl } from './ApiUrl';

const BASE = apiUrl('');

export interface YeuThichItem {
  maSach: number;
  tenSach: string;
  giaBan: number;
  hinhAnh: string;
}

export async function getDanhSachYeuThich(): Promise<YeuThichItem[]> {
  return authRequest<YeuThichItem[]>(`${BASE}/api/yeu-thich`);
}

export async function themYeuThich(maSach: number) {
  return authRequest(`${BASE}/api/yeu-thich/${maSach}`, { method: 'POST' });
}

export async function xoaYeuThich(maSach: number) {
  return authRequest(`${BASE}/api/yeu-thich/${maSach}`, { method: 'DELETE' });
}
