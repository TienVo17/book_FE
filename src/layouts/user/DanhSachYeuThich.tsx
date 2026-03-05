import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDanhSachYeuThich, xoaYeuThich } from '../../api/YeuThichApi';
import { toast } from 'react-toastify';
import dinhDangSo from '../utils/DinhDangSo';

interface YeuThichItem {
  maSach: number;
  tenSach: string;
  giaBan: number;
  hinhAnh: string;
}

const DanhSachYeuThich: React.FC = () => {
  const [danhSach, setDanhSach] = useState<YeuThichItem[]>([]);
  const [dangTai, setDangTai] = useState(true);

  useEffect(() => {
    getDanhSachYeuThich()
      .then((data: YeuThichItem[]) => {
        setDanhSach(data);
        setDangTai(false);
      })
      .catch(() => {
        setDangTai(false);
        toast.error('Không thể tải danh sách yêu thích');
      });
  }, []);

  const handleXoa = async (maSach: number) => {
    try {
      await xoaYeuThich(maSach);
      setDanhSach(prev => prev.filter(item => item.maSach !== maSach));
      toast.success('Đã xóa khỏi danh sách yêu thích');
    } catch {
      toast.error('Có lỗi xảy ra');
    }
  };

  if (dangTai) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status"></div>
      </div>
    );
  }

  if (danhSach.length === 0) {
    return (
      <div className="container py-5 text-center">
        <i className="fas fa-heart" style={{ fontSize: '3rem', color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'block' }}></i>
        <h5 style={{ color: 'var(--color-text-secondary)' }}>Chưa có sản phẩm yêu thích</h5>
        <Link to="/" className="btn-modern-primary mt-3" style={{ display: 'inline-flex', padding: '0.6rem 1.5rem' }}>
          Khám phá sách
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="section-header"><h2>Sản phẩm yêu thích</h2></div>
      <div className="row">
        {danhSach.map(item => (
          <div key={item.maSach} className="col-lg-3 col-md-4 col-sm-6 mb-4">
            <div className="product-card">
              <Link to={`/sach/${item.maSach}`}>
                <div className="product-card-img-wrapper">
                  <img src={item.hinhAnh} alt={item.tenSach} loading="lazy" />
                </div>
              </Link>
              <div className="product-card-body">
                <Link to={`/sach/${item.maSach}`} style={{ textDecoration: 'none' }}>
                  <h5 className="product-card-title">{item.tenSach}</h5>
                </Link>
                <div className="product-card-price">
                  <span className="price-current">{dinhDangSo(item.giaBan)} đ</span>
                </div>
                <div className="product-card-actions">
                  <button className="btn-icon" aria-label="Xóa yêu thích" onClick={() => handleXoa(item.maSach)}>
                    <i className="fas fa-heart text-danger"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DanhSachYeuThich;
