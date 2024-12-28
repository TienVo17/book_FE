import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface FormData {
  hoTen: string;
  soDienThoai: string;
  email: string; 
  diaChiGiaoHang: string;
}

const DatHangNhanh: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    hoTen: '',
    soDienThoai: '',
    email: '',
    diaChiGiaoHang: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const gioHang = JSON.parse(localStorage.getItem('gioHang') || '[]');
      
      const response = await fetch('http://localhost:8080/tai-khoan/dang-ky', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          thongTinNguoiMua: formData,
          donHang: gioHang
        })
      });

      if (response.ok) {
        localStorage.removeItem('gioHang');
        navigate('/ket-qua-dat-hang');
      }
    } catch (error) {
      console.error('Lỗi đặt hàng:', error);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <div className="card shadow">
            <div className="card-body p-4">
              <h3 className="text-center mb-4">Đặt hàng nhanh</h3>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Họ tên</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.hoTen}
                    onChange={(e) => setFormData({...formData, hoTen: e.target.value})}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Số điện thoại</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={formData.soDienThoai}
                    onChange={(e) => setFormData({...formData, soDienThoai: e.target.value})}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Địa chỉ giao hàng</label>
                  <textarea
                    className="form-control"
                    value={formData.diaChiGiaoHang}
                    onChange={(e) => setFormData({...formData, diaChiGiaoHang: e.target.value})}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary w-100">
                  Đặt hàng
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatHangNhanh;