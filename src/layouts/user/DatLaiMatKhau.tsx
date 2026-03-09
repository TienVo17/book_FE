import React, { useMemo, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
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
  const { email, token } = useParams<{ email: string; token: string }>();
  const navigate = useNavigate();

  const [matKhauMoi, setMatKhauMoi] = useState('');
  const [xacNhanMatKhau, setXacNhanMatKhau] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const invalidLink = useMemo(() => !email || !token, [email, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !token) {
      setError('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
      return;
    }

    if (matKhauMoi.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (matKhauMoi !== xacNhanMatKhau) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsLoading(true);
    try {
      await datLaiMatKhau(email, token, matKhauMoi);
      setMatKhauMoi('');
      setXacNhanMatKhau('');
      toast.success('Đặt lại mật khẩu thành công! Vui lòng đăng nhập.');
      navigate('/dang-nhap');
    } catch (err: any) {
      const message = err?.message || '';
      if (
        message === 'Token không hợp lệ'
        || message === 'Token đã hết hạn'
        || message === 'Email không tồn tại trong hệ thống'
      ) {
        setError('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
      } else {
        setError(message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.');
      }
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

        {invalidLink ? (
          <div className="text-center py-3">
            <div
              className="animate-fade-in"
              style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: 'var(--radius-md)',
                padding: '0.9rem 1rem',
                fontSize: '0.9rem',
                color: 'var(--color-danger)',
                marginBottom: '1.5rem',
              }}
              role="alert"
            >
              <i className="fas fa-exclamation-circle me-2"></i>
              Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
            </div>
            <div className="d-flex justify-content-center gap-3 flex-wrap">
              <NavLink to="/quen-mat-khau" style={{ fontWeight: 600 }}>
                Yêu cầu liên kết mới
              </NavLink>
              <NavLink to="/dang-nhap" style={{ fontWeight: 600 }}>
                Quay lại đăng nhập
              </NavLink>
            </div>
          </div>
        ) : (
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

            <div className="mb-2">
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

            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Mật khẩu mới phải có ít nhất 6 ký tự.
            </p>

            <button
              type="submit"
              className="btn-modern-primary w-100"
              style={{ padding: '0.7rem', justifyContent: 'center', fontSize: '0.95rem' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...</>
              ) : (
                'Đặt lại mật khẩu'
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

            <div className="text-center mt-4" style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              <NavLink to="/dang-nhap" style={{ fontWeight: 600 }}>
                <i className="fas fa-arrow-left me-1"></i> Quay lại đăng nhập
              </NavLink>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default DatLaiMatKhau;
