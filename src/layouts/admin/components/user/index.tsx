import React, { useState, useEffect } from 'react';
import NguoiDungModel from "../../../../models/NguoiDungModel";
import { findAll } from "../../../../api/UserApi";

export default function UserComponent() {
  const [userList, setUserList] = useState<NguoiDungModel[]>([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(true);
  const [baoLoi, setBaoLoi] = useState<string | null>(null);
  const [trangHienTai, setTrangHienTai] = useState(1);
  const [tongSoTrang, setTongSoTrang] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [userId, setUserId] = useState<number>();
  const [nguoiDung, setNguoiDung] = useState<string>();
  const [quyenList, setQuyenList] = useState<any[]>([]);
  const [selectedQuyen, setSelectedQuyen] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    loadQuyenList();
  }, [trangHienTai]);

  const loadData = () => {
    setDangTaiDuLieu(true);
    findAll(trangHienTai - 1)
      .then((kq) => {
        setUserList(kq.ketQua);
        setTongSoTrang(kq.tongSoTrang);
        setDangTaiDuLieu(false);
      })
      .catch((error) => {
        setBaoLoi(error.message);
        setDangTaiDuLieu(false);
      });
  };

  const loadQuyenList = () => {
    fetch("http://localhost:8080/api/admin/quyen/findAll", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem('jwt')}`,
        'Content-Type': 'application/json',
      },
    })
      .then(response => response.json())
      .then(data => setQuyenList(data))
      .catch(error => console.error("Lỗi:", error));
  };

  const handleOpenModal = (user: NguoiDungModel) => {
    setShowModal(true);
    setUserId(user.maNguoiDung);
    setNguoiDung(`${user.hoDem} ${user.ten}`);
    setSelectedQuyen([]);
  };

  const handleClose = () => {
    setShowModal(false);
    setSelectedQuyen([]);
  };

  const handleCheckboxChange = (maQuyen: any) => {
    if (selectedQuyen.includes(maQuyen)) {
      setSelectedQuyen(selectedQuyen.filter((id) => id !== maQuyen));
    } else {
      setSelectedQuyen([...selectedQuyen, maQuyen]);
    }
  };

  const handleSaveQuyen = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/admin/user/phan-quyen", {
        method: "POST",
        body: JSON.stringify({ userId, quyenIds: selectedQuyen }),
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('jwt')}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.status === 200) {
        alert("Phân quyền thành công!");
        setShowModal(false);
      }
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Có lỗi xảy ra!");
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="admin-page-header">
        <h4><i className="fas fa-users me-2" />Quản lý người dùng</h4>
        <p>Quản lý tài khoản và phân quyền người dùng</p>
      </div>

      {/* Table */}
      {dangTaiDuLieu ? (
        <div className="text-center py-5">
          <span className="spinner-border text-primary" />
          <p className="mt-2" style={{ color: 'var(--color-text-muted)' }}>Đang tải…</p>
        </div>
      ) : baoLoi ? (
        <div className="empty-state">
          <div className="empty-state-icon"><i className="fas fa-exclamation-circle" /></div>
          <h5>Có lỗi xảy ra</h5>
          <p>{baoLoi}</p>
        </div>
      ) : userList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><i className="fas fa-users" /></div>
          <h5>Chưa có người dùng</h5>
          <p>Chưa có người dùng nào trong hệ thống</p>
        </div>
      ) : (
        <div className="order-table-wrapper">
          <div className="table-responsive">
            <table className="order-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Họ đệm</th>
                  <th>Tên</th>
                  <th>Email</th>
                  <th>Số điện thoại</th>
                  <th style={{ textAlign: 'center', width: '100px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {userList.map((user) => (
                  <tr key={user.maNguoiDung}>
                    <td>
                      <strong style={{ color: 'var(--color-primary)' }}>#{user.maNguoiDung}</strong>
                    </td>
                    <td style={{ fontWeight: 500 }}>{user.hoDem}</td>
                    <td style={{ fontWeight: 500 }}>{user.ten}</td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        {user.email}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{user.soDienThoai}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="order-action-btn"
                        title="Phân quyền"
                        onClick={() => handleOpenModal(user)}
                      >
                        <i className="fas fa-shield-alt" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {tongSoTrang > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <span className="pagination-info">
            Trang {trangHienTai} / {tongSoTrang}
          </span>
          <div className="pagination-modern">
            <button
              className="page-btn"
              disabled={trangHienTai === 1}
              onClick={() => setTrangHienTai(p => Math.max(1, p - 1))}
            >
              <i className="fas fa-chevron-left" />
            </button>
            {Array.from({ length: Math.min(tongSoTrang, 5) }, (_, i) => {
              const start = Math.max(1, Math.min(trangHienTai - 2, tongSoTrang - 4));
              const pageNum = start + i;
              return (
                <button
                  key={pageNum}
                  className={`page-btn${pageNum === trangHienTai ? ' active' : ''}`}
                  onClick={() => setTrangHienTai(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              className="page-btn"
              disabled={trangHienTai >= tongSoTrang}
              onClick={() => setTrangHienTai(p => Math.min(tongSoTrang, p + 1))}
            >
              <i className="fas fa-chevron-right" />
            </button>
          </div>
        </div>
      )}

      {/* Modern Modal */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={(e) => {
          if ((e.target as HTMLElement).classList.contains('admin-modal-overlay')) handleClose();
        }}>
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h5><i className="fas fa-shield-alt me-2" />Phân quyền cho {nguoiDung}</h5>
              <button className="admin-modal-close" onClick={handleClose}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="admin-modal-body">
              {quyenList.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  Không có quyền nào
                </p>
              ) : (
                quyenList.map((item) => (
                  <label
                    key={item?.maQuyen}
                    className={`role-card ${selectedQuyen.includes(item.maQuyen) ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      value={item.maQuyen}
                      checked={selectedQuyen.includes(item.maQuyen)}
                      onChange={() => handleCheckboxChange(item.maQuyen)}
                    />
                    <span className="role-card-label">{item.tenQuyen}</span>
                  </label>
                ))
              )}
            </div>
            <div className="admin-modal-footer">
              <button className="btn-modern-outline" onClick={handleClose}>
                Hủy
              </button>
              <button className="btn-modern-primary" onClick={handleSaveQuyen}>
                <i className="fas fa-save" /> Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { };