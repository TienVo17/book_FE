import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import SachForm_Admin from '../components/book/SachForm';
import DanhSachSach from '../components/book/DanhSachSach';
import CapNhatSach from "../components/book/CapNhatSach";
import UserComponent from "../components/user";
import DanhSachBinhLuan from '../components/binhluan/DanhSachBinhLuan';
import DonHang from '../components/donhang/DonHang';
import ThongKeDashboard from '../components/dashboard/ThongKeDashboard';
import QuanLyCoupon from '../components/coupon/QuanLyCoupon';
import TheLoaiList from '../components/category/TheLoaiList';

const AdminLayout: React.FC = () => {
  return (
    <div>
      <AdminSidebar />
      <main className="admin-main">
        <Routes>
          <Route path="dashboard" element={<ThongKeDashboard />} />
          <Route path="danh-sach-sach" element={<DanhSachSach />} />
          <Route path="them-sach" element={<SachForm_Admin />} />
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
