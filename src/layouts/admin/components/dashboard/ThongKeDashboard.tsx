import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowClockwise,
  Bag,
  Book,
  BoxSeam,
  CurrencyDollar,
  ExclamationTriangle,
  GraphUpArrow,
  People,
  PieChart,
  Truck,
  Trophy,
} from 'react-bootstrap-icons';
import { getThongKe } from '../../../../api/AdminApi';
import { ThongKeModel } from '../../../../models/ThongKeModel';

const BlueprintCorners: React.FC = () => (
  <>
    <span className="admin-blueprint-corner admin-blueprint-corner--tl" aria-hidden="true" />
    <span className="admin-blueprint-corner admin-blueprint-corner--tr" aria-hidden="true" />
    <span className="admin-blueprint-corner admin-blueprint-corner--bl" aria-hidden="true" />
    <span className="admin-blueprint-corner admin-blueprint-corner--br" aria-hidden="true" />
  </>
);

interface StatDefinition {
  key: keyof Pick<
    ThongKeModel,
    'tongDoanhThu' | 'donHangHomNay' | 'doanhThuHomNay' | 'tongDonHang' | 'donChoXuLy' | 'tongNguoiDung'
  >;
  label: string;
  icon: React.ReactNode;
  currency?: boolean;
}

const stats: StatDefinition[] = [
  { key: 'tongDoanhThu', label: 'Tổng doanh thu', icon: <CurrencyDollar size={19} />, currency: true },
  { key: 'donHangHomNay', label: 'Đơn hàng hôm nay', icon: <Bag size={19} /> },
  { key: 'doanhThuHomNay', label: 'Doanh thu hôm nay', icon: <GraphUpArrow size={19} />, currency: true },
  { key: 'tongDonHang', label: 'Tổng đơn hàng', icon: <BoxSeam size={19} /> },
  { key: 'donChoXuLy', label: 'Đơn chưa giao', icon: <Truck size={19} /> },
  { key: 'tongNguoiDung', label: 'Tổng người dùng', icon: <People size={19} /> },
];

const formatStatValue = (value: number, currency = false) => {
  const formatted = value.toLocaleString('vi-VN');
  return currency ? `${formatted}đ` : formatted;
};

const DashboardHeader: React.FC = () => (
  <header className="admin-dashboard-header">
    <h1 className="admin-dashboard-title">
      <PieChart size={20} aria-hidden="true" />
      Dashboard
    </h1>
    <p>Tổng quan hoạt động hệ thống</p>
  </header>
);

const DashboardLoading: React.FC = () => (
  <div className="admin-dashboard" role="status" aria-live="polite">
    <DashboardHeader />
    <p className="admin-dashboard-loading-text">Đang tải thống kê...</p>
    <div className="admin-dashboard-stat-grid" aria-hidden="true">
      {stats.map((stat) => (
        <div className="admin-blueprint-card admin-dashboard-stat-card" key={stat.key}>
          <BlueprintCorners />
          <span className="admin-dashboard-skeleton admin-dashboard-skeleton-icon" />
          <span className="admin-dashboard-skeleton-copy">
            <span className="admin-dashboard-skeleton admin-dashboard-skeleton-line admin-dashboard-skeleton-line--short" />
            <span className="admin-dashboard-skeleton admin-dashboard-skeleton-line" />
          </span>
        </div>
      ))}
    </div>
    <div className="admin-blueprint-card admin-dashboard-skeleton admin-dashboard-skeleton-table" aria-hidden="true">
      <BlueprintCorners />
    </div>
  </div>
);

const getRankClassName = (rank: number) => {
  if (rank === 1) return 'admin-dashboard-rank--gold';
  if (rank === 2) return 'admin-dashboard-rank--silver';
  if (rank === 3) return 'admin-dashboard-rank--bronze';
  return 'admin-dashboard-rank--plain';
};

const ThongKeDashboard: React.FC = () => {
  const [thongKe, setThongKe] = useState<ThongKeModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestVersionRef = useRef(0);

  const loadThongKe = useCallback(async () => {
    const requestVersion = ++requestVersionRef.current;
    setLoading(true);
    setError(null);

    try {
      const data = await getThongKe();
      if (requestVersion === requestVersionRef.current) {
        setThongKe(data);
      }
    } catch {
      if (requestVersion === requestVersionRef.current) {
        setError('Không thể tải dữ liệu thống kê. Hãy kiểm tra kết nối và thử lại.');
      }
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadThongKe();
    return () => {
      requestVersionRef.current += 1;
    };
  }, [loadThongKe]);

  if (loading) {
    return <DashboardLoading />;
  }

  if (error || !thongKe) {
    return (
      <div className="admin-dashboard">
        <DashboardHeader />
        <section className="admin-blueprint-card admin-dashboard-state" role="alert">
          <BlueprintCorners />
          <span className="admin-dashboard-state-icon" aria-hidden="true">
            <ExclamationTriangle size={20} />
          </span>
          <h2>Chưa tải được thống kê</h2>
          <p>{error || 'Dữ liệu thống kê hiện không khả dụng.'}</p>
          <button type="button" className="admin-dashboard-retry" onClick={loadThongKe}>
            <ArrowClockwise size={16} aria-hidden="true" />
            Thử lại
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <DashboardHeader />

      <section className="admin-dashboard-stat-grid" aria-label="Chỉ số hoạt động">
        {stats.map((stat) => (
          <article className="admin-blueprint-card admin-dashboard-stat-card" key={stat.key}>
            <BlueprintCorners />
            <span className="admin-dashboard-stat-icon" aria-hidden="true">{stat.icon}</span>
            <div>
              <p className="admin-dashboard-stat-value">
                {formatStatValue(thongKe[stat.key], stat.currency)}
              </p>
              <span className="admin-dashboard-stat-label">{stat.label}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="admin-blueprint-card admin-dashboard-table-card" aria-labelledby="top-books-title">
        <BlueprintCorners />
        <div className="admin-dashboard-table-heading">
          <Trophy size={15} aria-hidden="true" />
          <h2 id="top-books-title">Top sách bán chạy</h2>
        </div>

        {!thongKe.topSachBanChay.length ? (
          <div className="admin-dashboard-state">
            <span className="admin-dashboard-state-icon" aria-hidden="true">
              <Book size={20} />
            </span>
            <h2>Chưa có dữ liệu</h2>
            <p>Dữ liệu sách bán chạy sẽ hiển thị ở đây.</p>
          </div>
        ) : (
          <div className="admin-dashboard-table-scroll">
            <table className="admin-dashboard-table">
              <caption className="visually-hidden">Xếp hạng sách theo số lượng đã bán</caption>
              <thead>
                <tr>
                  <th scope="col" style={{ width: 60 }}>#</th>
                  <th scope="col">Tên sách</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Số lượng bán</th>
                </tr>
              </thead>
              <tbody>
                {thongKe.topSachBanChay.map((sach, index) => {
                  const rank = index + 1;
                  return (
                    <tr key={`${sach.maSach}-${sach.tenSach}`}>
                      <td>
                        <span className={`admin-dashboard-rank ${getRankClassName(rank)}`}>{rank}</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{sach.tenSach}</td>
                      <td className="admin-dashboard-number">{sach.soLuongBan.toLocaleString('vi-VN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default ThongKeDashboard;
