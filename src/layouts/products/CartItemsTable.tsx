import React from 'react';
import { Link } from 'react-router-dom';

interface SanPhamGioHang {
    maSach: number;
    sachDto: { tenSach: string; giaBan: number; hinhAnh: string };
    soLuong: number;
    hinhAnh?: string;
}

interface Props {
    gioHang: SanPhamGioHang[];
    onIncrease: (maSach: number) => void;
    onDecrease: (maSach: number) => void;
    onChangeQty: (maSach: number, qty: number) => void;
    onRemove: (maSach: number) => void;
}

const CartItemsTable: React.FC<Props> = ({ gioHang, onIncrease, onDecrease, onChangeQty, onRemove }) => (
    <div>
        {gioHang.map((item, index) => (
            <div
                className="cart-item d-flex gap-3 align-items-center"
                key={item.maSach}
                style={{ animationDelay: `${index * 80}ms` }}
            >
                <img
                    src={item.hinhAnh || item.sachDto.hinhAnh}
                    alt={item.sachDto.tenSach}
                    className="cart-item-img"
                    width={80}
                    height={100}
                />
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <h6 style={{
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 600,
                        marginBottom: 4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}>
                        {item.sachDto.tenSach}
                    </h6>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.93rem' }}>
                        {item.sachDto.giaBan.toLocaleString('vi-VN')}đ
                    </span>
                </div>
                <div className="qty-control">
                    <button onClick={() => onDecrease(item.maSach)} aria-label="Giảm số lượng">−</button>
                    <input
                        type="number"
                        value={item.soLuong}
                        min={1}
                        onChange={e => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val >= 1) onChangeQty(item.maSach, val);
                        }}
                        aria-label="Số lượng"
                    />
                    <button onClick={() => onIncrease(item.maSach)} aria-label="Tăng số lượng">+</button>
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
                    className="btn-icon"
                    style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                    onClick={() => onRemove(item.maSach)}
                    aria-label="Xóa sản phẩm"
                >
                    <i className="fas fa-trash-alt"></i>
                </button>
            </div>
        ))}
        <div style={{ marginTop: '0.75rem' }}>
            <Link to="/" className="btn-modern-outline" style={{ textDecoration: 'none' }}>
                <i className="fas fa-arrow-left"></i>
                Tiếp tục mua sắm
            </Link>
        </div>
    </div>
);

export default CartItemsTable;
