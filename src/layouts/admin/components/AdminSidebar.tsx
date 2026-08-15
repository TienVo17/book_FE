import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signOutCartSession } from '../../../api/CartSession';
import { logoutAuth, useAuthSession } from '../../../api/AuthSession';

const AdminSidebar = (): JSX.Element => {
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const auth = useAuthSession();
  const isAdmin = auth.status === 'authenticated' && auth.capabilities.includes('ADMIN');
  const username = auth.status === 'authenticated' ? auth.username : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target as HTMLElement;
      if (!target.closest('.admin-profile-btn') && !target.closest('.admin-profile-dropdown')) setIsDropdownOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = async (): Promise<void> => {
    setIsDropdownOpen(false);
    try {
      signOutCartSession();
    } catch {
      // Auth invalidation must continue when browser storage is unavailable.
    } finally {
      await logoutAuth();
    }
    navigate('/');
  };
  const toggleSubMenu = (menu: string): void => setOpenSubMenu(current => current === menu ? null : menu);
  const getInitials = (name: string | null): string => name?.charAt(0).toUpperCase() || 'A';

  return <>
    <aside className="admin-sidebar"><div className="admin-sidebar-brand"><i className="fas fa-book-reader" /><h4>BookStore</h4></div>
      <ul className="admin-sidebar-nav"><li className="admin-sidebar-section">Tổng quan</li>
        {isAdmin && <li><NavLink to="/quan-ly/dashboard" className="admin-nav-item"><i className="fas fa-chart-pie" />Dashboard</NavLink></li>}
        <li className="admin-sidebar-section">Quản lý</li>
        <li><div className="admin-nav-item" onClick={() => toggleSubMenu('sach')}><i className="fas fa-book" />Quản lý sách<i className={`fas fa-chevron-right nav-chevron ${openSubMenu === 'sach' ? 'open' : ''}`} /></div><ul className={`admin-sub-menu ${openSubMenu === 'sach' ? 'open' : ''}`}><li><NavLink to="danh-sach-sach"><i className="fas fa-list" /> Danh sách sách</NavLink></li></ul></li>
        {isAdmin && <li><div className="admin-nav-item" onClick={() => toggleSubMenu('donhang')}><i className="fas fa-shopping-bag" />Quản lý đơn hàng<i className={`fas fa-chevron-right nav-chevron ${openSubMenu === 'donhang' ? 'open' : ''}`} /></div><ul className={`admin-sub-menu ${openSubMenu === 'donhang' ? 'open' : ''}`}><li><NavLink to="/quan-ly/danh-sach-don-hang"><i className="fas fa-list" /> Danh sách đơn hàng</NavLink></li></ul></li>}
        {isAdmin && <li><div className="admin-nav-item" onClick={() => toggleSubMenu('nguoidung')}><i className="fas fa-users" />Quản lý người dùng<i className={`fas fa-chevron-right nav-chevron ${openSubMenu === 'nguoidung' ? 'open' : ''}`} /></div><ul className={`admin-sub-menu ${openSubMenu === 'nguoidung' ? 'open' : ''}`}><li><NavLink to="/quan-ly/danh-sach-nguoi-dung"><i className="fas fa-list" /> Danh sách người dùng</NavLink></li></ul></li>}
        <li><div className="admin-nav-item" onClick={() => toggleSubMenu('binhluan')}><i className="fas fa-comments" />Quản lý bình luận<i className={`fas fa-chevron-right nav-chevron ${openSubMenu === 'binhluan' ? 'open' : ''}`} /></div><ul className={`admin-sub-menu ${openSubMenu === 'binhluan' ? 'open' : ''}`}><li><NavLink to="danh-sach-binh-luan"><i className="fas fa-list" /> Danh sách bình luận</NavLink></li></ul></li>
        {isAdmin && <><li><NavLink to="/quan-ly/quan-ly-the-loai" className="admin-nav-item"><i className="fas fa-tags" />Quản lý thể loại</NavLink></li><li><NavLink to="/quan-ly/quan-ly-coupon" className="admin-nav-item"><i className="fas fa-ticket-alt" />Quản lý coupon</NavLink></li></>}
      </ul>
    </aside>
    <div className="admin-profile-btn" onClick={() => setIsDropdownOpen(current => !current)}><div className="admin-profile-avatar">{getInitials(username)}</div><span>{username || 'Admin'}</span><i className={`fas fa-chevron-${isDropdownOpen ? 'up' : 'down'}`} /></div>
    {isDropdownOpen && <div className="admin-profile-dropdown"><NavLink to="/profile"><i className="fas fa-user" /> Tài khoản</NavLink><NavLink to="/settings"><i className="fas fa-cog" /> Cài đặt</NavLink><div className="divider" /><button className="logout-btn" onClick={() => { void handleLogout(); }}><i className="fas fa-sign-out-alt" /> Đăng xuất</button></div>}
  </>;
};
export default AdminSidebar;
