import React, { useEffect, useState } from "react";
import SachModel from "../../../models/SachModel";
import { getSachBanChay } from "../../../api/SachApi";
import SachProps from "./SachProps";

interface KhongCoKetQuaProps {
  thongDiep?: string;
}

/**
 * Trạng thái KHÔNG CÓ KẾT QUẢ — khác với lỗi mạng/máy chủ (xem
 * LoiTaiDuLieu.tsx). Giữ nguyên tiêu đề/bộ lọc của trang cha (không return
 * sớm và cắt mất lối đi tiếp), gợi ý bỏ bớt bộ lọc, và hiện vài cuốn bán chạy
 * để trang không bao giờ là một ngõ cụt.
 */
const KhongCoKetQua: React.FC<KhongCoKetQuaProps> = ({ thongDiep }) => {
  const [sachBanChay, setSachBanChay] = useState<SachModel[]>([]);

  useEffect(() => {
    let conHieuLuc = true;
    getSachBanChay()
      .then((ds) => {
        if (conHieuLuc) {
          setSachBanChay(ds);
        }
      })
      // Gợi ý bán chạy chỉ là phần thêm cho trải nghiệm; lỗi ở đây không
      // được che khuất thông điệp "không có kết quả" chính của trang.
      .catch(() => undefined);

    return () => {
      conHieuLuc = false;
    };
  }, []);

  return (
    <div className="text-center py-5">
      <i
        className="fas fa-book"
        style={{ fontSize: "3rem", color: "var(--color-text-muted)", marginBottom: "1rem", display: "block" }}
        aria-hidden="true"
      ></i>
      <h5 style={{ color: "var(--color-text-secondary)" }}>
        {thongDiep ?? "Không tìm thấy sách phù hợp. Hãy thử bỏ bớt bộ lọc hoặc đổi từ khóa."}
      </h5>
      {sachBanChay.length > 0 && (
        <div className="mt-4">
          <p style={{ color: "var(--color-text-secondary)" }}>Có thể bạn quan tâm:</p>
          <div className="row justify-content-center">
            {sachBanChay.map((sach) => (
              <SachProps key={sach.maSach} sach={sach} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default KhongCoKetQua;
