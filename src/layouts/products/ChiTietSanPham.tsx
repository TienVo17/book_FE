import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SachModel from "../../models/SachModel";
import { getBookByIdentifier, getSachLienQuan } from "../../api/SachApi";
import { getSeoMeta } from "../../api/SeoApi";
import { applySeoMeta, resetSeoMeta } from "../utils/SeoMeta";
import HinhAnhSanPham from "./components/HinhAnhSanPham";
import DanhGiaSanPham, { renderStars } from "./components/DanhGiaSanPham";
import dinhDangSo from "../utils/DinhDangSo";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { themVaoGioHang } from "../utils/GioHangUtils";
import {
  isBookWishlisted,
  setBookWishlisted,
  useWishlist,
} from "../../api/WishlistSession";
import SachProps from "./components/SachProps";

const ChiTietSanPham: React.FC = () => {
  const navigate = useNavigate();
  // The route param is an identifier: either a legacy numeric id or a canonical
  // slug. The numeric book id is only known after the product loads, so
  // id-based calls (reviews, wishlist, SEO) key off the loaded product.
  const { maSach: identifier } = useParams();
  const [maSachNumber, setMaSachNumber] = useState(0);

  const [sach, setSach] = useState<SachModel | null>(null);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(true);
  const [baoLoi, setBaoLoi] = useState<string | null>(null);
  const [soLuong, setSoLuong] = useState(1);
  const [sachLienQuan, setSachLienQuan] = useState<SachModel[]>([]);
  const wishlist = useWishlist();
  const daYeuThich = isBookWishlisted(maSachNumber, wishlist);
  const dangDoiYeuThich = wishlist.pendingBookIds.includes(maSachNumber);

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

  const handleMuaNgay = async () => {
    if (!sach) return;

    // Unauthenticated: never mutate the cart before auth is validated. Send
    // the user to login with an explicit return target to /thanh-toan
    // (the existing "nextPay" flag, consumed by DangNhap after sign-in).
    if (!localStorage.getItem("jwt")) {
      localStorage.setItem("nextPay", "true");
      navigate("/dang-nhap");
      return;
    }

    // Authenticated: merge the selected item into the existing cart,
    // preserving other lines, then proceed to checkout.
    if (await themVaoGioHang(sach, soLuong)) {
      navigate("/thanh-toan");
    }
  };

  useEffect(() => {
    let huy = false;
    setDangTaiDuLieu(true);
    getBookByIdentifier(identifier ?? "")
      .then((sach) => {
        if (huy) return;
        setSach(sach);
        setMaSachNumber(sach?.maSach ?? 0);
        setDangTaiDuLieu(false);
      })
      .catch((error) => {
        if (huy) return;
        setBaoLoi(error.message);
        setDangTaiDuLieu(false);
      });
    return () => { huy = true; };
  }, [identifier]);

  // SEO metadata is keyed by the resolved numeric id, so a slug URL and a
  // numeric URL produce the same canonical. Failures fall back to the visible
  // product fields rather than leaving another page's metadata in place.
  useEffect(() => {
    if (!sach || maSachNumber <= 0) {
      return;
    }
    let huy = false;
    const duPhong = () => applySeoMeta({
      title: sach.tenSach,
      description: sach.moTaNgan || sach.moTa || undefined,
      canonical: `${window.location.origin}/sach/${sach.slug || sach.maSach}`,
      ogType: "book",
    });

    getSeoMeta(maSachNumber)
      .then((meta) => {
        if (huy) return;
        if (!meta || !meta.title) {
          duPhong();
          return;
        }
        applySeoMeta({
          title: meta.title,
          description: meta.description || sach.moTaNgan || undefined,
          canonical: meta.canonical,
          ogTitle: meta.ogTitle,
          ogDescription: meta.ogDescription,
          ogImage: meta.ogImage || undefined,
          ogType: meta.ogType || "book",
          jsonLd: meta.jsonLd,
        });
      })
      .catch(() => { if (!huy) duPhong(); });

    return () => { huy = true; };
  }, [sach, maSachNumber]);

  // Clear the previous product's canonical/OG/JSON-LD as soon as the identifier
  // changes. Navigating between products (e.g. a related-product card) reuses
  // this component, so an unmount-only reset would leave the old product's
  // metadata in the head for the whole load window of the new one.
  useEffect(() => {
    resetSeoMeta();
    return resetSeoMeta;
  }, [identifier]);

  useEffect(() => {
    if (maSachNumber > 0) {
      getSachLienQuan(maSachNumber, 6).then(setSachLienQuan).catch(console.error);
    }
  }, [maSachNumber]);

  const toggleYeuThich = async () => {
    const jwt = localStorage.getItem('jwt');
    if (!jwt) {
      toast.info("Vui lòng đăng nhập để sử dụng tính năng yêu thích!");
      return;
    }
    try {
      await setBookWishlisted(maSachNumber, !daYeuThich);
      toast.success(daYeuThich
        ? "Đã xóa khỏi danh sách yêu thích!"
        : "Đã thêm vào danh sách yêu thích!");
    } catch (error) {
      toast.error("Có lỗi xảy ra, vui lòng thử lại!");
    }
  };

  const xuLyThemVaoGioHang = async () => {
    if (sach) {
      await themVaoGioHang(sach, soLuong);
    }
  };

  if (dangTaiDuLieu) {
    return <div className="container py-5">Đang tải dữ liệu...</div>;
  }

  if (baoLoi) {
    return <div className="container py-5 text-center">Gặp lỗi: {baoLoi}</div>;
  }

  if (!sach) {
    return <div className="container py-5 text-center">Sách không tồn tại!</div>;
  }

  const moTaHienThi = sach.moTaChiTiet || sach.moTa || "Mô tả không có sẵn";

  return (
    <div className="container py-4">
      <div className="detail-section animate-fade-in">
        <div className="row">
          <div className="col-lg-5 mb-4 mb-lg-0">
            <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              <HinhAnhSanPham maSach={maSachNumber} />
            </div>
          </div>

          <div className="col-lg-7">
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              {sach.tenSach}
            </h1>

            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem", marginBottom: "0.75rem" }}>
              <i className="fas fa-pen-nib me-2"></i>{sach.tenTacGia}
            </p>

            <div className="mb-3">{renderStars(sach.trungBinhXepHang ?? 0)}</div>

            <div className="d-flex align-items-baseline gap-3 mb-3">
              <span className="detail-price">{dinhDangSo(sach.giaBan)} đ</span>
              {sach.giaNiemYet != null && sach.giaBan != null && sach.giaNiemYet > sach.giaBan && (
                <span style={{ textDecoration: "line-through", color: "var(--color-text-muted)", fontSize: "1.1rem" }}>
                  {dinhDangSo(sach.giaNiemYet)} đ
                </span>
              )}
            </div>

            <div style={{ color: "var(--color-text-secondary)", fontSize: "0.93rem", lineHeight: 1.7, marginBottom: "1rem" }}>
              {sach.moTaNgan && <p>{sach.moTaNgan}</p>}
              <div style={{ whiteSpace: "pre-wrap" }}>{moTaHienThi}</div>
            </div>

            {sach.thongTinChiTiet && (
              <div className="mb-4">
                <h5>Thông tin chi tiết</h5>
                <ul className="list-group list-group-flush">
                  {sach.thongTinChiTiet.congTyPhatHanh && <li className="list-group-item px-0">Công ty phát hành: {sach.thongTinChiTiet.congTyPhatHanh}</li>}
                  {sach.thongTinChiTiet.nhaXuatBan && <li className="list-group-item px-0">Nhà xuất bản: {sach.thongTinChiTiet.nhaXuatBan}</li>}
                  {sach.thongTinChiTiet.ngayXuatBan && <li className="list-group-item px-0">Ngày xuất bản: {sach.thongTinChiTiet.ngayXuatBan}</li>}
                  {sach.thongTinChiTiet.soTrang ? <li className="list-group-item px-0">Số trang: {sach.thongTinChiTiet.soTrang}</li> : null}
                  {sach.thongTinChiTiet.loaiBia && <li className="list-group-item px-0">Loại bìa: {sach.thongTinChiTiet.loaiBia}</li>}
                  {sach.thongTinChiTiet.kichThuoc && <li className="list-group-item px-0">Kích thước: {sach.thongTinChiTiet.kichThuoc}</li>}
                </ul>
              </div>
            )}

            <hr style={{ borderColor: "var(--color-border)", opacity: 0.5 }} />

            <div className="row align-items-end mt-3">
              <div className="col-auto">
                <label style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 8, display: "block", color: "var(--color-text-secondary)" }}>
                  Số lượng
                </label>
                <div className="qty-control">
                  <button onClick={giamSoLuong} aria-label="Giảm số lượng">-</button>
                  <input type="number" value={soLuong} min={1} onChange={handleSoLuongChange} aria-label="Số lượng" />
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
              <button className="btn-modern-outline-primary" onClick={xuLyThemVaoGioHang} style={{ padding: "0.7rem 1.5rem" }}>
                <i className="fas fa-shopping-cart"></i>
                Thêm vào giỏ hàng
              </button>
              <button
                type="button"
                className="btn-modern-outline"
                onClick={toggleYeuThich}
                aria-pressed={daYeuThich}
                aria-busy={dangDoiYeuThich}
                disabled={dangDoiYeuThich}
                style={{ padding: "0.7rem 1.5rem" }}
              >
                <i className={`fas fa-heart ${daYeuThich ? 'text-danger' : ''}`} aria-hidden="true"></i>
                {dangDoiYeuThich ? ' Đang cập nhật...' : daYeuThich ? ' Đã yêu thích' : ' Yêu thích'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 animate-fade-in-up">
        <DanhGiaSanPham maSach={maSachNumber} />
      </div>

      {sachLienQuan.length > 0 && (
        <div className="mt-4 animate-fade-in-up">
          <div className="section-header"><h2>Sách liên quan</h2></div>
          <div className="row">
            {sachLienQuan.map((s) => <SachProps key={s.maSach} sach={s} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChiTietSanPham;
