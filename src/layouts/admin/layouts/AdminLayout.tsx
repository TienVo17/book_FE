import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import SachForm_Admin from '../components/book/SachForm';
import DanhSachSach from '../components/book/DanhSachSach';
import CapNhatSach from "../components/book/CapNhatSach";
import UserComponent from "../components/user";
import DanhSachBinhLuan from '../components/binhluan/DanhSachBinhLuan';
import DonHang from '../components/donhang/DonHang';

const AdminLayout: React.FC = () => {
  return (
    <div className="d-flex">
      <AdminSidebar />
      <main className="flex-grow-1 p-4" style={{marginLeft: '250px'}}>
        <Routes>
            {/* <Route path="dashboard" element={<div>ard</div>} /> */}
            <Route path="/danh-sach-sach" element={<DanhSachSach />} />
            <Route path="/them-sach" element={<SachForm_Admin />} />
            <Route path="/cap-nhat-sach/:maSach" element={<CapNhatSach />} />
            <Route path="/danh-sach-nguoi-dung" element={<UserComponent />} />
            <Route path="/danh-sach-binh-luan" element={<DanhSachBinhLuan />} />
            <Route path="/danh-sach-don-hang" element={<DonHang />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminLayout;