export async function my_request(duongDan: string) {
  const response = await fetch(duongDan);
  if (!response.ok) {
    throw new Error(`Không thể truy cập ${duongDan}`);
  }
  return response.json();
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
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
}

function clearAuth() {
  localStorage.removeItem('jwt');
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

export async function authRequest(url: string, options: RequestInit = {}) {
  const token = getValidJwtOrThrow();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 401 || response.status === 403) {
      clearAuth();
    }
    throw new Error(errorText || `Request failed: ${response.status}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}