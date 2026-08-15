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
              <div
                className="d-flex align-items-center gap-2 mt-4"
                style={{ color: "var(--color-text-secondary)", fontSize: "0.82rem" }}
              >
                <span style={{ flex: 1, height: 1, background: "var(--color-border, #e5e7eb)" }} />
                hoặc
                <span style={{ flex: 1, height: 1, background: "var(--color-border, #e5e7eb)" }} />
              </div>

              {/*
                Thẻ <a> chứ không phải nút gọi fetch: luồng phải là điều hướng cả trang để
                trình duyệt đi theo redirect của backend sang Google và lưu cookie binding.
                Một fetch sẽ bị CORS chặn và cũng không đưa người dùng tới màn hình đồng ý.
              */}
              <a
                href={googleLoginUrl()}
                className="btn-modern-outline-primary w-100 mt-3"
                style={{
                  padding: "0.7rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontSize: "0.95rem",
                  textDecoration: "none",
                }}
              >
                <i className="fab fa-google" aria-hidden="true"></i>
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
