import React, { useEffect, useRef, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import SachFormAdmin from '../components/book/SachForm';
import DanhSachSach from '../components/book/DanhSachSach';
import CapNhatSach from '../components/book/CapNhatSach';
import UserComponent from '../components/user';
import DanhSachBinhLuan from '../components/binhluan/DanhSachBinhLuan';
import DonHang from '../components/donhang/DonHang';
import ThongKeDashboard from '../components/dashboard/ThongKeDashboard';
import QuanLyCoupon from '../components/coupon/QuanLyCoupon';
import TheLoaiList from '../components/category/TheLoaiList';
import '../admin.css';

const AdminLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isSidebarOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSidebarOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSidebarOpen]);

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="admin-shell">
      <AdminSidebar
        isOpen={isSidebarOpen}
        menuButtonRef={menuButtonRef}
        onRequestOpen={() => setIsSidebarOpen(true)}
        onRequestClose={closeSidebar}
      />

      {isSidebarOpen && (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          onClick={() => {
            closeSidebar();
            menuButtonRef.current?.focus();
          }}
          aria-label="Đóng menu quản trị"
        />
      )}

      <main className="admin-main" id="admin-main-content">
        <Routes>
          <Route path="dashboard" element={<ThongKeDashboard />} />
          <Route path="danh-sach-sach" element={<DanhSachSach />} />
          <Route path="them-sach" element={<SachFormAdmin />} />
          <Route path="cap-nhat-sach/:maSach" element={<CapNhatSach />} />
          <Route path="danh-sach-nguoi-dung" element={<UserComponent />} />
          <Route path="danh-sach-binh-luan" element={<DanhSachBinhLuan />} />
          <Route path="danh-sach-don-hang" element={<DonHang />} />
          <Route path="quan-ly-coupon" element={<QuanLyCoupon />} />
          <Route path="quan-ly-the-loai" element={<TheLoaiList />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminLayout;
