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
    <div className="card shadow-sm mb-3">
        <div className="card-header bg-dark text-white">
            <h6 className="mb-0">Sản phẩm</h6>
        </div>
        <div className="card-body p-0">
            <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                        <tr>
                            <th style={{ width: '80px' }}>Ảnh</th>
                            <th>Tên sách</th>
                            <th className="text-end">Đơn giá</th>
                            <th className="text-center" style={{ width: '140px' }}>Số lượng</th>
                            <th className="text-end">Thành tiền</th>
                            <th style={{ width: '60px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {gioHang.map(item => (
                            <tr key={item.maSach}>
                                <td>
                                    <img
                                        src={item.hinhAnh || item.sachDto.hinhAnh}
                                        alt={item.sachDto.tenSach}
                                        className="img-fluid rounded"
                                        style={{ maxWidth: '70px' }}
                                    />
                                </td>
                                <td><h6 className="mb-0">{item.sachDto.tenSach}</h6></td>
                                <td className="text-end">{item.sachDto.giaBan.toLocaleString()}đ</td>
                                <td>
                                    <div className="d-flex justify-content-center align-items-center">
                                        <button className="btn btn-sm btn-outline-secondary" onClick={() => onDecrease(item.maSach)}>-</button>
                                        <input
                                            className="form-control form-control-sm text-center mx-1"
                                            style={{ width: '50px' }}
                                            type="number"
                                            value={item.soLuong}
                                            min={1}
                                            onChange={e => {
                                                const val = parseInt(e.target.value);
                                                if (!isNaN(val) && val >= 1) onChangeQty(item.maSach, val);
                                            }}
                                        />
                                        <button className="btn btn-sm btn-outline-secondary" onClick={() => onIncrease(item.maSach)}>+</button>
                                    </div>
                                </td>
                                <td className="text-end fw-bold">{(item.sachDto.giaBan * item.soLuong).toLocaleString()}đ</td>
                                <td>
                                    <button className="btn btn-outline-danger btn-sm" onClick={() => onRemove(item.maSach)}>
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        <div className="card-footer bg-white">
            <Link to="/" className="btn btn-outline-primary btn-sm">
                <i className="fas fa-arrow-left me-2"></i>Tiếp tục mua sắm
            </Link>
        </div>
    </div>
);

export default CartItemsTable;
