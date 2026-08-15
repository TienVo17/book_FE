import { authRequest, publicRequest } from './Request';

import { apiUrl } from './ApiUrl';

const BASE = apiUrl('');

async function postJson(url: string, body: Record<string, string>) {
  return publicRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function getHoSo<T = unknown>(): Promise<T> {
  return authRequest<T>(`${BASE}/api/nguoi-dung/ho-so`);
}

export async function capNhatHoSo(data: any) {
  return authRequest(`${BASE}/api/nguoi-dung/cap-nhat-ho-so`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function doiMatKhau(matKhauCu: string, matKhauMoi: string) {
  return authRequest(`${BASE}/tai-khoan/doi-mat-khau`, {
    method: 'PUT',
    body: JSON.stringify({ matKhauCu, matKhauMoi }),
  });
}

export async function quenMatKhau(email: string) {
  return postJson(`${BASE}/tai-khoan/quen-mat-khau`, { email });
}

export async function datLaiMatKhau(email: string, token: string, matKhauMoi: string) {
  return postJson(`${BASE}/tai-khoan/dat-lai-mat-khau`, { email, token, matKhauMoi });
}
