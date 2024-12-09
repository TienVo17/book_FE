import { useEffect, useState } from "react";

function KichHoatTaiKhoan() {
  const [email, setEmail] = useState<string>("");
  const [maKichHoat, setMaKichHoat] = useState<string>("");
  const [daKichHoat, setDaKichHoat] = useState<boolean>(false);
  const [thongBao, setThongBao] = useState<string>("");

  useEffect(() => {
    // Lấy các tham số từ URL
    const queryParams = new URLSearchParams(window.location.search);
    const emailFromUrl = queryParams.get("email");
    const maKichHoatFromUrl = queryParams.get("maKichHoat");

    if (emailFromUrl && maKichHoatFromUrl) {
      setEmail(emailFromUrl);
      setMaKichHoat(maKichHoatFromUrl);
      thucHienKichHoat(emailFromUrl, maKichHoatFromUrl);
    }
  }, []);

  const thucHienKichHoat = async (email: string, maKichHoat: string) => {
    try {
      const url = `http://localhost:8080/tai-khoan/kich-hoat?email=${email}&maKichHoat=${maKichHoat}`;
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
