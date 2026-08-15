import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import { Search, X } from "react-bootstrap-icons";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { getAllTheLoai } from "../../api/TheLoaiApi";
import { getGoiYTimKiem, SachGoiYModel } from "../../api/SachApi";
import { TheLoaiModel } from "../../models/TheLoaiModel";
import { loadCart, readCartForCurrentSession, signOutCartSession } from "../../api/CartSession";
import { getAuthSnapshot, logoutAuth, useAuthSession } from "../../api/AuthSession";
import dinhDangSo from "../utils/DinhDangSo";
import AnhSach from "../utils/AnhSach";

const DO_DAI_TU_KHOA_TOI_THIEU = 2;
const THOI_GIAN_DEBOUNCE_MS = 250;

function Navbar(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuthSession();
  const [tuKhoaTamThoi, setTuKhoaTamThoi] = useState(() => new URLSearchParams(location.search).get("q") ?? "");
  const [soLuongGioHang, setSoLuongGioHang] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [openNavDropdown, setOpenNavDropdown] = useState<"theLoai" | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [theLoaiList, setTheLoaiList] = useState<TheLoaiModel[]>([]);
  const [goiY, setGoiY] = useState<SachGoiYModel[]>([]);
  const [moGoiY, setMoGoiY] = useState(false);
  const [chiSoDangChon, setChiSoDangChon] = useState(-1);
  const soThuTuYeuCauRef = useRef(0);

  useEffect(() => {
    if (location.pathname === "/tim-kiem") setTuKhoaTamThoi(new URLSearchParams(location.search).get("q") ?? "");
  }, [location.pathname, location.search]);

  useEffect(() => { getAllTheLoai().then(setTheLoaiList).catch(() => setTheLoaiList([])); }, []);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const loadSoLuongGioHang = () => {
      if (getAuthSnapshot().status === "unknown") return;
      setSoLuongGioHang(readCartForCurrentSession().reduce((total, item) => total + item.soLuong, 0));
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
    if (auth.status === "unknown") {
      return () => { active = false; };
    }
    if (auth.status === "guest") {
      setSoLuongGioHang(readCartForCurrentSession().reduce((total, item) => total + item.soLuong, 0));
      return () => { active = false; };
    }
    const expectedUid = auth.uid;
    loadCart().then(items => {
      const currentAuth = getAuthSnapshot();
      if (
        active &&
        currentAuth.status === "authenticated" &&
        currentAuth.uid === expectedUid
      ) {
        setSoLuongGioHang(items.reduce((total, item) => total + item.soLuong, 0));
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [auth.status, auth.uid]);

  useEffect(() => {
    const tuKhoa = tuKhoaTamThoi.trim();
    if (tuKhoa.length < DO_DAI_TU_KHOA_TOI_THIEU) {
      setGoiY([]); setMoGoiY(false); setChiSoDangChon(-1); return;
    }
    const soThuTu = ++soThuTuYeuCauRef.current;
    const timer = setTimeout(() => {
      getGoiYTimKiem(tuKhoa).then(ketQua => {
        if (soThuTuYeuCauRef.current !== soThuTu) return;
        setGoiY(ketQua); setMoGoiY(ketQua.length > 0); setChiSoDangChon(-1);
      }).catch(() => {
        if (soThuTuYeuCauRef.current !== soThuTu) return;
        setGoiY([]); setMoGoiY(false); setChiSoDangChon(-1);
      });
    }, THOI_GIAN_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [tuKhoaTamThoi]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isDropdownOpen && !target.closest(".user-dropdown")) setIsDropdownOpen(false);
      if (openNavDropdown && !target.closest(".navbar-nav .dropdown")) setOpenNavDropdown(null);
      if (moGoiY && !target.closest(".search-modern")) setMoGoiY(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen, openNavDropdown, moGoiY]);

  const dieuHuongTimKiem = (tuKhoa: string): void => {
    const trimmed = tuKhoa.trim();
    if (!trimmed) return;
    setMoGoiY(false); setChiSoDangChon(-1); navigate(`/tim-kiem?q=${encodeURIComponent(trimmed)}`);
  };
  const chonGoiY = (item: SachGoiYModel): void => {
    setMoGoiY(false); setChiSoDangChon(-1); setTuKhoaTamThoi(item.tenSach); navigate(`/sach/${item.slug || item.maSach}`);
  };
  const handleLogout = async (): Promise<void> => {
    setIsDropdownOpen(false);
    try {
      signOutCartSession();
    } catch {
      // Auth invalidation must continue when browser storage is unavailable.
    } finally {
      await logoutAuth();
    }
    navigate("/");
  };
  const hienThiGoiY = moGoiY && goiY.length > 0;
  const isAdmin = auth.status === "authenticated" && auth.capabilities.includes("ADMIN");

  return <nav className={`navbar navbar-expand-lg navbar-modern sticky-top ${scrolled ? "scrolled" : ""}`}>
    <div className="container">
      <NavLink className="navbar-brand" to="/"><i className="fas fa-book-open me-2" />BookStore</NavLink>
      <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarMain" aria-controls="navbarMain" aria-expanded="false" aria-label="Toggle navigation"><i className="fas fa-bars" /></button>
      <div className="collapse navbar-collapse" id="navbarMain"><ul className="navbar-nav me-auto mb-2 mb-lg-0">
        <li className="nav-item"><NavLink className="nav-link" to="/">Trang chủ</NavLink></li>
        <li className="nav-item dropdown"><button className={`nav-link dropdown-toggle nav-dropdown-toggle ${openNavDropdown === "theLoai" ? "show active" : ""}`} type="button" id="navbarDropdown1" aria-expanded={openNavDropdown === "theLoai"} onClick={() => setOpenNavDropdown(current => current === "theLoai" ? null : "theLoai")}>Thể loại sách</button>
          <ul className={`dropdown-menu dropdown-modern ${openNavDropdown === "theLoai" ? "show" : ""}`} aria-labelledby="navbarDropdown1">{theLoaiList.map(tl => <li key={tl.maTheLoai}><NavLink className="dropdown-item" to={`/the-loai/${tl.slug}`} onClick={() => setOpenNavDropdown(null)}>{tl.tenTheLoai} ({tl.soLuongSach})</NavLink></li>)}{theLoaiList.length === 0 && <li><span className="dropdown-item text-muted">Đang tải...</span></li>}</ul>
        </li><li className="nav-item"><NavLink className="nav-link" to="/about">Liên hệ</NavLink></li>
      </ul></div>
      <form className="search-modern me-3" role="search" onSubmit={event => { event.preventDefault(); dieuHuongTimKiem(tuKhoaTamThoi); }} autoComplete="off">
        <input type="search" role="combobox" placeholder="Tìm kiếm sách..." aria-label="Tìm kiếm sách" aria-expanded={hienThiGoiY} aria-controls="goi-y-tim-kiem-listbox" aria-autocomplete="list" aria-activedescendant={chiSoDangChon >= 0 ? `goi-y-tim-kiem-option-${chiSoDangChon}` : undefined} onChange={(event: ChangeEvent<HTMLInputElement>) => setTuKhoaTamThoi(event.target.value)} onKeyDown={event => {
          if (event.key === "Escape") { setMoGoiY(false); setChiSoDangChon(-1); }
          else if (moGoiY && goiY.length > 0 && event.key === "ArrowDown") { event.preventDefault(); setChiSoDangChon(index => (index + 1) % goiY.length); }
          else if (moGoiY && goiY.length > 0 && event.key === "ArrowUp") { event.preventDefault(); setChiSoDangChon(index => index <= 0 ? goiY.length - 1 : index - 1); }
          else if (moGoiY && chiSoDangChon >= 0 && event.key === "Enter") { event.preventDefault(); chonGoiY(goiY[chiSoDangChon]); }
        }} value={tuKhoaTamThoi} />
        {tuKhoaTamThoi.length > 0 && <button className="search-clear-btn" type="button" onClick={() => { setTuKhoaTamThoi(""); setGoiY([]); setMoGoiY(false); setChiSoDangChon(-1); }} aria-label="Xóa từ khóa tìm kiếm"><X size={16} /></button>}
        <button className="search-btn" type="submit" aria-label="Tìm kiếm"><Search size={14} /></button>
        {hienThiGoiY && <ul id="goi-y-tim-kiem-listbox" role="listbox" aria-label="Gợi ý tìm kiếm" className="search-suggestions dropdown-modern">{goiY.map((item, index) => <li key={item.maSach} id={`goi-y-tim-kiem-option-${index}`} role="option" aria-selected={index === chiSoDangChon} className={`search-suggestion-item ${index === chiSoDangChon ? "active" : ""}`} onMouseDown={event => { event.preventDefault(); chonGoiY(item); }}><AnhSach src={item.urlAnh ?? undefined} alt={item.tenSach} className="search-suggestion-anh" /><span className="search-suggestion-ten">{item.tenSach}</span><span className="search-suggestion-gia">{dinhDangSo(item.giaBan)} đ</span></li>)}</ul>}
      </form>
      <NavLink to="/gio-hang" className="cart-icon me-3" aria-label="Giỏ hàng"><i className="fas fa-shopping-bag" />{soLuongGioHang > 0 && <span className="cart-badge" key={soLuongGioHang}>{soLuongGioHang}</span>}</NavLink>
      {auth.status === "unknown" ? <span data-testid="auth-pending" role="status" aria-live="polite">Đang xác thực…</span> : auth.status === "guest" ? <NavLink to="/dang-nhap" className="btn-modern-primary"><i className="fas fa-user" />Đăng nhập</NavLink> : <div className="user-dropdown position-relative"><button className="btn-modern-outline" onClick={() => setIsDropdownOpen(current => !current)}><i className="fas fa-user-circle" />{auth.username || "User"}</button>{isDropdownOpen && <ul className="dropdown-menu dropdown-modern show" style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", minWidth: "200px" }}><li><NavLink to="/profile" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}><i className="fas fa-user me-2" />Tài khoản</NavLink></li><li><NavLink to="/order" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}><i className="fas fa-box me-2" />Đơn hàng của tôi</NavLink></li><li><NavLink to="/yeu-thich" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}><i className="fas fa-heart me-2" />Yêu thích</NavLink></li>{isAdmin && <li><NavLink to="/quan-ly/danh-sach-sach" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}><i className="fas fa-cog me-2" />Quản lý</NavLink></li>}<li><hr className="dropdown-divider" /></li><li><button className="dropdown-item" onClick={() => { void handleLogout(); }} style={{ color: "var(--color-danger)" }}><i className="fas fa-sign-out-alt me-2" />Đăng xuất</button></li></ul>}</div>}
    </div>
  </nav>;
}
export default Navbar;
