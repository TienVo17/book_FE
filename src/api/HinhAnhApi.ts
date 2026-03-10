import HinhAnhModel from "../models/HinhAnhModel";
import { my_request } from "./Request";

export async function getAllImageOfOneBook(maSach: number): Promise<HinhAnhModel[]> {
  const duongDan: string = `http://localhost:8080/api/admin/sach/findImage/${maSach}`;
  return my_request<HinhAnhModel[]>(duongDan);
}

export async function getOneImageOfOneBook(maSach: number): Promise<HinhAnhModel[]> {
  const images = await getAllImageOfOneBook(maSach);
  return images.slice(0, 1);
}

export async function findImageByBook(maSach: number): Promise<HinhAnhModel[]> {
  const duongDan: string = `http://localhost:8080/api/admin/sach/findImage/${maSach}`;
  return my_request<HinhAnhModel[]>(duongDan);
}
