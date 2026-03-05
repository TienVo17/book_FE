import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { quenMatKhau } from '../../api/NguoiDungApi';

const iconStyle: React.CSSProperties = {
  width: 64, height: 64, borderRadius: '50%',
  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem',
};

const labelStyle: React.CSSProperties = {
  fontWeight: 600, fontSize: '0.88rem', marginBottom: 6, display: 'block',
};

const QuenMatKhau = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await quenMatKhau(email);
      setSent(true);
    } catch {
      setError('Không tìm thấy tài khoản với email này. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="text-center mb-4">
          <div style={iconStyle}>
            <i className="fas fa-envelope" style={{ color: 'white', fontSize: '1.5rem' }}></i>
          </div>
          <h2>Quên mật khẩu</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Nhập email để nhận liên kết đặt lại mật khẩu
          </p>
        </div>

        {sent ? (
          <div className="text-center py-3">
            <div style={{ ...iconStyle, background: 'linear-gradient(135deg, #22c55e, #16a34a)', margin: '0 auto 1rem' }}>
              <i className="fas fa-check-circle" style={{ color: 'white', fontSize: '1.5rem' }}></i>
            </div>
            <h5 style={{ color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>Email đã được gửi!</h5>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Vui lòng kiểm tra email <strong>{email}</strong> và làm theo hướng dẫn.
            </p>
            <NavLink to="/dang-nhap" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
              <i className="fas fa-arrow-left me-1"></i> Quay lại đăng nhập
            </NavLink>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" style={labelStyle}>Địa chỉ email</label>
              <input
                type="email"
                id="email"
                className="auth-input"
                placeholder="Nhập email của bạn"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-modern-primary w-100"
              style={{ padding: '0.7rem', justifyContent: 'center', fontSize: '0.95rem' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang gửi...</>
              ) : (
                'Gửi liên kết đặt lại'
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

export default QuenMatKhau;
