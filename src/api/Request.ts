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

export function getApiMessage(body: unknown, fallback: string): string {
  if (typeof body === 'string') {
    return body.trim() || fallback;
  }

  if (body && typeof body === 'object') {
    const payload = body as Record<string, unknown>;
    const directMessage = payload.message ?? payload.thongBao ?? payload.noiDung;

    if (typeof directMessage === 'string' && directMessage.trim()) {
      return directMessage.trim();
    }

    for (const value of Object.values(payload)) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
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
