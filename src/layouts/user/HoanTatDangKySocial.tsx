import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { bootstrapAuth } from "../../api/AuthSession";
import {
  guiMaXacMinhEmail,
  hoanTatDangKy,
  layHoSoDangKy,
  SocialSignupError,
  xacMinhEmail,
} from "../../api/SocialAuthApi";

/**
 * Thông điệp theo mã ổn định của backend.
 *
 * Backend cố tình trả mã chứ không trả câu chữ, để phía tấn công không đọc được tài khoản nào
 * tồn tại từ thông điệp. Bảng này là nơi duy nhất dịch mã sang tiếng Việt.
 */
const THONG_DIEP: Record<string, string> = {
  SIGNUP_INTENT_INVALID:
    "Phiên đăng ký đã hết hạn. Vui lòng đăng nhập lại bằng Google hoặc Facebook.",
  USERNAME_REQUIRED: "Vui lòng nhập tên đăng nhập.",
  USERNAME_TAKEN: "Tên đăng nhập này đã có người dùng. Vui lòng chọn tên khác.",
  EMAIL_REQUIRED: "Vui lòng nhập địa chỉ email.",
  EMAIL_TAKEN:
    "Địa chỉ email này đã có tài khoản. Vui lòng đăng nhập bằng mật khẩu để liên kết.",
  EMAIL_NOT_VERIFIED: "Vui lòng xác minh địa chỉ email trước khi hoàn tất.",
  EMAIL_CODE_INVALID: "Mã xác minh không đúng hoặc đã hết hạn. Vui lòng gửi lại mã.",
  IDENTITY_ALREADY_LINKED: "Tài khoản này đã được liên kết trước đó. Vui lòng đăng nhập lại.",
  IDENTITY_RACE: "Có một yêu cầu khác đang xử lý. Vui lòng thử lại.",
  ROLE_UNAVAILABLE: "Hệ thống chưa sẵn sàng tạo tài khoản. Vui lòng thử lại sau.",
};

function thongDiep(loi: unknown): string {
  if (loi instanceof SocialSignupError) {
    return THONG_DIEP[loi.code] ?? "Không thể hoàn tất đăng ký. Vui lòng thử lại.";
  }
  return "Không thể kết nối máy chủ. Vui lòng thử lại.";
}

interface Props {
  readonly tiepTuc: string;
}

const HoanTatDangKySocial: React.FC<Props> = ({ tiepTuc }) => {
  const navigate = useNavigate();
  const [dangTai, setDangTai] = useState(true);
  const [hetHan, setHetHan] = useState(false);
  const [loi, setLoi] = useState("");
  const [dangGui, setDangGui] = useState(false);

  const [tenDangNhap, setTenDangNhap] = useState("");
  const [hoDem, setHoDem] = useState("");
  const [ten, setTen] = useState("");
  const [email, setEmail] = useState("");
  const [ghiNho, setGhiNho] = useState(false);

  const [emailDaXacMinh, setEmailDaXacMinh] = useState(false);
  const [daGuiMa, setDaGuiMa] = useState(false);
  const [ma, setMa] = useState("");

  const conHieuLuc = useRef(true);
  useEffect(() => {
    conHieuLuc.current = true;
    return () => {
      conHieuLuc.current = false;
    };
  }, []);

  useEffect(() => {
    layHoSoDangKy()
      .then((hoSo) => {
        if (!conHieuLuc.current) return;
        setEmail(hoSo.email ?? "");
        setEmailDaXacMinh(hoSo.emailDaXacMinh);
        const phan = (hoSo.tenHienThi ?? "").trim().split(/\s+/).filter(Boolean);
        if (phan.length > 0) {
          setTen(phan[phan.length - 1]);
          setHoDem(phan.slice(0, -1).join(" "));
        }
      })
      .catch((error) => {
        if (!conHieuLuc.current) return;
        setHetHan(true);
        setLoi(thongDiep(error));
      })
      .finally(() => {
        if (conHieuLuc.current) setDangTai(false);
      });
  }, []);

  // Đổi địa chỉ thì bằng chứng cũ không còn giá trị — backend cũng xoá y hệt, nên giao diện
  // phải phản ánh đúng để nút hoàn tất không mở ra trong khi máy chủ sẽ từ chối.
  const doiEmail = useCallback((giaTri: string) => {
    setEmail(giaTri);
    setEmailDaXacMinh(false);
    setDaGuiMa(false);
    setMa("");
  }, []);

  const guiMa = useCallback(async () => {
    setLoi("");
    setDangGui(true);
    try {
      await guiMaXacMinhEmail(email);
      if (conHieuLuc.current) setDaGuiMa(true);
    } catch (error) {
      if (conHieuLuc.current) setLoi(thongDiep(error));
    } finally {
      if (conHieuLuc.current) setDangGui(false);
    }
  }, [email]);

  const xacMinh = useCallback(async () => {
    setLoi("");
    setDangGui(true);
    try {
      await xacMinhEmail(ma);
      if (conHieuLuc.current) setEmailDaXacMinh(true);
    } catch (error) {
      if (conHieuLuc.current) setLoi(thongDiep(error));
    } finally {
      if (conHieuLuc.current) setDangGui(false);
    }
  }, [ma]);

  const guiForm = async (su_kien: React.FormEvent<HTMLFormElement>) => {
    su_kien.preventDefault();
    if (dangGui) return;
    setLoi("");
    setDangGui(true);
    try {
      await hoanTatDangKy({ tenDangNhap, email, hoDem, ten, ghiNho });
      // Hồ sơ đã bị tiêu ở máy chủ; phiên mới nằm trong cookie refresh nên phải bootstrap
      // thì tab này mới có access token dùng được.
      const phien = await bootstrapAuth();
      if (!conHieuLuc.current) return;
      if (phien.status === "authenticated") {
        navigate(tiepTuc, { replace: true });
        return;
      }
      navigate("/dang-nhap", { replace: true });
    } catch (error) {
      if (conHieuLuc.current) {
        setLoi(thongDiep(error));
        setDangGui(false);
      }
    }
  };

  if (dangTai) {
    return (
      <div className="auth-container">
        <div className="auth-card text-center" role="status">
          <div className="spinner-border text-primary" role="presentation" />
          <p className="mt-3">Đang tải thông tin đăng ký…</p>
        </div>
      </div>
    );
  }

  if (hetHan) {
    return (
      <div className="auth-container">
        <div className="auth-card text-center" role="alert">
          <h2>Phiên đăng ký đã hết hạn</h2>
          <p>{loi}</p>
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
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="text-center mb-4">
          <h2>Hoàn tất đăng ký</h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            Chỉ còn một bước nữa là xong.
          </p>
        </div>

        <form onSubmit={guiForm}>
          <div className="mb-3">
            <label htmlFor="tenDangNhap" style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 6, display: "block" }}>
              Tên đăng nhập
            </label>
            <input
              type="text"
              className="auth-input"
              id="tenDangNhap"
              value={tenDangNhap}
              onChange={(e) => setTenDangNhap(e.target.value)}
              required
            />
          </div>

          <div className="d-flex gap-2 mb-3">
            <div style={{ flex: 1 }}>
              <label htmlFor="hoDem" style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 6, display: "block" }}>
                Họ đệm
              </label>
              <input
                type="text"
                className="auth-input"
                id="hoDem"
                value={hoDem}
                onChange={(e) => setHoDem(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="ten" style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 6, display: "block" }}>
                Tên
              </label>
              <input
                type="text"
                className="auth-input"
                id="ten"
                value={ten}
                onChange={(e) => setTen(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="email" style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 6, display: "block" }}>
              Email
            </label>
            <input
              type="email"
              className="auth-input"
              id="email"
              value={email}
              onChange={(e) => doiEmail(e.target.value)}
              required
            />
            {emailDaXacMinh ? (
              <p className="mt-2" style={{ fontSize: "0.85rem", color: "var(--color-success, #16a34a)" }}>
                Địa chỉ này đã được xác minh.
              </p>
            ) : (
              <div className="mt-2">
                {/*
                  Facebook không bao giờ chứng minh được địa chỉ email, nên bước này là bắt
                  buộc ở đó. Google có thể đã xác minh sẵn và bỏ qua được.
                */}
                <button
                  type="button"
                  className="btn-modern-outline-primary"
                  onClick={guiMa}
                  disabled={dangGui || !email}
                >
                  {daGuiMa ? "Gửi lại mã" : "Gửi mã xác minh"}
                </button>
                {daGuiMa && (
                  <div className="d-flex gap-2 mt-2">
                    <input
                      type="text"
                      className="auth-input"
                      aria-label="Mã xác minh"
                      inputMode="numeric"
                      value={ma}
                      onChange={(e) => setMa(e.target.value)}
                      placeholder="Nhập mã 6 số"
                    />
                    <button
                      type="button"
                      className="btn-modern-primary"
                      onClick={xacMinh}
                      disabled={dangGui || !ma}
                    >
                      Xác minh
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <label style={{ fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                 className="mb-4">
            <input
              type="checkbox"
              checked={ghiNho}
              onChange={(e) => setGhiNho(e.target.checked)}
              style={{ accentColor: "var(--color-primary)" }}
            />
            Ghi nhớ
          </label>

          <button
            type="submit"
            className="btn-modern-primary w-100"
            style={{ padding: "0.7rem", justifyContent: "center", fontSize: "0.95rem" }}
            disabled={dangGui || !emailDaXacMinh}
          >
            {dangGui ? "Đang xử lý..." : "Hoàn tất đăng ký"}
          </button>

          {loi && (
            <div
              className="mt-3"
              style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.15)",
                borderRadius: "var(--radius-md)",
                padding: "0.7rem 1rem",
                fontSize: "0.88rem",
                color: "var(--color-danger)",
              }}
              role="alert"
            >
              {loi}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default HoanTatDangKySocial;
