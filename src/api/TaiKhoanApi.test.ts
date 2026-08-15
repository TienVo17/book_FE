import { loginAuth } from './TaiKhoanApi';
import { getAuthSnapshot, resetAuthSessionForTests } from './AuthSession';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('TaiKhoanApi loginAuth', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    resetAuthSessionForTests();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('delegates to the memory-only auth session without a legacy jwt result', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'csrf-token' }))
      .mockResolvedValueOnce(jsonResponse({
        accessToken: 'access-token',
        expiresIn: 60,
        principal: { uid: 7, username: 'reader', roles: ['USER'] },
      }));

    const snapshot = await loginAuth({ username: 'reader', password: 'secret', rememberMe: false });

    expect(snapshot).toMatchObject({ status: 'authenticated', uid: 7 });
    expect(snapshot).not.toHaveProperty('accessToken');
    expect(getAuthSnapshot()).toBe(snapshot);
    expect(localStorage.getItem('jwt')).toBeNull();
  });
});
