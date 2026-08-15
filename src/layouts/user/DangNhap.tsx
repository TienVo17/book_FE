import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { loginAuth, logoutAuth } from '../../api/AuthSession';
import { getSocialProviderStatus, googleLoginUrl } from '../../api/SocialAuthApi';
import {
  claimGuestCartForAccount,
  mergeGuestCartAfterLogin,
  preserveFailedLoginHandoffForLogout,
  readGuestCartSnapshot,
} from '../../api/CartSession';

/**
 * Logo "G" chính thức của Google, bốn màu.
 *
 * Vẽ inline thay vì dùng glyph icon font: glyph là đơn sắc nên nó kế thừa màu chữ và bị
 * tô lại theo màu của site — vừa sai hướng dẫn nhận diện của Google, vừa làm mất chính bộ
 * màu mà người dùng dựa vào để nhận ra nút này. `aria-hidden` vì nhãn chữ bên cạnh đã mô
 * tả đầy đủ hành động.
 */
const GoogleLogo: React.FC = () => (
  <svg className="social-logo" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const DangNhap = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const loginInFlight = useRef(false);

  // Nút provider chỉ hiện khi backend xác nhận đang bật. Mọi thất bại đều giữ nút ẩn:
  // một nút dẫn tới endpoint trả 404 trông như web hỏng chứ không như tính năng đang tắt.
  useEffect(() => {
    let conHieuLuc = true;
    getSocialProviderStatus()
      .then((status) => {
        if (conHieuLuc) setGoogleAvailable(status.google);
      })
      .catch(() => {
        if (conHieuLuc) setGoogleAvailable(false);
      });
    return () => {
      conHieuLuc = false;
    };
  }, []);

  const handleDangNhap = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loginInFlight.current) return;
    loginInFlight.current = true;
    setIsLoading(true);
    setError("");

    let sessionInstalled = false;
    try {
      const continueToCheckout = localStorage.getItem("nextPay") === "true";
      let guestSnapshot: ReturnType<typeof readGuestCartSnapshot> = [];
      await loginAuth({
        username,
        password,
        rememberMe,
        // The session is intentionally still unknown here, so the snapshot is
        // captured before authenticated cart ownership becomes visible.
        beforeInstall: (principal) => {
          guestSnapshot = readGuestCartSnapshot();
          claimGuestCartForAccount(
            principal.uid,
            guestSnapshot
          );
        },
      });
      sessionInstalled = true;
      await mergeGuestCartAfterLogin(guestSnapshot);

      if (continueToCheckout) {
        localStorage.removeItem("nextPay");
        navigate("/thanh-toan");
      } else {
        navigate("/");
      }
    } catch (error) {
      if (sessionInstalled) {
        // Preserve only a valid, same-account merge retry through this fail-closed
        // logout; storage failure must never prevent server/session invalidation.
        try {
          preserveFailedLoginHandoffForLogout();
        } catch {
          // Logout remains mandatory even when private-state preservation fails.
        } finally {
          await logoutAuth();
        }
      }
      setError(error instanceof Error
        ? error.message
        : "Đăng nhập thất bại. Vui lòng kiểm tra lại tên đăng nhập và mật khẩu.");
    } finally {
      loginInFlight.current = false;
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="text-center mb-4">
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
            display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem"
          }}>
            <i className="fas fa-user" style={{ color: "white", fontSize: "1.5rem" }}></i>
          </div>
          <h2>Đăng nhập</h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            Chào mừng bạn trở lại!
          </p>
        </div>

        <form onSubmit={handleDangNhap}>
          <div className="mb-3">
            <label htmlFor="username" style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 6, display: "block" }}>
              Tên đăng nhập
            </label>
            <input
              type="text"
              className="auth-input"
              id="username"
              placeholder="Nhập tên đăng nhập"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password" style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 6, display: "block" }}>
              Mật khẩu
            </label>
            <input
              type="password"
              className="auth-input"
              id="password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4">
            <label style={{ fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                style={{ accentColor: "var(--color-primary)" }}
              />
              Ghi nhớ
            </label>
            <button
              type="button"
              style={{ background: "none", border: "none", color: "var(--color-primary)", fontSize: "0.85rem", cursor: "pointer" }}
              onClick={() => navigate('/quen-mat-khau')}
            >
              Quên mật khẩu?
            </button>
          </div>

          <button
            type="submit"
            className="btn-modern-primary w-100"
            style={{ padding: "0.7rem", justifyContent: "center", fontSize: "0.95rem" }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Đang xử lý...
              </>
            ) : (
              "Đăng nhập"
            )}
          </button>

          {error && (
            <div
              className="mt-3 animate-fade-in"
              style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.15)",
                borderRadius: "var(--radius-md)",
                padding: "0.7rem 1rem",
                fontSize: "0.88rem",
                color: "var(--color-danger)"
              }}
              role="alert"
            >
              <i className="fas fa-exclamation-circle me-2"></i>
              {error}
            </div>
          )}

          {googleAvailable && (
            <>
              <div className="auth-divider">hoặc</div>

              {/*
                Thẻ <a> chứ không phải nút gọi fetch: luồng phải là điều hướng cả trang để
                trình duyệt đi theo redirect của backend sang Google và lưu cookie binding.
                Một fetch sẽ bị CORS chặn và cũng không đưa người dùng tới màn hình đồng ý.
              */}
              <a href={googleLoginUrl()} className="btn-social-google mt-3">
                <GoogleLogo />
                Đăng nhập bằng Google
              </a>
            </>
          )}

          <div className="text-center mt-4" style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)" }}>
            Chưa có tài khoản?{" "}
            <NavLink to="/dang-ky" style={{ fontWeight: 600 }}>
              Đăng ký ngay
            </NavLink>
          </div>
        </form>
      </div>
    </div>
  );
};
export default DangNhap;
