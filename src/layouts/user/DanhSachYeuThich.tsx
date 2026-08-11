import React from 'react';
import { Link } from 'react-router-dom';
import {
  setBookWishlisted,
  syncWishlistSession,
  useWishlist,
} from '../../api/WishlistSession';
import { toast } from 'react-toastify';
import dinhDangSo from '../utils/DinhDangSo';
import AnhSach from '../utils/AnhSach';

const DanhSachYeuThich: React.FC = () => {
  const wishlist = useWishlist();
  const { items: danhSach, status, error, pendingBookIds } = wishlist;

  const handleXoa = async (maSach: number) => {
    try {
      await setBookWishlisted(maSach, false);
      toast.success('Đã xóa khỏi danh sách yêu thích');
    } catch {
      toast.error('Không thể xóa khỏi danh sách yêu thích');
    }
  };

  const handleRetry = () => {
    void syncWishlistSession().catch(() => undefined);
  };

  if (status === 'loading' && danhSach.length === 0) {
    return (
      <div className="container py-5 text-center" role="status" aria-live="polite">
        <div className="spinner-border" aria-hidden="true"></div>
        <span className="visually-hidden">Đang tải danh sách yêu thích...</span>
      </div>
    );
  }

  if (status === 'error' && danhSach.length === 0) {
    return (
      <div className="container py-5 text-center" role="alert">
        <p style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
          {error || 'Không thể tải danh sách yêu thích.'}
        </p>
        <button type="button" className="btn-modern-primary mt-3" onClick={handleRetry}>
          Thử lại
        </button>
      </div>
    );
  }

  if (status === 'ready' && danhSach.length === 0) {
    return (
      <div className="container py-5 text-center">
        <i className="fas fa-heart" aria-hidden="true" style={{ fontSize: '3rem', color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'block' }}></i>
        <p style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Chưa có sản phẩm yêu thích</p>
        <Link to="/" className="btn-modern-primary mt-3" style={{ display: 'inline-flex', padding: '0.6rem 1.5rem' }}>
          Khám phá sách
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-4" aria-busy={status === 'loading'}>
      <div className="section-header"><h2>Sản phẩm yêu thích</h2></div>
      {status === 'error' && (
        <div className="alert alert-danger d-flex flex-wrap align-items-center justify-content-between gap-2" role="alert" aria-live="polite">
          <span>{error || 'Danh sách có thể chưa phải dữ liệu mới nhất.'}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={handleRetry}>
            Thử lại
          </button>
        </div>
      )}
      <div className="row">
        {danhSach.map(item => {
          const dangXoa = pendingBookIds.includes(item.maSach);
          return (
            <div key={item.maSach} className="col-lg-3 col-md-4 col-6 mb-4">
              <div className="product-card">
                <Link to={`/sach/${item.maSach}`}>
                  <div className="product-card-img-wrapper">
                    <AnhSach src={item.hinhAnh} alt={item.tenSach} />
                  </div>
                </Link>
                <div className="product-card-body">
                  <Link to={`/sach/${item.maSach}`} style={{ textDecoration: 'none' }}>
                    <h3 className="product-card-title">{item.tenSach}</h3>
                  </Link>
                  <div className="product-card-price">
                    <span className="price-current">{dinhDangSo(item.giaBan)} đ</span>
                  </div>
                  <div className="product-card-actions">
                    <button
                      type="button"
                      className="btn-icon"
                      aria-label={`Xóa ${item.tenSach} khỏi danh sách yêu thích`}
                      aria-pressed="true"
                      aria-busy={dangXoa}
                      disabled={dangXoa}
                      onClick={() => { void handleXoa(item.maSach); }}
                    >
                      <i className="fas fa-heart text-danger" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DanhSachYeuThich;
