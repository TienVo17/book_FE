import React, { useEffect, useState } from 'react';
import { NavLink, useParams, useSearchParams } from 'react-router-dom';
import { getTheLoaiBySlug } from '../../api/TheLoaiApi';
import DanhSachCoBoLoc from '../products/DanhSachCoBoLoc';
import { TheLoaiModel } from '../../models/TheLoaiModel';

const TheLoaiPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [theLoai, setTheLoai] = useState<TheLoaiModel | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const [baoLoi, setBaoLoi] = useState<string | null>(null);

  const tuKhoa = (searchParams.get('q') ?? '').trim();
  const [tuKhoaNhap, setTuKhoaNhap] = useState(tuKhoa);

  useEffect(() => {
    setTuKhoaNhap(tuKhoa);
  }, [tuKhoa]);

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

  /** Tìm trong phạm vi thể loại đang xem: chỉ đổi `q`, thể loại do route quyết định. */
  const timTrongTheLoai = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams((truoc) => {
      const banSao = new URLSearchParams(truoc);
      const giaTri = tuKhoaNhap.trim();
      if (giaTri) {
        banSao.set('q', giaTri);
      } else {
        banSao.delete('q');
      }
      banSao.delete('page');
      return banSao;
    });
  };

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

  return (
    <div className="container py-4">
      <nav style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--color-text-secondary)' }}>
        <NavLink to="/" style={{ textDecoration: 'none' }}>Trang chủ</NavLink>
        <span> / Thể loại / {theLoai.tenTheLoai}</span>
      </nav>
      <div className="section-header" style={{ marginBottom: '1rem' }}>
        <h2>{theLoai.tenTheLoai}</h2>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{theLoai.soLuongSach} sách</p>
      </div>

      <form className="d-flex gap-2 mb-3" onSubmit={timTrongTheLoai} role="search">
        <label className="visually-hidden" htmlFor="tim-trong-the-loai">
          Tìm trong thể loại {theLoai.tenTheLoai}
        </label>
        <input
          id="tim-trong-the-loai"
          type="search"
          className="form-control"
          style={{ maxWidth: 320 }}
          placeholder={`Tìm trong ${theLoai.tenTheLoai}…`}
          value={tuKhoaNhap}
          onChange={(e) => setTuKhoaNhap(e.target.value)}
        />
        <button type="submit" className="btn-modern-outline-primary">Tìm</button>
      </form>

      <DanhSachCoBoLoc
        maTheLoaiCoDinh={theLoai.maTheLoai}
        thongDiepRong={`Chưa có sách nào phù hợp trong thể loại ${theLoai.tenTheLoai}.`}
      />
    </div>
  );
};

export default TheLoaiPage;
