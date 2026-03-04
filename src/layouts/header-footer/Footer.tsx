import React from "react";
import { NavLink } from "react-router-dom";

function Footer() {
  return (
    <footer className="footer-modern">
      <div className="container">
        <div className="row">
          {/* Brand */}
          <div className="col-lg-3 col-md-6 mb-4">
            <h5 style={{ fontSize: "1.3rem", textTransform: "none", letterSpacing: "-0.3px" }}>
              <i className="fas fa-book-open me-2" style={{ color: "var(--color-primary-light)" }}></i>
              BookStore
            </h5>
            <p style={{ fontSize: "0.88rem", lineHeight: 1.7 }}>
              Nơi mang đến hàng ngàn đầu sách hay với giá ưu đãi nhất. Giao hàng toàn quốc.
            </p>
            <div className="d-flex gap-2 mt-3">
              <a href="https://www.facebook.com/" className="social-icon" aria-label="Facebook">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#!" className="social-icon" aria-label="Twitter">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="https://www.instagram.com/" className="social-icon" aria-label="Instagram">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="https://github.com/" className="social-icon" aria-label="Github">
                <i className="fab fa-github"></i>
              </a>
            </div>
          </div>

          {/* Services */}
          <div className="col-lg-2 col-md-6 mb-4">
            <h5>Dịch vụ</h5>
            <ul className="list-unstyled mb-0">
              <li className="mb-2"><a href="#!">Điều khoản sử dụng</a></li>
              <li className="mb-2"><a href="#!">Chính sách bảo mật</a></li>
              <li className="mb-2"><a href="#!">Bảo mật thanh toán</a></li>
              <li className="mb-2"><a href="#!">Hệ thống nhà sách</a></li>
            </ul>
          </div>

          {/* Support */}
          <div className="col-lg-2 col-md-6 mb-4">
            <h5>Hỗ trợ</h5>
            <ul className="list-unstyled mb-0">
              <li className="mb-2"><a href="#!">Đổi trả - Hoàn tiền</a></li>
              <li className="mb-2"><a href="#!">Bảo hành - Bồi hoàn</a></li>
              <li className="mb-2"><a href="#!">Chính sách vận chuyển</a></li>
              <li className="mb-2"><a href="#!">Chính sách khách sỉ</a></li>
            </ul>
          </div>

          {/* Account */}
          <div className="col-lg-2 col-md-6 mb-4">
            <h5>Tài khoản</h5>
            <ul className="list-unstyled mb-0">
              <li className="mb-2">
                <NavLink to="/dang-nhap">Đăng nhập</NavLink>
              </li>
              <li className="mb-2"><a href="#!">Đổi địa chỉ</a></li>
              <li className="mb-2"><a href="#!">Chi tiết tài khoản</a></li>
              <li className="mb-2">
                <NavLink to="/order">Lịch sử mua hàng</NavLink>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="col-lg-3 col-md-12 mb-4">
            <h5>Đăng ký nhận tin</h5>
            <p style={{ fontSize: "0.85rem" }}>Nhận thông tin ưu đãi và sách mới nhất.</p>
            <form className="d-flex gap-2">
              <input
                type="email"
                className="form-control"
                placeholder="Email của bạn"
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
                type="button"
                className="btn"
                style={{
                  background: "var(--color-primary)",
                  color: "white",
                  borderRadius: "var(--radius-md)",
                  padding: "0.5rem 1rem",
                  whiteSpace: "nowrap",
                  fontSize: "0.85rem"
                }}
              >
                Đăng ký
              </button>
            </form>
          </div>
        </div>

        {/* Copyright */}
        <div className="footer-bottom text-center">
          &copy; 2026 BookStore. Designed by VVT
        </div>
      </div>
    </footer>
  );
}
export default Footer;
