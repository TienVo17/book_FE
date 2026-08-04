import React from 'react';
import { Link } from 'react-router-dom';
import AnhSach from '../utils/AnhSach';
import { CartItem } from '../../api/CartStorage';

type SanPhamGioHang = CartItem & { hinhAnh?: string };

interface Props {
    gioHang: SanPhamGioHang[];
    onIncrease: (maSach: number) => void;
    onDecrease: (maSach: number) => void;
    onChangeQty: (maSach: number, qty: number) => void;
    onRemove: (maSach: number) => void;
}

const CartItemsTable: React.FC<Props> = ({ gioHang, onIncrease, onDecrease, onChangeQty, onRemove }) => (
    <div>
        <ul
            aria-label="Sản phẩm trong giỏ hàng"
            style={{ listStyle: 'none', margin: 0, padding: 0 }}
        >
        {gioHang.map((item, index) => (
            <li
                className="cart-item d-flex gap-3 align-items-center"
                key={item.maSach}
                style={{ animationDelay: `${index * 80}ms` }}
            >
                <AnhSach
                    src={item.hinhAnh || item.sachDto.hinhAnh}
                    alt={item.sachDto.tenSach}
                    className="cart-item-img"
                    width={80}
                    height={100}
                />
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    {/* h2: the page h1 is "Xác nhận đơn hàng", so a h6 here would
                        skip four heading levels and break the outline. */}
                    <h2 style={{
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 600,
                        fontSize: '1rem',
                        marginBottom: 4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}>
                        {item.sachDto.tenSach}
                    </h2>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.93rem' }}>
                        {item.sachDto.giaBan.toLocaleString('vi-VN')}đ
                    </span>
                </div>
                <div className="qty-control">
                    <button
                        type="button"
                        onClick={() => onDecrease(item.maSach)}
                        aria-label={`Giảm số lượng ${item.sachDto.tenSach}`}
                    >
                        −
                    </button>
                    <input
                        type="number"
                        value={item.soLuong}
                        min={1}
                        onChange={e => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val >= 1) onChangeQty(item.maSach, val);
                        }}
                        aria-label={`Số lượng ${item.sachDto.tenSach}`}
                    />
                    <button
                        type="button"
                        onClick={() => onIncrease(item.maSach)}
                        aria-label={`Tăng số lượng ${item.sachDto.tenSach}`}
                    >
                        +
                    </button>
                </div>
                <div className="text-end" style={{ minWidth: 100 }}>
                    <div style={{
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 700,
                        fontSize: '1rem',
                        fontVariantNumeric: 'tabular-nums',
                    }}>
                        {(item.sachDto.giaBan * item.soLuong).toLocaleString('vi-VN')}đ
                    </div>
                </div>
                <button
                    type="button"
                    className="btn-icon"
                    style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                    onClick={() => onRemove(item.maSach)}
                    aria-label={`Xóa ${item.sachDto.tenSach} khỏi giỏ hàng`}
                >
                    <i className="fas fa-trash-alt" aria-hidden="true"></i>
                </button>
            </li>
        ))}
        </ul>
        <div style={{ marginTop: '0.75rem' }}>
            <Link to="/" className="btn-modern-outline" style={{ textDecoration: 'none' }}>
                <i className="fas fa-arrow-left"></i>
                Tiếp tục mua sắm
            </Link>
        </div>
    </div>
);

export default CartItemsTable;
