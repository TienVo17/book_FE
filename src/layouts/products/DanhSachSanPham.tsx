import React, { useEffect, useState } from "react";
import Book from "../../models/Book";
import SachModel from "../../models/SachModel";
import SachProps from "./components/SachProps";
import { PhanTrang } from "../utils/PhanTrang";
import { getAllBook } from "../../api/SachApi";
import { findByBook } from "../../api/SachApi";
interface DanhSachSanPhamProps {
  tuKhoaTimKiem: string;
  maTheLoai: number;
}

function DanhSachSanPham({ tuKhoaTimKiem, maTheLoai }: DanhSachSanPhamProps) {
  const [danhsachQuyenSach, setDanhSachQuyenSach] = useState<SachModel[]>([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState<boolean>(true);
  const [baoLoi, setBaoLoi] = useState(null);
  const [trangHienTai, setTrangHienTai] = useState(1);
  const [tongSoTrang, setTongSoTrang] = useState(0);
  const [tongSoSach, setSoSach] = useState(0);

  useEffect(
    () => {
      if (tuKhoaTimKiem === "" && maTheLoai == 0) {
        getAllBook(trangHienTai - 1)
          .then((kq) => {
            setDanhSachQuyenSach(kq.ketQua);
            setTongSoTrang(kq.tongSoTrang);
            setDangTaiDuLieu(false);
          })
          .catch((error) => {
            setBaoLoi(error.message);
          });
      } else {
        findByBook(tuKhoaTimKiem, maTheLoai)
          .then((kq) => {
            setDanhSachQuyenSach(kq.ketQua);
            setTongSoTrang(kq.tongSoTrang);
            setDangTaiDuLieu(false);
          })
          .catch((error) => {
            setBaoLoi(error.message);
          });
      }
    },
    [trangHienTai, tuKhoaTimKiem, maTheLoai] // Chỉ gọi 1 lần
  );
  const phanTrang = (trang: number) => setTrangHienTai(trang);
  if (dangTaiDuLieu) {
    return (
      <div>
        <h1>Đang tải dữ liệu</h1>
      </div>
    );
  }
  if (baoLoi) {
    return (
      <div>
        <h1>Gặp lỗi : {baoLoi}</h1>
      </div>
    );
  }

  if (danhsachQuyenSach.length === 0) {
    return (
      <div className="container">
        <div className="d-flex align-items-center justify-content-center">
          <h1>Hiện tại không có sách theo yêu cầu!</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="row mt-4 mb-4">
        {danhsachQuyenSach.map((sach) => (
          <SachProps key={sach.maSach} sach={sach} />
        ))}
      </div>
      <PhanTrang
        trangHienTai={trangHienTai}
        tongSoTrang={tongSoTrang}
        phanTrang={phanTrang}
      />
    </div>
  );
}
export default DanhSachSanPham;
