import { authRequest } from './Request';

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
});
