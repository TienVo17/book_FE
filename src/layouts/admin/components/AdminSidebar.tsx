import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bag,
  Book,
  BoxArrowRight,
  ChatDots,
  ChevronDown,
  ChevronRight,
  List,
  People,
  Person,
  PieChart,
  Tags,
  TicketPerforated,
  XLg,
} from 'react-bootstrap-icons';
import { getJwtPayload } from '../../../api/Request';
import { signOutCartSession } from '../../../api/CartSession';

interface AdminSidebarProps {
  isOpen: boolean;
  menuButtonRef: React.RefObject<HTMLButtonElement>;
  onRequestOpen: () => void;
  onRequestClose: () => void;
}

type SubMenuName = 'sach' | 'donhang' | 'nguoidung' | 'binhluan';

const routeSubMenus: Array<{ prefix: string; menu: SubMenuName }> = [
  { prefix: '/quan-ly/danh-sach-sach', menu: 'sach' },
  { prefix: '/quan-ly/them-sach', menu: 'sach' },
  { prefix: '/quan-ly/cap-nhat-sach', menu: 'sach' },
  { prefix: '/quan-ly/danh-sach-don-hang', menu: 'donhang' },
  { prefix: '/quan-ly/danh-sach-nguoi-dung', menu: 'nguoidung' },
  { prefix: '/quan-ly/danh-sach-binh-luan', menu: 'binhluan' },
];

const getSubMenuForPath = (pathname: string): SubMenuName | null => (
  routeSubMenus.find(({ prefix }) => pathname.startsWith(prefix))?.menu ?? null
);

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isOpen,
  menuButtonRef,
  onRequestOpen,
  onRequestClose,
}) => {
  const [openSubMenu, setOpenSubMenu] = useState<SubMenuName | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [jwt, setJwt] = useState(() => localStorage.getItem('jwt') || '');
  const [userInfo, setUserInfo] = useState(() => getJwtPayload(localStorage.getItem('jwt')));
  const profileRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setUserInfo(getJwtPayload(jwt));
  }, [jwt]);

  useEffect(() => {
    const activeSubMenu = getSubMenuForPath(location.pathname);
    if (activeSubMenu) {
      setOpenSubMenu(activeSubMenu);
    }
    setIsDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleSubMenu = (menu: SubMenuName) => {
    setOpenSubMenu((current) => current === menu ? null : menu);
  };

  const handleNavigation = () => {
    setIsDropdownOpen(false);
    onRequestClose();
  };

  const handleLogout = () => {
    signOutCartSession();
    setJwt('');
    setIsDropdownOpen(false);
    onRequestClose();
    navigate('/');
  };

  const getInitials = (name?: string) => name?.trim().charAt(0).toUpperCase() || 'A';

  const renderSubMenu = (
    menu: SubMenuName,
    label: string,
    icon: React.ReactNode,
    links: Array<{ to: string; label: string }>,
  ) => {
    const isExpanded = openSubMenu === menu;
    const submenuId = `admin-submenu-${menu}`;

    return (
      <li>
        <button
          type="button"
          className="admin-nav-item"
          onClick={() => toggleSubMenu(menu)}
          aria-expanded={isExpanded}
          aria-controls={submenuId}
        >
          {icon}
          <span>{label}</span>
          <ChevronRight className={`nav-chevron ${isExpanded ? 'open' : ''}`} size={12} aria-hidden="true" />
        </button>
        <ul id={submenuId} className={`admin-sub-menu ${isExpanded ? 'open' : ''}`}>
          {links.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} onClick={handleNavigation}>
                <List size={13} aria-hidden="true" />
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </li>
    );
  };

  return (
    <>
      <div className="admin-topbar">
        <button
          ref={menuButtonRef}
          type="button"
          className="admin-menu-toggle"
          onClick={onRequestOpen}
          aria-label="Mở menu quản trị"
          aria-expanded={isOpen}
          aria-controls="admin-sidebar"
        >
          <List size={20} aria-hidden="true" />
        </button>

        <div className="admin-profile" ref={profileRef}>
          <button
            type="button"
            className="admin-profile-btn"
            onClick={() => setIsDropdownOpen((current) => !current)}
            aria-haspopup="menu"
            aria-expanded={isDropdownOpen}
            aria-controls="admin-profile-menu"
          >
            <span className="admin-profile-avatar" aria-hidden="true">
              {getInitials(userInfo?.sub)}
            </span>
            <span className="admin-profile-name">{userInfo?.sub || 'Admin'}</span>
            <ChevronDown size={11} aria-hidden="true" />
          </button>

          {isDropdownOpen && (
            <div id="admin-profile-menu" className="admin-profile-dropdown" role="menu">
              <NavLink to="/profile" role="menuitem" onClick={handleNavigation}>
                <Person size={16} aria-hidden="true" />
                Tài khoản
              </NavLink>
              <NavLink to="/settings" role="menuitem" onClick={handleNavigation}>
                <Tags size={16} aria-hidden="true" />
                Cài đặt
              </NavLink>
              <div className="divider" />
              <button type="button" className="logout-btn" role="menuitem" onClick={handleLogout}>
                <BoxArrowRight size={16} aria-hidden="true" />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>

      <aside
        id="admin-sidebar"
        className={`admin-sidebar ${isOpen ? 'open' : ''}`}
        aria-label="Điều hướng quản trị"
      >
        <div className="admin-sidebar-brand">
          <Book size={20} aria-hidden="true" />
          <h4>BookStore</h4>
          <button
            type="button"
            className="admin-sidebar-close"
            onClick={onRequestClose}
            aria-label="Đóng menu quản trị"
          >
            <XLg size={18} aria-hidden="true" />
          </button>
        </div>

        <ul className="admin-sidebar-nav">
          <li className="admin-sidebar-section">Tổng quan</li>
          {userInfo?.isAdmin && (
            <li>
              <NavLink to="/quan-ly/dashboard" className="admin-nav-item" onClick={handleNavigation}>
                <PieChart size={16} aria-hidden="true" />
                Dashboard
              </NavLink>
            </li>
          )}

          <li className="admin-sidebar-section">Quản lý</li>
          {renderSubMenu('sach', 'Quản lý sách', <Book size={16} aria-hidden="true" />, [
            { to: '/quan-ly/danh-sach-sach', label: 'Danh sách sách' },
          ])}

          {userInfo?.isAdmin && renderSubMenu(
            'donhang',
            'Quản lý đơn hàng',
            <Bag size={16} aria-hidden="true" />,
            [{ to: '/quan-ly/danh-sach-don-hang', label: 'Danh sách đơn hàng' }],
          )}

          {userInfo?.isAdmin && renderSubMenu(
            'nguoidung',
            'Quản lý người dùng',
            <People size={16} aria-hidden="true" />,
            [{ to: '/quan-ly/danh-sach-nguoi-dung', label: 'Danh sách người dùng' }],
          )}

          {renderSubMenu(
            'binhluan',
            'Quản lý bình luận',
            <ChatDots size={16} aria-hidden="true" />,
            [{ to: '/quan-ly/danh-sach-binh-luan', label: 'Danh sách bình luận' }],
          )}

          {userInfo?.isAdmin && (
            <li>
              <NavLink to="/quan-ly/quan-ly-the-loai" className="admin-nav-item" onClick={handleNavigation}>
                <Tags size={16} aria-hidden="true" />
                Quản lý thể loại
              </NavLink>
            </li>
          )}
          {userInfo?.isAdmin && (
            <li>
              <NavLink to="/quan-ly/quan-ly-coupon" className="admin-nav-item" onClick={handleNavigation}>
                <TicketPerforated size={16} aria-hidden="true" />
                Quản lý coupon
              </NavLink>
            </li>
          )}
        </ul>
      </aside>

    </>
  );
};

export default AdminSidebar;
