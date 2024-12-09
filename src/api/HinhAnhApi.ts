import React from "react";
import HinhAnhModel from "../models/HinhAnhModel";
import { my_request } from "./Request";

async function getAllImageOfBook(duongDan: string): Promise<HinhAnhModel[]> {
  const ketQua: HinhAnhModel[] = [];

  // Gọi phương thức request
  const response = await my_request(duongDan);

  // Lấy ra json sach
  const responseData = response._embedded.hinhAnhs;

  for (const key in responseData) {
    ketQua.push({
      maHinhAnh: responseData[key].maHinhAnh,
      tenHinhAnh: responseData[key].tenHinhAnh,
      icon: responseData[key].laIcon,
      urlHinh: responseData[key].urlHinh,
      dataImage: responseData[key].dataImage,
    });
  }

  return ketQua;
}

export async function getAllImageOfOneBook(
  maSach: number
): Promise<HinhAnhModel[]> {
  // Xác định endpoint
  const duongDan: string = `http://localhost:8080/sach/${maSach}/listHinhAnh`;

  return getAllImageOfBook(duongDan);  // Call the correct function with the string
}

export async function getOneImageOfOneBook(
  maSach: number
): Promise<HinhAnhModel[]> {
  // Xác định endpoint
  const duongDan: string = `http://localhost:8080/sach/${maSach}/listHinhAnh?sort=maHinhAnh,asc&page=0&size=1`;

  return getAllImageOfBook(duongDan);  // Call the correct function with the string
}


export async function findImageByBook(maSach:number){
  const duongDan: string = `http://localhost:8080/api/admin/sach/findImage/${maSach}`;
  const response = await my_request(duongDan);
  return response;
}