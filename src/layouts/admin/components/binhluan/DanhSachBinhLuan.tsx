import React, { useState, useEffect } from 'react';
import DanhGiaModel from '../../../../models/DanhGiaModel';

export default function DanhSachBinhLuan() {
  const [binhLuanList, setBinhLuanList] = useState<any[]>([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(true);
  const [baoLoi, setBaoLoi] = useState<string | null>(null);
  const [trangHienTai, setTrangHienTai] = useState(1);
  const [tongSoTrang, setTongSoTrang] = useState(0);

  useEffect(() => {
    loadData();
  }, [trangHienTai]);

  const loadData = () => {
    setDangTaiDuLieu(true);
    fetch(`http://localhost:8080/api/admin/danh-gia/findAll?page=${trangHienTai - 1}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
        'Content-Type': 'application/json',
      },
    })
      .then(response => response.json())
      .then(response => {
        const sorted = (response.content as DanhGiaModel[]).sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeB - timeA;
        });
        setBinhLuanList(sorted);
        setTongSoTrang(response.totalPages || 0);
        setDangTaiDuLieu(false);
      })
      .catch(error => {
        console.error('Lỗi:', error);
        setBaoLoi('Có lỗi xảy ra khi tải dữ liệu!');
        setDangTaiDuLieu(false);
      });
  };

  const handleToggleActive = async (maDanhGia: number, isActive: boolean) => {
    const action = isActive ? 'ẩn' : 'hiện';
    if (!window.confirm(`Bạn muốn ${action} bình luận này?`)) return;
    try {
      const endpoint = isActive ? 'unactive' : 'active';
      await fetch(`http://localhost:8080/api/admin/danh-gia/${endpoint}/${maDanhGia}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
          'Content-Type': 'application/json',
        },
      });
      loadData();
    } catch (error) {
      alert('Có lỗi xảy ra!');
      console.error('Lỗi:', error);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i
          key={i}
          className={`fas fa-star ${i <= rating ? '' : 'star-empty'}`}
        />
      );
    }
    return <span className="star-rating">{stars}</span>;
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="admin-page-header">
        <h4><i className="fas fa-comments me-2" />Quản lý bình luận</h4>
        <p>Xét duyệt và quản lý bình luận của khách hàng</p>
      </div>

      {/* Table */}
      {dangTaiDuLieu ? (
        <div className="text-center py-5">
          <span className="spinner-border text-primary" />
          <p className="mt-2" style={{ color: 'var(--color-text-muted)' }}>Đang tải…</p>
        </div>
      ) : baoLoi ? (
        <div className="empty-state">
          <div className="empty-state-icon"><i className="fas fa-exclamation-circle" /></div>
          <h5>Có lỗi xảy ra</h5>
          <p>{baoLoi}</p>
        </div>
      ) : binhLuanList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><i className="fas fa-comments" /></div>
          <h5>Chưa có bình luận</h5>
          <p>Chưa có bình luận nào trong hệ thống</p>
        </div>
      ) : (
        <div className="order-table-wrapper">
          <div className="table-responsive">
            <table className="order-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Nhận xét</th>
                  <th>Đánh giá</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center', width: '80px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {binhLuanList.map((item) => (
                  <tr key={item.maDanhGia}>
                    <td>
                      <strong style={{ color: 'var(--color-primary)' }}>#{item.maDanhGia}</strong>
                    </td>
                    <td style={{ maxWidth: '300px' }}>
                      <span style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {item.nhanXet || '—'}
                      </span>
                    </td>
                    <td>{renderStars(item.diemXepHang)}</td>
                    <td>
                      <span className={`status-badge ${item.isActive ? 'paid' : 'pending'}`}>
                        {item.isActive ? 'Hiển thị' : 'Đã ẩn'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className={`order-action-btn ${item.isActive ? '' : 'success'}`}
                        title={item.isActive ? 'Ẩn bình luận' : 'Hiện bình luận'}
                        onClick={() => handleToggleActive(item.maDanhGia, item.isActive)}
                      >
                        <i className={`fas fa-${item.isActive ? 'eye-slash' : 'eye'}`} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {tongSoTrang > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <span className="pagination-info">
            Trang {trangHienTai} / {tongSoTrang}
          </span>
          <div className="pagination-modern">
            <button
              className="page-btn"
              disabled={trangHienTai === 1}
              onClick={() => setTrangHienTai(p => Math.max(1, p - 1))}
            >
              <i className="fas fa-chevron-left" />
            </button>
            {Array.from({ length: Math.min(tongSoTrang, 5) }, (_, i) => {
              const start = Math.max(1, Math.min(trangHienTai - 2, tongSoTrang - 4));
              const pageNum = start + i;
              return (
                <button
                  key={pageNum}
                  className={`page-btn${pageNum === trangHienTai ? ' active' : ''}`}
                  onClick={() => setTrangHienTai(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              className="page-btn"
              disabled={trangHienTai >= tongSoTrang}
              onClick={() => setTrangHienTai(p => Math.min(tongSoTrang, p + 1))}
            >
              <i className="fas fa-chevron-right" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { };