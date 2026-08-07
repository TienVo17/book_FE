import React, { useEffect, useState } from "react";
import SachModel from "../../models/SachModel";
import SachProps from "./components/SachProps";
import { PhanTrang } from "../utils/PhanTrang";
import { getAllBook, findByBook } from "../../api/SachApi";
import LoiTaiDuLieu from "./components/LoiTaiDuLieu";
import KhongCoKetQua from "./components/KhongCoKetQua";

interface DanhSachSanPhamProps {
  maTheLoai: number;
  tieuDe?: string;
}

function DanhSachSanPham({ maTheLoai, tieuDe }: DanhSachSanPhamProps) {
  const [danhsachQuyenSach, setDanhSachQuyenSach] = useState<SachModel[]>([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState<boolean>(true);
  // Tách hẳn LỖI (mạng/máy chủ) khỏi trạng thái KHÔNG CÓ KẾT QUẢ — trộn hai
  // trạng thái này từng khiến "không tìm thấy sách" hiện y hệt một sự cố hạ
  // tầng, và ngược lại một sự cố thật lại bị hiểu nhầm là "chưa có sách nào".
  const [loi, setLoi] = useState<boolean>(false);
  const [trangHienTai, setTrangHienTai] = useState(1);
  const [tongSoTrang, setTongSoTrang] = useState(0);
  const [lanThuLai, setLanThuLai] = useState(0);

  useEffect(() => {
    setTrangHienTai(1);
  }, [maTheLoai]);

  useEffect(() => {
    let conHieuLuc = true;
    setDangTaiDuLieu(true);
    setLoi(false);

    const request = maTheLoai === 0
      ? getAllBook(trangHienTai - 1)
      : findByBook("", maTheLoai, trangHienTai - 1);

    request
      .then((kq) => {
        if (!conHieuLuc) return;
        setDanhSachQuyenSach(kq.ketQua);
        setTongSoTrang(kq.tongSoTrang);
        setDangTaiDuLieu(false);
      })
      .catch(() => {
        if (!conHieuLuc) return;
        setLoi(true);
        setDangTaiDuLieu(false);
      });

    return () => {
      conHieuLuc = false;
    };
  }, [trangHienTai, maTheLoai, lanThuLai]);

  const phanTrang = (trang: number) => setTrangHienTai(trang);
  const thuLai = () => setLanThuLai((n) => n + 1);
  const tieuDeHienThi = tieuDe || "Tất cả sách";

  if (dangTaiDuLieu) {
    return (
      <div className="container py-5">
        <div className="section-header">
          <h2>{tieuDeHienThi}</h2>
        </div>
        <div className="row">
          {[1, 2, 3, 4].map((i) => (
            <div className="col-lg-3 col-md-4 col-6 mb-4" key={i}>
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

  // Cả lỗi lẫn rỗng đều giữ nguyên tiêu đề: trước đây return sớm ở đây từng
  // xóa luôn tiêu đề trang và mọi lối đi tiếp khi không có kết quả.
  if (loi) {
    return (
      <div className="container py-5">
        <div className="section-header">
          <h2>{tieuDeHienThi}</h2>
        </div>
        <LoiTaiDuLieu onThuLai={thuLai} />
      </div>
    );
  }

  if (danhsachQuyenSach.length === 0) {
    return (
      <div className="container py-5">
        <div className="section-header">
          <h2>{tieuDeHienThi}</h2>
        </div>
        <KhongCoKetQua />
      </div>
    );
  }

  return (
    <div className="container py-4" id="san-pham">
      <div className="section-header">
        <h2>{tieuDeHienThi}</h2>
      </div>
      <div className="row">
        {danhsachQuyenSach.map((sach) => (
          <SachProps key={sach.maSach} sach={sach} />
        ))}
      </div>
      {tongSoTrang > 1 && (
        <PhanTrang
          trangHienTai={trangHienTai}
          tongSoTrang={tongSoTrang}
          phanTrang={phanTrang}
        />
      )}
    </div>
  );
}

export default DanhSachSanPham;
