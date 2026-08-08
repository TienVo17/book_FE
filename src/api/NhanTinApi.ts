import { publicRequest } from "./Request";
import { apiUrl } from "./ApiUrl";

/**
 * Đăng ký nhận tin. Endpoint công khai — khách chưa đăng nhập vẫn dùng được, nên dùng
 * `publicRequest` chứ không phải `authRequest`.
 *
 * Gọi lại cùng một email là chuyện bình thường và backend trả 200: người dùng chỉ muốn
 * nhận tin, và kết quả đó đã đạt được. Nơi gọi không cần xử lý trường hợp trùng.
 */
export async function dangKyNhanTin(email: string): Promise<void> {
  await publicRequest(apiUrl("/api/nhan-tin/dang-ky"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

/** Huỷ nhận tin bằng khoá ngẫu nhiên trong liên kết, không phải bằng địa chỉ email. */
export async function huyNhanTin(maHuy: string): Promise<void> {
  await publicRequest(apiUrl(`/api/nhan-tin/huy/${encodeURIComponent(maHuy)}`), {
    method: "POST",
  });
}
