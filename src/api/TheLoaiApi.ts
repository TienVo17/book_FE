import { authRequest, my_request } from './Request';
import { TheLoaiAdminModel, TheLoaiAdminUpsertPayload, TheLoaiModel } from '../models/TheLoaiModel';

const BASE = 'http://localhost:8080';

export async function getAllTheLoai(): Promise<TheLoaiModel[]> {
  return my_request<TheLoaiModel[]>(`${BASE}/api/the-loai`);
}

export async function getTheLoaiBySlug(slug: string): Promise<TheLoaiModel> {
  return my_request<TheLoaiModel>(`${BASE}/api/the-loai/${encodeURIComponent(slug)}`);
}

export async function getAdminTheLoai(): Promise<TheLoaiAdminModel[]> {
  return authRequest<TheLoaiAdminModel[]>(`${BASE}/api/admin/the-loai`);
}

export async function createTheLoaiAdmin(payload: TheLoaiAdminUpsertPayload): Promise<TheLoaiAdminModel> {
  return authRequest<TheLoaiAdminModel>(`${BASE}/api/admin/the-loai`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTheLoaiAdmin(maTheLoai: number, payload: TheLoaiAdminUpsertPayload): Promise<TheLoaiAdminModel> {
  return authRequest<TheLoaiAdminModel>(`${BASE}/api/admin/the-loai/${maTheLoai}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteTheLoaiAdmin(maTheLoai: number) {
  return authRequest<{ message: string }>(`${BASE}/api/admin/the-loai/${maTheLoai}`, {
    method: 'DELETE',
  });
}
