import React from "react";

interface LoiTaiDuLieuProps {
  thongBao?: string;
  onThuLai: () => void;
}

/**
 * Trạng thái LỖI MẠNG/MÁY CHỦ thực sự — khác với "không có kết quả" (xem
 * KhongCoKetQua.tsx). Trộn hai trạng thái này từng khiến người dùng đứng
 * trước một danh sách rỗng không rõ nguyên nhân và không có lối đi tiếp.
 */
const LoiTaiDuLieu: React.FC<LoiTaiDuLieuProps> = ({ thongBao, onThuLai }) => (
  <div className="text-center py-5">
    <i
      className="fas fa-triangle-exclamation"
      style={{ fontSize: "3rem", color: "var(--color-danger)", marginBottom: "1rem", display: "block" }}
      aria-hidden="true"
    ></i>
    <h5 style={{ color: "var(--color-text-secondary)" }}>
      {thongBao ?? "Không thể tải dữ liệu. Vui lòng kiểm tra kết nối và thử lại."}
    </h5>
    <button type="button" className="btn-modern-primary mt-3" onClick={onThuLai}>
      Thử lại
    </button>
  </div>
);

export default LoiTaiDuLieu;
