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
  const [baoLoi, setBaoLoi] = useState<string | null>(null);
  const [trangHienTai, setTrangHienTai] = useState(1);
  const [tongSoTrang, setTongSoTrang] = useState(0);
  const [tongSoSach, setSoSach] = useState(0);

  useEffect(() => {
    // Khi không có từ khóa tìm kiếm và thể loại
    if (tuKhoaTimKiem === "" && maTheLoai == 0) {
      getAllBook(trangHienTai - 1)
        .then((kq) => {
          console.log("Dữ liệu từ API:", kq); // Debug log
          if (kq.ketQua && kq.ketQua.length > 0) {
            setDanhSachQuyenSach(kq.ketQua);
            setTongSoTrang(kq.tongSoTrang);
            setDangTaiDuLieu(false);
          } else {
            setDanhSachQuyenSach([]); // Nếu không có sách nào, trả về mảng trống
            setBaoLoi("Không có sách nào phù hợp với yêu cầu.");
            setDangTaiDuLieu(false);
          }
        })
        .catch((error) => {
          setBaoLoi("Gặp lỗi khi tải dữ liệu: " + error.message);
          setDangTaiDuLieu(false);
        });
    } else {
      // Tìm sách theo từ khóa và thể loại
      findByBook(tuKhoaTimKiem, maTheLoai)
        .then((kq) => {
          console.log("Dữ liệu từ API:", kq); // Debug log
          if (kq.ketQua && kq.ketQua.length > 0) {
            setDanhSachQuyenSach(kq.ketQua);
            setTongSoTrang(kq.tongSoTrang);
            setDangTaiDuLieu(false);
          } else {
            setDanhSachQuyenSach([]); // Nếu không có sách nào, trả về mảng trống
            setBaoLoi("Không có sách nào phù hợp với yêu cầu.");
            setDangTaiDuLieu(false);
          }
        })
        .catch((error) => {
          setBaoLoi("Gặp lỗi khi tải dữ liệu: " + error.message);
          setDangTaiDuLieu(false);
        });
    }
  }, [trangHienTai, tuKhoaTimKiem, maTheLoai]);
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
