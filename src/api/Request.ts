export async function my_request<T = unknown>(duongDan: string): Promise<T> {
  return publicRequest<T>(duongDan);
}

interface JwtPayload {
  exp?: number;
  isAdmin?: boolean;
  isStaff?: boolean;
  isUser?: boolean;
  sub?: string;
}

function parseJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) {
      return null;
    }
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function clearAuth() {
  localStorage.removeItem('jwt');
}

function parseJsonSafely(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Do dai toi da cua thong bao duoc phep hien thi. Stack trace va dump noi bo deu dai hon
 * nhieu, nen gioi han nay chan chung ngay ca khi lot qua cac kiem tra khac.
 */
const MAX_MESSAGE_LENGTH = 200;

/** Dau hieu cua chi tiet ky thuat noi bo — khong bao gio hien thi cho nguoi dung cuoi. */
const INTERNAL_DETAIL_PATTERN =
  /(\bat\s+[\w.$]+\([\w.]+:\d+\)|Exception|Throwable|SQLSTATE|java\.|org\.springframework|com\.example|jdbc:|SELECT\s|INSERT\s|UPDATE\s|\bstack\b)/i;

function isSafeToDisplay(message: string): boolean {
  return (
    message.length > 0 &&
    message.length <= MAX_MESSAGE_LENGTH &&
    !message.includes('\n') &&
    !INTERNAL_DETAIL_PATTERN.test(message)
  );
}

/**
 * Chi lay thong bao tu truong `message` cua hop dong ApiError ma backend cam ket, va chi khi
 * no khong chua chi tiet ky thuat.
 *
 * Truoc day ham nay duyet moi gia tri chuoi trong response va hien thi cai dau tien tim duoc.
 * Neu backend (hoac mot proxy/WAF phia truoc) tra ve stack trace hay thong tin noi bo, no se
 * duoc in thang len man hinh nguoi dung. Mo rong be mat lo thong tin nay khong doi lai duoc
 * loi ich nao — nguoi dung khong lam gi duoc voi mot stack trace.
 */
export function getApiMessage(body: unknown, fallback: string): string {
  if (typeof body === 'string') {
    const trimmed = body.trim();
    return isSafeToDisplay(trimmed) ? trimmed : fallback;
  }

  if (body && typeof body === 'object') {
    const payload = body as Record<string, unknown>;
    const directMessage = payload.message ?? payload.thongBao ?? payload.noiDung;

    if (typeof directMessage === 'string') {
      const trimmed = directMessage.trim();
      if (isSafeToDisplay(trimmed)) {
        return trimmed;
      }
    }
  }

  return fallback;
}

export async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  return parseJsonSafely(text);
}

export function getJwtPayload(token: string | null): JwtPayload | null {
  if (!token) {
    return null;
  }
  return parseJwt(token);
}

export function getValidJwtOrThrow(): string {
  const token = localStorage.getItem('jwt');
  if (!token) {
    throw new Error('Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại.');
  }

  const payload = parseJwt(token);
  if (!payload?.exp || payload.exp * 1000 <= Date.now()) {
    clearAuth();
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  return token;
}

interface ApiErrorPayload {
  status?: number;
  code?: string;
  message?: string;
  path?: string;
  traceId?: string;
}

function toApiError(response: Response, body: unknown, fallback: string): ApiRequestError {
  const payload = body && typeof body === 'object' ? body as ApiErrorPayload : {};
  const responseTraceId = response.headers.get('X-Trace-Id') || undefined;
  return new ApiRequestError(
    getApiMessage(body, fallback),
    response.status,
    typeof payload.code === 'string' ? payload.code : undefined,
    typeof payload.traceId === 'string' ? payload.traceId : responseTraceId,
    typeof payload.path === 'string' ? payload.path : undefined,
  );
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly traceId?: string,
    public readonly path?: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export async function publicRequest<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, options);
  const body = await parseResponseBody(response);
  if (!response.ok) {
    throw toApiError(response, body, `Không thể truy cập ${url}`);
  }
  return body as T;
}

export async function authRequest<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getValidJwtOrThrow();
  const headers = new Headers(options.headers);
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, { ...options, headers });
  const body = await parseResponseBody(response);

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearAuth();
    }
    throw toApiError(response, body, `Request failed: ${response.status}`);
  }

  return body as T;
}
