import React, { useState, useEffect } from 'react';
import SachModel from '../../../../models/SachModel';
import { useNavigate } from 'react-router-dom';
import { xoaSach, findAll } from "../../../../api/SachApi";

export default function DanhSachSach() {
  const [danhSachSach, setDanhSachSach] = useState<SachModel[]>([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(true);
  const [baoLoi, setBaoLoi] = useState<string | null>(null);
  const [trangHienTai, setTrangHienTai] = useState(1);
  const [tongSoTrang, setTongSoTrang] = useState(0);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const jwt = localStorage.getItem('jwt') || '';
    if (jwt) {
      const decodedJwt = JSON.parse(atob(jwt.split('.')[1]));
      setUserInfo(decodedJwt);
    }
    loadData();
  }, [trangHienTai]);

  const loadData = () => {
    setDangTaiDuLieu(true);
    findAll(trangHienTai - 1)
      .then((kq) => {
        setDanhSachSach(kq.ketQua);
        setTongSoTrang(kq.tongSoTrang);
        setDangTaiDuLieu(false);
      })
      .catch((error) => {
        setBaoLoi(error.message);
        setDangTaiDuLieu(false);
      });
  };

  const handleToggleActive = async (maSach: number, isActive: number) => {
    const action = isActive ? 'đóng bán' : 'mở bán';
    if (!window.confirm(`Bạn có muốn ${action} sách này?`)) return;
    try {
      const endpoint = isActive ? 'unactive' : 'active';
      await fetch(`http://localhost:8080/api/admin/sach/${endpoint}/${maSach}`, {
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

  const handleDelete = async (maSach: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa cuốn sách này?')) return;
    try {
      await xoaSach(maSach);
      alert('Xóa sách thành công!');
      loadData();
    } catch (error) {
      alert('Có lỗi xảy ra khi xóa sách!');
      console.error('Lỗi xóa sách:', error);
    }
  };

  // Client-side search filter
  const filtered = danhSachSach.filter(sach =>
    !searchTerm || sach.tenSach?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="admin-page-header">
        <h4><i className="fas fa-book me-2" />Quản lý sách</h4>
        <p>Quản lý danh sách sách trong hệ thống</p>
      </div>

      {/* Toolbar */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div className="admin-search">
          <i className="fas fa-search search-icon" />
          <input
            type="text"
            placeholder="Tìm tên sách…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {userInfo?.isAdmin && (
          <button className="admin-btn-add" onClick={() => navigate('/quan-ly/them-sach')}>
            <i className="fas fa-plus" /> Thêm sách
          </button>
        )}
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
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><i className="fas fa-book-open" /></div>
          <h5>Không có sách</h5>
          <p>Không tìm thấy sách nào phù hợp</p>
        </div>
      ) : (
        <div className="order-table-wrapper">
          <div className="table-responsive">
            <table className="order-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên sách</th>
                  <th>Trạng thái</th>
                  <th>Tác giả</th>
                  <th style={{ textAlign: 'right' }}>Giá bán</th>
                  <th style={{ textAlign: 'center' }}>SL</th>
                  <th>Hình ảnh</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sach) => (
                  <tr key={sach.maSach}>
                    <td>
                      <strong style={{ color: 'var(--color-primary)' }}>#{sach.maSach}</strong>
                    </td>
                    <td style={{ maxWidth: '200px', fontWeight: 500 }}>
                      <span style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {sach.tenSach}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${sach.isActive === 1 ? 'paid' : 'pending'}`}>
                        {sach.isActive === 1 ? 'Mở bán' : 'Đóng'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{sach.tenTacGia}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {(sach.giaBan ?? 0).toLocaleString('vi-VN')}đ
                    </td>
                    <td style={{ textAlign: 'center' }}>{sach.soLuong}</td>
                    <td>
                      <img
                        width={60}
                        height={75}
                        src={sach.danhSachAnh?.at(0)?.urlHinh}
                        alt={sach.tenSach}
                        style={{ objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="d-flex gap-1 justify-content-center flex-wrap">
                        {userInfo?.isAdmin && (
                          <>
                            <button
                              className="order-action-btn"
                              title="Chỉnh sửa"
                              onClick={() => navigate(`/quan-ly/cap-nhat-sach/${sach.maSach}`)}
                            >
                              <i className="fas fa-edit" />
                            </button>
                            <button
                              className="order-action-btn"
                              title="Xóa"
                              onClick={() => handleDelete(sach.maSach)}
                              style={{ color: 'var(--color-danger)' }}
                            >
                              <i className="fas fa-trash" />
                            </button>
                          </>
                        )}
                        <button
                          className={`order-action-btn ${sach.isActive ? '' : 'success'}`}
                          title={sach.isActive ? 'Đóng bán' : 'Mở bán'}
                          onClick={() => handleToggleActive(sach.maSach, sach.isActive ?? 0)}
                        >
                          <i className={`fas fa-${sach.isActive ? 'lock' : 'lock-open'}`} />
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