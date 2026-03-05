import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

const DangNhap = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDangNhap = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    const loginRequest = { username, password };

    try {
      const response = await fetch("http://localhost:8080/tai-khoan/dang-nhap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginRequest),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("jwt", data.jwt);
        if (localStorage.getItem("nextPay") === "true") {
          localStorage.removeItem("nextPay");
          navigate("/thanh-toan");
        } else {
          navigate("/");
        }
        window.location.reload();
      } else {
        throw new Error("Đăng nhập thất bại!");
      }
    } catch (error) {
      setError("Đăng nhập thất bại. Vui lòng kiểm tra lại tên đăng nhập và mật khẩu.");
    } finally {
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
              <input type="checkbox" style={{ accentColor: "var(--color-primary)" }} />
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
