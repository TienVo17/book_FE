import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { dangKyNhanTin } from "../../api/NhanTinApi";
import { HOTLINE_TEL, MANG_XA_HOI, THONG_TIN_CUA_HANG } from "../../config/thongTinCuaHang";

type TrangThaiGui = "nhan" | "dang-gui" | "thanh-cong" | "loi";

/** Bốn mục "Dịch vụ" cũ đều là `#!`; giờ trỏ vào trang chính sách thật. */
const NHOM_DICH_VU = [
  { slug: "dieu-khoan-su-dung", nhan: "Điều khoản sử dụng" },
  { slug: "chinh-sach-bao-mat", nhan: "Chính sách bảo mật" },
  { slug: "bao-mat-thanh-toan", nhan: "Bảo mật thanh toán" },
  { slug: "he-thong-nha-sach", nhan: "Hệ thống nhà sách" },
];

const NHOM_HO_TRO = [
  { slug: "doi-tra-hoan-tien", nhan: "Đổi trả - Hoàn tiền" },
  { slug: "bao-hanh-boi-hoan", nhan: "Bảo hành - Bồi hoàn" },
  { slug: "chinh-sach-van-chuyen", nhan: "Chính sách vận chuyển" },
  { slug: "chinh-sach-khach-si", nhan: "Chính sách khách sỉ" },
];

/**
 * Hai mục dưới đây từng là `#!` dù trang đích đã tồn tại từ lâu: `/dia-chi` và `/profile`
 * đều có route thật trong App.tsx. Không ai trỏ tới chúng từ footer.
 */
const NHOM_TAI_KHOAN = [
  { to: "/dang-nhap", nhan: "Đăng nhập" },
  { to: "/profile", nhan: "Chi tiết tài khoản" },
  { to: "/dia-chi", nhan: "Sổ địa chỉ" },
  { to: "/order", nhan: "Lịch sử mua hàng" },
];

const NHOM_KHAM_PHA = [
  { to: "/tim-kiem", nhan: "Tìm kiếm sách" },
  { to: "/gio-hang", nhan: "Giỏ hàng" },
  { to: "/yeu-thich", nhan: "Sách yêu thích" },
  { to: "/about", nhan: "Liên hệ" },
];

function Footer() {
  const [email, setEmail] = useState("");
  const [trangThai, setTrangThai] = useState<TrangThaiGui>("nhan");
  const [thongDiep, setThongDiep] = useState("");

  /**
   * `onSubmit` chứ không phải `onClick`: chỉ submit mới bắt được phím Enter trong ô nhập và
   * mới để `required`/`type="email"` của trình duyệt chặn trước khi gửi. Nút cũ mang
   * `type="button"` và không có handler nào cả — gõ email rồi bấm thì không có gì xảy ra.
   */
  const guiDangKy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (trangThai === "dang-gui") return;

    const giaTri = email.trim();
    if (!giaTri) return;

    setTrangThai("dang-gui");
    setThongDiep("");
    try {
      await dangKyNhanTin(giaTri);
      setTrangThai("thanh-cong");
      // Đăng ký chưa hoàn tất ở bước này: nói "sẽ gửi tin cho bạn" là hứa một việc chỉ
      // xảy ra sau khi họ bấm liên kết trong thư.
      setThongDiep("Đã gửi thư xác nhận. Vui lòng mở hộp thư và bấm liên kết để hoàn tất.");
      setEmail("");
    } catch (loi) {
      setTrangThai("loi");
      setThongDiep(loi instanceof Error ? loi.message : "Không thể đăng ký lúc này. Vui lòng thử lại sau.");
    }
  };

  const mangXaHoiHienThi = MANG_XA_HOI.filter((muc) => muc.url);

  return (
    <footer className="footer-modern">
      <div className="container">
        <div className="row">
          {/* Brand */}
          <div className="col-lg-3 col-md-6 mb-4">
            <h3 style={{ fontSize: "1.3rem", textTransform: "none", letterSpacing: "-0.3px" }}>
              <i className="fas fa-book-open me-2" style={{ color: "var(--color-primary-light)" }}></i>
              {THONG_TIN_CUA_HANG.ten}
            </h3>
            <p style={{ fontSize: "0.88rem", lineHeight: 1.7 }}>
              Nơi mang đến hàng ngàn đầu sách hay với giá ưu đãi nhất. Giao hàng toàn quốc.
            </p>

            <ul className="list-unstyled mb-0 mt-3" style={{ fontSize: "0.85rem", lineHeight: 1.9 }}>
              <li className="d-flex gap-2">
                <i className="fas fa-map-marker-alt mt-1" style={{ width: 16 }} aria-hidden="true" />
                <span>{THONG_TIN_CUA_HANG.diaChi}</span>
              </li>
              <li className="d-flex gap-2">
                <i className="fas fa-phone mt-1" style={{ width: 16 }} aria-hidden="true" />
                <a href={HOTLINE_TEL}>{THONG_TIN_CUA_HANG.hotline}</a>
              </li>
              <li className="d-flex gap-2">
                <i className="fas fa-envelope mt-1" style={{ width: 16 }} aria-hidden="true" />
                <a href={`mailto:${THONG_TIN_CUA_HANG.email}`}>{THONG_TIN_CUA_HANG.email}</a>
              </li>
              <li className="d-flex gap-2">
                <i className="fas fa-clock mt-1" style={{ width: 16 }} aria-hidden="true" />
                <span>{THONG_TIN_CUA_HANG.gioMoCua}</span>
              </li>
            </ul>

            {/* Chỉ hiện biểu tượng có trang thật. Xem chú thích ở MANG_XA_HOI. */}
            {mangXaHoiHienThi.length > 0 && (
              <div className="d-flex gap-2 mt-3">
                {mangXaHoiHienThi.map((muc) => (
                  <a
                    key={muc.ten}
                    href={muc.url as string}
                    className="social-icon"
                    aria-label={muc.ten}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className={muc.icon} aria-hidden="true"></i>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Services */}
          <div className="col-lg-2 col-md-6 mb-4">
            <h3>Dịch vụ</h3>
            <ul className="list-unstyled mb-0">
              {NHOM_DICH_VU.map((muc) => (
                <li className="mb-2" key={muc.slug}>
                  <NavLink to={`/chinh-sach/${muc.slug}`}>{muc.nhan}</NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="col-lg-2 col-md-6 mb-4">
            <h3>Hỗ trợ</h3>
            <ul className="list-unstyled mb-0">
              {NHOM_HO_TRO.map((muc) => (
                <li className="mb-2" key={muc.slug}>
                  <NavLink to={`/chinh-sach/${muc.slug}`}>{muc.nhan}</NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Account + Explore */}
          <div className="col-lg-2 col-md-6 mb-4">
            <h3>Tài khoản</h3>
            <ul className="list-unstyled mb-3">
              {NHOM_TAI_KHOAN.map((muc) => (
                <li className="mb-2" key={muc.to}>
                  <NavLink to={muc.to}>{muc.nhan}</NavLink>
                </li>
              ))}
            </ul>
            <h3>Khám phá</h3>
            <ul className="list-unstyled mb-0">
              {NHOM_KHAM_PHA.map((muc) => (
                <li className="mb-2" key={muc.to}>
                  <NavLink to={muc.to}>{muc.nhan}</NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="col-lg-3 col-md-12 mb-4">
            <h3>Đăng ký nhận tin</h3>
            <p style={{ fontSize: "0.85rem" }}>Nhận thông tin ưu đãi và sách mới nhất.</p>
            <form className="d-flex gap-2" onSubmit={guiDangKy}>
              <label className="visually-hidden" htmlFor="email-nhan-tin">
                Email nhận tin
              </label>
              <input
                id="email-nhan-tin"
                type="email"
                className="form-control"
                placeholder="Email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={trangThai === "dang-gui"}
                required
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "white",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.85rem",
                  padding: "0.5rem 0.8rem"
                }}
              />
              <button
                type="submit"
                className="btn"
                disabled={trangThai === "dang-gui"}
                style={{
                  background: "var(--color-primary)",
                  color: "white",
                  borderRadius: "var(--radius-md)",
                  padding: "0.5rem 1rem",
                  whiteSpace: "nowrap",
                  fontSize: "0.85rem"
                }}
              >
                {trangThai === "dang-gui" ? "Đang gửi…" : "Đăng ký"}
              </button>
            </form>
            <p
              role="status"
              aria-live="polite"
              style={{
                fontSize: "0.8rem",
                marginTop: "0.6rem",
                marginBottom: 0,
                minHeight: "1.2rem",
                color: trangThai === "loi" ? "var(--color-danger, #f87171)" : undefined,
              }}
            >
              {thongDiep}
            </p>

            <h3 className="mt-4">Thanh toán</h3>
            <ul className="list-unstyled mb-0" style={{ fontSize: "0.85rem", lineHeight: 1.9 }}>
              <li className="d-flex gap-2">
                <i className="fas fa-money-bill-wave mt-1" style={{ width: 16 }} aria-hidden="true" />
                <span>Thanh toán khi nhận hàng</span>
              </li>
              <li className="d-flex gap-2">
                <i className="fas fa-credit-card mt-1" style={{ width: 16 }} aria-hidden="true" />
                <span>Thanh toán trực tuyến qua VNPay</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="footer-bottom text-center">
          &copy; {new Date().getFullYear()} {THONG_TIN_CUA_HANG.ten}. Designed by VVT
        </div>
      </div>
    </footer>
  );
}
export default Footer;
