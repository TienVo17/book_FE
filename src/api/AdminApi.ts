import { authRequest, getValidJwtOrThrow } from './Request';
import { ThongKeModel } from '../models/ThongKeModel';
import SachModel from '../models/SachModel';

const BASE = 'http://localhost:8080';

export async function getThongKe(): Promise<ThongKeModel> {
  return authRequest(`${BASE}/api/admin/thong-ke`);
}

export async function createSachAdmin(sach: SachModel): Promise<SachModel> {
  return authRequest(`${BASE}/api/admin/sach/insert`, {
    method: 'POST',
    body: JSON.stringify(sach),
  });
}

export async function updateSachAdmin(sach: SachModel): Promise<SachModel> {
  return authRequest(`${BASE}/api/admin/sach/update/${sach.maSach}`, {
    method: 'PUT',
    body: JSON.stringify(sach),
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
