/**
 * Dashboard quản trị, khai theo đúng những gì backend thật sự trả về.
 *
 * Bản trước khai `tongDoanhThu`, `donHangHomNay`, `doanhThuHomNay`, `tongDonHang`,
 * `soBinhLuanChoXet` và `topSachBanChay` — không tên nào có trong response của
 * `GET /api/admin/thong-ke`. `authRequest<T>` chỉ ép kiểu, không kiểm tra, nên mọi
 * trường về `undefined` trong im lặng: dashboard hiện 0đ và bảng rỗng ngay cả khi
 * hệ thống có doanh thu. `soBinhLuanChoXet` còn không có nguồn nào cả — hệ thống
 * kiểm duyệt chỉ có HIEN_THI/DA_AN, không có hàng đợi "chờ xét".
 *
 * `AdminApi.getThongKe` ánh xạ từ tên backend sang đây và kiểm tra lúc chạy, nên
 * lần đổi contract tiếp theo sẽ báo lỗi thay vì hiện số 0.
 */
export interface TopSachBanChay {
  maSach: number;
  tenSach: string;
  soLuongBan: number;
}

export interface ThongKeModel {
  /** Đã loại đơn demo của V12 — xem DonHangRepository.demDonThat. */
  tongDonHang: number;
  tongDoanhThu: number;
  donHangHomNay: number;
  doanhThuHomNay: number;
  tongNguoiDung: number;
  /** Đơn có trạng thái giao hàng = 0, tức chưa giao. */
  donChoXuLy: number;
  topSachBanChay: TopSachBanChay[];
}
