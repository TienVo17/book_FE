import { authRequest } from './Request';
import { ThongKeModel } from '../models/ThongKeModel';

const BASE = 'http://localhost:8080';

export async function getThongKe(): Promise<ThongKeModel> {
  return authRequest(`${BASE}/api/admin/thong-ke`);
}

export async function uploadHinhAnhSach(maSach: number, file: File) {
  const token = localStorage.getItem('jwt');
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BASE}/api/admin/sach/${maSach}/hinh-anh`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
