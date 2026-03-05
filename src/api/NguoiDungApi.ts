import { authRequest } from './Request';

const BASE = 'http://localhost:8080';

export async function getHoSo() {
  return authRequest(`${BASE}/api/nguoi-dung/ho-so`);
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
  const res = await fetch(`${BASE}/tai-khoan/quen-mat-khau`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function datLaiMatKhau(token: string, matKhauMoi: string) {
  const res = await fetch(`${BASE}/tai-khoan/dat-lai-mat-khau`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, matKhauMoi }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
