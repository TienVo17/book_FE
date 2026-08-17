import { apiUrl } from './ApiUrl';
import { getPreSessionResource, postPreSessionMutation } from './AuthSession';
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

export interface HoSoDangKy {
  readonly provider: string;
  readonly email: string | null;
  readonly emailDaXacMinh: boolean;
  readonly tenHienThi: string | null;
}

export interface HoanTatDangKyInput {
  readonly tenDangNhap: string;
  readonly email: string;
  readonly hoDem: string;
  readonly ten: string;
  readonly ghiNho: boolean;
}

/**
 * Lỗi mang theo mã ổn định của backend để giao diện chọn đúng câu thông báo, thay vì so khớp
 * chuỗi tiếng Việt — chuỗi đó đổi lúc nào cũng được mà không ai coi là đổi hợp đồng.
 */
export class SocialSignupError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = 'SocialSignupError';
    this.code = code;
  }
}

function maLoi(body: unknown): string {
  const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  return typeof payload?.code === 'string' ? payload.code : 'SIGNUP_INTENT_INVALID';
}

/** Hồ sơ đang dở nhận dạng bằng cookie `__Host-oauth-intent`, không phải bằng tham số URL. */
export async function layHoSoDangKy(): Promise<HoSoDangKy> {
  const result = await getPreSessionResource('/tai-khoan/oauth/dang-ky-cho');
  if (!result.ok) {
    throw new SocialSignupError(maLoi(result.body));
  }
  const payload = (result.body ?? {}) as Record<string, unknown>;
  return {
    provider: typeof payload.provider === 'string' ? payload.provider : '',
    email: typeof payload.email === 'string' ? payload.email : null,
    emailDaXacMinh: payload.emailDaXacMinh === true,
    tenHienThi: typeof payload.tenHienThi === 'string' ? payload.tenHienThi : null,
  };
}

export async function guiMaXacMinhEmail(email: string): Promise<void> {
  const result = await postPreSessionMutation('/tai-khoan/oauth/gui-ma-xac-minh-email', { email });
  if (!result.ok) {
    throw new SocialSignupError(maLoi(result.body));
  }
}

export async function xacMinhEmail(ma: string): Promise<void> {
  const result = await postPreSessionMutation('/tai-khoan/oauth/xac-minh-email', { ma });
  if (!result.ok) {
    throw new SocialSignupError(maLoi(result.body));
  }
}

export async function hoanTatDangKy(input: HoanTatDangKyInput): Promise<void> {
  const result = await postPreSessionMutation('/tai-khoan/oauth/hoan-tat-dang-ky', input);
  if (!result.ok) {
    throw new SocialSignupError(maLoi(result.body));
  }
}
