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
                <p className="mt-2" style={{ color: 'var(--color-text-muted)' }}>Đang tải thống kê...</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="admin-page-header">
                <h4><i className="fas fa-chart-pie me-2" />Dashboard</h4>
                <p>Tổng quan hoạt động hệ thống</p>
            </div>

            {/* Cảnh báo "bình luận chờ xét duyệt" đã bị gỡ: không có hàng đợi nào
                như vậy. Kiểm duyệt đánh giá chỉ có HIEN_THI và DA_AN, và backend
                không trả con số đó — ô cảnh báo cũ đọc một trường luôn luôn
                `undefined` nên không bao giờ hiện, kể cả khi có gì cần xem. */}

            {/* Stat cards */}
            <div className="stats-grid">
                <div className="stat-card stagger-1">
                    <div className="stat-card-icon stat-card-icon--primary">
                        <i className="fas fa-dollar-sign" />
                    </div>
                    <div className="stat-card-info">
                        <h3>{thongKe?.tongDoanhThu?.toLocaleString('vi-VN') || 0}đ</h3>
                        <span>Tổng doanh thu</span>
                    </div>
                </div>

                <div className="stat-card stagger-2">
                    <div className="stat-card-icon stat-card-icon--warning">
                        <i className="fas fa-shopping-bag" />
                    </div>
                    <div className="stat-card-info">
                        <h3>{thongKe?.donHangHomNay ?? 0}</h3>
                        <span>Đơn hàng hôm nay</span>
                    </div>
                </div>

                <div className="stat-card stagger-3">
                    <div className="stat-card-icon stat-card-icon--success">
                        <i className="fas fa-chart-line" />
                    </div>
                    <div className="stat-card-info">
                        <h3>{thongKe?.doanhThuHomNay?.toLocaleString('vi-VN') || 0}đ</h3>
                        <span>Doanh thu hôm nay</span>
                    </div>
                </div>

                <div className="stat-card stagger-4">
                    <div className="stat-card-icon stat-card-icon--accent">
                        <i className="fas fa-boxes" />
                    </div>
                    <div className="stat-card-info">
                        <h3>{thongKe?.tongDonHang ?? 0}</h3>
                        <span>Tổng đơn hàng</span>
                    </div>
                </div>

                {/* Hai ô dưới đây đọc `pendingOrders` và `totalUsers` — backend đã
                    trả sẵn từ trước nhưng màn hình chưa từng hiển thị. */}
                <div className="stat-card stagger-5">
                    <div className="stat-card-icon stat-card-icon--warning">
                        <i className="fas fa-truck" />
                    </div>
                    <div className="stat-card-info">
                        <h3>{thongKe?.donChoXuLy ?? 0}</h3>
                        <span>Đơn chưa giao</span>
                    </div>
                </div>

                <div className="stat-card stagger-6">
                    <div className="stat-card-icon stat-card-icon--primary">
                        <i className="fas fa-users" />
                    </div>
                    <div className="stat-card-info">
                        <h3>{thongKe?.tongNguoiDung ?? 0}</h3>
                        <span>Tổng người dùng</span>
                    </div>
                </div>
            </div>

            {/* Top selling books */}
            <div className="order-table-wrapper">
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border-light)' }}>
                    <h6 className="mb-0" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                        <i className="fas fa-trophy me-2" style={{ color: '#FBBF24' }} />
                        Top sách bán chạy
                    </h6>
                </div>
                {!thongKe?.topSachBanChay?.length ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                        <div className="empty-state-icon"><i className="fas fa-book-open" /></div>
                        <h5>Chưa có dữ liệu</h5>
                        <p>Dữ liệu sách bán chạy sẽ hiển thị ở đây</p>
                    </div>
                ) : (
                    <table className="order-table">
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>#</th>
                                <th>Tên sách</th>
                                <th style={{ textAlign: 'right' }}>Số lượng bán</th>
                            </tr>
                        </thead>
                        <tbody>
                            {thongKe.topSachBanChay.map((sach, idx) => (
                                <tr key={idx}>
                                    <td>
                                        {idx === 0 && <span className="badge" style={{ background: '#FBBF24', color: '#78350F' }}>1</span>}
                                        {idx === 1 && <span className="badge bg-secondary">2</span>}
                                        {idx === 2 && <span className="badge" style={{ background: '#CD7F32', color: 'white' }}>3</span>}
                                        {idx > 2 && <span style={{ color: 'var(--color-text-muted)' }}>{idx + 1}</span>}
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{sach.tenSach}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                        {sach.soLuongBan}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ThongKeDashboard;
