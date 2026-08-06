import { authRequest, my_request } from "./Request";
import { apiUrl } from './ApiUrl';

export interface DanhGiaCongKhai {
  maDanhGia: number;
  nhanXet: string;
  diemXepHang: number;
  timestamp: string;
  laCuaToi: boolean;
}

export type KieuSapXepDanhGia = 'moi-nhat' | 'cu-nhat' | 'diem-cao' | 'diem-thap' | 'huu-ich';

export interface TrangDanhGia {
  content: DanhGiaCongKhai[];
  trang: number;
  kichThuoc: number;
  tongSoTrang: number;
  /** Tổng toàn bộ đánh giá hiển thị — không phải số dòng khớp bộ lọc đang chọn. */
  tongSo: number;
  diemTrungBinh: number;
  /** Phân bố sao trên toàn bộ đánh giá hiển thị, luôn đủ 5 khoá. */
  phanBo: Record<string, number>;
}

export interface ThamSoTrangDanhGia {
  page?: number;
  size?: number;
  sort?: KieuSapXepDanhGia;
  loc?: number | null;
}

/**
 * Một request đủ cho cả khối đánh giá: danh sách đã phân trang, điểm trung bình, phân bố.
 *
 * Thay cho `findAll` cũ, vốn trả về toàn bộ đánh giá của một cuốn trong một mảng không
 * giới hạn và không kèm thông tin tổng hợp nào.
 */
export function layTrangDanhGia(
  maSach: number,
  thamSo: ThamSoTrangDanhGia = {}
): Promise<TrangDanhGia> {
  const query = new URLSearchParams({ maSach: String(maSach) });
  if (thamSo.page != null) query.set('page', String(thamSo.page));
  if (thamSo.size != null) query.set('size', String(thamSo.size));
  if (thamSo.sort) query.set('sort', thamSo.sort);
  if (thamSo.loc != null) query.set('loc', String(thamSo.loc));
  return my_request<TrangDanhGia>(apiUrl(`/api/danh-gia?${query.toString()}`));
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

export type TrangThaiDanhGia = 'HIEN_THI' | 'DA_AN';

/**
 * Dòng đánh giá như màn kiểm duyệt nhìn thấy — có danh tính thật, có chủ đích.
 *
 * Trước đây màn này khai `useState<any[]>` và đọc `item.isActive`, một trường backend
 * không còn trả về. Giá trị thiếu thành `undefined` im lặng: mọi đánh giá hiện nhãn
 * "Đã ẩn", và nút gọi `setDanhGiaActive(id, !undefined)` nên luôn gửi lệnh "hiện" —
 * công cụ kiểm duyệt đảo ngược ý nghĩa mà không hề báo lỗi. Kiểu tường minh ở đây là
 * thứ biến `tsc --noEmit` thành cổng thật.
 */
export interface DanhGiaQuanTri {
  maDanhGia: number;
  nhanXet: string;
  diemXepHang: number;
  timestamp: string;
  maNguoiDung: number | null;
  tenNguoiDung: string | null;
  maSach: number | null;
  tenSach: string | null;
  trangThai: TrangThaiDanhGia;
  tungBiAn: boolean;
  maDonHang: number | null;
}

interface DanhGiaAdminPage {
  content: DanhGiaQuanTri[];
  totalPages: number;
}

export function getDanhGiaAdmin(page: number): Promise<DanhGiaAdminPage> {
  return authRequest(apiUrl(`/api/admin/danh-gia/findAll?page=${page}`));
}

export function setDanhGiaActive(maDanhGia: number, active: boolean): Promise<unknown> {
  const endpoint = active ? 'active' : 'unactive';
  return authRequest(apiUrl(`/api/admin/danh-gia/${endpoint}/${maDanhGia}`), { method: 'POST' });
}
