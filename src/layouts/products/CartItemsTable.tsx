import React, { useEffect, useState } from 'react';
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
    pendingBookId?: number | null;
}

const CartItemsTable: React.FC<Props> = ({
    gioHang,
    onIncrease,
    onDecrease,
    onChangeQty,
    onRemove,
    pendingBookId = null,
}) => {
    const [quantityDrafts, setQuantityDrafts] = useState<Record<number, string>>({});

    useEffect(() => {
        setQuantityDrafts(current => {
            const next: Record<number, string> = {};
            gioHang.forEach(item => {
                if (current[item.maSach] !== undefined) {
                    next[item.maSach] = current[item.maSach];
                }
            });
            return next;
        });
    }, [gioHang]);

    const commitQuantity = (item: SanPhamGioHang) => {
        const raw = quantityDrafts[item.maSach];
        if (raw === undefined) return;
        setQuantityDrafts(current => {
            const next = { ...current };
            delete next[item.maSach];
            return next;
        });
        const quantity = Number.parseInt(raw, 10);
        if (Number.isInteger(quantity) && quantity >= 1 && quantity !== item.soLuong) {
            onChangeQty(item.maSach, quantity);
        }
    };

    return (
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
                aria-busy={pendingBookId === item.maSach}
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
                        disabled={pendingBookId === item.maSach || item.soLuong <= 1}
                    >
                        −
                    </button>
                    <input
                        type="number"
                        value={quantityDrafts[item.maSach] ?? String(item.soLuong)}
                        min={1}
                        onChange={event => setQuantityDrafts(current => ({
                            ...current,
                            [item.maSach]: event.target.value,
                        }))}
                        onBlur={() => commitQuantity(item)}
                        onKeyDown={event => {
                            if (event.key === 'Enter') {
                                event.currentTarget.blur();
                            } else if (event.key === 'Escape') {
                                setQuantityDrafts(current => {
                                    const next = { ...current };
                                    delete next[item.maSach];
                                    return next;
                                });
                                event.currentTarget.blur();
                            }
                        }}
                        aria-label={`Số lượng ${item.sachDto.tenSach}`}
                        disabled={pendingBookId === item.maSach}
                    />
                    <button
                        type="button"
                        onClick={() => onIncrease(item.maSach)}
                        aria-label={`Tăng số lượng ${item.sachDto.tenSach}`}
                        disabled={pendingBookId === item.maSach}
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
                    disabled={pendingBookId === item.maSach}
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
};

export default CartItemsTable;
