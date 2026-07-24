import DanhGiaModel from "../models/DanhGiaModel";
import { my_request } from "./Request";
import { apiUrl } from './ApiUrl';

async function getAllReviewOfBook(duongDan: string): Promise<DanhGiaModel[]> {
  const ketQua: DanhGiaModel[] = [];

  // Gọi phương thức request
  const response = await my_request<DanhGiaModel[]>(duongDan);

  // Lấy ra json sach
  const responseData = response;

  for (const key in responseData) {
    ketQua.push({
      maDanhGia: responseData[key].maDanhGia,
      nhanXet: responseData[key].nhanXet,
      diemXepHang: responseData[key].diemXepHang,
      timestamp: responseData[key].timestamp,
      nguoiDung: responseData[key].nguoiDung,
      sach: responseData[key].sach,
    });
  }

  return ketQua;
}

export async function getAllReviewOfOneBook(
  maSach: number
): Promise<DanhGiaModel[]> {
  // Xác định endpoint
  const duongDan: string = apiUrl(`/api/danh-gia/findAll?maSach=${maSach}`);

  return getAllReviewOfBook(duongDan); // Call the correct function with the string
}

export async function getOneReviewOfOneBook(
  maSach: number
): Promise<DanhGiaModel[]> {
  // Xác định endpoint
  const duongDan: string = apiUrl(`/sach/${maSach}/listDanhGia?sort=maDanhGia,asc&page=0&size=1`);

  return getAllReviewOfBook(duongDan); // Call the correct function with the string
}
export async function themDanhGiaMoi(
  maSach: number,
  nhanXet: string,
  diemXepHang: number,
  maNguoiDung: number
): Promise<boolean> {
  const token = localStorage.getItem('jwt');
  if (!token) {
    throw new Error('Không tìm thấy token đăng nhập!');
  }

  try {
    // Log request data để debug
    console.log('Request data:', {
      maSach,
      nhanXet,
      diemXepHang,
      maNguoiDung,
      token
    });

    const response = await fetch(apiUrl('/api/danh-gia/them-danh-gia-v1'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        maSach,
        nhanXet,
        diemXepHang,
        maNguoiDung
      }),
    });

    // Log response status và body
    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (!response.ok) {
      throw new Error(`Lỗi ${response.status}: ${responseText}`);
    }

    return true;
  } catch (error) {
    console.error('Error in themDanhGiaMoi:', error);
    throw error;
  }
}
