import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SachModel from "../../models/SachModel";
import { getBookById } from "../../api/SachApi";
import HinhAnhSanPham from "./components/HinhAnhSanPham";
import DanhGiaSanPham, { renderStars } from "./components/DanhGiaSanPham";
import dinhDangSo from "../utils/DinhDangSo";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { themVaoGioHang } from '../utils/GioHangUtils';

const ChiTietSanPham: React.FC = () => {
  const { maSach } = useParams();
  let maSachNumber = 0;

  try {
    maSachNumber = parseInt(maSach + "");
    if (Number.isNaN(maSachNumber)) maSachNumber = 0;
  } catch (error) {
    maSachNumber = 0;
    console.error("Lỗi", error);
  }

  const [sach, setSach] = useState<SachModel | null>(null);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(true);
  const [baoLoi, setBaoLoi] = useState<string | null>(null);
  const [soLuong, setSoLuong] = useState(1);

  const tangSoLuong = () => {
    const soLuongTonKho = sach && sach.soLuong ? sach.soLuong : 0;
    if (soLuong < soLuongTonKho) {
      setSoLuong(soLuong + 1);
    }
  };

  const giamSoLuong = () => {
    if (soLuong > 1) {
      setSoLuong(soLuong - 1);
    }
  };
  const handleSoLuongChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const soLuongMoi = parseInt(event.target.value);
    const soLuongTonKho = sach && sach.soLuong ? sach.soLuong : 0;
    if (!isNaN(soLuongMoi) && soLuongMoi >= 1 && soLuongMoi <= soLuongTonKho) {
      setSoLuong(soLuongMoi);
    }
  };

  useEffect(() => {
    const loadSanPham = async () => {
      getBookById(maSachNumber)
        .then((sach) => {
          setSach(sach);
          setDangTaiDuLieu(false);
        })
        .catch((error) => {
          setBaoLoi(error.message);
          setDangTaiDuLieu(false);
        });
    };
    loadSanPham();
  }, [maSachNumber]);

  const xuLyThemVaoGioHang = () => {
    if (sach) {
      themVaoGioHang(sach, soLuong);
    }
  };

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
        <h1>Gặp lỗi: {baoLoi}</h1>
      </div>
    );
  }

  if (!sach) {
    return (
      <div>
        <h1>Sách không tồn tại!</h1>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="row mt-4 mb-4">
        <div className="col-4">
          <HinhAnhSanPham maSach={maSachNumber} />
        </div>
        <div className="col-8">
          <div className="row">
            <div className="col-8">
              <h1>{sach.tenSach}</h1>
              <h4>{renderStars(sach.trungBinhXepHang ?? 0)}</h4>
              <h4>{dinhDangSo(sach.giaBan)} đ</h4>
              <hr />
              <div
                dangerouslySetInnerHTML={{
                  __html: sach.moTa || "Mô tả không có sẵn",
                }}
              />
              <hr />
            </div>
            <div className="col-4">
              <div>
                <div className="mb-2">Số lượng</div>
                <div className="d-flex align-items-center">
                  <button
                    className="btn btn-outline-secondary me-2"
                    onClick={giamSoLuong}
                  >
                    -
                  </button>
                  <input
                    className="form-control text-center"
                    type="number"
                    value={soLuong}
                    min={1}
                    onChange={handleSoLuongChange}
                  />
                  <button
                    className="btn btn-outline-secondary ms-2"
                    onClick={tangSoLuong}
                  >
                    +
                  </button>
                </div>

                {sach.giaBan && (
                  <div className="mt text-center">
                    Số tiền tạm tính
                    <br />
                    <h4>{dinhDangSo(soLuong * sach.giaBan)} đ</h4>
                  </div>
                )}
                <div className="d-grid gap-2">
                  <button type="button" className="btn btn-danger mt-3">
                    Mua ngay
                  </button>
                  <button
                    className="btn btn-primary mt-2"
                    onClick={xuLyThemVaoGioHang}
                  >
                    <i className="fas fa-shopping-cart me-2"></i>
                    Thêm vào giỏ hàng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="row mt-4 mb-4">
        <DanhGiaSanPham maSach={maSachNumber} />
      </div>
    </div>
  );
};

export default ChiTietSanPham;
