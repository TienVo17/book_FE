import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { bootstrapAuth } from "../../api/AuthSession";
import HoanTatDangKySocial from "./HoanTatDangKySocial";

/**
 * Các đường quay về được phép sau khi đăng nhập qua provider.
 *
 * Backend đã lọc một lần, nhưng frontend không được tin tham số query: một URL tuyệt đối ở
 * đây sẽ thành open redirect phía client. Danh sách cho phép sai về phía từ chối.
 */
const DUONG_CHO_PHEP = new Set([
  "/",
  "/gio-hang",
  "/thanh-toan",
  "/profile",
  "/yeu-thich",
  "/order",
]);

function duongQuayVeAnToan(giaTri: string | null): string {
  if (!giaTri || !giaTri.startsWith("/") || giaTri.startsWith("//")) {
    return "/";
  }
  const duong = giaTri.split("?")[0].split("#")[0];
  return DUONG_CHO_PHEP.has(duong) ? duong : "/";
}

const KetQuaDangNhapSocial: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [thatBai, setThatBai] = useState(false);

  const ketQua = searchParams.get("ket-qua");
  const tiepTuc = duongQuayVeAnToan(searchParams.get("tiep-tuc"));

  useEffect(() => {
    if (ketQua !== "thanh-cong") {
      return;
    }
    let conHieuLuc = true;
    // Callback chỉ nói rằng đăng nhập đã thành công; access token nằm trong bộ nhớ và tab
    // này chưa có. Bootstrap mới biến cookie refresh thành một phiên dùng được.
    bootstrapAuth()
      .then((phien) => {
        if (!conHieuLuc) return;
        if (phien.status === "authenticated") {
          navigate(tiepTuc, { replace: true });
        } else {
          setThatBai(true);
        }
      })
      .catch(() => {
        if (conHieuLuc) setThatBai(true);
      });
    return () => {
      conHieuLuc = false;
    };
  }, [ketQua, tiepTuc, navigate]);

  if (ketQua === "can-dang-ky") {
    // Form nằm ngay tại route này chứ không phải một route riêng: mọi đường dưới
    // `/tai-khoan/` đều bị rewrite sang backend, chỉ `ket-qua` có ngoại lệ. Thêm route mới
    // mà quên thêm ngoại lệ là người dùng rơi vào trang lỗi của backend.
    return <HoanTatDangKySocial tiepTuc={tiepTuc} />;
  }

  if (ketQua === "can-lien-ket") {
    return (
      <div className="auth-container">
        <div className="auth-card text-center" role="status">
          <h2>Email này đã có tài khoản</h2>
          {/*
            Không bao giờ tự động liên kết theo email: ai lập được một tài khoản Google mang
            địa chỉ này sẽ chiếm được đơn hàng của người khác. Phải đăng nhập bằng mật khẩu
            để chứng minh quyền sở hữu trước.
          */}
          <p>
            Địa chỉ email này đã có tài khoản. Vui lòng đăng nhập bằng mật khẩu để xác nhận
            đây là bạn, sau đó liên kết với Google.
          </p>
          <button
            type="button"
            className="btn-modern-primary mt-3"
            onClick={() => navigate("/dang-nhap")}
          >
            Đăng nhập bằng mật khẩu
          </button>
        </div>
      </div>
    );
  }

  if (ketQua === "thanh-cong" && !thatBai) {
    return (
      <div className="auth-container">
        <div className="auth-card text-center" role="status">
          <div className="spinner-border text-primary" role="presentation" />
          <p className="mt-3">Đang hoàn tất đăng nhập…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card text-center" role="alert">
        <h2>Không thể đăng nhập</h2>
        {/* Thông điệp chung: lý do chi tiết nằm ở log máy chủ, không nói cho phía tấn công. */}
        <p>Đăng nhập bằng Google chưa hoàn tất. Vui lòng thử lại.</p>
        <button
          type="button"
          className="btn-modern-primary mt-3"
          onClick={() => navigate("/dang-nhap")}
        >
          Quay lại đăng nhập
        </button>
      </div>
    </div>
  );
};

export default KetQuaDangNhapSocial;
