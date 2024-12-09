import React, { useState } from "react";
import { NavLink,useNavigate } from 'react-router-dom';
const DangNhap = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleDangNhap = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const loginRequest = {
      username: username,
      password: password,
    };

    try {
      const response = await fetch("http://localhost:8080/tai-khoan/dang-nhap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginRequest),
      });

      if (response.ok) {
        const data = await response.json();
        // Lưu JWT vào localStorage
        localStorage.setItem('jwt', data.jwt);
        setError("Đăng nhập thành công!");
        if(localStorage.getItem("nextPay") ==="true"){
          localStorage.removeItem("nextPay");
          navigate('/thanh-toan'); 
        }else{
          navigate('/'); // Chuyển hướng về trang chủ
        }
       
        window.location.reload(); // Reload để cập nhật state
      } else {
        throw new Error("Đăng nhập thất bại!");
      }
    } catch (error) {
      console.error("Đăng nhập thất bại: ", error);
      setError(
        "Đăng nhập thất bại. Vui lòng kiểm tra lại tên đăng nhập và mật khẩu."
      );
    }
  };

  return (
    <div className="container-fluid vh-100 overflow-hidden">
      <div className="row justify-content-center align-items-center h-100">
        <div className="col-md-6 col-lg-4">
          <div className="card shadow-lg">
            <div className="card-body p-5">
              <div className="text-center mb-4">
                <i className="fas fa-user-circle fa-3x text-primary mb-3"></i>
                <h3 className="font-weight-bold">Đăng nhập</h3>
              </div>

              <form onSubmit={handleDangNhap}>
                <div className="mb-3">
                  <label htmlFor="username" className="form-label">
                    Tên đăng nhập
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-user"></i>
                    </span>
                    <input
                      type="username"
                      className="form-control"
                      id="username"
                      placeholder="Nhập tên đăng nhập"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">
                    Mật khẩu
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-lock"></i>
                    </span>
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      placeholder="Nhập mật khẩu"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="mb-3 form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="remember"
                  />
                  <label className="form-check-label" htmlFor="remember">
                    Ghi nhớ đăng nhập
                  </label>
                </div>

                <div className="d-grid">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                  >
                    Đăng nhập
                  </button>
                </div>

                {error && (
                  <div className="alert alert-danger mt-3" role="alert">
                    <i className="fas fa-exclamation-circle me-2"></i>
                    {error}
                  </div>
                )}

                <div className="text-center mt-3">
                  <button 
                    className="btn btn-link text-decoration-none p-0" 
                    onClick={() => {/* xử lý quên mật khẩu */}}
                  >
                    Quên mật khẩu?
                  </button>
                  <div className="mt-2">
                    Chưa có tài khoản?{" "}
                    <NavLink to="/dang-ky" className="text-decoration-none">
                      Đăng ký ngay
                    </NavLink>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DangNhap;
