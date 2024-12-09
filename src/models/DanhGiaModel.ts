import NguoiDungModel from "./NguoiDungModel";
import SachModel from "./SachModel";

class DanhGiaModel {
  maDanhGia: number;
  diemXepHang: number;
  nhanXet: string;
  timestamp: string;
  nguoiDung: NguoiDungModel;
  sach: SachModel;

  constructor(
    maDanhGia: number,
    diemXepHang: number,
    nhanXet: string,
    timestamp: string,
    nguoiDung: NguoiDungModel,
    sach: SachModel
  ) {
    this.maDanhGia = maDanhGia;
    this.diemXepHang = diemXepHang;
    this.nhanXet = nhanXet;
    this.timestamp = timestamp;
    this.nguoiDung = nguoiDung;
    this.sach = sach;
  }
}
export default DanhGiaModel;
