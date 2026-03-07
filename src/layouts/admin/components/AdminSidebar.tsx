import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const AdminSidebar = () => {
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [jwt, setJwt] = useState(localStorage.getItem('jwt') || '');
  const [userInfo, setUserInfo] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (jwt) {
      const decodedJwt = JSON.parse(atob(jwt.split('.')[1]));
      setUserInfo(decodedJwt);
    }
  }, [jwt]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.admin-profile-btn') && !target.closest('.admin-profile-dropdown')) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleSubMenu = (menu: string) => {
    setOpenSubMenu(openSubMenu === menu ? null : menu);
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    setJwt('');
    navigate('/');
  };

  const getInitials = (name: string) => {
    return name?.charAt(0)?.toUpperCase() || 'A';
  };

  return (
    <>
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <i className="fas fa-book-reader" />
          <h4>BookStore</h4>
        </div>

        <ul className="admin-sidebar-nav">
          {/* Overview section */}
          <li className="admin-sidebar-section">Tổng quan</li>

          {userInfo?.isAdmin && (
            <li>
              <NavLink to="/quan-ly/dashboard" className="admin-nav-item">
                <i className="fas fa-chart-pie" />
                Dashboard
              </NavLink>
            </li>
          )}

          {/* Management section */}
          <li className="admin-sidebar-section">Quản lý</li>

          {/* Book management */}
          <li>
            <div className="admin-nav-item" onClick={() => toggleSubMenu('sach')}>
              <i className="fas fa-book" />
              Quản lý sách
              <i className={`fas fa-chevron-right nav-chevron ${openSubMenu === 'sach' ? 'open' : ''}`} />
            </div>
            <ul className={`admin-sub-menu ${openSubMenu === 'sach' ? 'open' : ''}`}>
              <li>
                <NavLink to="danh-sach-sach">
                  <i className="fas fa-list" /> Danh sách sách
                </NavLink>
              </li>
            </ul>
          </li>

          {/* Order management */}
          {userInfo?.isAdmin && (
            <li>
              <div className="admin-nav-item" onClick={() => toggleSubMenu('donhang')}>
                <i className="fas fa-shopping-bag" />
                Quản lý đơn hàng
                <i className={`fas fa-chevron-right nav-chevron ${openSubMenu === 'donhang' ? 'open' : ''}`} />
              </div>
              <ul className={`admin-sub-menu ${openSubMenu === 'donhang' ? 'open' : ''}`}>
                <li>
                  <NavLink to="/quan-ly/danh-sach-don-hang">
                    <i className="fas fa-list" /> Danh sách đơn hàng
                  </NavLink>
                </li>
              </ul>
            </li>
          )}

          {/* User management */}
          {userInfo?.isAdmin && (
            <li>
              <div className="admin-nav-item" onClick={() => toggleSubMenu('nguoidung')}>
                <i className="fas fa-users" />
                Quản lý người dùng
                <i className={`fas fa-chevron-right nav-chevron ${openSubMenu === 'nguoidung' ? 'open' : ''}`} />
              </div>
              <ul className={`admin-sub-menu ${openSubMenu === 'nguoidung' ? 'open' : ''}`}>
                <li>
                  <NavLink to="/quan-ly/danh-sach-nguoi-dung">
                    <i className="fas fa-list" /> Danh sách người dùng
                  </NavLink>
                </li>
              </ul>
            </li>
          )}

          {/* Comment management */}
          <li>
            <div className="admin-nav-item" onClick={() => toggleSubMenu('binhluan')}>
              <i className="fas fa-comments" />
              Quản lý bình luận
              <i className={`fas fa-chevron-right nav-chevron ${openSubMenu === 'binhluan' ? 'open' : ''}`} />
            </div>
            <ul className={`admin-sub-menu ${openSubMenu === 'binhluan' ? 'open' : ''}`}>
              <li>
                <NavLink to="danh-sach-binh-luan">
                  <i className="fas fa-list" /> Danh sách bình luận
                </NavLink>
              </li>
            </ul>
          </li>

          {/* Coupon management */}
          {userInfo?.isAdmin && (
            <li>
              <NavLink to="/quan-ly/quan-ly-coupon" className="admin-nav-item">
                <i className="fas fa-ticket-alt" />
                Quản lý coupon
              </NavLink>
            </li>
          )}
        </ul>
      </aside>

      {/* Profile button - top right */}
      <div
        className="admin-profile-btn"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <div className="admin-profile-avatar">
          {getInitials(userInfo?.sub)}
        </div>
        <span>{userInfo?.sub || 'Admin'}</span>
        <i className={`fas fa-chevron-${isDropdownOpen ? 'up' : 'down'}`} style={{ fontSize: '0.65rem' }} />
      </div>

      {/* Profile dropdown */}
      {isDropdownOpen && (
        <div className="admin-profile-dropdown">
          <NavLink to="/profile">
            <i className="fas fa-user" /> Tài khoản
          </NavLink>
          <NavLink to="/settings">
            <i className="fas fa-cog" /> Cài đặt
          </NavLink>
          <div className="divider" />
          <button className="logout-btn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt" /> Đăng xuất
          </button>
        </div>
      )}
    </>
  );
};

export default AdminSidebar;
