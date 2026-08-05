import { ApiRequestError, authRequest, publicRequest } from './Request';

function createJwt(expirationOffsetMs: number): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor((Date.now() + expirationOffsetMs) / 1000) }));
  return `header.${payload}.signature`;
}

describe('authRequest', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.setItem('jwt', createJwt(60_000));
    global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  });

  afterEach(() => {
    localStorage.clear();
    global.fetch = originalFetch;
  });

  it('does not assign a JSON content type to FormData requests', async () => {
    const formData = new FormData();
    formData.append('files', new File(['image'], 'cover.png', { type: 'image/png' }));

    await authRequest('/api/admin/sach/1/hinh-anh', { method: 'POST', body: formData });

    const [, requestOptions] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const headers = new Headers(requestOptions.headers);
    expect(headers.get('Authorization')).toMatch(/^Bearer /);
    expect(headers.has('Content-Type')).toBe(false);
  });

  it('assigns JSON content type to non-multipart requests without one', async () => {
    await authRequest('/api/dia-chi', { method: 'POST', body: JSON.stringify({}) });

    const [, requestOptions] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(new Headers(requestOptions.headers).get('Content-Type')).toBe('application/json');
  });

  it('parses the stable API error schema into ApiRequestError fields', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({
      timestamp: '2026-08-03T08:41:00Z',
      status: 409,
      code: 'STOCK_CONFLICT',
      message: 'Số lượng tồn kho không đủ',
      path: '/api/don-hang/them',
      traceId: 'trace-body-123',
    }), {
      status: 409,
      headers: { 'Content-Type': 'application/json', 'X-Trace-Id': 'trace-header-123' },
    }));

    await expect(authRequest('/api/don-hang/them')).rejects.toEqual(
      expect.objectContaining({
        name: 'ApiRequestError',
        status: 409,
        code: 'STOCK_CONFLICT',
        message: 'Số lượng tồn kho không đủ',
        path: '/api/don-hang/them',
        traceId: 'trace-body-123',
      }),
    );
  });

  it('uses the exposed trace header when a staged legacy error has no traceId body', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('Lỗi cũ', {
      status: 400,
      headers: { 'X-Trace-Id': 'trace-header-legacy' },
    }));

    let caught: unknown;
    try {
      await publicRequest('/public-api');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ApiRequestError);
    expect(caught).toMatchObject({ status: 400, message: 'Lỗi cũ', traceId: 'trace-header-legacy' });
  });

  it('keeps clearing jwt on a structured 401 denial', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'Vui lòng đăng nhập để tiếp tục.',
      traceId: 'trace-401',
    }), { status: 401, headers: { 'Content-Type': 'application/json' } }));

    await expect(authRequest('/api/dia-chi')).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
    expect(localStorage.getItem('jwt')).toBeNull();
  });
});
