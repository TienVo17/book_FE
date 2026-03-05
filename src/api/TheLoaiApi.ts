import { my_request } from './Request';
import { TheLoaiModel } from '../models/TheLoaiModel';

const BASE = 'http://localhost:8080';

export async function getAllTheLoai(): Promise<TheLoaiModel[]> {
  return my_request(`${BASE}/api/the-loai`);
}
