import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from '../../api/ApiUrl';

interface DonHangItem {
    maDonHang: number;
    ngayTao: string;
    diaChiNhanHang: string;
    phuongThucThanhToan?: 'COD' | 'VNPAY' | string;
    tenPhuongThucThanhToan?: string;
    trangThaiThanhToan: number;
    trangThaiGiaoHang: number;
    tongTien: number;
}

function DonHangUser() {
    const [donHangList, setDonHangList] = useState<DonHangItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [dangHuy, setDangHuy] = useState<number | null>(null);

    const taiDonHang = async () => {
        try {
            const response = await fetch(apiUrl('/api/don-hang/findAll?page=0'), {
                headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` },
            });
            if (!response.ok) throw new Error();
            const data = await response.json();
            setDonHangList(data.content || []);
        } catch {
            // giữ danh sách hiện tại nếu tải lỗi
        }
    };

    useEffect(() => {
        setLoading(true);
        taiDonHang().finally(() => setLoading(false));
    }, []);

    const huyDon = async (maDonHang: number) => {
        if (!window.confirm(`Bạn có chắc muốn hủy đơn hàng #${maDonHang}?`)) return;
        setDangHuy(maDonHang);
        try {
            const response = await fetch(apiUrl(`/api/don-hang/huy/${maDonHang}`), {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` },
            });
            if (!response.ok) {
                const message = await response.text();
                alert(message || 'Hủy đơn hàng thất bại.');
                return;
            }
            await taiDonHang();
        } catch {
            alert('Không kết nối được máy chủ.');
        } finally {
            setDangHuy(null);
        }
    };

    // User chỉ hủy được đơn đang chờ xử lý (0) và chưa thanh toán online (khớp quy tắc backend).
    const coTheHuy = (item: DonHangItem) =>
        item.trangThaiGiaoHang === 0 && item.trangThaiThanhToan !== 1;

    const renderTrangThaiGiaoHang = (trangThai: number) => {
        if (trangThai === 3) {
            return <span className="status-badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>Đã hủy</span>;
        }
        if (trangThai === 2) {
            return <span className="status-badge delivered">Đã nhận hàng</span>;
        }
        if (trangThai === 1) {
            return <span className="status-badge shipping">Đang giao</span>;
        }
        return <span className="status-badge pending">Đang xử lý</span>;
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Intl.DateTimeFormat('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            }).format(new Date(dateStr));
        } catch {
            return dateStr;
        }
    };

    if (loading) {
        return (
            <div className="container py-5 text-center">
                <span className="spinner-border text-primary"></span>
                <p className="mt-2" style={{ color: 'var(--color-text-muted)' }}>Đang tải đơn hàng…</p>
            </div>
        );
    }

    return (
        <div className="container py-4 animate-fade-in">
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '1.5rem' }}>
                <i className="fas fa-receipt me-2" style={{ color: 'var(--color-primary)' }}></i>
                Đơn hàng của tôi
                {donHangList.length > 0 && (
                    <span style={{
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        color: 'var(--color-text-secondary)',
                        marginLeft: '0.75rem',
                    }}>
                        ({donHangList.length} đơn hàng)
                    </span>
                )}
            </h2>

            {donHangList.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><i className="fas fa-box-open"></i></div>
                    <h5>Chưa có đơn hàng</h5>
                    <p>Bạn chưa có đơn hàng nào. Hãy khám phá cửa hàng!</p>
                    <Link to="/" className="btn-modern-primary" style={{ textDecoration: 'none' }}>
                        <i className="fas fa-shopping-bag"></i>
                        Mua sắm ngay
                    </Link>
                </div>
            ) : (
                <div className="order-table-wrapper">
                    <div className="table-responsive">
                        <table className="order-table">
                            <thead>
                                <tr>
                                    <th>Mã ĐH</th>
                                    <th>Ngày đặt</th>
                                    <th>Địa chỉ nhận hàng</th>
                                    <th>PT thanh toán</th>
                                    <th>Thanh toán</th>
                                    <th>Giao hàng</th>
                                    <th style={{ textAlign: 'right' }}>Tổng tiền</th>
                                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {donHangList.map((item, index) => (
                                    <tr key={item.maDonHang} className="animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                                        <td>
                                            <strong style={{ color: 'var(--color-primary)' }}>#{item.maDonHang}</strong>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(item.ngayTao)}</td>
                                        <td style={{ maxWidth: '200px' }}>
                                            <span style={{
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                fontSize: '0.88rem',
                                            }}>
                                                {item.diaChiNhanHang || '—'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="status-badge shipping">
                                                {item.phuongThucThanhToan === 'COD' ? 'COD' : item.phuongThucThanhToan === 'VNPAY' ? 'VNPAY' : item.tenPhuongThucThanhToan || '—'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${item.trangThaiThanhToan === 0 ? 'pending' : 'paid'}`}>
                                                {item.trangThaiThanhToan === 0 ? 'Chưa thanh toán' : 'Đã thanh toán'}
                                            </span>
                                        </td>
                                        <td>
                                            {renderTrangThaiGiaoHang(item.trangThaiGiaoHang)}
                                        </td>
                                        <td style={{
                                            textAlign: 'right',
                                            fontWeight: 600,
                                            fontVariantNumeric: 'tabular-nums',
                                            color: 'var(--color-accent)',
                                        }}>
                                            {item.tongTien?.toLocaleString('vi-VN')}đ
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {coTheHuy(item) ? (
                                                <button
                                                    type="button"
                                                    onClick={() => huyDon(item.maDonHang)}
                                                    disabled={dangHuy === item.maDonHang}
                                                    style={{
                                                        border: '1px solid #dc3545',
                                                        color: '#dc3545',
                                                        background: 'transparent',
                                                        borderRadius: '6px',
                                                        padding: '4px 12px',
                                                        fontSize: '0.82rem',
                                                        fontWeight: 600,
                                                        cursor: dangHuy === item.maDonHang ? 'not-allowed' : 'pointer',
                                                        opacity: dangHuy === item.maDonHang ? 0.6 : 1,
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {dangHuy === item.maDonHang ? 'Đang hủy…' : 'Hủy đơn'}
                                                </button>
                                            ) : (
                                                <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                                            )}
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
}

export default DonHangUser;
