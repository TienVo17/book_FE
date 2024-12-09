import React from "react";
import SachModel from "../models/SachModel";
import { my_request } from "./Request";
interface KetQuaInterface {
  ketQua: SachModel[];
  tongSoTrang: number;
  tongSoSach: number;
}
async function laySach(duongDan: string): Promise<KetQuaInterface> {
  const ketQua: SachModel[] = [];

  //Gọi phương thức request
  const response = await my_request(duongDan);

  // Lấy ra json sách
  const responseData = response.content;

  // Lấy thông tin trang
  const tongSoTrang: number = response.totalPages;
  const tongSoSach: number = response.totalElements;

  for (const key in responseData) {
    ketQua.push({
      maSach: responseData[key].maSach,
      tenSach: responseData[key].tenSach,
      giaBan: responseData[key].giaBan,
      giaNiemYet: responseData[key].giaNiemYet,
      moTa: responseData[key].moTa,
      soLuong: responseData[key].soLuong,
      tenTacGia: responseData[key].tenTacGia,
      trungBinhXepHang: responseData[key].trungBinhXepHang,
      image: responseData[key].image,
    });
  }
  return { ketQua: ketQua, tongSoSach: tongSoSach, tongSoTrang: tongSoTrang };
}
export async function getAllBook(
  trangHienTai: number
): Promise<KetQuaInterface> {
  // Xác định endpoint
  const duongDan: string = `http://localhost:8080/api/sach?page=${trangHienTai}`;
  return laySach(duongDan);
}
export async function get3NewBook(): Promise<KetQuaInterface> {
  // Xác định endpoint
  const duongDan: string =
    "http://localhost:8080/sach?sort=maSach,desc&page=0&size=3";
  return laySach(duongDan);
}

export async function findByBook(
  tuKhoaTimKiem: string,
  maTheLoai: number
): Promise<KetQuaInterface> {
  let duongDan: string = `http://localhost:8080/sach?sort=maSach,desc&size=8&page=0`;
  if (tuKhoaTimKiem !== "" && maTheLoai == 0) {
    duongDan = `http://localhost:8080/sach/search/findByTenSachContaining?sort=maSach,desc&size=8&page=0&tenSach=${tuKhoaTimKiem}`;
  } else if (tuKhoaTimKiem === "" && maTheLoai > 0) {
    duongDan = `http://localhost:8080/sach/search/findByListTheLoai_MaTheLoai?sort=maSach,desc&size=8&page=0&maTheLoai=${maTheLoai}`;
  } else if (tuKhoaTimKiem !== "" && maTheLoai > 0) {
    duongDan = `http://localhost:8080/sach/search/findByTenSachContainingAndListTheLoai_MaTheLoai?sort=maSach,desc&size=8&page=0&maTheLoai=${maTheLoai}&tenSach=${tuKhoaTimKiem}`;
  }
  return laySach(duongDan);
}

export async function getBookById(maSach: number): Promise<SachModel | null> {
  const duongDan = `http://localhost:8080/sach/${maSach}`;
  let ketQua: SachModel;

  try {
    //Gọi phương thức request
    const response = await fetch(duongDan);
    if (!response.ok) {
      throw new Error("Gặp lỗi trong quá trình gọi API lấy sách!");
    }

    const sachData = await response.json();

    if (sachData) {
      return {
        maSach: sachData.maSach,
        tenSach: sachData.tenSach,
        giaBan: sachData.giaBan,
        giaNiemYet: sachData.giaNiemYet,
        moTa: sachData.moTa,
        soLuong: sachData.soLuong,
        tenTacGia: sachData.tenTacGia,
        trungBinhXepHang: sachData.trungBinhXepHang,
        isbn:sachData.isbn
      };
    } else {
      throw new Error("Sách không tồn tại!");
    }
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
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(sach)
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

  // Kiểm tra token tồn tại
  if (!token) {
    console.error('Không tìm thấy token xác thực');
    return false;
  }

  try {
    const response = await fetch(duongDan, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'  // Thêm content-type
      }
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

  // Thêm log để debug
  console.log('Token:', token);

  if (!token) {
    console.error('Không tìm thấy token xác thực');
    return false;
  }

  try {
    // Log request details
    console.log('Request Headers:', {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    
    const response = await fetch(duongDan, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sach)
    });

    // Log response để debug
    console.log('Response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }

    return response.ok;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}


var url = 'http://localhost:8080';
var endpoint = url + "/api/admin/sach";
export async function findAll(trangHienTai: number): Promise<KetQuaInterface> {
  const ketQua: SachModel[] = [];

  //Gọi phương thức request
  const response = await my_request(endpoint+"?page="+trangHienTai);
  console.log(response);
  // Lấy ra json sách
  const responseData = response.content;

  // Lấy thông tin trang
  const tongSoTrang: number = response.totalPages;
  const tongSoSach: number = response.totalElements;

  for (const key in responseData) {
    ketQua.push({
      maSach: responseData[key].maSach,
      tenSach: responseData[key].tenSach,
      giaBan: responseData[key].giaBan,
      giaNiemYet: responseData[key].giaNiemYet,
      moTa: responseData[key].moTa,
      soLuong: responseData[key].soLuong,
      tenTacGia: responseData[key].tenTacGia,
      isActive:responseData[key].isActive,
      trungBinhXepHang: responseData[key].trungBinhXepHang,
      danhSachAnh: responseData[key].listHinhAnh,
    });
  }
  console.log(ketQua);
  return { ketQua: ketQua, tongSoSach: tongSoSach, tongSoTrang: tongSoTrang };
}