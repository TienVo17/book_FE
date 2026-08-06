import React, { useState } from "react";
import { doiBinhChonHuuIch } from "../../../api/DanhGiaAPI";

interface NutHuuIchProps {
  maDanhGia: number;
  soLuot: number;
  daBinhChon: boolean;
  /** Ẩn nút với chính chủ bài viết. Backend vẫn chặn, đây chỉ là chuyện giao diện. */
  laCuaToi: boolean;
  daDangNhap: boolean;
  onLoi: (thongDiep: string) => void;
}

/**
 * Bấm lần hai là gỡ bình chọn, như nút thích ở mọi nơi khác.
 *
 * Cập nhật lạc quan để nút phản hồi ngay, nhưng lấy con số cuối cùng từ response — nếu
 * chỉ cộng thêm một ở client, hai tab mở song song sẽ dần lệch nhau.
 */
const NutHuuIch: React.FC<NutHuuIchProps> = ({
  maDanhGia,
  soLuot,
  daBinhChon,
  laCuaToi,
  daDangNhap,
  onLoi,
}) => {
  const [soLuotHienTai, setSoLuotHienTai] = useState(soLuot);
  const [daBam, setDaBam] = useState(daBinhChon);
  const [dangGui, setDangGui] = useState(false);

  if (laCuaToi) {
    return (
      <span className="text-muted small">
        {soLuotHienTai > 0 ? `${soLuotHienTai} người thấy hữu ích` : ""}
      </span>
    );
  }

  const bam = async () => {
    if (dangGui) return;
    setDangGui(true);
    try {
      const ketQua = await doiBinhChonHuuIch(maDanhGia);
      setSoLuotHienTai(ketQua.soLuotHuuIch);
      setDaBam(!daBam);
    } catch (error) {
      onLoi(error instanceof Error ? error.message : "Không thể bình chọn lúc này.");
    } finally {
      setDangGui(false);
    }
  };

  return (
    <button
      type="button"
      className={`btn btn-sm ${daBam ? "btn-primary" : "btn-outline-secondary"}`}
      style={{ minHeight: "2rem" }}
      disabled={dangGui || !daDangNhap}
      aria-pressed={daBam}
      title={daDangNhap ? undefined : "Đăng nhập để bình chọn"}
      onClick={bam}
    >
      <i className="far fa-thumbs-up me-1" aria-hidden="true" />
      Hữu ích{soLuotHienTai > 0 ? ` (${soLuotHienTai})` : ""}
    </button>
  );
};

export default NutHuuIch;
