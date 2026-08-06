import React, { useCallback, useEffect, useState } from 'react';
import { DanhGiaQuanTri } from '../../../../api/DanhGiaAPI';
import {
  getDanhGiaAdmin,
  setDanhGiaActive,
  traLoiDanhGia,
  xoaAnhDanhGia,
} from '../../../../api/DanhGiaAPI';

export default function DanhSachBinhLuan() {
  const [binhLuanList, setBinhLuanList] = useState<DanhGiaQuanTri[]>([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(true);
  const [baoLoi, setBaoLoi] = useState<string | null>(null);
  const [trangHienTai, setTrangHienTai] = useState(1);
  const [tongSoTrang, setTongSoTrang] = useState(0);

  const loadData = useCallback(() => {
    setDangTaiDuLieu(true);
    getDanhGiaAdmin(trangHienTai - 1)
      .then(response => {
        const sorted = response.content.slice().sort((a, b) => {
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
  }, [trangHienTai]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleActive = async (maDanhGia: number, dangHienThi: boolean) => {
    const action = dangHienThi ? 'ẩn' : 'hiện';
    if (!window.confirm(`Bạn muốn ${action} bình luận này?`)) return;
    try {
      await setDanhGiaActive(maDanhGia, !dangHienThi);
      loadData();
    } catch (error) {
      alert('Có lỗi xảy ra!');
      console.error('Lỗi:', error);
    }
  };

  const handleTraLoi = async (maDanhGia: number, phanHoiHienTai: string | null) => {
    const noiDung = window.prompt('Phản hồi của shop:', phanHoiHienTai ?? '');
    if (noiDung === null || !noiDung.trim()) return;
    try {
      await traLoiDanhGia(maDanhGia, noiDung.trim());
      loadData();
    } catch (error) {
      alert('Không gửi được phản hồi!');
      console.error('Lỗi:', error);
    }
  };

  const handleXoaAnh = async (maDanhGia: number, maHinhAnh: number) => {
    if (!window.confirm('Bạn muốn gỡ ảnh vi phạm này?')) return;
    try {
      await xoaAnhDanhGia(maHinhAnh);
      setBinhLuanList((danhSach) =>
        danhSach.map((danhGia) =>
          danhGia.maDanhGia === maDanhGia
            ? {
                ...danhGia,
                anhDinhKem: danhGia.anhDinhKem.filter(
                  (anh) => anh.maHinhAnh !== maHinhAnh
                ),
              }
            : danhGia
        )
      );
    } catch (error) {
      alert('Không gỡ được ảnh!');
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
                  <th>Ảnh</th>
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
                    <td>
                      {item.anhDinhKem.length === 0 ? (
                        <span>—</span>
                      ) : (
                        <ul className="admin-review-image-list" aria-label={`Ảnh của đánh giá #${item.maDanhGia}`}>
                          {item.anhDinhKem.map((anh, index) => (
                            <li key={anh.maHinhAnh}>
                              <a href={anh.urlHinh} target="_blank" rel="noreferrer">
                                <img
                                  src={anh.urlHinh}
                                  alt={`Ảnh ${index + 1} của đánh giá #${item.maDanhGia}`}
                                  width={64}
                                  height={64}
                                  loading="lazy"
                                />
                              </a>
                              <button
                                type="button"
                                className="order-action-btn"
                                title={`Gỡ ảnh ${index + 1}`}
                                aria-label={`Gỡ ảnh ${index + 1} của đánh giá #${item.maDanhGia}`}
                                onClick={() => handleXoaAnh(item.maDanhGia, anh.maHinhAnh)}
                              >
                                <i className="fas fa-trash" aria-hidden="true" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td>{renderStars(item.diemXepHang)}</td>
                    <td>
                      {/* Đọc `trangThai` chứ không phải `isActive`. Trường cũ đã biến mất
                          khỏi response; khi còn khai `any[]`, giá trị thiếu thành
                          `undefined` im lặng nên mọi dòng hiện "Đã ẩn" và nút gọi
                          `!undefined` nên luôn gửi lệnh "hiện" — công cụ kiểm duyệt đảo
                          ngược ý nghĩa mà không hề báo lỗi. */}
                      <span className={`status-badge ${item.trangThai === 'HIEN_THI' ? 'paid' : 'pending'}`}>
                        {item.trangThai === 'HIEN_THI' ? 'Hiển thị' : 'Đã ẩn'}
                      </span>
                      {item.tungBiAn && item.trangThai === 'HIEN_THI' && (
                        <span className="status-badge pending ms-1" title="Đã từng bị ẩn ít nhất một lần">
                          Từng bị ẩn
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className={`order-action-btn ${item.trangThai === 'HIEN_THI' ? '' : 'success'}`}
                        title={item.trangThai === 'HIEN_THI' ? 'Ẩn bình luận' : 'Hiện bình luận'}
                        onClick={() => handleToggleActive(item.maDanhGia, item.trangThai === 'HIEN_THI')}
                      >
                        <i className={`fas fa-${item.trangThai === 'HIEN_THI' ? 'eye-slash' : 'eye'}`} />
                      </button>
                      {/* Trả lời lần hai là sửa nội dung, không tạo thêm dòng — phản hồi
                          lưu thẳng trên chính dòng đánh giá. */}
                      <button
                        className="order-action-btn"
                        title={item.phanHoiShop ? 'Sửa phản hồi' : 'Trả lời'}
                        onClick={() => handleTraLoi(item.maDanhGia, item.phanHoiShop)}
                      >
                        <i className="fas fa-reply" />
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