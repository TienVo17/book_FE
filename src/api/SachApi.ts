import React from "react";
import SachModel from "../models/SachModel";
import { my_request } from "./Request";

interface KetQuaInterface {
  ketQua: SachModel[];
  tongSoTrang: number;
  tongSoSach: number;
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
  };
}

async function laySach(duongDan: string): Promise<KetQuaInterface> {
  const ketQua: SachModel[] = [];
  const response = await my_request(duongDan);
  const responseData = response.content;
  const tongSoTrang: number = response.totalPages;
  const tongSoSach: number = response.totalElements;

  for (const key in responseData) {
    ketQua.push(mapSach(responseData[key]));
  }
  return { ketQua, tongSoSach, tongSoTrang };
}

export async function getAllBook(trangHienTai: number): Promise<KetQuaInterface> {
  const duongDan: string = `http://localhost:8080/api/sach?page=${trangHienTai}`;
  return laySach(duongDan);
}

export async function get3NewBook(): Promise<KetQuaInterface> {
  const duongDan: string = "http://localhost:8080/sach?sort=maSach,desc&page=0&size=3";
  return laySach(duongDan);
}

export async function findByBook(tuKhoaTimKiem: string, maTheLoai: number): Promise<KetQuaInterface> {
  let duongDan: string = `http://localhost:8080/api/sach?page=0`;
  if (tuKhoaTimKiem !== "") {
    duongDan += `&tensach=${encodeURIComponent(tuKhoaTimKiem)}`;
  }
  if (maTheLoai > 0) {
    duongDan += `&maTheLoai=${maTheLoai}`;
  }
  return laySach(duongDan);
}

export async function getBookById(maSach: number): Promise<SachModel | null> {
  const duongDan = `http://localhost:8080/api/sach/${maSach}`;

  try {
    const response = await fetch(duongDan);
    if (!response.ok) {
      throw new Error("Gap loi trong qua trinh goi API lay sach!");
    }

    const sachData = await response.json();
    if (!sachData) {
      throw new Error("Sach khong ton tai!");
    }

    return mapSach(sachData);
  } catch (error) {
    console.error("Error", error);
    return null;
  }
}

export async function capNhatSach(sach: SachModel): Promise<boolean> {
  const duongDan = `http://localhost:8080/api/admin/sach/update/${sach.maSach}`;
  const token = localStorage.getItem('jwt');

  try {
    const response = await fetch(duongDan, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(sach),
    });
    return response.ok;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

export async function xoaSach(maSach: number): Promise<boolean> {
  const duongDan = `http://localhost:8080/sach/${maSach}`;
  const token = localStorage.getItem('jwt');

  if (!token) {
    console.error('Khong tim thay token xac thuc');
    return false;
  }

  try {
    const response = await fetch(duongDan, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

export async function themSach(sach: SachModel): Promise<boolean> {
  const duongDan = `http://localhost:8080/sach`;
  const token = localStorage.getItem('jwt');

  if (!token) {
    console.error('Khong tim thay token xac thuc');
    return false;
  }

  try {
    const response = await fetch(duongDan, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sach),
    });

    return response.ok;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

const url = 'http://localhost:8080';
const endpoint = url + "/api/admin/sach";
export async function findAll(trangHienTai: number): Promise<KetQuaInterface> {
  const ketQua: SachModel[] = [];
  const response = await my_request(endpoint + "?page=" + trangHienTai);
  const responseData = response.content;
  const tongSoTrang: number = response.totalPages;
  const tongSoSach: number = response.totalElements;

  for (const key in responseData) {
    ketQua.push(mapSach(responseData[key]));
  }

  return { ketQua, tongSoSach, tongSoTrang };
}

export async function getSachBanChay(limit: number = 8): Promise<SachModel[]> {
  return my_request(`http://localhost:8080/api/sach/ban-chay?limit=${limit}`);
}

export async function getSachMoiNhat(limit: number = 8): Promise<SachModel[]> {
  return my_request(`http://localhost:8080/api/sach/moi-nhat?limit=${limit}`);
}

export async function getSachLienQuan(maSach: number, limit: number = 6): Promise<SachModel[]> {
  return my_request(`http://localhost:8080/api/sach/${maSach}/lien-quan?limit=${limit}`);
}
