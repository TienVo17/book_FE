import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

type FilterType = 'all' | 'chua_thanh_toan' | 'da_thanh_toan' | 'chua_giao' | 'da_giao';

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

const BASE = 'http://localhost:8080';

function DonHang() {
    const [donHangList, setDonHangList] = useState<DonHangItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [filter, setFilter] = useState<FilterType>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [updating, setUpdating] = useState<number | null>(null);

    const fetchDonHang = useCallback(async (pageNum: number) => {
        setLoading(true);
        try {
            const response = await fetch(`${BASE}/api/don-hang/findAll?page=${pageNum}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` },
            });
            if (!response.ok) throw new Error('Lỗi tải dữ liệu');
            const data = await response.json();
            setDonHangList(data.content || []);
            setTotalPages(data.totalPages || 0);
            setTotalElements(data.totalElements || 0);
        } catch {
            toast.error('Không thể tải danh sách đơn hàng');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchDonHang(page); }, [page, fetchDonHang]);

    const handleCapNhatGiaoHang = async (maDonHang: number) => {
        if (!window.confirm('Bạn có chắc muốn cập nhật trạng thái giao hàng?')) return;
        setUpdating(maDonHang);
        try {
            const response = await fetch(`${BASE}/api/don-hang/cap-nhat-trang-thai-giao-hang/${maDonHang}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` },
            });
            if (!response.ok) throw new Error();
            toast.success('Đã cập nhật trạng thái');
            await fetchDonHang(page);
        } catch {
            toast.error('Lỗi cập nhật trạng thái');
        } finally {
            setUpdating(null);
        }
    };

    // Stats
    const stats = {
        total: donHangList.length,
        chuaThanhToan: donHangList.filter(d => d.trangThaiThanhToan === 0).length,
        daThanhToan: donHangList.filter(d => d.trangThaiThanhToan === 1).length,
        daGiao: donHangList.filter(d => d.trangThaiGiaoHang === 2).length,
    };

    // Filter + Search
    const filtered = donHangList.filter(item => {
        if (filter === 'chua_thanh_toan' && item.trangThaiThanhToan !== 0) return false;
        if (filter === 'da_thanh_toan' && item.trangThaiThanhToan !== 1) return false;
        if (filter === 'chua_giao' && item.trangThaiGiaoHang !== 2 && filter === 'chua_giao') {
            if (item.trangThaiGiaoHang === 2) return false;
        }
        if (filter === 'da_giao' && item.trangThaiGiaoHang !== 2) return false;
        if (filter === 'chua_giao' && item.trangThaiGiaoHang === 2) return false;
        if (searchTerm && !String(item.maDonHang).includes(searchTerm)) return false;
        return true;
    });

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

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="admin-page-header">
                <h4><i className="fas fa-shopping-bag me-2"></i>Quản lý đơn hàng</h4>
                <p>Theo dõi và quản lý tất cả đơn hàng của hệ thống</p>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card stagger-1">
                    <div className="stat-card-icon stat-card-icon--primary">
                        <i className="fas fa-receipt"></i>
                    </div>
                    <div className="stat-card-info">
                        <h3>{totalElements}</h3>
                        <span>Tổng đơn hàng</span>
                    </div>
                </div>
                <div className="stat-card stagger-2">
                    <div className="stat-card-icon stat-card-icon--warning">
                        <i className="fas fa-clock"></i>
                    </div>
                    <div className="stat-card-info">
                        <h3>{stats.chuaThanhToan}</h3>
                        <span>Chờ thanh toán</span>
                    </div>
                </div>
                <div className="stat-card stagger-3">
                    <div className="stat-card-icon stat-card-icon--success">
                        <i className="fas fa-check-circle"></i>
                    </div>
                    <div className="stat-card-info">
                        <h3>{stats.daThanhToan}</h3>
                        <span>Đã thanh toán</span>
                    </div>
                </div>
                <div className="stat-card stagger-4">
                    <div className="stat-card-icon stat-card-icon--accent">
                        <i className="fas fa-truck"></i>
                    </div>
                    <div className="stat-card-info">
                        <h3>{stats.daGiao}</h3>
                        <span>Đã giao hàng</span>
                    </div>
                </div>
            </div>

            {/* Search + Filter */}
            <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                <div className="admin-search">
                    <i className="fas fa-search search-icon"></i>
                    <input
                        type="text"
                        placeholder="Tìm mã đơn hàng…"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                    />
                </div>
            </div>

            <div className="filter-tabs">
                {([
                    ['all', 'Tất cả', filtered.length],
                    ['chua_thanh_toan', 'Chưa thanh toán', stats.chuaThanhToan],
                    ['da_thanh_toan', 'Đã thanh toán', stats.daThanhToan],
                    ['chua_giao', 'Chưa giao', stats.total - stats.daGiao],
                    ['da_giao', 'Đã giao', stats.daGiao],
                ] as [FilterType, string, number][]).map(([key, label, count]) => (
                    <button
                        key={key}
                        className={`filter-tab${filter === key ? ' active' : ''}`}
                        onClick={() => setFilter(key)}
                    >
                        {label}
                        <span className="tab-count">{count}</span>
                    </button>
                ))}
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-5">
                    <span className="spinner-border text-primary"></span>
                    <p className="mt-2" style={{ color: 'var(--color-text-muted)' }}>Đang tải…</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><i className="fas fa-inbox"></i></div>
                    <h5>Không có đơn hàng</h5>
                    <p>Không tìm thấy đơn hàng nào phù hợp với bộ lọc</p>
                </div>
            ) : (
                <>
                    <div className="order-table-wrapper">
                        <div className="table-responsive">
                            <table className="order-table">
                                <thead>
                                    <tr>
                                        <th>Mã ĐH</th>
                                        <th>Ngày tạo</th>
                                        <th>Địa chỉ nhận hàng</th>
                                        <th>PT thanh toán</th>
                                        <th>Thanh toán</th>
                                        <th>Giao hàng</th>
                                        <th style={{ textAlign: 'right' }}>Tổng tiền</th>
                                        <th style={{ textAlign: 'center', width: '80px' }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(item => (
                                        <tr key={item.maDonHang}>
                                            <td>
                                                <strong style={{ color: 'var(--color-primary)' }}>#{item.maDonHang}</strong>
                                            </td>
                                            <td>{formatDate(item.ngayTao)}</td>
                                            <td style={{ maxWidth: '220px' }}>
                                                <span style={{
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden'
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
                                                <span className={`status-badge ${item.trangThaiGiaoHang === 2 ? 'delivered' : 'shipping'}`}>
                                                    {item.trangThaiGiaoHang === 2 ? 'Đã nhận hàng' : 'Chưa nhận hàng'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                                {item.tongTien?.toLocaleString('vi-VN')}đ
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {item.trangThaiGiaoHang !== 2 && (
                                                    <button
                                                        className="order-action-btn success"
                                                        title="Cập nhật: Đã nhận hàng"
                                                        onClick={() => handleCapNhatGiaoHang(item.maDonHang)}
                                                        disabled={updating === item.maDonHang}
                                                    >
                                                        {updating === item.maDonHang
                                                            ? <span className="spinner-border spinner-border-sm"></span>
                                                            : <i className="fas fa-check"></i>}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="d-flex justify-content-between align-items-center mt-3">
                            <span className="pagination-info">
                                Trang {page + 1} / {totalPages} · {totalElements} đơn hàng
                            </span>
                            <div className="pagination-modern">
                                <button
                                    className="page-btn"
                                    disabled={page === 0}
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                >
                                    <i className="fas fa-chevron-left"></i>
                                </button>
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                    const start = Math.max(0, Math.min(page - 2, totalPages - 5));
                                    const pageNum = start + i;
                                    return (
                                        <button
                                            key={pageNum}
                                            className={`page-btn${pageNum === page ? ' active' : ''}`}
                                            onClick={() => setPage(pageNum)}
                                        >
                                            {pageNum + 1}
                                        </button>
                                    );
                                })}
                                <button
                                    className="page-btn"
                                    disabled={page >= totalPages - 1}
                                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                >
                                    <i className="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default DonHang;