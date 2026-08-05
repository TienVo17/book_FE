import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { kichHoat } from '../../api/TaiKhoanApi';

function KichHoatTaiKhoan() {
  const { email, maKichHoat } = useParams<{ email: string; maKichHoat: string }>();
  const [daKichHoat, setDaKichHoat] = useState<boolean>(false);
  const [thongBao, setThongBao] = useState<string>("");

  useEffect(() => {
    if (email && maKichHoat) {
      void thucHienKichHoat(email, maKichHoat);
    }
  }, [email, maKichHoat]);

  const thucHienKichHoat = async (activationEmail: string, activationCode: string) => {
    try {
      await kichHoat(activationEmail, activationCode);
      setDaKichHoat(true);
    } catch (error) {
      setThongBao(error instanceof Error
        ? error.message
        : "Đã xảy ra lỗi khi kết nối. Vui lòng thử lại.");
    }
  };

  return (
    <div>
      <h1>Kích hoạt tài khoản thành công</h1>
      {daKichHoat ? (
        <p>
          Tài khoản đã kích hoạt thành công, bạn hãy đăng nhập để tiếp tục sử
          dụng dịch vụ!
        </p>
      ) : (
        <p>{thongBao}</p>
      )}
    </div>
  );
}

export default KichHoatTaiKhoan;
