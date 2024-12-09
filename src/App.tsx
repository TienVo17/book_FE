import React, { useState } from "react";
import "./App.css";
import Navbar from "./layouts/header-footer/Navbar";
import Footer from "./layouts/header-footer/Footer";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import About from "./layouts/about/About";
import ChiTietSanPham from "./layouts/products/ChiTietSanPham";
import DangKyNguoiDung from "./layouts/user/DangKyNguoiDung";
import KichHoatTaiKhoan from "./layouts/user/KichHoatTaiKhoan";
import DangNhap from "./layouts/user/DangNhap";
import Test from "./layouts/user/Test";
import AdminLayout from "./layouts/admin/layouts/AdminLayout";
import DanhSachSach from "./layouts/admin/components/book/DanhSachSach";
import GioHang from "./layouts/products/GioHang";
import { ProtectedRoute } from "./layouts/utils/ProtectedRoute";
import HomePage from "./layouts/homepage/HomePage";
import { ToastContainer } from "react-toastify";
import ThanhToan from "./layouts/products/ThanhToan";
import KetQuaThanhToan from "./layouts/products/KetQuaThanhToan";
import DonHangUser from "./layouts/products/DonHangUser";
import AdminRoute from "./layouts/admin/components/route/Adminroute";
// import { ToastContainer } from 'react-toastify';


function App() {
  const [tuKhoaTimKiem, setTuKhoaTimKiem] = useState("");

  return (
    <BrowserRouter>
      <Routes>
        {/* Chỉ cho phép ADMIN và STAFF truy cập vào /quan-ly */}
        <Route path="/quan-ly/*" element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        } />
        <Route path="/*" element={
          <>
            <Navbar
              tuKhoaTimKiem={tuKhoaTimKiem}
              setTuKhoaTimKiem={setTuKhoaTimKiem}
            />
            <Routes>
              <Route path="/" element={<HomePage tuKhoaTimKiem={tuKhoaTimKiem} />} />
              <Route path="/about" element={<About />} />
              <Route path="/sach/:maSach" element={<ChiTietSanPham />} />
              <Route path="/dang-ky" element={<DangKyNguoiDung />} />
              <Route path="/thanh-toan" element={<ThanhToan />} />
              <Route path="/xu-ly-kq-thanh-toan" element={<KetQuaThanhToan />} />
              <Route path="/order" element={<DonHangUser />} />
              <Route path="/kich-hoat/:email/:maKichHoat" element={<KichHoatTaiKhoan />} />
              <Route path="/dang-nhap" element={<DangNhap />} />
              <Route path="/test" element={<Test />} />
              <Route path="/gio-hang" element={<GioHang />} />
            </Routes>
            <Footer />
          </>
        } />
      </Routes>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </BrowserRouter>
  );
}


export default App;
