import SachModel from "../models/SachModel";
import { ApiRequestError, authRequest, my_request } from "./Request";
import { apiUrl } from './ApiUrl';

const ADMIN_BOOKS_PATH = '/api/admin/sach';

interface KetQuaInterface {
  ketQua: SachModel[];
  tongSoTrang: number;
  tongSoSach: number;
}

interface SachPageResponse {
  content: SachModel[];
  totalPages: number;
  totalElements: number;
}

function mapSach(data: any): SachModel {
  return {
    maSach: data.maSach,
    tenSach: data.tenSach,
    giaBan: data.giaBan,
    giaNiemYet: data.giaNiemYet,
    moTa: data.moTa,
    moTaNgan: data.moTaNgan,
    moTaChiTiet: data.moTaChiTiet,
    soLuong: data.soLuong,
    tenTacGia: data.tenTacGia,
    trungBinhXepHang: data.trungBinhXepHang,
    isbn: data.isbn,
    slug: data.slug,
    image: data.image,
    isActive: data.isActive,
    danhSachAnh: data.listHinhAnh,
    thongTinChiTiet: data.thongTinChiTiet,
    listTheLoai: data.listTheLoai,
  };
}

async function laySach(duongDan: string): Promise<KetQuaInterface> {
  const ketQua: SachModel[] = [];
  const response = await my_request<SachPageResponse>(duongDan);
  const responseData = response.content;
  const tongSoTrang: number = response.totalPages;
  const tongSoSach: number = response.totalElements;

  for (const key in responseData) {
    ketQua.push(mapSach(responseData[key]));
  }
  return { ketQua, tongSoSach, tongSoTrang };
}

export async function getAllBook(trangHienTai: number): Promise<KetQuaInterface> {
  return laySach(apiUrl(`/api/sach?page=${trangHienTai}`));
}

export async function get3NewBook(): Promise<KetQuaInterface> {
  return laySach(apiUrl('/api/sach?page=0'));
}

/** Giá trị sort mà backend chấp nhận cho `GET /api/sach`; `moi-nhat` là mặc định. */
export type SachSortOption = 'moi-nhat' | 'gia-tang' | 'gia-giam' | 'ten-az' | 'danh-gia';

export interface TimKiemSachOptions {
  sort?: SachSortOption;
  giaMin?: number;
  giaMax?: number;
  size?: number;
}

export async function findByBook(
  tuKhoaTimKiem: string,
  maTheLoai: number,
  trangHienTai: number = 0,
  options: TimKiemSachOptions = {},
): Promise<KetQuaInterface> {
  let duongDan: string = apiUrl(`/api/sach?page=${trangHienTai}`);
  if (tuKhoaTimKiem !== "") {
    duongDan += `&tensach=${encodeURIComponent(tuKhoaTimKiem)}`;
  }
  if (maTheLoai > 0) {
    duongDan += `&maTheLoai=${maTheLoai}`;
  }
  if (options.giaMin !== undefined) {
    duongDan += `&giaMin=${options.giaMin}`;
  }
  if (options.giaMax !== undefined) {
    duongDan += `&giaMax=${options.giaMax}`;
  }
  if (options.sort) {
    duongDan += `&sort=${options.sort}`;
  }
  if (options.size !== undefined) {
    duongDan += `&size=${options.size}`;
  }
  return laySach(duongDan);
}

export async function getBookById(maSach: number): Promise<SachModel | null> {
  const sachData = await my_request<SachModel>(apiUrl(`/api/sach/${maSach}`));
  return sachData ? mapSach(sachData) : null;
}

async function fetchBookOrNull(path: string): Promise<SachModel | null> {
  try {
    const sachData = await my_request<SachModel>(apiUrl(path));
    return sachData ? mapSach(sachData) : null;
  } catch (error) {
    // A miss is an expected outcome while resolving an ambiguous identifier.
    if (error instanceof ApiRequestError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Resolves a product from the `/sach/:identifier` route.
 *
 * An all-digits identifier is ambiguous: it is usually a legacy numeric deep
 * link, but a title such as "1984" slugifies to the all-digit slug "1984",
 * which the backend publishes as that book's canonical URL. So for digits we
 * try the id first and fall back to a slug lookup, otherwise the site's own
 * canonical link would 404. Non-numeric identifiers are always slugs.
 */
export async function getBookByIdentifier(identifier: string): Promise<SachModel | null> {
  const value = (identifier ?? '').trim();
  if (!value) {
    return null;
  }

  if (!/^\d+$/.test(value)) {
    return fetchBookOrNull(`/api/sach/slug/${encodeURIComponent(value)}`);
  }

  const byId = await fetchBookOrNull(`/api/sach/${value}`);
  return byId ?? fetchBookOrNull(`/api/sach/slug/${encodeURIComponent(value)}`);
}

export async function xoaSach(maSach: number): Promise<boolean> {
  await authRequest(apiUrl(`${ADMIN_BOOKS_PATH}/delete/${maSach}`), { method: 'DELETE' });
  return true;
}

const endpoint = apiUrl(ADMIN_BOOKS_PATH);
export async function findAll(trangHienTai: number): Promise<KetQuaInterface> {
  const ketQua: SachModel[] = [];
  const response = await authRequest<SachPageResponse>(endpoint + "?page=" + trangHienTai);
  const responseData = response.content;
  const tongSoTrang: number = response.totalPages;
  const tongSoSach: number = response.totalElements;

  for (const key in responseData) {
    ketQua.push(mapSach(responseData[key]));
  }

  return { ketQua, tongSoSach, tongSoTrang };
}

export async function getSachBanChay(limit: number = 8): Promise<SachModel[]> {
  return my_request<SachModel[]>(apiUrl(`/api/sach/ban-chay?limit=${limit}`));
}

export async function getSachMoiNhat(limit: number = 8): Promise<SachModel[]> {
  return my_request<SachModel[]>(apiUrl(`/api/sach/moi-nhat?limit=${limit}`));
}

export async function getSachLienQuan(maSach: number, limit: number = 6): Promise<SachModel[]> {
  return my_request<SachModel[]>(apiUrl(`/api/sach/${maSach}/lien-quan?limit=${limit}`));
}

export interface SachGoiYModel {
  maSach: number;
  tenSach: string;
  slug: string;
  /** `null` khi sách chưa gắn ảnh nào — không phải dữ liệu hỏng. */
  urlAnh: string | null;
  giaBan: number;
}

/**
 * `my_request<T>` chỉ ép kiểu, không kiểm tra gì — dashboard admin từng hiện
 * toàn số 0 vì tin vào phép ép kiểu này (xem AdminApi.getThongKe). Áp dụng lại
 * bài học đó ở đây: xác thực từng phần tử trước khi vẽ, loại bỏ phần tử sai
 * hình dạng thay vì để `undefined` lọt xuống UI trong im lặng.
 */
function isSachGoiY(value: unknown): value is SachGoiYModel {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const item = value as Record<string, unknown>;
  return typeof item.maSach === 'number'
    && typeof item.tenSach === 'string'
    && typeof item.slug === 'string'
    // Sách chưa có ảnh là chuyện bình thường; đòi `urlAnh` phải là chuỗi sẽ lặng lẽ
    // loại chúng khỏi gợi ý, đúng kiểu hỏng mà hàm này sinh ra để chặn.
    && (item.urlAnh === null || typeof item.urlAnh === 'string')
    && typeof item.giaBan === 'number';
}

/**
 * Gợi ý tìm kiếm tức thời. Backend đang được làm song song và `/api/sach/goi-y`
 * chắc chắn có giai đoạn trả 404 trên production trước khi backend deploy —
 * nơi gọi (Navbar) phải tự bắt lỗi này và suy biến êm (không dropdown, không
 * toast), nên hàm này ném lỗi bình thường thay vì nuốt lỗi ở đây.
 */
export async function getGoiYTimKiem(q: string, limit: number = 8): Promise<SachGoiYModel[]> {
  const tuKhoa = q.trim();
  if (tuKhoa === '') {
    return [];
  }

  const raw = await my_request<unknown>(apiUrl(`/api/sach/goi-y?q=${encodeURIComponent(tuKhoa)}&limit=${limit}`));
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(isSachGoiY);
}
