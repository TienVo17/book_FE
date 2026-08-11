import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { CartItem } from './CartStorage';
import {
  addCartItem,
  loadCart,
  readCartForCurrentSession,
  removeCartItem,
  setCartItemQuantity,
} from './CartSession';

/**
 * React hook wrapper around CartStorage. Kept for callers that prefer a
 * stateful hook instead of calling CartStorage functions directly; all
 * storage access goes through CartStorage so there is a single source of
 * truth for the 'gioHang' key.
 */
export const useGioHang = () => {
  const [gioHang, setGioHang] = useState<CartItem[]>(() => readCartForCurrentSession());

  useEffect(() => {
    let active = true;
    loadCart()
      .then(items => { if (active) setGioHang(items); })
      .catch(error => {
        if (active) toast.error(error instanceof Error ? error.message : 'Không thể tải giỏ hàng.');
      });
    const reload = () => setGioHang(readCartForCurrentSession());
    window.addEventListener('cartUpdated', reload);
    window.addEventListener('storage', reload);
    return () => {
      active = false;
      window.removeEventListener('cartUpdated', reload);
      window.removeEventListener('storage', reload);
    };
  }, []);

  const themVaoGio = useCallback(async (item: CartItem) => {
    try {
      setGioHang(await addCartItem(item));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể thêm sách vào giỏ hàng.');
    }
  }, []);

  const xoaKhoiGio = useCallback(async (maSach: number) => {
    try {
      setGioHang(await removeCartItem(maSach));
      toast.success('Đã xóa sản phẩm!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa sản phẩm.');
    }
  }, []);

  const capNhatSoLuong = useCallback(async (maSach: number, soLuong: number) => {
    if (soLuong < 1) return;
    try {
      setGioHang(await setCartItemQuantity(maSach, soLuong));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật số lượng.');
    }
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
