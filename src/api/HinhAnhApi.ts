import HinhAnhModel from "../models/HinhAnhModel";
import { my_request } from "./Request";

async function getAllImageOfBook(duongDan: string): Promise<HinhAnhModel[]> {
  const ketQua: HinhAnhModel[] = [];
  const response = await my_request(duongDan);
  const responseData = response._embedded.hinhAnhs;

  for (const key in responseData) {
    ketQua.push({
      maHinhAnh: responseData[key].maHinhAnh,
      tenHinhAnh: responseData[key].tenHinhAnh,
      icon: responseData[key].laIcon,
      urlHinh: responseData[key].urlHinh,
      dataImage: responseData[key].dataImage,
      cloudinaryPublicId: responseData[key].cloudinaryPublicId,
    });
  }

  return ketQua;
}

export async function getAllImageOfOneBook(maSach: number): Promise<HinhAnhModel[]> {
  const duongDan: string = `http://localhost:8080/sach/${maSach}/listHinhAnh`;
  return getAllImageOfBook(duongDan);
}

export async function getOneImageOfOneBook(maSach: number): Promise<HinhAnhModel[]> {
  const duongDan: string = `http://localhost:8080/sach/${maSach}/listHinhAnh?sort=maHinhAnh,asc&page=0&size=1`;
  return getAllImageOfBook(duongDan);
}

export async function findImageByBook(maSach: number): Promise<HinhAnhModel[]> {
  const duongDan: string = `http://localhost:8080/api/admin/sach/findImage/${maSach}`;
  return my_request(duongDan);
}
