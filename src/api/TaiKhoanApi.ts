import { publicRequest } from './Request';
import { apiUrl } from './ApiUrl';

const BASE = apiUrl('');

export interface LoginResponse {
  jwt: string;
}

export interface RegisterRequest {
  tenDangNhap: string;
  email: string;
  matKhau: string;
  hoDem: string;
  ten: string;
  soDienThoai: string;
  diaChi: string;
  gioiTinh: string;
  daKichHoat: number;
  maKichHoat: string;
}

export function dangNhap(username: string, password: string): Promise<LoginResponse> {
  return publicRequest(`${BASE}/tai-khoan/dang-nhap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

export function dangKy(request: RegisterRequest): Promise<unknown> {
  return publicRequest(`${BASE}/tai-khoan/dang-ky`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

export function kichHoat(email: string, maKichHoat: string): Promise<unknown> {
  const query = new URLSearchParams({ email, maKichHoat });
  return publicRequest(`${BASE}/tai-khoan/kich-hoat?${query.toString()}`);
}

export function tenDangNhapDaTonTai(tenDangNhap: string): Promise<boolean> {
  const query = new URLSearchParams({ tenDangNhap });
  return publicRequest(`${BASE}/nguoi-dung/search/existsByTenDangNhap?${query.toString()}`);
}

export function emailDaTonTai(email: string): Promise<boolean> {
  const query = new URLSearchParams({ email });
  return publicRequest(`${BASE}/nguoi-dung/search/existsByEmail?${query.toString()}`);
}
