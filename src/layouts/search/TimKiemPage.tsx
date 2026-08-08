import React from "react";
import { useSearchParams } from "react-router-dom";
import DanhSachCoBoLoc from "../products/DanhSachCoBoLoc";

/**
 * Trang kết quả tìm kiếm với URL là nguồn sự thật duy nhất
 * (?q=&maTheLoai=&sort=&giaMin=&giaMax=&page=). Mở trực tiếp bằng URL (F5,
 * chia sẻ link, nút Back) phải tải đúng kết quả đang xem — đây chính là điều
 * ô tìm kiếm cũ (sống trong state của App.tsx) không làm được.
 *
 * Phần lọc và danh sách nằm ở `DanhSachCoBoLoc` để trang thể loại dùng chung
 * đúng bộ công cụ, thay vì có hai bản sẽ lệch nhau dần.
 */
function TimKiemPage() {
  const [searchParams] = useSearchParams();
  const tuKhoa = (searchParams.get("q") ?? "").trim();
  const tieuDe = tuKhoa ? `Kết quả tìm kiếm cho "${tuKhoa}"` : "Tìm kiếm sách";

  return (
    <div className="container py-4">
      <div className="section-header">
        <h2>{tieuDe}</h2>
      </div>
      <DanhSachCoBoLoc />
    </div>
  );
}

export default TimKiemPage;
