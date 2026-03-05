import React, { useState, useEffect } from 'react';
import { getThongKe } from '../../../../api/AdminApi';
import { ThongKeModel } from '../../../../models/ThongKeModel';

const ThongKeDashboard: React.FC = () => {
    const [thongKe, setThongKe] = useState<ThongKeModel | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getThongKe()
            .then(data => setThongKe(data))
            .catch(err => console.error('Lỗi tải thống kê:', err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="mt-2">Đang tải thống kê...</p>
            </div>
        );
    }

    const statCards = [
        {
            label: 'Tổng doanh thu',
            value: `${thongKe?.tongDoanhThu?.toLocaleString() || 0}đ`,
            icon: 'fas fa-dollar-sign',
            gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
        },
        {
            label: 'Đơn hàng hôm nay',
            value: thongKe?.donHangHomNay ?? 0,
            icon: 'fas fa-shopping-bag',
            gradient: 'linear-gradient(135deg, #f093fb, #f5576c)',
        },
        {
            label: 'Doanh thu hôm nay',
            value: `${thongKe?.doanhThuHomNay?.toLocaleString() || 0}đ`,
            icon: 'fas fa-chart-line',
            gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)',
        },
        {
            label: 'Tổng đơn hàng',
            value: thongKe?.tongDonHang ?? 0,
            icon: 'fas fa-boxes',
            gradient: 'linear-gradient(135deg, #43e97b, #38f9d7)',
        },
    ];

    return (
        <div>
            <h4 className="mb-4">Dashboard</h4>

            {thongKe && thongKe.soBinhLuanChoXet > 0 && (
                <div className="alert alert-warning d-flex align-items-center mb-4" role="alert">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Có <strong className="mx-1">{thongKe.soBinhLuanChoXet}</strong> bình luận đang chờ xét duyệt.
                </div>
            )}

            {/* Stat cards */}
            <div className="row mb-4">
                {statCards.map((card, idx) => (
                    <div className="col-md-3 mb-3" key={idx}>
                        <div className="card text-white h-100" style={{ background: card.gradient }}>
                            <div className="card-body d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="card-title mb-1 opacity-75">{card.label}</h6>
                                    <h4 className="mb-0 fw-bold">{card.value}</h4>
                                </div>
                                <i className={`${card.icon} fa-2x opacity-50`}></i>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Top selling books */}
            <div className="card shadow-sm">
                <div className="card-header bg-dark text-white">
                    <h6 className="mb-0"><i className="fas fa-trophy me-2"></i>Top sách bán chạy</h6>
                </div>
                <div className="card-body p-0">
                    {!thongKe?.topSachBanChay?.length ? (
                        <p className="text-muted p-3 mb-0">Chưa có dữ liệu</p>
                    ) : (
                        <table className="table table-hover mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>#</th>
                                    <th>Tên sách</th>
                                    <th className="text-end">Số lượng bán</th>
                                </tr>
                            </thead>
                            <tbody>
                                {thongKe.topSachBanChay.map((sach, idx) => (
                                    <tr key={idx}>
                                        <td>
                                            {idx === 0 && <span className="badge bg-warning text-dark">1</span>}
                                            {idx === 1 && <span className="badge bg-secondary">2</span>}
                                            {idx === 2 && <span className="badge" style={{ background: '#cd7f32', color: 'white' }}>3</span>}
                                            {idx > 2 && <span className="text-muted">{idx + 1}</span>}
                                        </td>
                                        <td>{sach.tenSach}</td>
                                        <td className="text-end fw-bold">{sach.soLuongBan}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ThongKeDashboard;
