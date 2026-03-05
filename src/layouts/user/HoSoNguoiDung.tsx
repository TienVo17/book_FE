import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getHoSo, capNhatHoSo, doiMatKhau } from '../../api/NguoiDungApi';

const iconStyle: React.CSSProperties = {
  width: 64, height: 64, borderRadius: '50%',
  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem',
};

const labelStyle: React.CSSProperties = {
  fontWeight: 600, fontSize: '0.88rem', marginBottom: 6, display: 'block',
};

const HoSoNguoiDung = () => {
  const navigate = useNavigate();

  // Profile state
  const [hoDem, setHoDem] = useState('');
  const [ten, setTen] = useState('');
  const [email, setEmail] = useState('');
  const [soDienThoai, setSoDienThoai] = useState('');
  const [gioiTinh, setGioiTinh] = useState('M');
  const [loadingHoSo, setLoadingHoSo] = useState(false);

  // Password state
  const [matKhauCu, setMatKhauCu] = useState('');
  const [matKhauMoi, setMatKhauMoi] = useState('');
  const [xacNhanMatKhau, setXacNhanMatKhau] = useState('');
  const [loadingMatKhau, setLoadingMatKhau] = useState(false);

  useEffect(() => {
    const jwt = localStorage.getItem('jwt');
    if (!jwt) { navigate('/dang-nhap'); return; }

    getHoSo()
      .then((data: any) => {
        setHoDem(data.hoDem || '');
        setTen(data.ten || '');
        setEmail(data.email || '');
        setSoDienThoai(data.soDienThoai || '');
        setGioiTinh(data.gioiTinh || 'M');
      })
      .catch(() => toast.error('Không thể tải thông tin hồ sơ'));
  }, [navigate]);

  const handleCapNhat = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingHoSo(true);
    try {
      await capNhatHoSo({ hoDem, ten, soDienThoai, gioiTinh });
      toast.success('Cập nhật hồ sơ thành công!');
    } catch {
      toast.error('Cập nhật thất bại. Vui lòng thử lại.');
    } finally {
      setLoadingHoSo(false);
    }
  };

  const handleDoiMatKhau = async (e: React.FormEvent) => {
    e.preventDefault();
    if (matKhauMoi !== xacNhanMatKhau) {
      toast.error('Mật khẩu xác nhận không khớp!');
      return;
    }
    setLoadingMatKhau(true);
    try {
      await doiMatKhau(matKhauCu, matKhauMoi);
      toast.success('Đổi mật khẩu thành công!');
      setMatKhauCu(''); setMatKhauMoi(''); setXacNhanMatKhau('');
    } catch {
      toast.error('Đổi mật khẩu thất bại. Kiểm tra lại mật khẩu cũ.');
    } finally {
      setLoadingMatKhau(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 600 }}>
      {/* Profile info card */}
      <div className="auth-card">
        <div className="text-center mb-4">
          <div style={iconStyle}>
            <i className="fas fa-user" style={{ color: 'white', fontSize: '1.5rem' }}></i>
          </div>
          <h2>Hồ sơ của tôi</h2>
        </div>

        <form onSubmit={handleCapNhat}>
          <div className="mb-3">
            <label style={labelStyle}>Họ đệm</label>
            <input className="auth-input" placeholder="Nhập họ đệm" value={hoDem}
              onChange={e => setHoDem(e.target.value)} />
          </div>
          <div className="mb-3">
            <label style={labelStyle}>Tên</label>
            <input className="auth-input" placeholder="Nhập tên" value={ten}
              onChange={e => setTen(e.target.value)} />
          </div>
          <div className="mb-3">
            <label style={labelStyle}>Email</label>
            <input className="auth-input" value={email} readOnly
              style={{ background: 'var(--color-bg-secondary)', cursor: 'not-allowed' }} />
          </div>
          <div className="mb-3">
            <label style={labelStyle}>Số điện thoại</label>
            <input className="auth-input" placeholder="Nhập số điện thoại" value={soDienThoai}
              onChange={e => setSoDienThoai(e.target.value)} />
          </div>
          <div className="mb-4">
            <label style={labelStyle}>Giới tính</label>
            <div style={{ display: 'flex', gap: 24 }}>
              {[{ val: 'M', label: 'Nam' }, { val: 'F', label: 'Nữ' }].map(opt => (
                <label key={opt.val} style={{ fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="radio" name="gioiTinh" value={opt.val} checked={gioiTinh === opt.val}
                    onChange={() => setGioiTinh(opt.val)} style={{ accentColor: 'var(--color-primary)' }} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="btn-modern-primary w-100"
            style={{ padding: '0.7rem', justifyContent: 'center', fontSize: '0.95rem' }}
            disabled={loadingHoSo}>
            {loadingHoSo
              ? <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang lưu...</>
              : 'Lưu thay đổi'}
          </button>
        </form>
      </div>

      {/* Password change card */}
      <div className="auth-card mt-4">
        <h4 className="mb-4">Đổi mật khẩu</h4>
        <form onSubmit={handleDoiMatKhau}>
          <div className="mb-3">
            <label style={labelStyle}>Mật khẩu cũ</label>
            <input type="password" className="auth-input" placeholder="Nhập mật khẩu cũ" value={matKhauCu}
              onChange={e => setMatKhauCu(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label style={labelStyle}>Mật khẩu mới</label>
            <input type="password" className="auth-input" placeholder="Nhập mật khẩu mới" value={matKhauMoi}
              onChange={e => setMatKhauMoi(e.target.value)} required />
          </div>
          <div className="mb-4">
            <label style={labelStyle}>Xác nhận mật khẩu mới</label>
            <input type="password" className="auth-input" placeholder="Nhập lại mật khẩu mới" value={xacNhanMatKhau}
              onChange={e => setXacNhanMatKhau(e.target.value)} required />
          </div>
          <button type="submit" className="btn-modern-primary w-100"
            style={{ padding: '0.7rem', justifyContent: 'center', fontSize: '0.95rem' }}
            disabled={loadingMatKhau}>
            {loadingMatKhau
              ? <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...</>
              : 'Đổi mật khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default HoSoNguoiDung;
