/**
 * Thông tin liên hệ của cửa hàng — một nguồn sự thật duy nhất.
 *
 * Trước đây địa chỉ, hotline và giờ mở cửa chỉ nằm trong `About.tsx`, nên footer không
 * hiển thị được gì cả và trang chính sách sẽ phải chép lại lần thứ ba. Sửa số điện thoại
 * ở đây là đổi trên toàn bộ site.
 */
export const THONG_TIN_CUA_HANG = {
  ten: "BookStore",
  diaChi: "A34/24D3 Quốc lộ 50, xã Bình Hưng, huyện Bình Chánh",
  hotline: "0348972987",
  email: "tienvovan917@gmail.com",
  gioMoCua: "08:00 - 21:00, Thứ 2 - Chủ nhật",
} as const;

/** Dạng `tel:` cần số liền, không dấu cách. */
export const HOTLINE_TEL = `tel:${THONG_TIN_CUA_HANG.hotline.replace(/\s+/g, "")}`;

/**
 * Trang mạng xã hội của cửa hàng.
 *
 * `null` nghĩa là chưa có trang thật và biểu tượng sẽ KHÔNG được hiển thị. Trước đây bốn
 * biểu tượng này trỏ vào trang chủ facebook.com / instagram.com / github.com — tức là đẩy
 * khách ra khỏi site để tới một nơi không liên quan gì đến cửa hàng — còn Twitter là `#!`
 * nên bấm vào không đi đâu cả. Điền URL trang thật vào đây thì biểu tượng tự hiện lại.
 */
export const MANG_XA_HOI: Array<{ ten: string; icon: string; url: string | null }> = [
  { ten: "Facebook", icon: "fab fa-facebook-f", url: null },
  { ten: "Instagram", icon: "fab fa-instagram", url: null },
  { ten: "Github", icon: "fab fa-github", url: null },
];
