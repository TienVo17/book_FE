import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

interface FormData {
  hoTen: string;
  soDienThoai: string;
  email: string;
  diaChiGiaoHang: string;
}

const DatHangNhanh: React.FC = () => {
  const navigate = useNavigate();
  const [dangGui, setDangGui] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    hoTen: '',
    soDienThoai: '',
    email: '',
    diaChiGiaoHang: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDangGui(true);

    try {
      const gioHang = JSON.parse(localStorage.getItem('gioHang') || '[]');

      const response = await fetch('http://localhost:8080/tai-khoan/dang-ky', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thongTinNguoiMua: formData,
          donHang: gioHang
        })
      });

      if (response.ok) {
        localStorage.removeItem('gioHang');
        toast.success('Đặt hàng thành công!');
        navigate('/ket-qua-dat-hang');
      } else {
        toast.error('Đặt hàng thất bại. Vui lòng thử lại.');
      }
    } catch {
      toast.error('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setDangGui(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card animate-scale-in">
        <h2>
          <i className="fas fa-bolt me-2" style={{ color: 'var(--color-accent)' }}></i>
          Đặt hàng nhanh
        </h2>
        <p style={{
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
          fontSize: '0.9rem',
          marginBottom: '1.5rem',
        }}>
          Điền thông tin để đặt hàng không cần tài khoản
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
              Họ tên
            </label>
            <input
              className="auth-input"
              type="text"
              autoComplete="name"
              placeholder="Nguyễn Văn A…"
              value={formData.hoTen}
              onChange={e => setFormData({ ...formData, hoTen: e.target.value })}
              required
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
              Email
            </label>
            <input
              className="auth-input"
              type="email"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              placeholder="email@example.com…"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
              Số điện thoại
            </label>
            <input
              className="auth-input"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="0912 345 678…"
              value={formData.soDienThoai}
              onChange={e => setFormData({ ...formData, soDienThoai: e.target.value })}
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
              Địa chỉ giao hàng
            </label>
            <textarea
              className="auth-input"
              autoComplete="street-address"
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố…"
              value={formData.diaChiGiaoHang}
              onChange={e => setFormData({ ...formData, diaChiGiaoHang: e.target.value })}
              required
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <button
            type="submit"
            className="btn-modern-accent w-100"
            disabled={dangGui}
            style={{ padding: '0.75rem', justifyContent: 'center' }}
          >
            {dangGui ? (
              <><span className="spinner-border spinner-border-sm me-2"></span>Đang xử lý…</>
            ) : (
              <><i className="fas fa-paper-plane me-2"></i>Đặt hàng</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DatHangNhanh;