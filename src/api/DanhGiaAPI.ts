import { ApiRequestError, authRequest, my_request } from "./Request";
import { apiUrl } from './ApiUrl';

export interface DanhGiaHinhAnhCongKhai {
  maHinhAnh: number;
  urlHinh: string;
}

export interface DanhGiaCongKhai {
  maDanhGia: number;
  nhanXet: string;
  diemXepHang: number;
  timestamp: string;
  /** Tên đã được backend che sẵn ("Nguyễn V. A."). Không bao giờ là chuỗi rỗng. */
  tenHienThi: string;
  laCuaToi: boolean;
  soLuotHuuIch: number;
  toiDaBinhChon: boolean;
  phanHoiShop: string | null;
  phanHoiShopTai: string | null;
  anhDinhKem: DanhGiaHinhAnhCongKhai[];
}

/**
 * Bấm lần hai là gỡ bình chọn, như nút thích ở mọi nơi khác. Trả về số lượt còn lại để
 * giao diện không phải tải lại cả trang chỉ để cập nhật một con số.
 */
export function doiBinhChonHuuIch(maDanhGia: number): Promise<{ maDanhGia: number; soLuotHuuIch: number }> {
  return authRequest(apiUrl(`/api/danh-gia/${maDanhGia}/huu-ich`), { method: 'POST' });
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

export function themDanhGiaMoi(
  maSach: number,
  nhanXet: string,
  diemXepHang: number,
  maNguoiDung: number
): Promise<DanhGiaCongKhai> {
  return authRequest<DanhGiaCongKhai>(apiUrl('/api/danh-gia/them-danh-gia-v1'), {
    method: 'POST',
    body: JSON.stringify({ maSach, nhanXet, diemXepHang, maNguoiDung }),
  });
}

export function thongDiepLoiAnhDanhGia(error: unknown): string {
  if (!(error instanceof ApiRequestError)) {
    return error instanceof Error ? error.message : "Không thể tải ảnh đánh giá.";
  }

  switch (error.code) {
    case "REVIEW_IMAGE_TOO_MANY":
      return "Mỗi đánh giá tối đa 5 ảnh.";
    case "REVIEW_IMAGE_TOO_LARGE":
    case "FILE_TOO_LARGE":
      return "Mỗi ảnh phải có dung lượng không quá 5MB.";
    case "REVIEW_IMAGE_UNSUPPORTED_TYPE":
      return "Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.";
    case "REVIEW_IMAGE_EMPTY":
      return "Ảnh đã chọn không có dữ liệu. Vui lòng chọn ảnh khác.";
    case "REVIEW_IMAGE_QUOTA_EXCEEDED":
      return "Bạn đã dùng hết hạn ngạch ảnh đánh giá.";
    case "RATE_LIMITED":
      return "Bạn tải ảnh quá nhanh. Vui lòng thử lại sau ít phút.";
    case "STORAGE_NOT_CONFIGURED":
      return "Hệ thống chưa cấu hình lưu ảnh. Đánh giá chữ đã được lưu; vui lòng thử tải ảnh sau.";
    default:
      return error.message || "Không thể tải ảnh đánh giá.";
  }
}

export function themAnhDanhGia(
  maDanhGia: number,
  tep: File,
  idempotencyKey: string
): Promise<DanhGiaHinhAnhCongKhai> {
  const form = new FormData();
  form.append("tep", tep);
  return authRequest<DanhGiaHinhAnhCongKhai>(apiUrl(`/api/danh-gia/${maDanhGia}/hinh-anh`), {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
    body: form,
  });
}

export function xoaAnhDanhGia(maHinhAnh: number): Promise<{ maHinhAnh: number; daXoa: boolean }> {
  return authRequest(apiUrl(`/api/danh-gia/hinh-anh/${maHinhAnh}/xoa`), { method: "POST" });
}

export type TrangThaiDanhGia = 'HIEN_THI' | 'DA_AN';

/**
 * Dòng đánh giá như màn kiểm duyệt nhìn thấy — có danh tính thật, có chủ đích.
 *
 * Trước đây màn này khai `useState<any[]>` và đọc cờ trạng thái legacy, một trường backend
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
  phanHoiShop: string | null;
  phanHoiShopTai: string | null;
  anhDinhKem: DanhGiaHinhAnhCongKhai[];
}

/** Chủ sở hữu tự gỡ bài của mình. Backend kiểm tra quyền sở hữu, không tin client. */
export function xoaDanhGia(maDanhGia: number): Promise<unknown> {
  return authRequest(apiUrl(`/api/danh-gia/xoa-danh-gia/${maDanhGia}`), { method: 'POST' });
}

/** Shop trả lời công khai dưới một đánh giá. Gọi lần hai là sửa, không tạo thêm dòng. */
export function traLoiDanhGia(maDanhGia: number, noiDung: string): Promise<unknown> {
  return authRequest(apiUrl(`/api/admin/danh-gia/${maDanhGia}/phan-hoi`), {
    method: 'POST',
    body: JSON.stringify({ noiDung }),
  });
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
