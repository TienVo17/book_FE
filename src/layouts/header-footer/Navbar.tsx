import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import { Search, X } from "react-bootstrap-icons";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { getAllTheLoai } from "../../api/TheLoaiApi";
import { getGoiYTimKiem, SachGoiYModel } from "../../api/SachApi";
import { getJwtPayload } from "../../api/Request";
import { TheLoaiModel } from "../../models/TheLoaiModel";
import { loadCart, readCartForCurrentSession, signOutCartSession } from "../../api/CartSession";
import { AUTH_SESSION_CHANGED_EVENT } from "../../api/SessionCleanup";
import dinhDangSo from "../utils/DinhDangSo";
import AnhSach from "../utils/AnhSach";

// Bỏ qua gợi ý khi từ khóa quá ngắn: một, hai ký tự trả về quá nhiều kết quả
// không liên quan và tốn một lượt gọi API cho mỗi phím gõ.
const DO_DAI_TU_KHOA_TOI_THIEU = 2;
// Chờ người dùng ngừng gõ 250ms rồi mới gọi API gợi ý.
const THOI_GIAN_DEBOUNCE_MS = 250;

function Navbar() {
  const location = useLocation();
  const [tuKhoaTamThoi, setTuKhoaTamThoi] = useState(
    () => new URLSearchParams(location.search).get("q") ?? ""
  );
  const [soLuongGioHang, setSoLuongGioHang] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [openNavDropdown, setOpenNavDropdown] = useState<"theLoai" | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const [jwt, setJwt] = useState(localStorage.getItem("jwt") || "");
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isAdminorStaff, setIsAdminorStaff] = useState(false);
  const [theLoaiList, setTheLoaiList] = useState<TheLoaiModel[]>([]);

  // Gợi ý tìm kiếm
  const [goiY, setGoiY] = useState<SachGoiYModel[]>([]);
  const [moGoiY, setMoGoiY] = useState(false);
  const [chiSoDangChon, setChiSoDangChon] = useState(-1);
  // Đánh số mỗi lượt gọi gợi ý để loại bỏ phản hồi trả về trễ (cờ "còn hiệu
  // lực" theo request) — nếu không, một phản hồi chậm của từ khóa cũ có thể
  // ghi đè lên kết quả mới hơn của từ khóa hiện tại.
  const soThuTuYeuCauRef = useRef(0);

  // Đồng bộ ô tìm kiếm với URL khi đang đứng ở trang kết quả: F5 hoặc back/forward
  // trên /tim-kiem?q=... phải hiện đúng từ khóa đang xem, không phải ô trống.
  useEffect(() => {
    if (location.pathname === "/tim-kiem") {
      setTuKhoaTamThoi(new URLSearchParams(location.search).get("q") ?? "");
    }
  }, [location.pathname, location.search]);

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
      const tongSoLuong = readCartForCurrentSession().reduce((total, item) => total + item.soLuong, 0);
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
    let active = true;
    const syncSession = () => {
      const nextJwt = localStorage.getItem("jwt") || "";
      setJwt(nextJwt);
      if (!nextJwt) {
        setSoLuongGioHang(0);
        return;
      }
      loadCart()
        .then(items => {
          if (active && localStorage.getItem("jwt") === nextJwt) {
            setSoLuongGioHang(items.reduce((total, item) => total + item.soLuong, 0));
          }
        })
        .catch(() => {
          // Cart pages expose actionable load errors. Navbar keeps the last safe
          // cache count instead of showing another global toast.
        });
    };
    const syncStoredSession = (event: StorageEvent) => {
      if (event.key === "jwt") syncSession();
    };
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, syncSession);
    window.addEventListener("storage", syncStoredSession);
    return () => {
      active = false;
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, syncSession);
      window.removeEventListener("storage", syncStoredSession);
    };
  }, []);

  useEffect(() => {
    if (jwt) {
      const decodedJwt = getJwtPayload(jwt);
      setUserInfo(decodedJwt);
      // Admin CTA requires ADMIN only; isStaff is kept in the JWT payload for
      // backward compatibility but must not grant admin UI access.
      setIsAdminorStaff(Boolean(decodedJwt?.isAdmin));
      return;
    }

    setUserInfo(null);
    setIsAdminorStaff(false);
  }, [jwt]);

  const handleLogout = () => {
    signOutCartSession();
    setJwt("");
    setIsDropdownOpen(false);
    navigate("/");
  };

  // Debounce + hủy phản hồi trễ cho gợi ý tìm kiếm. Lỗi/404 phải suy biến êm:
  // không dropdown, không toast, và không được cản trở việc submit tìm kiếm
  // bình thường — backend /api/sach/goi-y deploy sau frontend nên chắc chắn
  // có giai đoạn trả 404 trên production.
  useEffect(() => {
    const tuKhoa = tuKhoaTamThoi.trim();
    if (tuKhoa.length < DO_DAI_TU_KHOA_TOI_THIEU) {
      setGoiY([]);
      setMoGoiY(false);
      setChiSoDangChon(-1);
      return;
    }

    const soThuTu = ++soThuTuYeuCauRef.current;
    const timer = setTimeout(() => {
      getGoiYTimKiem(tuKhoa)
        .then((ketQua) => {
          if (soThuTuYeuCauRef.current !== soThuTu) return; // phản hồi trễ, đã có yêu cầu mới hơn
          setGoiY(ketQua);
          setMoGoiY(ketQua.length > 0);
          setChiSoDangChon(-1);
        })
        .catch(() => {
          if (soThuTuYeuCauRef.current !== soThuTu) return;
          setGoiY([]);
          setMoGoiY(false);
          setChiSoDangChon(-1);
        });
    }, THOI_GIAN_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [tuKhoaTamThoi]);

  const onSearchInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTuKhoaTamThoi(e.target.value);
  };

  const dieuHuongTimKiem = (tuKhoa: string) => {
    const trimmed = tuKhoa.trim();
    if (!trimmed) return;
    setMoGoiY(false);
    setChiSoDangChon(-1);
    navigate(`/tim-kiem?q=${encodeURIComponent(trimmed)}`);
  };

  const onSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    dieuHuongTimKiem(tuKhoaTamThoi);
  };

  const chonGoiY = (item: SachGoiYModel) => {
    setMoGoiY(false);
    setChiSoDangChon(-1);
    setTuKhoaTamThoi(item.tenSach);
    navigate(`/sach/${item.slug || item.maSach}`);
  };

  const xoaTuKhoa = () => {
    setTuKhoaTamThoi("");
    setGoiY([]);
    setMoGoiY(false);
    setChiSoDangChon(-1);
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setMoGoiY(false);
      setChiSoDangChon(-1);
      return;
    }

    if (!moGoiY || goiY.length === 0) {
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setChiSoDangChon((i) => (i + 1) % goiY.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setChiSoDangChon((i) => (i <= 0 ? goiY.length - 1 : i - 1));
    } else if (e.key === "Enter" && chiSoDangChon >= 0) {
      e.preventDefault();
      chonGoiY(goiY[chiSoDangChon]);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isDropdownOpen && !target.closest(".user-dropdown")) {
        setIsDropdownOpen(false);
      }
      if (openNavDropdown && !target.closest(".navbar-nav .dropdown")) {
        setOpenNavDropdown(null);
      }
      if (moGoiY && !target.closest(".search-modern")) {
        setMoGoiY(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen, openNavDropdown, moGoiY]);

  const toggleNavDropdown = (dropdown: "theLoai") => {
    setOpenNavDropdown((current) => current === dropdown ? null : dropdown);
  };

  const hienThiGoiY = moGoiY && goiY.length > 0;

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
              <button
                className={`nav-link dropdown-toggle nav-dropdown-toggle ${openNavDropdown === "theLoai" ? "show active" : ""}`}
                type="button"
                id="navbarDropdown1"
                aria-expanded={openNavDropdown === "theLoai"}
                onClick={() => toggleNavDropdown("theLoai")}
              >
                Thể loại sách
              </button>
              <ul className={`dropdown-menu dropdown-modern ${openNavDropdown === "theLoai" ? "show" : ""}`} aria-labelledby="navbarDropdown1">
                {theLoaiList.map(tl => (
                  <li key={tl.maTheLoai}>
                    <NavLink className="dropdown-item" to={`/the-loai/${tl.slug}`} onClick={() => setOpenNavDropdown(null)}>
                      {tl.tenTheLoai} ({tl.soLuongSach})
                    </NavLink>
                  </li>
                ))}
                {theLoaiList.length === 0 && (
                  <li><span className="dropdown-item text-muted">Đang tải...</span></li>
                )}
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
        <form className="search-modern me-3" role="search" onSubmit={onSearchSubmit} autoComplete="off">
          <input
            type="search"
            role="combobox"
            placeholder="Tìm kiếm sách..."
            aria-label="Tìm kiếm sách"
            aria-expanded={hienThiGoiY}
            aria-controls="goi-y-tim-kiem-listbox"
            aria-autocomplete="list"
            aria-activedescendant={chiSoDangChon >= 0 ? `goi-y-tim-kiem-option-${chiSoDangChon}` : undefined}
            onChange={onSearchInputChange}
            onKeyDown={onSearchKeyDown}
            value={tuKhoaTamThoi}
          />
          {tuKhoaTamThoi.length > 0 && (
            <button
              className="search-clear-btn"
              type="button"
              onClick={xoaTuKhoa}
              aria-label="Xóa từ khóa tìm kiếm"
            >
              <X size={16} />
            </button>
          )}
          <button
            className="search-btn"
            type="submit"
            aria-label="Tìm kiếm"
          >
            <Search size={14} />
          </button>

          {hienThiGoiY && (
            <ul
              id="goi-y-tim-kiem-listbox"
              role="listbox"
              aria-label="Gợi ý tìm kiếm"
              className="search-suggestions dropdown-modern"
            >
              {goiY.map((item, index) => (
                <li
                  key={item.maSach}
                  id={`goi-y-tim-kiem-option-${index}`}
                  role="option"
                  aria-selected={index === chiSoDangChon}
                  className={`search-suggestion-item ${index === chiSoDangChon ? "active" : ""}`}
                  // onMouseDown thay vì onClick: chạy trước sự kiện blur của input
                  // nên lựa chọn không bị mất khi dropdown đóng do mất focus.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    chonGoiY(item);
                  }}
                >
                  <AnhSach src={item.urlAnh ?? undefined} alt={item.tenSach} className="search-suggestion-anh" />
                  <span className="search-suggestion-ten">{item.tenSach}</span>
                  <span className="search-suggestion-gia">{dinhDangSo(item.giaBan)} đ</span>
                </li>
              ))}
            </ul>
          )}
        </form>

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
