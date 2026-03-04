import React, { useState } from "react";
import { NavLink } from "react-router-dom";

function DangKyNguoiDung() {
  const [tenDangNhap, setTenDangNhap] = useState("");
  const [email, setEmail] = useState("");
  const [hoDem, setHoDen] = useState("");
  const [ten, setTen] = useState("");
  const [soDienThoai, setSoDienThoai] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [matKhauLapLai, setMatKhauLapLai] = useState("");
  const [gioiTinh, setGioiTinh] = useState("M");
  const [thongBao, setThongBao] = useState("");
  const [diaChi, setDiaChi] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [errorTenDangNhap, setErrorTenDangNhap] = useState("");
  const [errorEmail, setErrorEmail] = useState("");
  const [errorMatKhau, setErrorMatKhau] = useState("");
  const [errorMatKhauLapLai, setErrorMatKhauLapLai] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    setErrorTenDangNhap("");
    setErrorEmail("");
    setErrorMatKhau("");
    setErrorMatKhauLapLai("");
    e.preventDefault();

    const isTenDangNhapValid = !(await kiemTraTenDangNhapDaTonTai(tenDangNhap));
    const isEmailValid = !(await kiemTraEmailDaTonTai(email));
    const isMatKhauValid = !kiemTraMatKhauDaTonTai(matKhau);
    const isMatKhauLapLaiValid = !kiemTraMatKhauLapLai(matKhauLapLai);

    if (isTenDangNhapValid && isEmailValid && isMatKhauValid && isMatKhauLapLaiValid) {
      setIsLoading(true);
      try {
        const url = "http://localhost:8080/tai-khoan/dang-ky";
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify({
            tenDangNhap, email, matKhau, hoDem, ten,
            soDienThoai, diaChi, gioiTinh, daKichHoat: 0, maKichHoat: "",
          }),
        });
        if (response.ok) {
          setThongBao("Đăng ký thành công, vui lòng kiểm tra email để kích hoạt!");
        } else {
          setThongBao("Đã xảy ra lỗi trong quá trình đăng ký tài khoản.");
        }
      } catch (error) {
        setThongBao("Đã xảy ra lỗi trong quá trình đăng ký tài khoản.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const kiemTraTenDangNhapDaTonTai = async (tenDangNhap: string) => {
    const url = `http://localhost:8080/nguoi-dung/search/existsByTenDangNhap?tenDangNhap=${tenDangNhap}`;
    try {
      const response = await fetch(url);
      const data = await response.text();
      if (data === "true") {
        setErrorTenDangNhap("Tên đăng nhập này đã tồn tại");
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const handleTenDangNhapChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setTenDangNhap(e.target.value);
    setErrorTenDangNhap("");
    return kiemTraTenDangNhapDaTonTai(e.target.value);
  };

  const kiemTraEmailDaTonTai = async (email: string) => {
    const url = `http://localhost:8080/nguoi-dung/search/existsByEmail?email=${email}`;
    try {
      const response = await fetch(url);
      const data = await response.text();
      if (data === "true") {
        setErrorEmail("Email này đã tồn tại");
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const kiemTraMatKhauDaTonTai = (matKhau: string) => {
    const passwordRegex = /^(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(matKhau)) {
      setErrorMatKhau("Mật khẩu phải có ít nhất 8 ký tự và 1 ký tự đặc biệt (!@#$%^&*)");
      return true;
    }
    setErrorMatKhau("");
    return false;
  };

  const handleMatKhauChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMatKhau(e.target.value);
    setErrorMatKhau("");
    kiemTraMatKhauDaTonTai(e.target.value);
  };

  const kiemTraMatKhauLapLai = (matKhauLapLai: string) => {
    if (matKhauLapLai !== matKhau) {
      setErrorMatKhauLapLai("Mật khẩu không trùng khớp.");
      return true;
    }
    setErrorMatKhauLapLai("");
    return false;
  };

  const handleMatKhauLapLaiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMatKhauLapLai(e.target.value);
    setErrorMatKhauLapLai("");
    kiemTraMatKhauLapLai(e.target.value);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setErrorEmail("");
    kiemTraEmailDaTonTai(e.target.value);
  };

  const renderField = (label: string, id: string, type: string, value: string, onChange: any, placeholder: string, icon: string, error?: string) => (
    <div className="mb-3">
      <label htmlFor={id} style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 6, display: "block" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <i className={`fas ${icon}`} style={{
          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          color: "var(--color-text-muted)", fontSize: "0.85rem"
        }}></i>
        <input
          type={type}
          className="auth-input"
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{ paddingLeft: "2.2rem" }}
        />
      </div>
      {error && (
        <small className="animate-fade-in" style={{ color: "var(--color-danger)", fontSize: "0.8rem", marginTop: 4, display: "block" }}>
          {error}
        </small>
      )}
    </div>
  );

  return (
    <div className="auth-container" style={{ padding: "2rem 1rem" }}>
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="text-center mb-4">
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
            display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem"
          }}>
            <i className="fas fa-user-plus" style={{ color: "white", fontSize: "1.5rem" }}></i>
          </div>
          <h2>Đăng ký tài khoản</h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            Tạo tài khoản để mua sắm dễ dàng
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {renderField("Tên đăng nhập", "tenDangNhap", "text", tenDangNhap, handleTenDangNhapChange, "Nhập tên đăng nhập", "fa-user", errorTenDangNhap)}
          {renderField("Email", "email", "email", email, handleEmailChange, "Nhập email", "fa-envelope", errorEmail)}
          {renderField("Mật khẩu", "matKhau", "password", matKhau, handleMatKhauChange, "Nhập mật khẩu", "fa-lock", errorMatKhau)}
          {renderField("Xác nhận mật khẩu", "matKhauLapLai", "password", matKhauLapLai, handleMatKhauLapLaiChange, "Nhập lại mật khẩu", "fa-lock", errorMatKhauLapLai)}

          <div className="row mb-3">
            <div className="col-md-6">
              <label htmlFor="hoDem" style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 6, display: "block" }}>Họ đệm</label>
              <input type="text" className="auth-input" id="hoDem" value={hoDem} onChange={(e) => setHoDen(e.target.value)} placeholder="Nhập họ đệm" />
            </div>
            <div className="col-md-6">
              <label htmlFor="ten" style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 6, display: "block" }}>Tên</label>
              <input type="text" className="auth-input" id="ten" value={ten} onChange={(e) => setTen(e.target.value)} placeholder="Nhập tên" />
            </div>
          </div>

          {renderField("Số điện thoại", "soDienThoai", "tel", soDienThoai, (e: any) => setSoDienThoai(e.target.value), "Nhập số điện thoại", "fa-phone")}
          {renderField("Địa chỉ", "diaChi", "text", diaChi, (e: any) => setDiaChi(e.target.value), "Nhập địa chỉ", "fa-map-marker-alt")}

          <div className="mb-4">
            <label htmlFor="gioiTinh" style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 6, display: "block" }}>Giới tính</label>
            <select
              id="gioiTinh"
              className="auth-input"
              value={gioiTinh}
              onChange={(e) => setGioiTinh(e.target.value)}
              style={{ cursor: "pointer" }}
            >
              <option value="M">Nam</option>
              <option value="F">Nữ</option>
              <option value="O">Khác</option>
            </select>
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
              "Đăng ký"
            )}
          </button>

          {thongBao && (
            <div
              className="mt-3 animate-fade-in"
              style={{
                background: "rgba(16,185,129,0.06)",
                border: "1px solid rgba(16,185,129,0.15)",
                borderRadius: "var(--radius-md)",
                padding: "0.7rem 1rem",
                fontSize: "0.88rem",
                color: "var(--color-success)"
              }}
              role="alert"
            >
              <i className="fas fa-check-circle me-2"></i>
              {thongBao}
            </div>
          )}

          <div className="text-center mt-4" style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)" }}>
            Đã có tài khoản?{" "}
            <NavLink to="/dang-nhap" style={{ fontWeight: 600 }}>
              Đăng nhập ngay
            </NavLink>
          </div>
        </form>
      </div>
    </div>
  );
}
export default DangKyNguoiDung;
