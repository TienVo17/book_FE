import React, { useEffect, useState } from "react";
import SachModel from "../../models/SachModel";
import SachProps from "./components/SachProps";
import { PhanTrang } from "../utils/PhanTrang";
import { getAllBook, findByBook } from "../../api/SachApi";

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

  useEffect(() => {
    if (tuKhoaTimKiem === "" && maTheLoai === 0) {
      getAllBook(trangHienTai - 1)
        .then((kq) => {
          if (kq.ketQua && kq.ketQua.length > 0) {
            setDanhSachQuyenSach(kq.ketQua);
            setTongSoTrang(kq.tongSoTrang);
            setDangTaiDuLieu(false);
          } else {
            setDanhSachQuyenSach([]);
            setBaoLoi("Không có sách nào phù hợp với yêu cầu.");
            setDangTaiDuLieu(false);
          }
        })
        .catch((error) => {
          setBaoLoi("Gặp lỗi khi tải dữ liệu: " + error.message);
          setDangTaiDuLieu(false);
        });
    } else {
      findByBook(tuKhoaTimKiem, maTheLoai)
        .then((kq) => {
          if (kq.ketQua && kq.ketQua.length > 0) {
            setDanhSachQuyenSach(kq.ketQua);
            setTongSoTrang(kq.tongSoTrang);
            setDangTaiDuLieu(false);
          } else {
            setDanhSachQuyenSach([]);
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
      <div className="container py-5">
        <div className="section-header">
          <h2>Sản phẩm nổi bật</h2>
        </div>
        <div className="row">
          {[1, 2, 3, 4].map((i) => (
            <div className="col-lg-3 col-md-4 col-sm-6 mb-4" key={i}>
              <div className="product-card">
                <div className="skeleton skeleton-img"></div>
                <div className="product-card-body">
                  <div className="skeleton skeleton-text"></div>
                  <div className="skeleton skeleton-text-sm"></div>
                  <div className="skeleton skeleton-text-sm" style={{ width: "40%" }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (baoLoi) {
    return (
      <div className="container py-5">
        <div className="text-center py-5">
          <i className="fas fa-search" style={{ fontSize: "3rem", color: "var(--color-text-muted)", marginBottom: "1rem", display: "block" }}></i>
          <h5 style={{ color: "var(--color-text-secondary)" }}>{baoLoi}</h5>
        </div>
      </div>
    );
  }

  if (danhsachQuyenSach.length === 0) {
    return (
      <div className="container py-5">
        <div className="text-center py-5">
          <i className="fas fa-book" style={{ fontSize: "3rem", color: "var(--color-text-muted)", marginBottom: "1rem", display: "block" }}></i>
          <h5 style={{ color: "var(--color-text-secondary)" }}>Hiện tại không có sách theo yêu cầu!</h5>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4" id="san-pham">
      <div className="section-header">
        <h2>{tuKhoaTimKiem ? `Kết quả tìm kiếm: "${tuKhoaTimKiem}"` : "Sản phẩm nổi bật"}</h2>
      </div>
      <div className="row">
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
