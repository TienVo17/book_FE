import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { capNhatDiaChi, getDanhSachDiaChi, themDiaChi, xoaDiaChi } from '../../api/DiaChiApi';
import { DiaChiModel } from '../../models/DiaChiModel';

const emptyForm: DiaChiModel = {
  hoTen: '',
  soDienThoai: '',
  diaChiDayDu: '',
  macDinh: false,
};

function DiaChiNguoiDung() {
  const [danhSachDiaChi, setDanhSachDiaChi] = useState<DiaChiModel[]>([]);
  const [form, setForm] = useState<DiaChiModel>(emptyForm);
  const [dangLuu, setDangLuu] = useState(false);
  const [maDangSua, setMaDangSua] = useState<number | null>(null);

  const taiDanhSachDiaChi = async () => {
    try {
      const data = await getDanhSachDiaChi();
      setDanhSachDiaChi(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tải địa chỉ');
    }
  };

  useEffect(() => {
    taiDanhSachDiaChi();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setMaDangSua(null);
  };

  const handleChange = (field: keyof DiaChiModel, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hoTen.trim() || !form.soDienThoai.trim() || !form.diaChiDayDu.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin địa chỉ');
      return;
    }

    setDangLuu(true);
    try {
      if (maDangSua) {
        await capNhatDiaChi(maDangSua, form);
        toast.success('Cập nhật địa chỉ thành công');
      } else {
        await themDiaChi(form);
        toast.success('Thêm địa chỉ thành công');
      }
      resetForm();
      await taiDanhSachDiaChi();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể lưu địa chỉ');
    } finally {
      setDangLuu(false);
    }
  };

  const handleEdit = (diaChi: DiaChiModel) => {
    setMaDangSua(diaChi.maDiaChi || null);
    setForm({
      hoTen: diaChi.hoTen,
      soDienThoai: diaChi.soDienThoai,
      diaChiDayDu: diaChi.diaChiDayDu,
      macDinh: diaChi.macDinh || false,
    });
  };

  const handleDelete = async (maDiaChi?: number) => {
    if (!maDiaChi || !window.confirm('Bạn có chắc muốn xóa địa chỉ này?')) {
      return;
    }
    try {
      await xoaDiaChi(maDiaChi);
      toast.success('Xóa địa chỉ thành công');
      if (maDangSua === maDiaChi) {
        resetForm();
      }
      await taiDanhSachDiaChi();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa địa chỉ');
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 900 }}>
      <div className="row g-4">
        <div className="col-lg-5">
          <div className="auth-card h-100">
            <div className="mb-4">
              <h3>{maDangSua ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ mới'}</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: 0 }}>
                Dùng địa chỉ này cho checkout.
              </p>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Họ tên</label>
                <input className="auth-input" value={form.hoTen} onChange={(e) => handleChange('hoTen', e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">Số điện thoại</label>
                <input className="auth-input" value={form.soDienThoai} onChange={(e) => handleChange('soDienThoai', e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">Địa chỉ đầy đủ</label>
                <textarea
                  className="auth-input"
                  rows={4}
                  value={form.diaChiDayDu}
                  onChange={(e) => handleChange('diaChiDayDu', e.target.value)}
                  style={{ resize: 'vertical', minHeight: 120 }}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(form.macDinh)}
                  onChange={(e) => handleChange('macDinh', e.target.checked)}
                />
                Đặt làm địa chỉ mặc định
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" className="btn-modern-primary" disabled={dangLuu} style={{ justifyContent: 'center', flex: 1 }}>
                  {dangLuu ? 'Đang lưu...' : maDangSua ? 'Cập nhật' : 'Thêm địa chỉ'}
                </button>
                {maDangSua && (
                  <button type="button" className="btn-modern-outline" onClick={resetForm} style={{ textDecoration: 'none' }}>
                    Hủy
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="auth-card h-100">
            <div className="mb-4">
              <h3>Danh sách địa chỉ</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: 0 }}>
                Chọn hoặc chỉnh sửa địa chỉ giao hàng của bạn.
              </p>
            </div>
            {danhSachDiaChi.length === 0 ? (
              <div className="empty-state" style={{ minHeight: 240 }}>
                <div className="empty-state-icon"><i className="fas fa-map-marker-alt"></i></div>
                <h5>Chưa có địa chỉ</h5>
                <p>Thêm một địa chỉ để sử dụng tính năng đặt hàng.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {danhSachDiaChi.map((diaChi) => (
                  <div key={diaChi.maDiaChi} className="checkout-card" style={{ marginBottom: 0 }}>
                    <div className="checkout-card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>
                            {diaChi.hoTen}
                            {diaChi.macDinh && <span className="status-badge paid" style={{ marginLeft: 8 }}>Mặc định</span>}
                          </div>
                          <div style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>{diaChi.soDienThoai}</div>
                          <div style={{ marginTop: 8 }}>{diaChi.diaChiDayDu}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <button type="button" className="btn-modern-outline" onClick={() => handleEdit(diaChi)} style={{ textDecoration: 'none' }}>
                            Sửa
                          </button>
                          <button type="button" className="btn-modern-outline" onClick={() => handleDelete(diaChi.maDiaChi)} style={{ textDecoration: 'none', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.25)' }}>
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DiaChiNguoiDung;
