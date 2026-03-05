import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SachModel from "../../models/SachModel";
import { getBookById, getSachLienQuan } from "../../api/SachApi";
import HinhAnhSanPham from "./components/HinhAnhSanPham";
import DanhGiaSanPham, { renderStars } from "./components/DanhGiaSanPham";
import dinhDangSo from "../utils/DinhDangSo";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { themVaoGioHang } from "../utils/GioHangUtils";
import { themYeuThich, xoaYeuThich, getDanhSachYeuThich } from "../../api/YeuThichApi";
import SachProps from "./components/SachProps";

const ChiTietSanPham: React.FC = () => {
  const navigate = useNavigate();
  const { maSach } = useParams();
  let maSachNumber = 0;

  try {
    maSachNumber = parseInt(maSach + "");
    if (Number.isNaN(maSachNumber)) maSachNumber = 0;
  } catch (error) {
    maSachNumber = 0;
  }

  const [sach, setSach] = useState<SachModel | null>(null);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(true);
  const [baoLoi, setBaoLoi] = useState<string | null>(null);
  const [soLuong, setSoLuong] = useState(1);
  const [sachLienQuan, setSachLienQuan] = useState<SachModel[]>([]);
  const [daYeuThich, setDaYeuThich] = useState(false);

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

  const handleMuaNgay = () => {
    if (!sach) return;
    const sanPhamMuaNgay = {
      maSach: sach.maSach,
      sachDto: {
        tenSach: sach.tenSach,
        giaBan: sach.giaBan,
        hinhAnh: sach.danhSachAnh?.[0]?.urlHinh || "",
      },
      soLuong: soLuong,
    };
    localStorage.setItem("gioHang", JSON.stringify([sanPhamMuaNgay]));
    if (localStorage.getItem("jwt")) {
      navigate("/thanh-toan");
    } else {
      navigate("/dat-hang-nhanh");
    }
  };

  useEffect(() => {
    getBookById(maSachNumber)
      .then((sach) => {
        setSach(sach);
        setDangTaiDuLieu(false);
      })
      .catch((error) => {
        setBaoLoi(error.message);
        setDangTaiDuLieu(false);
      });
  }, [maSachNumber]);

  // Fetch related books
  useEffect(() => {
    if (maSachNumber > 0) {
      getSachLienQuan(maSachNumber, 6).then(setSachLienQuan).catch(console.error);
    }
  }, [maSachNumber]);

  // Check wishlist status on mount (only if logged in)
  useEffect(() => {
    const jwt = localStorage.getItem('jwt');
    if (jwt && maSachNumber > 0) {
      getDanhSachYeuThich()
        .then((list: any[]) => {
          const found = list.some((item: any) => item.maSach === maSachNumber);
          setDaYeuThich(found);
        })
        .catch(console.error);
    }
  }, [maSachNumber]);

  const toggleYeuThich = async () => {
    const jwt = localStorage.getItem('jwt');
    if (!jwt) {
      toast.info("Vui lòng đăng nhập để sử dụng tính năng yêu thích!");
      return;
    }
    try {
      if (daYeuThich) {
        await xoaYeuThich(maSachNumber);
        setDaYeuThich(false);
        toast.success("Đã xóa khỏi danh sách yêu thích!");
      } else {
        await themYeuThich(maSachNumber);
        setDaYeuThich(true);
        toast.success("Đã thêm vào danh sách yêu thích!");
      }
    } catch (error) {
      toast.error("Có lỗi xảy ra, vui lòng thử lại!");
    }
  };

  const xuLyThemVaoGioHang = () => {
    if (sach) {
      themVaoGioHang(sach, soLuong);
    }
  };

  if (dangTaiDuLieu) {
    return (
      <div className="container py-5">
        <div className="detail-section">
          <div className="row">
            <div className="col-md-5">
              <div className="skeleton" style={{ height: 400, borderRadius: "var(--radius-md)" }}></div>
            </div>
            <div className="col-md-7">
              <div className="skeleton skeleton-text" style={{ width: "60%", height: 28 }}></div>
              <div className="skeleton skeleton-text mt-3" style={{ width: "30%" }}></div>
              <div className="skeleton skeleton-text mt-3" style={{ width: "40%", height: 32 }}></div>
              <div className="skeleton skeleton-text mt-4" style={{ width: "100%" }}></div>
              <div className="skeleton skeleton-text" style={{ width: "90%" }}></div>
              <div className="skeleton skeleton-text" style={{ width: "75%" }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (baoLoi) {
    return (
      <div className="container py-5 text-center">
        <i className="fas fa-exclamation-triangle" style={{ fontSize: "3rem", color: "var(--color-danger)", marginBottom: "1rem", display: "block" }}></i>
        <h5 style={{ color: "var(--color-text-secondary)" }}>Gặp lỗi: {baoLoi}</h5>
      </div>
    );
  }

  if (!sach) {
    return (
      <div className="container py-5 text-center">
        <i className="fas fa-book" style={{ fontSize: "3rem", color: "var(--color-text-muted)", marginBottom: "1rem", display: "block" }}></i>
        <h5 style={{ color: "var(--color-text-secondary)" }}>Sách không tồn tại!</h5>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="detail-section animate-fade-in">
        <div className="row">
          {/* Image */}
          <div className="col-lg-5 mb-4 mb-lg-0">
            <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              <HinhAnhSanPham maSach={maSachNumber} />
            </div>
          </div>

          {/* Info */}
          <div className="col-lg-7">
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              {sach.tenSach}
            </h1>

            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem", marginBottom: "0.75rem" }}>
              <i className="fas fa-pen-nib me-2"></i>{sach.tenTacGia}
            </p>

            <div className="mb-3">
              {renderStars(sach.trungBinhXepHang ?? 0)}
            </div>

            <div className="d-flex align-items-baseline gap-3 mb-3">
              <span className="detail-price">{dinhDangSo(sach.giaBan)} đ</span>
              {sach.giaNiemYet != null && sach.giaBan != null && sach.giaNiemYet > sach.giaBan && (
                <span style={{ textDecoration: "line-through", color: "var(--color-text-muted)", fontSize: "1.1rem" }}>
                  {dinhDangSo(sach.giaNiemYet)} đ
                </span>
              )}
            </div>

            <div
              style={{ color: "var(--color-text-secondary)", fontSize: "0.93rem", lineHeight: 1.7, marginBottom: "1.5rem" }}
              dangerouslySetInnerHTML={{ __html: sach.moTa || "Mô tả không có sẵn" }}
            />

            <hr style={{ borderColor: "var(--color-border)", opacity: 0.5 }} />

            {/* Quantity + Actions */}
            <div className="row align-items-end mt-3">
              <div className="col-auto">
                <label style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 8, display: "block", color: "var(--color-text-secondary)" }}>
                  Số lượng
                </label>
                <div className="qty-control">
                  <button onClick={giamSoLuong} aria-label="Giảm số lượng">-</button>
                  <input
                    type="number"
                    value={soLuong}
                    min={1}
                    onChange={handleSoLuongChange}
                    aria-label="Số lượng"
                  />
                  <button onClick={tangSoLuong} aria-label="Tăng số lượng">+</button>
                </div>
              </div>

              {sach.giaBan && (
                <div className="col-auto">
                  <div style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>Tạm tính</div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "1.3rem", color: "var(--color-accent)" }}>
                    {dinhDangSo(soLuong * sach.giaBan)} đ
                  </div>
                </div>
              )}
            </div>

            <div className="d-flex gap-3 mt-4 flex-wrap">
              <button className="btn-modern-accent" onClick={handleMuaNgay} style={{ padding: "0.7rem 2rem" }}>
                <i className="fas fa-bolt"></i>
                Mua ngay
              </button>
              <button className="btn-modern-primary" onClick={xuLyThemVaoGioHang} style={{ padding: "0.7rem 2rem" }}>
                <i className="fas fa-shopping-cart"></i>
                Thêm vào giỏ hàng
              </button>
              <button className="btn-modern-outline" onClick={toggleYeuThich} style={{ padding: "0.7rem 1.5rem" }}>
                <i className={`fas fa-heart ${daYeuThich ? 'text-danger' : ''}`}></i>
                {daYeuThich ? ' Đã yêu thích' : ' Yêu thích'}
              </button>
            </div>

            {/* Stock info */}
            <div className="mt-3" style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
              {sach.soLuong && sach.soLuong > 0 ? (
                <span style={{ color: "var(--color-success)" }}>
                  <i className="fas fa-check-circle me-1"></i>
                  Còn {sach.soLuong} sản phẩm
                </span>
              ) : (
                <span style={{ color: "var(--color-danger)" }}>
                  <i className="fas fa-times-circle me-1"></i>
                  Hết hàng
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-4 animate-fade-in-up">
        <DanhGiaSanPham maSach={maSachNumber} />
      </div>

      {/* Related books */}
      {sachLienQuan.length > 0 && (
        <div className="mt-4 animate-fade-in-up">
          <div className="section-header"><h2>Sách liên quan</h2></div>
          <div className="row">
            {sachLienQuan.map(s => <SachProps key={s.maSach} sach={s} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChiTietSanPham;
