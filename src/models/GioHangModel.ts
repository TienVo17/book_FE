/**
 * The canonical cart item type now lives in src/api/CartStorage.ts, which is
 * also the only module allowed to read/write localStorage['gioHang']. This
 * module re-exports it so existing imports keep working.
 */
export type { CartItem as default, CartItem, CartItemBook } from '../api/CartStorage';
