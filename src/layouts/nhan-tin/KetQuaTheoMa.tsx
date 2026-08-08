import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

type TrangThai = "dang-xu-ly" | "thanh-cong" | "that-bai";

interface KetQuaTheoMaProps {
  ma: string | undefined;
  /** Gọi tới backend với khoá trong URL. */
  hanhDong: (ma: string) => Promise<void>;
  nhanDangXuLy: string;
  tieuDeThanhCong: string;
  moTaThanhCong: string;
  tieuDeLoi: string;
  loiThieuMa: string;
}

/**
 * Khung chung cho hai trang đích của liên kết trong email: xác nhận nhận tin và huỷ nhận tin.
 *
 * Cả hai làm đúng một việc — gọi backend với khoá trong URL ngay khi mở trang rồi báo kết quả —
 * nên tách ra một chỗ thay vì nuôi hai bản gần giống nhau.
 *
 * Chạy ngay khi mở trang chứ không bắt bấm thêm một nút: người đã bấm liên kết trong thư là đã
 * nêu rõ ý định, buộc xác nhận lần nữa chỉ làm việc rời bỏ khó hơn cần thiết.
 */
const KetQuaTheoMa: React.FC<KetQuaTheoMaProps> = ({
  ma,
  hanhDong,
  nhanDangXuLy,
  tieuDeThanhCong,
  moTaThanhCong,
  tieuDeLoi,
  loiThieuMa,
}) => {
  const [trangThai, setTrangThai] = useState<TrangThai>("dang-xu-ly");
  const [thongDiep, setThongDiep] = useState("");

  useEffect(() => {
    let conHieuLuc = true;
    if (!ma) {
      setTrangThai("that-bai");
      setThongDiep(loiThieuMa);
      return;
    }
    hanhDong(ma)
      .then(() => {
        if (conHieuLuc) setTrangThai("thanh-cong");
      })
      .catch((loi) => {
        if (!conHieuLuc) return;
        setTrangThai("that-bai");
        setThongDiep(loi instanceof Error ? loi.message : tieuDeLoi);
      });
    return () => {
      conHieuLuc = false;
    };
    // `hanhDong` là hàm ổn định do nơi gọi truyền vào; đưa nó vào deps sẽ gọi lại
    // mỗi lần component vẽ lại nếu nơi gọi lỡ tạo hàm mới mỗi lần.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ma]);

  return (
    <div className="container py-5">
      <div className="text-center py-5" role="status" aria-live="polite">
        {trangThai === "dang-xu-ly" && (
          <>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Đang xử lý...</span>
            </div>
            <h5 className="mt-3" style={{ color: "var(--color-text-secondary)" }}>{nhanDangXuLy}</h5>
          </>
        )}

        {trangThai === "thanh-cong" && (
          <>
            <i
              className="fas fa-circle-check"
              style={{ fontSize: "3rem", color: "var(--color-success, #16a34a)", marginBottom: "1rem", display: "block" }}
            />
            <h5>{tieuDeThanhCong}</h5>
            <p style={{ color: "var(--color-text-secondary)" }}>{moTaThanhCong}</p>
          </>
        )}

        {trangThai === "that-bai" && (
          <>
            <i
              className="fas fa-circle-exclamation"
              style={{ fontSize: "3rem", color: "var(--color-danger, #dc2626)", marginBottom: "1rem", display: "block" }}
            />
            <h5>{tieuDeLoi}</h5>
            <p style={{ color: "var(--color-text-secondary)" }}>{thongDiep}</p>
          </>
        )}

        <NavLink to="/" className="btn-modern-outline-primary mt-3 d-inline-block">
          Về trang chủ
        </NavLink>
      </div>
    </div>
  );
};

export default KetQuaTheoMa;
