import { findAll } from './SachApi';
import { apiUrl } from './ApiUrl';

function createJwt(): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 }));
  return `header.${payload}.signature`;
}

describe('SachApi admin listing', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.setItem('jwt', createJwt());
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({
      content: [],
      totalPages: 0,
      totalElements: 0,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  });

  afterEach(() => {
    localStorage.clear();
    global.fetch = originalFetch;
  });

  it('uses the authenticated request boundary for /api/admin/sach', async () => {
    await findAll(2);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(apiUrl('/api/admin/sach?page=2'));
    expect(new Headers(options.headers).get('Authorization')).toMatch(/^Bearer /);
  });
});
