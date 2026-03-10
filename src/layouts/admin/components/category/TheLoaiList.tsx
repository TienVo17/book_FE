import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  createTheLoaiAdmin,
  deleteTheLoaiAdmin,
  getAdminTheLoai,
  updateTheLoaiAdmin,
} from '../../../../api/TheLoaiApi';
import { TheLoaiAdminModel } from '../../../../models/TheLoaiModel';

const emptyTenTheLoai = '';

function toSlugPreview(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const TheLoaiList: React.FC = () => {
  const [danhSach, setDanhSach] = useState<TheLoaiAdminModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tenTheLoai, setTenTheLoai] = useState(emptyTenTheLoai);
  const [dangLuu, setDangLuu] = useState(false);
  const [editingItem, setEditingItem] = useState<TheLoaiAdminModel | null>(null);

  const slugPreview = useMemo(() => toSlugPreview(tenTheLoai), [tenTheLoai]);

  const fetchData = () => {
    setLoading(true);
    getAdminTheLoai()
      .then(setDanhSach)
      .catch(() => toast.error('Không thể tải danh sách thể loại'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setShowForm(false);
    setIsEditing(false);
    setTenTheLoai(emptyTenTheLoai);
    setEditingItem(null);
  };

  const handleAdd = () => {
    setShowForm(true);
    setIsEditing(false);
    setTenTheLoai(emptyTenTheLoai);
    setEditingItem(null);
  };

  const handleEdit = (item: TheLoaiAdminModel) => {
    setShowForm(true);
    setIsEditing(true);
    setTenTheLoai(item.tenTheLoai);
    setEditingItem(item);
  };

  const handleDelete = async (item: TheLoaiAdminModel) => {
    if (!window.confirm(`Xóa thể loại "${item.tenTheLoai}"?`)) return;
    try {
      await deleteTheLoaiAdmin(item.maTheLoai);
      toast.success('Đã xóa thể loại');
      fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể xóa thể loại';
      toast.error(message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenTheLoai.trim()) {
      toast.error('Vui lòng nhập tên thể loại');
      return;
    }

    setDangLuu(true);
    try {
      if (isEditing && editingItem) {
        await updateTheLoaiAdmin(editingItem.maTheLoai, { tenTheLoai });
        toast.success('Cập nhật thể loại thành công');
      } else {
        await createTheLoaiAdmin({ tenTheLoai });
        toast.success('Thêm thể loại thành công');
      }
      resetForm();
      fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể lưu thể loại';
      toast.error(message);
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h4><i className="fas fa-tags me-2" />Quản lý thể loại</h4>
            <p>Tạo và quản lý thể loại sách</p>
          </div>
          <button className="admin-btn-add" onClick={handleAdd} style={{ background: 'white', color: 'var(--color-text)' }}>
            <i className="fas fa-plus" /> Thêm thể loại
          </button>
        </div>
      </div>

      {showForm && (
        <div className="order-table-wrapper mb-3" style={{ animation: 'fadeInDown var(--anim-normal) var(--ease-out)' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border-light)' }}>
            <h6 className="mb-0" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
              <i className="fas fa-edit me-2" />
              {isEditing ? 'Cập nhật thể loại' : 'Thêm thể loại mới'}
            </h6>
          </div>
          <div style={{ padding: '1.25rem' }}>
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tên thể loại</label>
                  <input className="auth-input" value={tenTheLoai} onChange={(e) => setTenTheLoai(e.target.value)} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Slug</label>
                  <input className="auth-input" value={slugPreview} readOnly placeholder="Tự sinh từ tên thể loại" />
                </div>
                <div className="col-12 d-flex gap-2">
                  <button type="submit" className="btn-modern-primary" disabled={dangLuu}>
                    <i className="fas fa-save" /> {dangLuu ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Thêm mới'}
                  </button>
                  <button type="button" className="btn-modern-outline" onClick={resetForm} disabled={dangLuu}>Hủy</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <span className="spinner-border text-primary" />
          <p className="mt-2" style={{ color: 'var(--color-text-muted)' }}>Đang tải…</p>
        </div>
      ) : danhSach.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><i className="fas fa-tags" /></div>
          <h5>Chưa có thể loại</h5>
          <p>Bấm "Thêm thể loại" để tạo thể loại mới</p>
        </div>
      ) : (
        <div className="order-table-wrapper">
          <div className="table-responsive">
            <table className="order-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên thể loại</th>
                  <th>Slug</th>
                  <th style={{ textAlign: 'center' }}>Số sách</th>
                  <th style={{ textAlign: 'center' }}>Xóa được</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {danhSach.map((item) => (
                  <tr key={item.maTheLoai}>
                    <td><strong style={{ color: 'var(--color-primary)' }}>#{item.maTheLoai}</strong></td>
                    <td style={{ fontWeight: 500 }}>{item.tenTheLoai}</td>
                    <td><code>{item.slug}</code></td>
                    <td style={{ textAlign: 'center' }}>{item.soLuongSach}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-badge ${item.coTheXoa ? 'paid' : 'pending'}`}>
                        {item.coTheXoa ? 'Có' : 'Không'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="d-flex gap-1 justify-content-center">
                        <button className="order-action-btn" title="Chỉnh sửa" onClick={() => handleEdit(item)}>
                          <i className="fas fa-edit" />
                        </button>
                        <button className="order-action-btn" title="Xóa" onClick={() => handleDelete(item)} style={{ color: 'var(--color-danger)' }}>
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TheLoaiList;
