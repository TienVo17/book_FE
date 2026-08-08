import React from "react";
import { useParams } from "react-router-dom";
import { huyNhanTin } from "../../api/NhanTinApi";
import KetQuaTheoMa from "./KetQuaTheoMa";

/** Trang đích của liên kết huỷ nhận tin trong email. */
const HuyNhanTin: React.FC = () => {
  const { maHuy } = useParams<{ maHuy: string }>();

  return (
    <KetQuaTheoMa
      ma={maHuy}
      hanhDong={huyNhanTin}
      nhanDangXuLy="Đang huỷ đăng ký nhận tin…"
      tieuDeThanhCong="Đã huỷ đăng ký nhận tin."
      moTaThanhCong="Bạn sẽ không nhận thêm email khuyến mãi từ chúng tôi nữa."
      tieuDeLoi="Không huỷ được đăng ký"
      loiThieuMa="Liên kết huỷ đăng ký không hợp lệ."
    />
  );
};

export default HuyNhanTin;
