import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiUrl } from '../../api/ApiUrl';

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
      const query = new URLSearchParams({ email: activationEmail, maKichHoat: activationCode });
      const url = apiUrl(`/tai-khoan/kich-hoat?${query.toString()}`);
      const response = await fetch(url, { method: "GET" });

      if (response.ok) {
        setDaKichHoat(true);
      } else {
        const message = await response.text();
        setThongBao(message || "Kích hoạt thất bại. Vui lòng thử lại.");
      }
    } catch (error) {
      console.log("Lỗi khi kích hoạt: ", error);
      setThongBao("Đã xảy ra lỗi khi kết nối. Vui lòng thử lại.");
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
