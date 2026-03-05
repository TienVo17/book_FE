import React, { ChangeEvent, useState, useEffect } from "react";
import { Search } from "react-bootstrap-icons";
import { NavLink, useNavigate } from "react-router-dom";
import { getAllTheLoai } from "../../api/TheLoaiApi";
import { TheLoaiModel } from "../../models/TheLoaiModel";

interface NavbarProps {
  tuKhoaTimKiem: string;
  setTuKhoaTimKiem: (tuKhoa: string) => void;
}

function Navbar({ tuKhoaTimKiem, setTuKhoaTimKiem }: NavbarProps) {
  const [tuKhoaTamThoi, setTuKhoaTamThoi] = useState("");
  const [soLuongGioHang, setSoLuongGioHang] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const [jwt, setJwt] = useState(localStorage.getItem("jwt") || "");
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isAdminorStaff, setIsAdminorStaff] = useState(false);
  const [theLoaiList, setTheLoaiList] = useState<TheLoaiModel[]>([]);

  // Fetch categories on mount
  useEffect(() => {
    getAllTheLoai().then(setTheLoaiList).catch(console.error);
  }, []);

  // Track scroll for navbar style change
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const loadSoLuongGioHang = () => {
      const gioHang = JSON.parse(localStorage.getItem("gioHang") || "[]");
      const tongSoLuong = gioHang.reduce(
        (total: number, item: any) => total + item.soLuong,
        0
      );
      setSoLuongGioHang(tongSoLuong);
    };

    loadSoLuongGioHang();
    window.addEventListener("storage", loadSoLuongGioHang);
    window.addEventListener("cartUpdated", loadSoLuongGioHang);

    return () => {
      window.removeEventListener("storage", loadSoLuongGioHang);
      window.removeEventListener("cartUpdated", loadSoLuongGioHang);
    };
  }, []);

  useEffect(() => {
    if (jwt) {
      const decodedJwt = JSON.parse(atob(jwt.split(".")[1]));
      setUserInfo(decodedJwt);
      if (decodedJwt.isAdmin || decodedJwt.isStaff) {
        setIsAdminorStaff(true);
      }
    }
  }, [jwt]);

  const handleLogout = () => {
    localStorage.removeItem("jwt");
    setJwt("");
    setIsDropdownOpen(false);
    navigate("/");
  };

  useEffect(() => {
    setTuKhoaTamThoi(tuKhoaTimKiem);
  }, [tuKhoaTimKiem]);

  const onSearchInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTuKhoaTamThoi(e.target.value);
  };

  const onSearchSubmit = () => {
    setTuKhoaTimKiem(tuKhoaTamThoi);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearchSubmit();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isDropdownOpen) {
        const target = e.target as HTMLElement;
        if (!target.closest(".user-dropdown")) {
          setIsDropdownOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  return (
    <nav className={`navbar navbar-expand-lg navbar-modern sticky-top ${scrolled ? "scrolled" : ""}`}>
      <div className="container">
        <NavLink className="navbar-brand" to="/">
          <i className="fas fa-book-open me-2" style={{ fontSize: "1.2rem" }}></i>
          BookStore
        </NavLink>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarMain"
          aria-controls="navbarMain"
          aria-expanded="false"
          aria-label="Toggle navigation"
          style={{ border: "1.5px solid var(--color-border)", padding: "0.4rem 0.6rem" }}
        >
          <i className="fas fa-bars" style={{ color: "var(--color-text)" }}></i>
        </button>

        <div className="collapse navbar-collapse" id="navbarMain">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <NavLink className="nav-link" to="/">
                Trang chủ
              </NavLink>
            </li>
            <li className="nav-item dropdown">
              <NavLink
                className="nav-link dropdown-toggle"
                to="#"
                id="navbarDropdown1"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Thể loại sách
              </NavLink>
              <ul className="dropdown-menu dropdown-modern" aria-labelledby="navbarDropdown1">
                {theLoaiList.map(tl => (
                  <li key={tl.maTheLoai}>
                    <NavLink className="dropdown-item" to={`/?maTheLoai=${tl.maTheLoai}`}>
                      {tl.tenTheLoai} ({tl.soLuongSach})
                    </NavLink>
                  </li>
                ))}
                {theLoaiList.length === 0 && (
                  <li><span className="dropdown-item text-muted">Đang tải...</span></li>
                )}
              </ul>
            </li>
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle"
                href="#"
                id="navbarDropdown2"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Quy định
              </a>
              <ul className="dropdown-menu dropdown-modern" aria-labelledby="navbarDropdown2">
                <li>
                  <a className="dropdown-item" href="#">Quy định 1</a>
                </li>
                <li>
                  <a className="dropdown-item" href="#">Quy định 2</a>
                </li>
                <li>
                  <a className="dropdown-item" href="#">Quy định 3</a>
                </li>
              </ul>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/about">
                Liên hệ
              </NavLink>
            </li>
          </ul>
        </div>

        {/* Search */}
        <div className="search-modern me-3">
          <input
            type="search"
            placeholder="Tìm kiếm sách..."
            aria-label="Tìm kiếm"
            onChange={onSearchInputChange}
            onKeyDown={handleSearchKeyDown}
            value={tuKhoaTamThoi}
          />
          <button
            className="search-btn"
            type="button"
            onClick={onSearchSubmit}
            aria-label="Tìm kiếm"
          >
            <Search size={14} />
          </button>
        </div>

        {/* Cart */}
        <NavLink to="/gio-hang" className="cart-icon me-3" aria-label="Giỏ hàng">
          <i className="fas fa-shopping-bag"></i>
          {soLuongGioHang > 0 && (
            <span className="cart-badge" key={soLuongGioHang}>
              {soLuongGioHang}
            </span>
          )}
        </NavLink>

        {/* User */}
        {!jwt ? (
          <NavLink to="/dang-nhap" className="btn-modern-primary" style={{ padding: "0.45rem 1.2rem", fontSize: "0.85rem" }}>
            <i className="fas fa-user" style={{ fontSize: "0.8rem" }}></i>
            Đăng nhập
          </NavLink>
        ) : (
          <div className="user-dropdown position-relative">
            <button
              className="btn-modern-outline"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}
            >
              <i className="fas fa-user-circle"></i>
              {userInfo?.sub || "User"}
            </button>
            {isDropdownOpen && (
              <ul
                className="dropdown-menu dropdown-modern show"
                style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", minWidth: "200px" }}
              >
                <li>
                  <NavLink to="/profile" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                    <i className="fas fa-user me-2"></i>Tài khoản
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/order" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                    <i className="fas fa-box me-2"></i>Đơn hàng của tôi
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/yeu-thich" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                    <i className="fas fa-heart me-2"></i>Yêu thích
                  </NavLink>
                </li>
                {isAdminorStaff && (
                  <li>
                    <NavLink
                      to="/quan-ly/danh-sach-sach"
                      className="dropdown-item"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <i className="fas fa-cog me-2"></i>Quản lý
                    </NavLink>
                  </li>
                )}
                <li><hr className="dropdown-divider" style={{ margin: "0.3rem 0", opacity: 0.1 }} /></li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={handleLogout}
                    style={{ color: "var(--color-danger)" }}
                  >
                    <i className="fas fa-sign-out-alt me-2"></i>Đăng xuất
                  </button>
                </li>
              </ul>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
export default Navbar;
