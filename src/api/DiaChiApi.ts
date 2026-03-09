import { authRequest } from './Request';
import { DiaChiModel } from '../models/DiaChiModel';

const BASE = 'http://localhost:8080';

export async function getDanhSachDiaChi(): Promise<DiaChiModel[]> {
  return authRequest<DiaChiModel[]>(`${BASE}/api/dia-chi`);
}

export async function themDiaChi(diaChi: DiaChiModel) {
  return authRequest(`${BASE}/api/dia-chi`, {
    method: 'POST',
    body: JSON.stringify(diaChi),
  });
}

export async function capNhatDiaChi(id: number, diaChi: DiaChiModel) {
  return authRequest(`${BASE}/api/dia-chi/${id}`, {
    method: 'PUT',
    body: JSON.stringify(diaChi),
  });
}

export async function xoaDiaChi(id: number) {
  return authRequest(`${BASE}/api/dia-chi/${id}`, { method: 'DELETE' });
}
