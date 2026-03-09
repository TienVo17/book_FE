export async function my_request<T = unknown>(duongDan: string): Promise<T> {
  const response = await fetch(duongDan);
  if (!response.ok) {
    throw new Error(`Không thể truy cập ${duongDan}`);
  }
  const data = await response.json();
  return data as T;
}

interface JwtPayload {
  exp?: number;
  isAdmin?: boolean;
  isStaff?: boolean;
  isUser?: boolean;
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

export async function authRequest<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getValidJwtOrThrow();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, { ...options, headers });
  const body = await parseResponseBody(response);

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearAuth();
    }
    throw new Error(getApiMessage(body, `Request failed: ${response.status}`));
  }

  return body as T;
}
