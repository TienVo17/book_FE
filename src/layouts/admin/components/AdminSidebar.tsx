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

  const toggleSubMenu = (menu: string) => {
    setOpenSubMenu(openSubMenu === menu ? null : menu);
  };

  const handleThemSach = () => {
    navigate('/quan-ly/them-sach');
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    setJwt('');
    navigate('/');
  };

  return (
    <>
      {/* Icon đăng nhập góc phải */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '30px',
        zIndex: 9999,
        backgroundColor: '#343a40',
        padding: '5px 15px',
        borderRadius: '4px'
      }}>
        <div className="dropdown">
          <button 
            className="btn text-white dropdown-toggle"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{ 
              border: 'none',
              background: 'none',
              padding: '5px'
            }}
          >
            <i className="fas fa-user me-2"></i>
            {userInfo?.sub || 'Admin'}
          </button>
          {isDropdownOpen && (
            <ul className="dropdown-menu show dropdown-menu-end"
              style={{ 
                position: 'absolute',
                top: '100%',
                right: 0,
                minWidth: '200px',
                backgroundColor: 'white',
                boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '4px',
                padding: '8px 0'
              }}
            >
              <li>
                <NavLink to="/profile" className="dropdown-item">
                  <i className="fas fa-user me-2"></i>Tài khoản
                </NavLink>
              </li>
              <li>
                <NavLink to="/settings" className="dropdown-item">
                  <i className="fas fa-cog me-2"></i>Cài đặt
                </NavLink>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button
                  className="dropdown-item text-danger" 
                  onClick={handleLogout}
                  style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}
                >
                  <i className="fas fa-sign-out-alt me-2"></i>Đăng xuất
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>

      {/* Sidebar chính */}
      <div className="sidebar" 
        style={{
          width: '250px', 
          height: '100vh', 
          position: 'fixed',
          left: 0,
          top: 0,
          backgroundColor: '#343a40',
          color: 'white',
          overflowY: 'auto'
        }}>
        <div className="p-3">
          <h4 className="mb-4">
            <i className="fas fa-user-shield me-2"></i>
            Admin Panel
          </h4>
          <hr />
          <ul className="nav flex-column">
            {/* <li className="nav-item">
              <NavLink to="/quan-ly/dashboard" className="nav-link text-white">
                <i className="fas fa-tachometer-alt me-2"></i>
                Dashboard
              </NavLink>
            </li> */}

            {/* Quản lý sách */}
            <li className="nav-item">
              <div className="nav-link text-white" style={{cursor: 'pointer'}} onClick={() => toggleSubMenu('sach')}>
                <i className="fas fa-book me-2"></i>
                Quản lý sách
                <i className={`fas fa-chevron-${openSubMenu === 'sach' ? 'down' : 'right'} float-end mt-1`}></i>
              </div>
              {openSubMenu === 'sach' && (
                <ul className="nav flex-column ms-3">
                  <li className="nav-item">
                    <NavLink to="danh-sach-sach" className="nav-link text-white">
                      <i className="fas fa-list me-2"></i>
                      Danh sách sách
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>

            {/* Quản lý đơn hàng */}
            {userInfo?.isAdmin ?
            <li className="nav-item">
              <div className="nav-link text-white" style={{cursor: 'pointer'}} onClick={() => toggleSubMenu('donhang')}>
                <i className="fas fa-shopping-cart me-2"></i>
                Quản lý đơn hàng
                <i className={`fas fa-chevron-${openSubMenu === 'donhang' ? 'down' : 'right'} float-end mt-1`}></i>
              </div>
              {openSubMenu === 'donhang' && (
                <ul className="nav flex-column ms-3">
                  <li className="nav-item">
                    <NavLink to="/quan-ly/danh-sach-don-hang" className="nav-link text-white">
                      <i className="fas fa-list me-2"></i>
                      Danh sách đơn hàng
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>:""
}
            {/* Các menu khác tương tự */}
            {userInfo?.isAdmin ?<li className="nav-item">
              <div className="nav-link text-white" style={{cursor: 'pointer'}} onClick={() => toggleSubMenu('nguoidung')}>
                <i className="fas fa-users me-2"></i>
                Quản lý người dùng
                <i className={`fas fa-chevron-${openSubMenu === 'nguoidung' ? 'down' : 'right'} float-end mt-1`}></i>
              </div>
              {openSubMenu === 'nguoidung' && (
                <ul className="nav flex-column ms-3">
                
                  <li className="nav-item">
                    <NavLink to="/quan-ly/danh-sach-nguoi-dung" className="nav-link text-white">
                      <i className="fas fa-list me-2"></i>
                      Danh sách người dùng
                    </NavLink>
                  </li>
                </ul>
              )}
            </li> : "" }
            <li className="nav-item">
              <div className="nav-link text-white" style={{cursor: 'pointer'}} onClick={() => toggleSubMenu('binhluan')}>
                <i className="fas fa-book me-2"></i>
                Quản lý bình luận
                <i className={`fas fa-chevron-${openSubMenu === 'binhluan' ? 'down' : 'right'} float-end mt-1`}></i>
              </div>
              {openSubMenu === 'binhluan' && (
                <ul className="nav flex-column ms-3">
                  <li className="nav-item">
                    <NavLink to="danh-sach-binh-luan" className="nav-link text-white">
                      <i className="fas fa-list me-2"></i>
                      Quản lý bình luận
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default AdminSidebar;