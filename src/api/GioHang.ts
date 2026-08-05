import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  CartItem,
  readCart,
  addOrUpdateItem,
  updateQuantity,
  removeItem,
} from './CartStorage';

/**
 * React hook wrapper around CartStorage. Kept for callers that prefer a
 * stateful hook instead of calling CartStorage functions directly; all
 * storage access goes through CartStorage so there is a single source of
 * truth for the 'gioHang' key.
 */
export const useGioHang = () => {
  const [gioHang, setGioHang] = useState<CartItem[]>(() => readCart());

  useEffect(() => {
    const reload = () => setGioHang(readCart());
    window.addEventListener('cartUpdated', reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener('cartUpdated', reload);
      window.removeEventListener('storage', reload);
    };
  }, []);

  const themVaoGio = useCallback((item: CartItem) => {
    const outcome = addOrUpdateItem({
      maSach: item.maSach,
      sachDto: item.sachDto,
      soLuong: item.soLuong,
      soLuongTonKho: item.soLuongTonKho,
    });
    if (outcome.status === 'rejected-stock') {
      toast.error(`Số lượng sách không đủ. Chỉ còn ${outcome.soLuongTonKho} cuốn.`);
      return;
    }
    setGioHang(outcome.cart);
  }, []);

  const xoaKhoiGio = useCallback((maSach: number) => {
    setGioHang(removeItem(maSach));
    toast.success('Đã xóa sản phẩm!');
  }, []);

  const capNhatSoLuong = useCallback((maSach: number, soLuong: number) => {
    if (soLuong < 1) return;
    setGioHang(updateQuantity(maSach, soLuong));
  }, []);

  const tinhTongTien = useCallback(
    () => gioHang.reduce((total, item) => total + item.sachDto.giaBan * item.soLuong, 0),
    [gioHang],
  );

  const soLuongSanPham = useCallback(
    () => gioHang.reduce((total, item) => total + item.soLuong, 0),
    [gioHang],
  );

  return {
    gioHang,
    themVaoGio,
    xoaKhoiGio,
    capNhatSoLuong,
    tinhTongTien,
    soLuongSanPham,
  };
};
