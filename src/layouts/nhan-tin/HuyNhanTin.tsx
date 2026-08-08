import React, { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { huyNhanTin } from "../../api/NhanTinApi";

type TrangThai = "dang-xu-ly" | "thanh-cong" | "that-bai";

/**
 * Trang đích của liên kết huỷ nhận tin.
 *
 * Huỷ ngay khi mở trang thay vì bắt bấm thêm một nút: người đã bấm "huỷ nhận tin" trong
 * email là đã nêu rõ ý định, buộc họ xác nhận lần nữa chỉ làm việc rời bỏ khó hơn cần thiết.
 */
const HuyNhanTin: React.FC = () => {
  const { maHuy } = useParams<{ maHuy: string }>();
  const [trangThai, setTrangThai] = useState<TrangThai>("dang-xu-ly");
  const [thongDiep, setThongDiep] = useState("");

  useEffect(() => {
    let conHieuLuc = true;
    if (!maHuy) {
      setTrangThai("that-bai");
      setThongDiep("Liên kết huỷ đăng ký không hợp lệ.");
      return;
    }
    huyNhanTin(maHuy)
      .then(() => {
        if (conHieuLuc) setTrangThai("thanh-cong");
      })
      .catch((loi) => {
        if (!conHieuLuc) return;
        setTrangThai("that-bai");
        setThongDiep(loi instanceof Error ? loi.message : "Không thể huỷ đăng ký.");
      });
    return () => {
      conHieuLuc = false;
    };
  }, [maHuy]);

  return (
    <div className="container py-5">
      <div className="text-center py-5" role="status" aria-live="polite">
        {trangThai === "dang-xu-ly" && (
          <>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Đang xử lý...</span>
            </div>
            <h5 className="mt-3" style={{ color: "var(--color-text-secondary)" }}>
              Đang huỷ đăng ký nhận tin…
            </h5>
          </>
        )}

        {trangThai === "thanh-cong" && (
          <>
            <i
              className="fas fa-circle-check"
              style={{ fontSize: "3rem", color: "var(--color-success, #16a34a)", marginBottom: "1rem", display: "block" }}
            />
            <h5>Đã huỷ đăng ký nhận tin.</h5>
            <p style={{ color: "var(--color-text-secondary)" }}>
              Bạn sẽ không nhận thêm email khuyến mãi từ chúng tôi nữa.
            </p>
          </>
        )}

        {trangThai === "that-bai" && (
          <>
            <i
              className="fas fa-circle-exclamation"
              style={{ fontSize: "3rem", color: "var(--color-danger, #dc2626)", marginBottom: "1rem", display: "block" }}
            />
            <h5>Không huỷ được đăng ký</h5>
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

export default HuyNhanTin;
