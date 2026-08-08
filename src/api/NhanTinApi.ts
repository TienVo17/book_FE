import { publicRequest } from "./Request";
import { apiUrl } from "./ApiUrl";

/**
 * Bước một của đăng ký nhận tin: ghi địa chỉ ở trạng thái chờ và gửi thư xác thực.
 * Địa chỉ chỉ vào danh sách gửi sau khi chính chủ bấm liên kết trong thư đó.
 *
 * Endpoint công khai — khách chưa đăng nhập vẫn dùng được, nên dùng `publicRequest`
 * chứ không phải `authRequest`.
 *
 * Gọi lại cùng một email là chuyện bình thường và backend trả 200. Nơi gọi không cần
 * xử lý trường hợp trùng.
 */
export async function dangKyNhanTin(email: string): Promise<void> {
  await publicRequest(apiUrl("/api/nhan-tin/dang-ky"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

/** Bước hai: chủ địa chỉ bấm liên kết trong thư xác thực. Khoá dùng một lần rồi bị xoá. */
export async function xacNhanNhanTin(maXacNhan: string): Promise<void> {
  await publicRequest(apiUrl(`/api/nhan-tin/xac-nhan/${encodeURIComponent(maXacNhan)}`), {
    method: "POST",
  });
}

/** Huỷ nhận tin bằng khoá ngẫu nhiên trong liên kết, không phải bằng địa chỉ email. */
export async function huyNhanTin(maHuy: string): Promise<void> {
  await publicRequest(apiUrl(`/api/nhan-tin/huy/${encodeURIComponent(maHuy)}`), {
    method: "POST",
  });
}
