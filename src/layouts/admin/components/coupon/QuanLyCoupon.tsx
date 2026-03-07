import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getAllCoupons, themCoupon, capNhatCoupon, xoaCoupon } from '../../../../api/CouponApi';
import { CouponModel } from '../../../../models/CouponModel';

const emptyForm: CouponModel = {
    ma: '',
    loai: 'PERCENT',
    giaTriGiam: 0,
    giaTriToiThieu: 0,
    hanSuDung: '',
    soLuongToiDa: 100,
    isActive: true,
};

const QuanLyCoupon: React.FC = () => {
    const [danhSach, setDanhSach] = useState<CouponModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<CouponModel>(emptyForm);

    const fetchData = () => {
        setLoading(true);
        getAllCoupons()
            .then(setDanhSach)
            .catch(() => toast.error('Không thể tải danh sách coupon'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, []);

    const handleEdit = (coupon: CouponModel) => {
        setForm({ ...coupon });
        setIsEditing(true);
        setShowForm(true);
    };

    const handleAdd = () => {
        setForm(emptyForm);
        setIsEditing(false);
        setShowForm(true);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Xóa coupon này?')) return;
        try {
            await xoaCoupon(id);
            toast.success('Đã xóa coupon');
            fetchData();
        } catch {
            toast.error('Lỗi khi xóa coupon');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await capNhatCoupon(form);
                toast.success('Cập nhật coupon thành công');
            } else {
                await themCoupon(form);
                toast.success('Thêm coupon thành công');
            }
            setShowForm(false);
            fetchData();
        } catch {
            toast.error('Lỗi khi lưu coupon');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="admin-page-header">
                <div className="d-flex justify-content-between align-items-center">
                    <div>
                        <h4><i className="fas fa-ticket-alt me-2" />Quản lý Coupon</h4>
                        <p>Tạo và quản lý mã giảm giá</p>
                    </div>
                    <button className="admin-btn-add" onClick={handleAdd} style={{ background: 'white', color: 'var(--color-text)' }}>
                        <i className="fas fa-plus" /> Thêm coupon
                    </button>
                </div>
            </div>

            {/* Form */}
            {showForm && (
                <div className="order-table-wrapper mb-3" style={{ animation: 'fadeInDown var(--anim-normal) var(--ease-out)' }}>
                    <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border-light)' }}>
                        <h6 className="mb-0" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                            <i className="fas fa-edit me-2" />
                            {isEditing ? 'Cập nhật coupon' : 'Thêm coupon mới'}
                        </h6>
                    </div>
                    <div style={{ padding: '1.25rem' }}>
                        <form onSubmit={handleSubmit}>
                            <div className="row g-3">
                                <div className="col-md-3">
                                    <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Mã coupon</label>
                                    <input className="auth-input" name="ma" value={form.ma} onChange={handleChange} required disabled={isEditing} />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Loại giảm</label>
                                    <select className="auth-input" name="loai" value={form.loai} onChange={handleChange} style={{ cursor: 'pointer' }}>
                                        <option value="PERCENT">Phần trăm (%)</option>
                                        <option value="FIXED">Số tiền cố định (đ)</option>
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Giá trị giảm</label>
                                    <input className="auth-input" type="number" name="giaTriGiam" value={form.giaTriGiam} onChange={handleChange} min={0} required />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Giá trị tối thiểu (đ)</label>
                                    <input className="auth-input" type="number" name="giaTriToiThieu" value={form.giaTriToiThieu} onChange={handleChange} min={0} />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Hạn sử dụng</label>
                                    <input className="auth-input" type="date" name="hanSuDung" value={form.hanSuDung || ''} onChange={handleChange} />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Số lượng tối đa</label>
                                    <input className="auth-input" type="number" name="soLuongToiDa" value={form.soLuongToiDa} onChange={handleChange} min={1} />
                                </div>
                                <div className="col-md-3 d-flex align-items-end">
                                    <div className="form-check">
                                        <input className="form-check-input" type="checkbox" name="isActive" id="isActive" checked={!!form.isActive} onChange={handleChange} style={{ cursor: 'pointer' }} />
                                        <label className="form-check-label" htmlFor="isActive" style={{ cursor: 'pointer', fontWeight: 500 }}>Kích hoạt</label>
                                    </div>
                                </div>
                                <div className="col-12 d-flex gap-2">
                                    <button type="submit" className="btn-modern-primary">
                                        <i className="fas fa-save" /> {isEditing ? 'Cập nhật' : 'Thêm mới'}
                                    </button>
                                    <button type="button" className="btn-modern-outline" onClick={() => setShowForm(false)}>Hủy</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="text-center py-5">
                    <span className="spinner-border text-primary" />
                    <p className="mt-2" style={{ color: 'var(--color-text-muted)' }}>Đang tải…</p>
                </div>
            ) : danhSach.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><i className="fas fa-ticket-alt" /></div>
                    <h5>Chưa có coupon</h5>
                    <p>Bấm "Thêm coupon" để tạo mã giảm giá mới</p>
                </div>
            ) : (
                <div className="order-table-wrapper">
                    <div className="table-responsive">
                        <table className="order-table">
                            <thead>
                                <tr>
                                    <th>Mã</th>
                                    <th>Loại</th>
                                    <th style={{ textAlign: 'right' }}>Giá trị giảm</th>
                                    <th style={{ textAlign: 'right' }}>Tối thiểu</th>
                                    <th>Hạn dùng</th>
                                    <th style={{ textAlign: 'center' }}>Đã dùng</th>
                                    <th style={{ textAlign: 'center' }}>Trạng thái</th>
                                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {danhSach.map(c => (
                                    <tr key={c.maCoupon}>
                                        <td>
                                            <code style={{
                                                background: 'var(--color-bg)',
                                                padding: '2px 8px',
                                                borderRadius: 'var(--radius-sm)',
                                                fontWeight: 600,
                                                fontSize: '0.85rem',
                                            }}>
                                                {c.ma}
                                            </code>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${c.loai === 'PERCENT' ? 'shipping' : 'pending'}`}>
                                                {c.loai === 'PERCENT' ? 'Phần trăm' : 'Cố định'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                            {c.loai === 'PERCENT' ? `${c.giaTriGiam}%` : `${c.giaTriGiam?.toLocaleString()}đ`}
                                        </td>
                                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                            {c.giaTriToiThieu?.toLocaleString()}đ
                                        </td>
                                        <td style={{ color: 'var(--color-text-secondary)' }}>
                                            {c.hanSuDung ? new Date(c.hanSuDung).toLocaleDateString('vi-VN') : '—'}
                                        </td>
                                        <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                                            {c.daSuDung ?? 0}/{c.soLuongToiDa ?? '∞'}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`status-badge ${c.isActive ? 'paid' : 'pending'}`}>
                                                {c.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div className="d-flex gap-1 justify-content-center">
                                                <button className="order-action-btn" title="Chỉnh sửa" onClick={() => handleEdit(c)}>
                                                    <i className="fas fa-edit" />
                                                </button>
                                                <button
                                                    className="order-action-btn"
                                                    title="Xóa"
                                                    onClick={() => handleDelete(c.maCoupon!)}
                                                    style={{ color: 'var(--color-danger)' }}
                                                >
                                                    <i className="fas fa-trash" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuanLyCoupon;
