import React from "react";
import "./App.css";
import Navbar from "./layouts/header-footer/Navbar";
import Footer from "./layouts/header-footer/Footer";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import About from "./layouts/about/About";
import RouteMetadata from "./layouts/utils/RouteMetadata";
import NotFound from "./layouts/utils/NotFound";
import ChiTietSanPham from "./layouts/products/ChiTietSanPham";
import DangKyNguoiDung from "./layouts/user/DangKyNguoiDung";
import KichHoatTaiKhoan from "./layouts/user/KichHoatTaiKhoan";
import DangNhap from "./layouts/user/DangNhap";
import AdminLayout from "./layouts/admin/layouts/AdminLayout";
import GioHang from "./layouts/products/GioHang";
import HomePage from "./layouts/homepage/HomePage";
import { ToastContainer } from "react-toastify";
import ThanhToan from "./layouts/products/ThanhToan";
import KetQuaThanhToan from "./layouts/products/KetQuaThanhToan";
import DonHangUser from "./layouts/products/DonHangUser";
import ChiTietDonHangUser from "./layouts/products/ChiTietDonHangUser";
import HoSoNguoiDung from "./layouts/user/HoSoNguoiDung";
import QuenMatKhau from "./layouts/user/QuenMatKhau";
import DatLaiMatKhau from "./layouts/user/DatLaiMatKhau";
import RouteGuard from "./layouts/utils/RouteGuard";
import DanhSachYeuThich from "./layouts/user/DanhSachYeuThich";
import TheLoaiPage from "./layouts/categories/TheLoaiPage";
import DiaChiNguoiDung from "./layouts/user/DiaChiNguoiDung";
import TimKiemPage from "./layouts/search/TimKiemPage";
import ChinhSachPage from "./layouts/chinh-sach/ChinhSachPage";
import HuyNhanTin from "./layouts/nhan-tin/HuyNhanTin";
import XacNhanNhanTin from "./layouts/nhan-tin/XacNhanNhanTin";
import WishlistBootstrap from "./layouts/utils/WishlistBootstrap";


function App() {
  return (
    <BrowserRouter>
      <RouteMetadata />
      <WishlistBootstrap />
      <Routes>
        {/* Chỉ cho phép ADMIN truy cập vào /quan-ly */}
        <Route path="/quan-ly/*" element={
          <RouteGuard require="admin">
            <AdminLayout />
          </RouteGuard>
        } />
        <Route path="/*" element={
          <>
            <Navbar />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<About />} />
              <Route path="/the-loai/:slug" element={<TheLoaiPage />} />
              <Route path="/tim-kiem" element={<TimKiemPage />} />
              <Route path="/sach/:maSach" element={<ChiTietSanPham />} />
              <Route path="/dang-ky" element={<DangKyNguoiDung />} />
              <Route path="/thanh-toan" element={<RouteGuard require="user"><ThanhToan /></RouteGuard>} />
              {/* VNPay browser return route stays public; it never trusts params without backend verification */}
              <Route path="/xu-ly-kq-thanh-toan" element={<KetQuaThanhToan />} />
              <Route path="/order/:maDonHang" element={<RouteGuard require="user"><ChiTietDonHangUser /></RouteGuard>} />
              <Route path="/order" element={<RouteGuard require="user"><DonHangUser /></RouteGuard>} />
              <Route path="/kich-hoat/:email/:maKichHoat" element={<KichHoatTaiKhoan />} />
              <Route path="/dang-nhap" element={<DangNhap />} />
              <Route path="/gio-hang" element={<GioHang />} />
              <Route path="/profile" element={<RouteGuard require="user"><HoSoNguoiDung /></RouteGuard>} />
              <Route path="/dia-chi" element={<RouteGuard require="user"><DiaChiNguoiDung /></RouteGuard>} />
              <Route path="/quen-mat-khau" element={<QuenMatKhau />} />
              <Route path="/dat-lai-mat-khau/:email/:token" element={<DatLaiMatKhau />} />
              <Route path="/yeu-thich" element={<RouteGuard require="user"><DanhSachYeuThich /></RouteGuard>} />
              {/* Tam trang chinh sach ma footer tro toi; noi dung lay theo slug. */}
              <Route path="/chinh-sach/:slug" element={<ChinhSachPage />} />
              {/* Hai duong dich cua lien ket trong email; khoa ngau nhien, khong phai email. */}
              <Route path="/xac-nhan-nhan-tin/:maXacNhan" element={<XacNhanNhanTin />} />
              <Route path="/huy-nhan-tin/:maHuy" element={<HuyNhanTin />} />
              {/* Unknown SPA path: client-side UX only. The origin still answers
                  200 because of the history fallback (documented limitation). */}
              <Route path="*" element={<NotFound />} />
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
