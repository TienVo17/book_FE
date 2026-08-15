import {
  themAnhDanhGia,
  thongDiepLoiAnhDanhGia,
} from "./DanhGiaAPI";
import { ApiRequestError } from "./Request";

jest.mock("./AuthSession", () => ({
  __esModule: true,
  captureAuthenticatedRequest: () => ({ accessToken: "test-access-token", revision: 1 }),
  isCurrentAuthCapture: () => true,
  refreshForRequest: () => Promise.resolve(false),
  invalidateAuthCapture: () => false,
}));

describe("DanhGiaAPI — ảnh đánh giá", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ maHinhAnh: 10, urlHinh: "https://cdn.example/1.jpg" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
  });

  afterEach(() => {
    localStorage.clear();
    global.fetch = originalFetch;
  });

  it("gửi đúng multipart key tep và để trình duyệt đặt content type", async () => {
    const tep = new File(["jpeg"], "bia.jpg", { type: "image/jpeg" });

    await themAnhDanhGia(99, tep, "review-image-key-1");

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit
    ];
    const form = options.body as FormData;
    expect(url).toBe("http://localhost:8080/api/danh-gia/99/hinh-anh");
    expect(options.method).toBe("POST");
    expect(form).toBeInstanceOf(FormData);
    expect(form.get("tep")).toBe(tep);
    expect(new Headers(options.headers).get("Idempotency-Key")).toBe("review-image-key-1");
    expect(new Headers(options.headers).has("Content-Type")).toBe(false);
  });

  it.each([
    ["REVIEW_IMAGE_TOO_MANY", "Mỗi đánh giá tối đa 5 ảnh."],
    ["REVIEW_IMAGE_TOO_LARGE", "Mỗi ảnh phải có dung lượng không quá 5MB."],
    ["FILE_TOO_LARGE", "Mỗi ảnh phải có dung lượng không quá 5MB."],
    ["REVIEW_IMAGE_UNSUPPORTED_TYPE", "Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP."],
    ["REVIEW_IMAGE_EMPTY", "Ảnh đã chọn không có dữ liệu. Vui lòng chọn ảnh khác."],
    ["REVIEW_IMAGE_QUOTA_EXCEEDED", "Bạn đã dùng hết hạn ngạch ảnh đánh giá."],
    ["RATE_LIMITED", "Bạn tải ảnh quá nhanh. Vui lòng thử lại sau ít phút."],
    [
      "STORAGE_NOT_CONFIGURED",
      "Hệ thống chưa cấu hình lưu ảnh. Đánh giá chữ đã được lưu; vui lòng thử tải ảnh sau.",
    ],
  ])("đổi mã lỗi %s thành thông báo có thể hành động", (code, message) => {
    const error = new ApiRequestError("backend message", 400, code);

    expect(thongDiepLoiAnhDanhGia(error)).toBe(message);
  });
});
