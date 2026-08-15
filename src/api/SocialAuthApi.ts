import { apiUrl } from './ApiUrl';
import { publicRequest } from './Request';

export interface SocialProviderStatus {
  readonly google: boolean;
  readonly facebook: boolean;
}

const UNAVAILABLE: SocialProviderStatus = Object.freeze({ google: false, facebook: false });

/**
 * Hỏi backend provider nào đang bật.
 *
 * Đi qua `publicRequest` như mọi lời gọi API khác, để phân tích lỗi và trace-id chỉ nằm ở
 * một chỗ duy nhất.
 *
 * Mọi thất bại đều quy về "không khả dụng": hiện nút dẫn tới một endpoint đang trả 404 thì
 * với người dùng chỉ là một nút hỏng, tệ hơn hẳn so với không hiện nút nào.
 */
export async function getSocialProviderStatus(): Promise<SocialProviderStatus> {
  try {
    const payload = await publicRequest<unknown>(apiUrl('/tai-khoan/oauth/trang-thai'));
    if (!payload || typeof payload !== 'object') {
      return UNAVAILABLE;
    }
    const status = payload as Record<string, unknown>;
    // Chỉ chấp nhận đúng boolean true; "yes" hay 1 đều không phải câu trả lời hợp lệ.
    // Mỗi provider đọc riêng: backend cũ chưa biết Facebook sẽ thiếu hẳn trường đó.
    return Object.freeze({
      google: status.google === true,
      facebook: status.facebook === true,
    });
  } catch {
    return UNAVAILABLE;
  }
}

/**
 * Đăng nhập bắt đầu bằng điều hướng cả trang, không phải fetch: trình duyệt phải đi theo
 * redirect sang Google và mang theo cookie binding mà backend đặt. Một fetch sẽ bị chặn bởi
 * CORS và cũng không đưa người dùng tới màn hình đồng ý của Google.
 */
export function googleLoginUrl(): string {
  return apiUrl('/tai-khoan/oauth/google/start');
}

export function facebookLoginUrl(): string {
  return apiUrl('/tai-khoan/oauth/facebook/start');
}
