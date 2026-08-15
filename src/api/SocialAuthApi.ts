import { apiUrl } from './ApiUrl';
import { publicRequest } from './Request';

export interface SocialProviderStatus {
  readonly google: boolean;
}

const UNAVAILABLE: SocialProviderStatus = Object.freeze({ google: false });

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
    const google = (payload as Record<string, unknown>).google;
    // Chỉ chấp nhận đúng boolean true; "yes" hay 1 đều không phải câu trả lời hợp lệ.
    return Object.freeze({ google: google === true });
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
