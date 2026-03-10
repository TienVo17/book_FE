export interface SachThongTinChiTietModel {
  congTyPhatHanh?: string;
  nhaXuatBan?: string;
  ngayXuatBan?: string;
  soTrang?: number;
  loaiBia?: string;
  ngonNgu?: string;
  kichThuoc?: string;
  trongLuongGram?: number;
  phienBan?: string;
}

import HinhAnhModel from "./HinhAnhModel";
import type { TheLoaiModel } from "./TheLoaiModel";

class SachModel {
  maSach: number;
  tenSach?: string;
  giaBan?: number;
  giaNiemYet?: number;
  moTa?: string;
  moTaNgan?: string;
  moTaChiTiet?: string;
  soLuong?: number;
  tenTacGia?: string;
  trungBinhXepHang?: number;
  isbn?: string;
  slug?: string;
  image?: string;
  danhSachAnh?: HinhAnhModel[];
  listImageStr?: string[];
  isActive?: number;
  thongTinChiTiet?: SachThongTinChiTietModel;
  listTheLoai?: TheLoaiModel[];
  maTheLoaiList?: number[];

  constructor(
    maSach: number,
    tenSach?: string,
    giaBan?: number,
    giaNiemYet?: number,
    moTa?: string,
    soLuong?: number,
    tenTacGia?: string,
    trungBinhXepHang?: number,
    isbn?: string,
    danhSachAnh?: HinhAnhModel[],
    image?: string,
    listImageStr?: string[],
    isActive?: number,
    moTaNgan?: string,
    moTaChiTiet?: string,
    slug?: string,
    thongTinChiTiet?: SachThongTinChiTietModel,
    listTheLoai?: TheLoaiModel[],
    maTheLoaiList?: number[],
  ) {
    this.maSach = maSach;
    this.tenSach = tenSach;
    this.giaBan = giaBan;
    this.giaNiemYet = giaNiemYet;
    this.moTa = moTa;
    this.soLuong = soLuong;
    this.tenTacGia = tenTacGia;
    this.trungBinhXepHang = trungBinhXepHang;
    this.isbn = isbn;
    this.danhSachAnh = danhSachAnh;
    this.image = image;
    this.listImageStr = listImageStr;
    this.isActive = isActive;
    this.moTaNgan = moTaNgan;
    this.moTaChiTiet = moTaChiTiet;
    this.slug = slug;
    this.thongTinChiTiet = thongTinChiTiet;
    this.listTheLoai = listTheLoai;
    this.maTheLoaiList = maTheLoaiList;
  }
}

export default SachModel;
