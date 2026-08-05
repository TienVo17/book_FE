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

export async function findByBook(tuKhoaTimKiem: string, maTheLoai: number, trangHienTai: number = 0): Promise<KetQuaInterface> {
  let duongDan: string = apiUrl(`/api/sach?page=${trangHienTai}`);
  if (tuKhoaTimKiem !== "") {
    duongDan += `&tensach=${encodeURIComponent(tuKhoaTimKiem)}`;
  }
  if (maTheLoai > 0) {
    duongDan += `&maTheLoai=${maTheLoai}`;
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
