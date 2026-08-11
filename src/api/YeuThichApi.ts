import { authRequest } from './Request';

import { apiUrl } from './ApiUrl';

const BASE = apiUrl('');

export interface YeuThichItem {
  maSach: number;
  tenSach: string;
  giaBan: number;
  hinhAnh: string;
}

const WISHLIST_ITEM_KEYS = ['giaBan', 'hinhAnh', 'maSach', 'tenSach'];

function isYeuThichItem(value: unknown): value is YeuThichItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Partial<YeuThichItem>;
  const keys = Object.keys(value).sort();
  return keys.length === WISHLIST_ITEM_KEYS.length &&
    keys.every((key, index) => key === WISHLIST_ITEM_KEYS[index]) &&
    Number.isInteger(item.maSach) && typeof item.maSach === 'number' && item.maSach > 0 &&
    typeof item.tenSach === 'string' &&
    typeof item.giaBan === 'number' && Number.isFinite(item.giaBan) && item.giaBan >= 0 &&
    typeof item.hinhAnh === 'string';
}

function validateWishlistResponse(value: unknown): YeuThichItem[] {
  if (!Array.isArray(value) || !value.every(isYeuThichItem)) {
    throw new Error('Dữ liệu danh sách yêu thích không hợp lệ.');
  }
  return value.map(item => ({
    maSach: item.maSach,
    tenSach: item.tenSach,
    giaBan: item.giaBan,
    hinhAnh: item.hinhAnh,
  }));
}

export async function getDanhSachYeuThich(): Promise<YeuThichItem[]> {
  const response = await authRequest<unknown>(`${BASE}/api/yeu-thich`);
  return validateWishlistResponse(response);
}

export async function themYeuThich(maSach: number): Promise<YeuThichItem[]> {
  const response = await authRequest<unknown>(`${BASE}/api/yeu-thich/${maSach}`, { method: 'POST' });
  return validateWishlistResponse(response);
}

export async function xoaYeuThich(maSach: number): Promise<YeuThichItem[]> {
  const response = await authRequest<unknown>(`${BASE}/api/yeu-thich/${maSach}`, { method: 'DELETE' });
  return validateWishlistResponse(response);
}
