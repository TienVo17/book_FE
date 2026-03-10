import React, { useEffect, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { getTheLoaiBySlug } from '../../api/TheLoaiApi';
import DanhSachSanPham from '../products/DanhSachSanPham';
import { TheLoaiModel } from '../../models/TheLoaiModel';

interface TheLoaiPageProps {
  tuKhoaTimKiem: string;
}

const TheLoaiPage: React.FC<TheLoaiPageProps> = ({ tuKhoaTimKiem }) => {
  const { slug } = useParams<{ slug: string }>();
  const [theLoai, setTheLoai] = useState<TheLoaiModel | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const [baoLoi, setBaoLoi] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setBaoLoi('Không tìm thấy thể loại.');
      setDangTai(false);
      return;
    }

    setDangTai(true);
    setBaoLoi(null);
    getTheLoaiBySlug(slug)
      .then((data) => {
        setTheLoai(data);
        setDangTai(false);
      })
      .catch((error) => {
        setBaoLoi(error instanceof Error ? error.message : 'Không thể tải thể loại.');
        setDangTai(false);
      });
  }, [slug]);

  if (dangTai) {
    return <div className="container py-5 text-center">Đang tải thể loại...</div>;
  }

  if (baoLoi || !theLoai) {
    return (
      <div className="container py-5 text-center">
        <i className="fas fa-folder-open" style={{ fontSize: '3rem', color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'block' }}></i>
        <h5 style={{ color: 'var(--color-text-secondary)' }}>{baoLoi || 'Không tìm thấy thể loại.'}</h5>
        <NavLink to="/" className="btn-modern-primary mt-3" style={{ display: 'inline-flex', padding: '0.6rem 1.5rem' }}>
          Quay lại trang chủ
        </NavLink>
      </div>
    );
  }

  const tieuDe = tuKhoaTimKiem ? `${theLoai.tenTheLoai} - tìm kiếm: "${tuKhoaTimKiem}"` : theLoai.tenTheLoai;

  return (
    <div>
      <div className="container py-4">
        <nav style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--color-text-secondary)' }}>
          <NavLink to="/" style={{ textDecoration: 'none' }}>Trang chủ</NavLink>
          <span> / Thể loại / {theLoai.tenTheLoai}</span>
        </nav>
        <div className="section-header" style={{ marginBottom: '1rem' }}>
          <h2>{theLoai.tenTheLoai}</h2>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{theLoai.soLuongSach} sách</p>
        </div>
      </div>
      <DanhSachSanPham tuKhoaTimKiem={tuKhoaTimKiem} maTheLoai={theLoai.maTheLoai} tieuDe={tieuDe} />
    </div>
  );
};

export default TheLoaiPage;
