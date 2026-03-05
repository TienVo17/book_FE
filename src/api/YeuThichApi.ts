import { authRequest } from './Request';

const BASE = 'http://localhost:8080';

export async function getDanhSachYeuThich() {
  return authRequest(`${BASE}/api/yeu-thich`);
}

export async function themYeuThich(maSach: number) {
  return authRequest(`${BASE}/api/yeu-thich/${maSach}`, { method: 'POST' });
}

export async function xoaYeuThich(maSach: number) {
  return authRequest(`${BASE}/api/yeu-thich/${maSach}`, { method: 'DELETE' });
}
