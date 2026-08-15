import {
  ApiRequestError,
  authRequest,
  authRequestWithCapture,
  publicRequest
} from './Request';
import {
  captureAuthenticatedRequest,
  getAuthSnapshot,
  loginAuth,
  resetAuthSessionForTests,
} from './AuthSession';

const authPayload = {
  accessToken: 'access-token',
  expiresIn: 60,
  principal: { uid: 7, username: 'reader', roles: ['USER'] },
};

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

async function installSession(): Promise<void> {
  (global.fetch as jest.Mock)
    .mockResolvedValueOnce(jsonResponse({ csrfToken: 'login-csrf' }))
    .mockResolvedValueOnce(jsonResponse(authPayload));
  await loginAuth({ username: 'reader', password: 'secret', rememberMe: false });
}

describe('authRequest', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    resetAuthSessionForTests();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('does not assign JSON content type to FormData and obtains Bearer only from the memory capture', async () => {
    await installSession();
    const formData = new FormData();
    formData.append('files', new File(['image'], 'cover.png', { type: 'image/png' }));
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({}));

    await authRequest('/api/admin/sach/1/hinh-anh', { method: 'POST', body: formData });

    const [, requestOptions] = (global.fetch as jest.Mock).mock.calls[2] as [string, RequestInit];
    const headers = new Headers(requestOptions.headers);
    expect(headers.get('Authorization')).toBe('Bearer access-token');
    expect(headers.has('Content-Type')).toBe(false);
  });

  it('assigns JSON content type to non-multipart requests without one', async () => {
    await installSession();
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({}));

    await authRequest('/api/dia-chi', { method: 'POST', body: JSON.stringify({}) });

    const [, requestOptions] = (global.fetch as jest.Mock).mock.calls[2] as [string, RequestInit];
    expect(new Headers(requestOptions.headers).get('Content-Type')).toBe('application/json');
  });

  it('parses the stable API error schema into ApiRequestError fields', async () => {
    await installSession();
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({
      timestamp: '2026-08-03T08:41:00Z', status: 409, code: 'STOCK_CONFLICT',
      message: 'Số lượng tồn kho không đủ', path: '/api/don-hang/them', traceId: 'trace-body-123',
    }, 409, { 'X-Trace-Id': 'trace-header-123' }));

    await expect(authRequest('/api/don-hang/them')).rejects.toEqual(expect.objectContaining({
      name: 'ApiRequestError', status: 409, code: 'STOCK_CONFLICT',
      message: 'Số lượng tồn kho không đủ', path: '/api/don-hang/them', traceId: 'trace-body-123',
    }));
  });

  it('uses the exposed trace header when a staged legacy error has no traceId body', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(new Response('Lỗi cũ', {
      status: 400, headers: { 'X-Trace-Id': 'trace-header-legacy' },
    }));

    await expect(publicRequest('/public-api')).rejects.toMatchObject({
      status: 400, message: 'Lỗi cũ', traceId: 'trace-header-legacy',
    });
  });

  it('bounds public response body consumption after headers arrive', async () => {
    jest.useFakeTimers();
    (global.fetch as jest.Mock).mockImplementationOnce((_url, options: RequestInit) => Promise.resolve({
      ok: true,
      status: 200,
      text: () => new Promise<string>((_resolve, reject) => {
        options.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      }),
    } as Response));

    try {
      const request = publicRequest('/public-api');
      await Promise.resolve();
      jest.advanceTimersByTime(15_001);
      await expect(request).rejects.toThrow('Máy chủ không phản hồi. Vui lòng thử lại.');
    } finally {
      jest.useRealTimers();
    }
  });

  it('honors a parent signal that was already aborted before dispatch', async () => {
    const parent = new AbortController();
    parent.abort();
    (global.fetch as jest.Mock).mockImplementationOnce((_url, options: RequestInit) => {
      expect(options.signal?.aborted).toBe(true);
      return Promise.reject(new DOMException('aborted', 'AbortError'));
    });

    await expect(publicRequest('/public-api', { signal: parent.signal }))
      .rejects.toMatchObject({ name: 'AbortError' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('refreshes and replays a current GET exactly once after 401', async () => {
    await installSession();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ ...authPayload, accessToken: 'refreshed-token' }))
      .mockResolvedValueOnce(jsonResponse({ id: 1 }));

    const result = await authRequestWithCapture<{ id: number }>('/api/dia-chi');
    expect(result.data).toEqual({ id: 1 });
    expect(result.capture).toEqual({ accessToken: 'refreshed-token', revision: 2 });
    expect(global.fetch).toHaveBeenCalledTimes(5);
    expect(new Headers((global.fetch as jest.Mock).mock.calls[4][1].headers).get('Authorization')).toBe('Bearer refreshed-token');
  });

  it('may refresh after a mutation 401 but never replays that mutation', async () => {
    await installSession();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ ...authPayload, accessToken: 'refreshed-token' }));

    await expect(authRequest('/api/dia-chi', { method: 'POST', body: '{}' })).rejects.toMatchObject({ status: 401 });
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  it('refreshes successfully after access TTL elapses while the cookie session remains valid', async () => {
    jest.useFakeTimers();
    await installSession();
    jest.advanceTimersByTime(61_000);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ ...authPayload, accessToken: 'refreshed-token' }))
      .mockResolvedValueOnce(jsonResponse({ id: 1 }));

    await expect(authRequest('/api/dia-chi')).resolves.toEqual({ id: 1 });
    expect(getAuthSnapshot()).toMatchObject({ status: 'authenticated', uid: 7 });
    jest.useRealTimers();
  });

  it('rejects a foreign absolute URL before leaking a Bearer header', async () => {
    await installSession();

    await expect(authRequest('https://attacker.example/account')).rejects.toThrow('API origin hiện tại');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('allows only the exact authenticated password-change account endpoint', async () => {
    await installSession();
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({}));

    await expect(authRequest('/tai-khoan/doi-mat-khau', {
      method: 'PUT',
      body: JSON.stringify({ matKhauCu: 'old', matKhauMoi: 'new' }),
    })).resolves.toEqual({});
    expect((global.fetch as jest.Mock).mock.calls[2][0]).toBe('/tai-khoan/doi-mat-khau');

    await expect(authRequest('/tai-khoan/quen-mat-khau', { method: 'POST' }))
      .rejects.toThrow('API origin hiện tại');
  });

  it('does not refresh or log out for 403', async () => {
    await installSession();
    const capture = captureAuthenticatedRequest();
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({ message: 'forbidden' }, 403));

    await expect(authRequest('/api/dia-chi')).rejects.toMatchObject({ status: 403 });
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(captureAuthenticatedRequest()).toEqual(capture);
  });

  it('does not let a stale 401 change a replacement session', async () => {
    await installSession();
    let resolveOldRequest!: (response: Response) => void;
    (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise<Response>((resolve) => {
      resolveOldRequest = resolve;
    }));
    const oldRequest = authRequest('/api/dia-chi');

    await installSession();
    resolveOldRequest(jsonResponse({ message: 'expired' }, 401));

    await expect(oldRequest).rejects.toMatchObject({ status: 401 });
    expect(getAuthSnapshot()).toMatchObject({ status: 'authenticated', uid: 7 });
  });

  it('does not refresh twice after replayed GET receives 401 and invalidates only its current session', async () => {
    await installSession();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ ...authPayload, accessToken: 'refreshed-token' }))
      .mockResolvedValueOnce(jsonResponse({ message: 'still expired' }, 401));

    await expect(authRequest('/api/dia-chi')).rejects.toMatchObject({ status: 401 });
    expect(global.fetch).toHaveBeenCalledTimes(5);
    expect(getAuthSnapshot().status).toBe('guest');
  });
});
