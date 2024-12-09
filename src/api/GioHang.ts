import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import SachModel from '../models/SachModel';


interface GioHangItem {
  maSach: number;
  sachDto: SachModel;
  soLuong: number;
  soLuongTon: number;
  giaBan: number;
}

export const useGioHang = () => {
  const [gioHang, setGioHang] = useState<GioHangItem[]>([]);

  useEffect(() => {
    const gioHangLocal = localStorage.getItem('gioHang');
    if (gioHangLocal) {
      try {
        const parsedGioHang = JSON.parse(gioHangLocal);
        setGioHang(parsedGioHang);
      } catch (error) {
        console.error('Lỗi khi đọc giỏ hàng:', error);
        localStorage.removeItem('gioHang'); // Xóa dữ liệu không hợp lệ
      }
    }
  }, []);

  const themVaoGio = (item: GioHangItem) => {
    try {
      setGioHang(gioHangHienTai => {
        const gioHangLocal = JSON.parse(localStorage.getItem('gioHang') || '[]');
        
        const itemTonTai = gioHangLocal.find((x: GioHangItem) => x.maSach === item.maSach);
        
        let gioHangMoi;
        if (itemTonTai) {
          const soLuongMoi = itemTonTai.soLuong + item.soLuong;
          
          if (soLuongMoi > item.soLuongTon) {
            toast.error(`Số lượng sách không đủ. Chỉ còn ${item.soLuongTon} cuốn.`);
            return gioHangHienTai;
          }
          
          gioHangMoi = gioHangLocal.map((x: GioHangItem) => 
            x.maSach === item.maSach 
              ? {...x, soLuong: soLuongMoi}
              : x
          );
        } else {
          if (item.soLuong > item.soLuongTon) {
            toast.error(`Số lượng sách không đủ. Chỉ còn ${item.soLuongTon} cuốn.`);
            return gioHangHienTai;
          }
          gioHangMoi = [...gioHangLocal, item];
        }
        
        localStorage.setItem('gioHang', JSON.stringify(gioHangMoi));
        window.dispatchEvent(new Event('storage'));
        return gioHangMoi;
      });
    } catch (error) {
      console.error('Lỗi khi thêm vào giỏ:', error);
      toast.error('Có lỗi xảy ra khi thêm vào giỏ hàng');
    }
  };

  const xoaKhoiGio = (maSach: number) => {
    setGioHang(gioHangHienTai => 
      gioHangHienTai.filter(item => item.maSach !== maSach)
    );
    toast.success('Đã xóa sản phẩm!');
  };

  const capNhatSoLuong = (maSach: number, soLuong: number) => {
    if (soLuong < 1) return;
    
    setGioHang(gioHangHienTai =>
      gioHangHienTai.map(item =>
        item.maSach === maSach ? {...item, soLuong} : item
      )
    );
  };

  const tinhTongTien = () => {
    return gioHang.reduce((total, item) => total + (item.giaBan * item.soLuong), 0);
  };

  const soLuongSanPham = () => {
    return gioHang.reduce((total, item) => total + item.soLuong, 0);
  };

  return {
    gioHang,
    themVaoGio,
    xoaKhoiGio,
    capNhatSoLuong,
    tinhTongTien,
    soLuongSanPham
  };
};