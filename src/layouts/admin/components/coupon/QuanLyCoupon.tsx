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
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="mb-0">Quản lý Coupon</h4>
                <button className="btn btn-dark" onClick={handleAdd}>
                    <i className="fas fa-plus me-2"></i>Thêm coupon
                </button>
            </div>

            {showForm && (
                <div className="card shadow-sm mb-4">
                    <div className="card-header bg-dark text-white">
                        <h6 className="mb-0">{isEditing ? 'Cập nhật coupon' : 'Thêm coupon mới'}</h6>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div className="row g-3">
                                <div className="col-md-3">
                                    <label className="form-label">Mã coupon</label>
                                    <input className="form-control" name="ma" value={form.ma} onChange={handleChange} required disabled={isEditing} />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Loại giảm</label>
                                    <select className="form-select" name="loai" value={form.loai} onChange={handleChange}>
                                        <option value="PERCENT">Phần trăm (%)</option>
                                        <option value="FIXED">Số tiền cố định (đ)</option>
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Giá trị giảm</label>
                                    <input className="form-control" type="number" name="giaTriGiam" value={form.giaTriGiam} onChange={handleChange} min={0} required />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Giá trị tối thiểu (đ)</label>
                                    <input className="form-control" type="number" name="giaTriToiThieu" value={form.giaTriToiThieu} onChange={handleChange} min={0} />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Hạn sử dụng</label>
                                    <input className="form-control" type="date" name="hanSuDung" value={form.hanSuDung || ''} onChange={handleChange} />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Số lượng tối đa</label>
                                    <input className="form-control" type="number" name="soLuongToiDa" value={form.soLuongToiDa} onChange={handleChange} min={1} />
                                </div>
                                <div className="col-md-3 d-flex align-items-end">
                                    <div className="form-check">
                                        <input className="form-check-input" type="checkbox" name="isActive" id="isActive" checked={!!form.isActive} onChange={handleChange} />
                                        <label className="form-check-label" htmlFor="isActive">Kích hoạt</label>
                                    </div>
                                </div>
                                <div className="col-12 d-flex gap-2">
                                    <button type="submit" className="btn btn-dark">{isEditing ? 'Cập nhật' : 'Thêm mới'}</button>
                                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowForm(false)}>Hủy</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="card shadow-sm">
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-4"><div className="spinner-border text-primary"></div></div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead className="table-dark">
                                    <tr>
                                        <th>Mã</th>
                                        <th>Loại</th>
                                        <th className="text-end">Giá trị giảm</th>
                                        <th className="text-end">Tối thiểu</th>
                                        <th>Hạn dùng</th>
                                        <th className="text-center">Đã dùng</th>
                                        <th className="text-center">Active</th>
                                        <th className="text-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {danhSach.length === 0 && (
                                        <tr><td colSpan={8} className="text-center text-muted py-4">Chưa có coupon nào</td></tr>
                                    )}
                                    {danhSach.map(c => (
                                        <tr key={c.maCoupon}>
                                            <td><code>{c.ma}</code></td>
                                            <td>
                                                <span className={`badge ${c.loai === 'PERCENT' ? 'bg-info text-dark' : 'bg-warning text-dark'}`}>
                                                    {c.loai === 'PERCENT' ? '%' : 'đ'}
                                                </span>
                                            </td>
                                            <td className="text-end">{c.loai === 'PERCENT' ? `${c.giaTriGiam}%` : `${c.giaTriGiam?.toLocaleString()}đ`}</td>
                                            <td className="text-end">{c.giaTriToiThieu?.toLocaleString()}đ</td>
                                            <td>{c.hanSuDung ? new Date(c.hanSuDung).toLocaleDateString('vi-VN') : '—'}</td>
                                            <td className="text-center">{c.daSuDung ?? 0}/{c.soLuongToiDa ?? '∞'}</td>
                                            <td className="text-center">
                                                {c.isActive
                                                    ? <span className="badge bg-success">Active</span>
                                                    : <span className="badge bg-secondary">Inactive</span>
                                                }
                                            </td>
                                            <td className="text-center">
                                                <button className="btn btn-sm btn-outline-primary me-1" onClick={() => handleEdit(c)}>
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c.maCoupon!)}>
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuanLyCoupon;
