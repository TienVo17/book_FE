import { authRequest, getValidJwtOrThrow } from './Request';
import { ThongKeModel } from '../models/ThongKeModel';
import SachModel from '../models/SachModel';

const BASE = 'http://localhost:8080';

function toSachAdminPayload(sach: SachModel) {
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
    listImageStr: sach.listImageStr,
    chiTiet: sach.thongTinChiTiet,
  };
}

export async function getThongKe(): Promise<ThongKeModel> {
  return authRequest<ThongKeModel>(`${BASE}/api/admin/thong-ke`);
}

export async function createSachAdmin(sach: SachModel): Promise<SachModel> {
  return authRequest<SachModel>(`${BASE}/api/admin/sach/insert`, {
    method: 'POST',
    body: JSON.stringify(toSachAdminPayload(sach)),
  });
}

export async function updateSachAdmin(sach: SachModel): Promise<SachModel> {
  return authRequest<SachModel>(`${BASE}/api/admin/sach/update/${sach.maSach}`, {
    method: 'PUT',
    body: JSON.stringify(toSachAdminPayload(sach)),
  });
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
