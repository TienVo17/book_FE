import DanhGiaModel from "../models/DanhGiaModel";
import { authRequest, my_request } from "./Request";
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

export type LyDoKhongDanhGiaDuoc =
  | 'CHUA_MUA'
  | 'CHUA_NHAN_HANG'
  | 'DA_DANH_GIA'
  | 'DA_BI_AN';

export interface CoTheDanhGia {
  coThe: boolean;
  maDonHang: number | null;
  lyDo: LyDoKhongDanhGiaDuoc | null;
}

/**
 * Chi goi khi da dang nhap — endpoint tra 401 cho khach an danh.
 *
 * Ket qua chi de quyet dinh hien thi. Backend kiem tra lai khi ghi, nen mot client sua
 * doi khong the vuot qua bang cach noi doi o day.
 */
export function layQuyenDanhGia(maSach: number): Promise<CoTheDanhGia> {
  return authRequest<CoTheDanhGia>(apiUrl(`/api/danh-gia/co-the-danh-gia?maSach=${maSach}`));
}

export async function themDanhGiaMoi(
  maSach: number,
  nhanXet: string,
  diemXepHang: number,
  maNguoiDung: number
): Promise<boolean> {
  await authRequest(apiUrl('/api/danh-gia/them-danh-gia-v1'), {
    method: 'POST',
    body: JSON.stringify({ maSach, nhanXet, diemXepHang, maNguoiDung }),
  });
  return true;
}

interface DanhGiaAdminPage {
  content: DanhGiaModel[];
  totalPages: number;
}

export function getDanhGiaAdmin(page: number): Promise<DanhGiaAdminPage> {
  return authRequest(apiUrl(`/api/admin/danh-gia/findAll?page=${page}`));
}

export function setDanhGiaActive(maDanhGia: number, active: boolean): Promise<unknown> {
  const endpoint = active ? 'active' : 'unactive';
  return authRequest(apiUrl(`/api/admin/danh-gia/${endpoint}/${maDanhGia}`), { method: 'POST' });
}
