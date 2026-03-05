import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { datLaiMatKhau } from '../../api/NguoiDungApi';

const iconStyle: React.CSSProperties = {
  width: 64, height: 64, borderRadius: '50%',
  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem',
};

const labelStyle: React.CSSProperties = {
  fontWeight: 600, fontSize: '0.88rem', marginBottom: 6, display: 'block',
};

const DatLaiMatKhau = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [matKhauMoi, setMatKhauMoi] = useState('');
  const [xacNhanMatKhau, setXacNhanMatKhau] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (matKhauMoi !== xacNhanMatKhau) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }

    if (!token) {
      setError('Liên kết đặt lại mật khẩu không hợp lệ.');
      return;
    }

    setIsLoading(true);
    try {
      await datLaiMatKhau(token, matKhauMoi);
      toast.success('Đặt lại mật khẩu thành công! Vui lòng đăng nhập.');
      navigate('/dang-nhap');
    } catch (err: any) {
      setError(err?.message || 'Đặt lại mật khẩu thất bại. Liên kết có thể đã hết hạn.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="text-center mb-4">
          <div style={iconStyle}>
            <i className="fas fa-lock" style={{ color: 'white', fontSize: '1.5rem' }}></i>
          </div>
          <h2>Đặt lại mật khẩu</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Nhập mật khẩu mới cho tài khoản của bạn
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="matKhauMoi" style={labelStyle}>Mật khẩu mới</label>
            <input
              type="password"
              id="matKhauMoi"
              className="auth-input"
              placeholder="Nhập mật khẩu mới"
              value={matKhauMoi}
              onChange={e => setMatKhauMoi(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="xacNhanMatKhau" style={labelStyle}>Xác nhận mật khẩu mới</label>
            <input
              type="password"
              id="xacNhanMatKhau"
              className="auth-input"
              placeholder="Nhập lại mật khẩu mới"
              value={xacNhanMatKhau}
              onChange={e => setXacNhanMatKhau(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn-modern-primary w-100"
            style={{ padding: '0.7rem', justifyContent: 'center', fontSize: '0.95rem' }}
            disabled={isLoading}
          >
            {isLoading ? (
              <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...</>
            ) : (
              'Xác nhận đặt lại mật khẩu'
            )}
          </button>

          {error && (
            <div
              className="mt-3 animate-fade-in"
              style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: 'var(--radius-md)',
                padding: '0.7rem 1rem',
                fontSize: '0.88rem',
                color: 'var(--color-danger)',
              }}
              role="alert"
            >
              <i className="fas fa-exclamation-circle me-2"></i>{error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default DatLaiMatKhau;
