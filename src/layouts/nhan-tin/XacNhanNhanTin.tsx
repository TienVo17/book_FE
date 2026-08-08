import React from "react";
import { useParams } from "react-router-dom";
import { xacNhanNhanTin } from "../../api/NhanTinApi";
import KetQuaTheoMa from "./KetQuaTheoMa";

/**
 * Bước hai của đăng ký nhận tin: chủ địa chỉ bấm liên kết trong thư xác thực.
 *
 * Chỉ từ đây địa chỉ mới thực sự nằm trong danh sách gửi. Bước này tồn tại vì nếu chỉ cần gõ
 * email vào ô ở footer là vào danh sách thì bất kỳ ai cũng đăng ký hộ người khác được.
 */
const XacNhanNhanTin: React.FC = () => {
  const { maXacNhan } = useParams<{ maXacNhan: string }>();

  return (
    <KetQuaTheoMa
      ma={maXacNhan}
      hanhDong={xacNhanNhanTin}
      nhanDangXuLy="Đang xác nhận đăng ký…"
      tieuDeThanhCong="Đã xác nhận đăng ký nhận tin."
      moTaThanhCong="Cảm ơn bạn. Chúng tôi sẽ gửi sách mới và ưu đãi tới địa chỉ này."
      tieuDeLoi="Không xác nhận được đăng ký"
      loiThieuMa="Liên kết xác nhận không hợp lệ."
    />
  );
};

export default XacNhanNhanTin;
