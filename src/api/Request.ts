import {
  captureAuthenticatedRequest,
  invalidateAuthCapture,
  isCurrentAuthCapture,
  refreshForRequest,
  type AuthenticatedRequestCapture,
} from './AuthSession';
import { apiUrl } from './ApiUrl';

export async function my_request<T = unknown>(duongDan: string): Promise<T> {
  return publicRequest<T>(duongDan);
}

function parseJsonSafely(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

const MAX_MESSAGE_LENGTH = 200;
const REQUEST_TIMEOUT_MS = 15_000;
const INTERNAL_DETAIL_PATTERN =
  /(\bat\s+[\w.$]+\([\w.]+:\d+\)|Exception|Throwable|SQLSTATE|java\.|org\.springframework|com\.example|jdbc:|SELECT\s|INSERT\s|UPDATE\s|\bstack\b)/i;

function isSafeToDisplay(message: string): boolean {
  return message.length > 0 && message.length <= MAX_MESSAGE_LENGTH &&
    !message.includes('\n') && !INTERNAL_DETAIL_PATTERN.test(message);
}

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
  return text ? parseJsonSafely(text) : null;
}

async function fetchWithBody(
  url: string,
  options: RequestInit,
): Promise<{ readonly response: Response; readonly body: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortParent = () => controller.abort();
  if (options.signal?.aborted) {
    controller.abort();
  } else {
    options.signal?.addEventListener('abort', abortParent, { once: true });
  }
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return {
      response,
      body: await parseResponseBody(response),
    };
  } catch (error) {
    if (controller.signal.aborted && !options.signal?.aborted) {
      throw new Error('Máy chủ không phản hồi. Vui lòng thử lại.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortParent);
  }
}

interface ApiErrorPayload {
  readonly code?: unknown;
  readonly traceId?: unknown;
  readonly path?: unknown;
}

function toApiError(response: Response, body: unknown, fallback: string): ApiRequestError {
  const payload = body && typeof body === 'object' ? body as ApiErrorPayload : {};
  const traceId = typeof payload.traceId === 'string'
    ? payload.traceId
    : response.headers.get('X-Trace-Id') || undefined;
  return new ApiRequestError(
    getApiMessage(body, fallback),
    response.status,
    typeof payload.code === 'string' ? payload.code : undefined,
    traceId,
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
  const { response, body } = await fetchWithBody(url, options);
  if (!response.ok) {
    throw toApiError(response, body, `Không thể truy cập ${url}`);
  }
  return body as T;
}

export interface AuthRequestResult<T> {
  readonly data: T;
  readonly capture: AuthenticatedRequestCapture;
}

function isTrustedAuthUrl(url: string): boolean {
  const runtimeOrigin = typeof window === 'undefined' ? apiUrl('') : window.location.origin;
  const apiOrigin = apiUrl('') || runtimeOrigin;
  try {
    const resolved = new URL(url, apiOrigin);
    if (resolved.origin !== new URL(apiOrigin).origin) {
      return false;
    }
    return resolved.pathname === '/api' ||
      resolved.pathname.startsWith('/api/') ||
      resolved.pathname === '/tai-khoan/doi-mat-khau';
  } catch {
    return false;
  }
}

function buildAuthenticatedOptions(options: RequestInit, accessToken: string): RequestInit {
  const headers = new Headers(options.headers);
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Authorization', `Bearer ${accessToken}`);
  return { ...options, headers, credentials: options.credentials ?? 'include' };
}

function isReplayableMethod(method: string | undefined): boolean {
  const normalized = (method ?? 'GET').toUpperCase();
  return normalized === 'GET' || normalized === 'HEAD';
}

async function sendAuthenticated<T>(
  url: string,
  options: RequestInit,
  replayed: boolean,
  expectedRevision?: number,
): Promise<AuthRequestResult<T>> {
  if (!isTrustedAuthUrl(url)) {
    throw new Error('URL xác thực phải thuộc API origin hiện tại.');
  }
  const capture = captureAuthenticatedRequest();
  if (!capture || (expectedRevision !== undefined && capture.revision !== expectedRevision)) {
    throw new Error('Phiên đăng nhập đã thay đổi. Vui lòng thử lại.');
  }

  const { response, body } = await fetchWithBody(
    url,
    buildAuthenticatedOptions(options, capture.accessToken),
  );
  if (response.ok) {
    return { data: body as T, capture };
  }

  if (response.status === 401 && isCurrentAuthCapture(capture)) {
    const refreshed = !replayed && await refreshForRequest(capture).catch(() => false);
    if (refreshed && isReplayableMethod(options.method)) {
      return sendAuthenticated<T>(url, options, true, capture.revision + 1);
    }
    invalidateAuthCapture(capture);
  }

  throw toApiError(response, body, `Request failed: ${response.status}`);
}

export async function authRequestWithCapture<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<AuthRequestResult<T>> {
  return sendAuthenticated<T>(url, options, false);
}

export async function authRequest<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  return (await authRequestWithCapture<T>(url, options)).data;
}
