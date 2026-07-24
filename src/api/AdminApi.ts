import { authRequest, getValidJwtOrThrow } from './Request';
import { ThongKeModel } from '../models/ThongKeModel';
import SachModel from '../models/SachModel';

import { apiUrl } from './ApiUrl';

const BASE = apiUrl('');
const MIN_JAVA_INTEGER = -2147483648;
const MAX_JAVA_INTEGER = 2147483647;

interface SachAdminCreatePayload {
  maSach: number;
  tenSach: SachModel['tenSach'];
  tenTacGia: SachModel['tenTacGia'];
  isbn: SachModel['isbn'];
  slug: SachModel['slug'];
  moTaNgan: SachModel['moTaNgan'];
  moTaChiTiet: SachModel['moTaChiTiet'];
  giaNiemYet: SachModel['giaNiemYet'];
  giaBan: SachModel['giaBan'];
  soLuongTon: SachModel['soLuong'];
  isActive: SachModel['isActive'];
  maTheLoaiList: SachModel['maTheLoaiList'];
  listImageStr: SachModel['listImageStr'];
  chiTiet: SachModel['thongTinChiTiet'];
}

interface SachAdminUpdatePayload {
  maSach: number;
  tenSach: SachModel['tenSach'];
  tenTacGia: SachModel['tenTacGia'];
  isbn: SachModel['isbn'];
  slug: SachModel['slug'];
  moTaNgan: SachModel['moTaNgan'];
  moTaChiTiet: SachModel['moTaChiTiet'];
  giaNiemYet: SachModel['giaNiemYet'];
  giaBan: SachModel['giaBan'];
  isActive: SachModel['isActive'];
  maTheLoaiList: SachModel['maTheLoaiList'];
  listImageStr: SachModel['listImageStr'];
  chiTiet: SachModel['thongTinChiTiet'];
  soLuongTon?: never;
}

export interface SachTonKhoDieuChinhRequest {
  soLuongThayDoi: number;
}

export interface SachTonKhoResponse {
  maSach: number;
  soLuongTon: number;
}

function toSachAdminCreatePayload(sach: SachModel): SachAdminCreatePayload {
  return {
    maSach: sach.maSach,
    tenSach: sach.tenSach,
    tenTacGia: sach.tenTacGia,
    isbn: sach.isbn,
    slug: sach.slug,
    moTaNgan: sach.moTaNgan,
    moTaChiTiet: sach.moTaChiTiet ?? sach.moTa,
    giaNiemYet: sach.giaNiemYet,
    giaBan: sach.giaBan,
    soLuongTon: sach.soLuong,
    isActive: sach.isActive,
    maTheLoaiList: sach.maTheLoaiList,
    listImageStr: sach.listImageStr,
    chiTiet: sach.thongTinChiTiet,
  };
}

function toSachAdminUpdatePayload(sach: SachModel): SachAdminUpdatePayload {
  return {
    maSach: sach.maSach,
    tenSach: sach.tenSach,
    tenTacGia: sach.tenTacGia,
    isbn: sach.isbn,
    slug: sach.slug,
    moTaNgan: sach.moTaNgan,
    moTaChiTiet: sach.moTaChiTiet ?? sach.moTa,
    giaNiemYet: sach.giaNiemYet,
    giaBan: sach.giaBan,
    isActive: sach.isActive,
    maTheLoaiList: sach.maTheLoaiList,
    listImageStr: sach.listImageStr,
    chiTiet: sach.thongTinChiTiet,
  };
}

function isJavaInteger(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= MIN_JAVA_INTEGER
    && value <= MAX_JAVA_INTEGER;
}

function isSachTonKhoResponse(value: unknown): value is SachTonKhoResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const response = value as Record<string, unknown>;
  return isJavaInteger(response.maSach)
    && response.maSach > 0
    && isJavaInteger(response.soLuongTon)
    && response.soLuongTon >= 0;
}

export async function getThongKe(): Promise<ThongKeModel> {
  return authRequest<ThongKeModel>(`${BASE}/api/admin/thong-ke`);
}

export async function createSachAdmin(sach: SachModel): Promise<SachModel> {
  return authRequest<SachModel>(`${BASE}/api/admin/sach/insert`, {
    method: 'POST',
    body: JSON.stringify(toSachAdminCreatePayload(sach)),
  });
}

export async function updateSachAdmin(sach: SachModel): Promise<SachModel> {
  return authRequest<SachModel>(`${BASE}/api/admin/sach/update/${sach.maSach}`, {
    method: 'PUT',
    body: JSON.stringify(toSachAdminUpdatePayload(sach)),
  });
}

export async function dieuChinhTonKhoSach(
  maSach: number,
  request: SachTonKhoDieuChinhRequest,
): Promise<SachTonKhoResponse> {
  if (!Number.isSafeInteger(maSach) || maSach <= 0) {
    throw new Error('Mã sách không hợp lệ.');
  }
  if (!isJavaInteger(request.soLuongThayDoi) || request.soLuongThayDoi === 0) {
    throw new Error('Số lượng thay đổi phải là số nguyên khác 0.');
  }

  const response = await authRequest<unknown>(`${BASE}/api/admin/sach/${maSach}/ton-kho`, {
    method: 'PATCH',
    body: JSON.stringify(request),
  });

  if (!isSachTonKhoResponse(response) || response.maSach !== maSach) {
    throw new Error('Phản hồi tồn kho từ máy chủ không hợp lệ. Vui lòng tải lại trang.');
  }

  return response;
}

export async function uploadHinhAnhSach(maSach: number, files: File[]) {
  const token = getValidJwtOrThrow();
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await fetch(`${BASE}/api/admin/sach/${maSach}/hinh-anh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('jwt');
    }
    throw new Error(errorText || 'Upload hinh anh that bai');
  }

  return response.json();
}
