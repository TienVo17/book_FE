import {
  readdirSync,
  readFileSync
} from 'fs';
import { waitFor } from '@testing-library/react';
import { extname, join } from 'path';
import {
  bootstrapAuth,
  captureAuthenticatedRequest,
  getAuthSnapshot,
  isCurrentAuthCapture,
  loginAuth,
  logoutAuth,
  refreshForRequest,
  resetAuthSessionForTests,
  subscribeAuthSession,
  subscribeAuthTransition,
} from './AuthSession';

const authPayload = {
  accessToken: 'access-token',
  expiresIn: 60,
  principal: { uid: 7, username: 'reader', roles: ['USER'] },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('AuthSession', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    resetAuthSessionForTests();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('keeps credential sinks out of every runtime source module', () => {
    const sourceRoot = join(__dirname, '..');
    const runtimeFiles: string[] = [];
    const visit = (directory: string): void => {
      readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
          visit(path);
          return;
        }
        if (
          ['.ts', '.tsx'].includes(extname(entry.name)) &&
          !entry.name.endsWith('.test.ts') &&
          !entry.name.endsWith('.test.tsx') &&
          entry.name !== 'setupTests.ts'
        ) {
          runtimeFiles.push(path);
        }
      });
    };
    visit(sourceRoot);

    const forbiddenSink = /(localStorage|sessionStorage)\s*\.\s*(setItem|getItem|removeItem)\s*\([^\n]*(jwt|accessToken|csrfToken|password)/i;
    const forbiddenUrlOrLog = /(?:location(?:\.href|\.assign|\.replace)?|navigate|console\.|logger\.)[^\n]*(jwt|accessToken|csrfToken|password)/i;
    const forbiddenCrossTabCredential = /BroadcastChannel[\s\S]{0,300}(jwt|accessToken|csrfToken|password)/i;

    runtimeFiles.forEach((file) => {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(forbiddenSink);
      expect(source).not.toMatch(forbiddenUrlOrLog);
      expect(source).not.toMatch(forbiddenCrossTabCredential);
    });
  });

  it('bootstraps once, keeps credentials private, and freezes the public identity', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'csrf-token' }))
      .mockResolvedValueOnce(jsonResponse(authPayload));

    const [first, second] = await Promise.all([bootstrapAuth(), bootstrapAuth()]);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(first).toEqual({
      status: 'authenticated',
      uid: 7,
      username: 'reader',
      roles: ['USER'],
      capabilities: ['USER'],
    });
    expect(second).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.roles)).toBe(true);
    expect(Object.isFrozen(first.capabilities)).toBe(true);
    expect(first).not.toHaveProperty('accessToken');
    expect(first).not.toHaveProperty('csrfToken');
    expect((global.fetch as jest.Mock).mock.calls[1][1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
      headers: expect.any(Headers),
    });
    expect(new Headers((global.fetch as jest.Mock).mock.calls[1][1].headers).get('X-CSRF-Token')).toBe('csrf-token');
  });

  it('notifies other tabs only for explicit login, never bootstrap or routine refresh', async () => {
    const broadcastMessages: unknown[] = [];
    class TestBroadcastChannel {
      constructor(_name: string) {}
      addEventListener(_type: string, _listener: EventListener): void {}
      postMessage(message: unknown): void { broadcastMessages.push(message); }
      close(): void {}
    }
    const originalBroadcastChannel = window.BroadcastChannel;
    Object.defineProperty(window, 'BroadcastChannel', { configurable: true, writable: true, value: TestBroadcastChannel });
    try {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(jsonResponse({ csrfToken: 'bootstrap-csrf' }))
        .mockResolvedValueOnce(jsonResponse(authPayload));
      await bootstrapAuth();
      expect(broadcastMessages).toEqual([]);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(jsonResponse({ ...authPayload, accessToken: 'refreshed-token' }));
      await refreshForRequest(captureAuthenticatedRequest());
      expect(broadcastMessages).toEqual([]);

      resetAuthSessionForTests();
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(jsonResponse({ csrfToken: 'login-csrf' }))
        .mockResolvedValueOnce(jsonResponse(authPayload));
      await loginAuth({ username: 'reader', password: 'secret', rememberMe: false });
      expect(broadcastMessages).toHaveLength(1);
      expect(broadcastMessages[0]).toMatchObject({ type: 'auth-changed' });
      expect(broadcastMessages[0]).not.toHaveProperty('accessToken');
      expect(broadcastMessages[0]).not.toHaveProperty('csrfToken');
    } finally {
      Object.defineProperty(window, 'BroadcastChannel', { configurable: true, writable: true, value: originalBroadcastChannel });
    }
  });

  it('queues a fresh bootstrap when another tab changes auth during an older bootstrap', async () => {
    let resolveOldCsrf!: (response: Response) => void;
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => new Promise<Response>((resolve) => {
        resolveOldCsrf = resolve;
      }))
      .mockResolvedValueOnce(jsonResponse(authPayload))
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'fresh-csrf' }))
      .mockResolvedValueOnce(jsonResponse({
        ...authPayload,
        accessToken: 'fresh-token',
      }));

    const oldBootstrap = bootstrapAuth();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new StorageEvent('storage', {
      key: 'book-fe-auth-coordination',
      newValue: JSON.stringify({
        type: 'auth-changed',
        nonce: 'other-tab-login',
        sender: 'other-tab',
        expiresAt: Date.now() + 10_000,
      }),
    }));
    resolveOldCsrf(jsonResponse({ csrfToken: 'old-csrf' }));

    await expect(oldBootstrap).resolves.toMatchObject({
      status: 'unknown',
    });
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(4);
      expect(getAuthSnapshot()).toMatchObject({
        status: 'authenticated',
        uid: 7,
      });
    });
    expect(captureAuthenticatedRequest()?.accessToken).toBe('fresh-token');
  });

  it('keeps a cross-tab invalidation terminal when an older bootstrap settles later', async () => {
    let resolveOldCsrf!: (response: Response) => void;
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => new Promise<Response>((resolve) => {
        resolveOldCsrf = resolve;
      }))
      .mockResolvedValueOnce(jsonResponse(authPayload));

    const oldBootstrap = bootstrapAuth();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new StorageEvent('storage', {
      key: 'book-fe-auth-coordination',
      newValue: JSON.stringify({
        type: 'auth-changed',
        nonce: 'other-tab-login',
        sender: 'other-tab',
        expiresAt: Date.now() + 10_000,
      }),
    }));
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'book-fe-auth-coordination',
      newValue: JSON.stringify({
        type: 'auth-invalidated',
        nonce: 'other-tab-logout',
        sender: 'other-tab',
        expiresAt: Date.now() + 10_000,
      }),
    }));
    resolveOldCsrf(jsonResponse({ csrfToken: 'old-csrf' }));

    await expect(oldBootstrap).resolves.toMatchObject({
      status: 'guest',
    });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(getAuthSnapshot().status).toBe('guest');
    expect(captureAuthenticatedRequest()).toBeNull();
  });

  it('accepts only the strict deployed payload and does not use jwt as an access-token fallback', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'csrf-token' }))
      .mockResolvedValueOnce(jsonResponse({ ...authPayload, accessToken: undefined, jwt: 'legacy-token' }));

    await expect(bootstrapAuth()).rejects.toThrow('Phản hồi xác thực không hợp lệ');
    expect(getAuthSnapshot().status).toBe('unknown');
  });

  it('transitions to guest for refresh 401 and unknown for transport failures', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'csrf-token' }))
      .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, 401));

    await expect(bootstrapAuth()).resolves.toMatchObject({ status: 'guest' });

    resetAuthSessionForTests();
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new TypeError('offline'));

    await expect(bootstrapAuth()).rejects.toThrow('offline');
    expect(getAuthSnapshot().status).toBe('unknown');
  });

  it('classifies refresh 401 by status even when an intermediary returns non-JSON', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'csrf-token' }))
      .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

    await expect(bootstrapAuth()).resolves.toMatchObject({ status: 'guest' });
    expect(getAuthSnapshot().status).toBe('guest');
  });

  it('installs a login session in memory without touching Web Storage', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'login-csrf' }))
      .mockResolvedValueOnce(jsonResponse(authPayload));

    await expect(loginAuth({ username: 'reader', password: 'secret', rememberMe: true }))
      .resolves.toMatchObject({ status: 'authenticated', uid: 7 });

    const [, options] = (global.fetch as jest.Mock).mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(options.body as string)).toEqual({ username: 'reader', password: 'secret', rememberMe: true });
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(localStorage.getItem('jwt')).toBeNull();
  });

  it('runs beforeInstall after response validation and before publishing the session', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'login-csrf' }))
      .mockResolvedValueOnce(jsonResponse(authPayload));
    let snapshotDuringCallback: string | null = null;
    let principalDuringCallback: unknown;

    await loginAuth({
      username: 'reader',
      password: 'secret',
      rememberMe: false,
      beforeInstall: (principal) => {
        snapshotDuringCallback = getAuthSnapshot().status;
        principalDuringCallback = principal;
      },
    });

    expect(snapshotDuringCallback).toBe('unknown');
    expect(principalDuringCallback).toEqual({ uid: 7, username: 'reader', roles: ['USER'] });
    expect(getAuthSnapshot().status).toBe('authenticated');
  });

  it('compensates a successful server login when beforeInstall fails', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'login-csrf' }))
      .mockResolvedValueOnce(jsonResponse(authPayload))
      .mockResolvedValueOnce(jsonResponse({}));

    await expect(loginAuth({
      username: 'reader',
      password: 'secret',
      rememberMe: false,
      beforeInstall: () => {
        throw new DOMException('storage blocked', 'SecurityError');
      },
    })).rejects.toThrow('storage blocked');

    expect((global.fetch as jest.Mock).mock.calls[2][0]).toMatch(/\/tai-khoan\/dang-xuat$/);
    expect(getAuthSnapshot().status).toBe('unknown');
    expect(captureAuthenticatedRequest()).toBeNull();
  });

  it('runs transition cleanup before normal subscribers observe an installed or invalidated session', async () => {
    const events: string[] = [];
    subscribeAuthTransition((previous, next) => {
      events.push(`transition:${previous.status}:${next.status}:${getAuthSnapshot().status}`);
    });
    subscribeAuthSession(() => {
      events.push(`subscriber:${getAuthSnapshot().status}`);
    });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'login-csrf' }))
      .mockResolvedValueOnce(jsonResponse(authPayload))
      .mockResolvedValueOnce(jsonResponse({}));

    await loginAuth({ username: 'reader', password: 'secret', rememberMe: false });
    await logoutAuth();

    expect(events).toEqual([
      'transition:unknown:authenticated:unknown',
      'subscriber:authenticated',
      'transition:authenticated:guest:authenticated',
      'subscriber:guest',
    ]);
  });

  it('moves to guest before a failed logout request and clears the captured credentials', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'login-csrf' }))
      .mockResolvedValueOnce(jsonResponse(authPayload));
    await loginAuth({ username: 'reader', password: 'secret', rememberMe: false });
    const capture = captureAuthenticatedRequest();
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockRejectedValueOnce(new TypeError('offline'));

    await expect(logoutAuth()).resolves.toMatchObject({ status: 'guest' });
    expect(getAuthSnapshot().status).toBe('guest');
    expect(isCurrentAuthCapture(capture)).toBe(false);
  });

  it('keeps local logout fail-closed when the server responds with an error', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'login-csrf' }))
      .mockResolvedValueOnce(jsonResponse(authPayload));
    await loginAuth({ username: 'reader', password: 'secret', rememberMe: false });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'logout-csrf' }))
      .mockResolvedValueOnce(jsonResponse({ code: 'SERVER_ERROR' }, 500));

    await expect(logoutAuth()).resolves.toMatchObject({ status: 'guest' });
    expect(getAuthSnapshot().status).toBe('guest');
    expect(captureAuthenticatedRequest()).toBeNull();
  });

  it('shares one refresh flight for concurrent requests in the same tab', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'login-csrf' }))
      .mockResolvedValueOnce(jsonResponse(authPayload));
    await loginAuth({ username: 'reader', password: 'secret', rememberMe: false });
    const capture = captureAuthenticatedRequest();

    let resolveRefresh!: (response: Response) => void;
    (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    }));

    const first = refreshForRequest(capture);
    const second = refreshForRequest(capture);
    expect(global.fetch).toHaveBeenCalledTimes(3);

    resolveRefresh(jsonResponse({ ...authPayload, accessToken: 'new-token' }));
    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('serializes logout after refresh and sends the cookie-clearing request last', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'login-csrf' }))
      .mockResolvedValueOnce(jsonResponse(authPayload));
    await loginAuth({ username: 'reader', password: 'secret', rememberMe: false });
    const capture = captureAuthenticatedRequest();

    let resolveRefresh!: (response: Response) => void;
    (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    }));

    const refresh = refreshForRequest(capture);
    const logout = logoutAuth();
    expect(global.fetch).toHaveBeenCalledTimes(3);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'logout-csrf' }))
      .mockResolvedValueOnce(jsonResponse({}));
    resolveRefresh(jsonResponse({ ...authPayload, accessToken: 'new-token' }));
    await expect(refresh).resolves.toBe(false);
    await logout;

    expect((global.fetch as jest.Mock).mock.calls[3][0]).toMatch(/\/tai-khoan\/csrf$/);
    expect((global.fetch as jest.Mock).mock.calls[4][0]).toMatch(/\/tai-khoan\/dang-xuat$/);
    const logoutOptions = (global.fetch as jest.Mock).mock.calls[4][1] as RequestInit;
    expect(new Headers(logoutOptions.headers).get('X-CSRF-Token')).toBe('logout-csrf');
    expect(new Headers(logoutOptions.headers).has('Authorization')).toBe(false);
    expect(getAuthSnapshot().status).toBe('guest');
  });

  it('bounds navigator lock acquisition when another tab never releases it', async () => {
    jest.useFakeTimers();
    const originalLocks = (navigator as Navigator & { locks?: LockManager }).locks;
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: (_name: string, options: LockOptions) => new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
      },
    });
    try {
      const bootstrap = bootstrapAuth();
      jest.advanceTimersByTime(20_001);
      await expect(bootstrap).rejects.toThrow('Không thể đồng bộ phiên đăng nhập giữa các thẻ.');
      expect(global.fetch).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
      Object.defineProperty(navigator, 'locks', { configurable: true, value: originalLocks });
    }
  });

  it('times out when auth response headers arrive but the body never completes', async () => {
    jest.useFakeTimers();
    (global.fetch as jest.Mock).mockImplementationOnce((_url, options: RequestInit) => Promise.resolve({
      ok: true,
      status: 200,
      text: () => new Promise<string>((_resolve, reject) => {
        options.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      }),
    } as Response));

    try {
      const bootstrap = bootstrapAuth();
      await Promise.resolve();
      jest.advanceTimersByTime(15_001);

      await expect(bootstrap).rejects.toThrow(
        'Máy chủ xác thực không phản hồi. Vui lòng thử lại.',
      );
      expect(getAuthSnapshot().status).toBe('unknown');
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps a completed login consistent when fallback lease metadata changes during publication', async () => {
    subscribeAuthSession(() => {
      localStorage.setItem('book-fe-auth-coordination-lease', JSON.stringify({
        owner: 'another-tab',
        expiresAt: Date.now() + 30_000,
      }));
    });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'login-csrf' }))
      .mockResolvedValueOnce(jsonResponse(authPayload));

    await expect(loginAuth({ username: 'reader', password: 'secret', rememberMe: false }))
      .resolves.toMatchObject({ status: 'authenticated', uid: 7 });
    expect(getAuthSnapshot().status).toBe('authenticated');
    expect(captureAuthenticatedRequest()?.accessToken).toBe('access-token');
  });

  it('keeps the published snapshot consistent when a transition listener throws', async () => {
    subscribeAuthTransition(() => {
      throw new DOMException('storage blocked', 'SecurityError');
    });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'login-csrf' }))
      .mockResolvedValueOnce(jsonResponse(authPayload))
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'logout-csrf' }))
      .mockResolvedValueOnce(jsonResponse({}));

    await expect(loginAuth({ username: 'reader', password: 'secret', rememberMe: false }))
      .resolves.toMatchObject({ status: 'authenticated' });
    await expect(logoutAuth()).resolves.toMatchObject({ status: 'guest' });
    expect(getAuthSnapshot().status).toBe('guest');
    expect(captureAuthenticatedRequest()).toBeNull();
  });

  it('does not let a normal subscriber exception interrupt login or server logout', async () => {
    subscribeAuthSession(() => {
      throw new DOMException('render failed', 'InvalidStateError');
    });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'login-csrf' }))
      .mockResolvedValueOnce(jsonResponse(authPayload))
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'logout-csrf' }))
      .mockResolvedValueOnce(jsonResponse({}));

    await expect(loginAuth({ username: 'reader', password: 'secret', rememberMe: false }))
      .resolves.toMatchObject({ status: 'authenticated' });
    await expect(logoutAuth()).resolves.toMatchObject({ status: 'guest' });

    expect((global.fetch as jest.Mock).mock.calls[3][0]).toMatch(/\/tai-khoan\/dang-xuat$/);
    expect(getAuthSnapshot().status).toBe('guest');
    expect(captureAuthenticatedRequest()).toBeNull();
  });

  it('does not replace CSRF for a non-CSRF 403 refresh rejection', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'login-csrf' }))
      .mockResolvedValueOnce(jsonResponse(authPayload));
    await loginAuth({ username: 'reader', password: 'secret', rememberMe: false });
    const capture = captureAuthenticatedRequest();
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({ code: 'AUTH_ORIGIN_REJECTED' }, 403));

    await expect(refreshForRequest(capture)).resolves.toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(getAuthSnapshot().status).toBe('unknown');
  });

  it('reboots CSRF once after a refresh CSRF rejection and then installs the replacement session', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'login-csrf' }))
      .mockResolvedValueOnce(jsonResponse(authPayload));
    await loginAuth({ username: 'reader', password: 'secret', rememberMe: false });
    const capture = captureAuthenticatedRequest();

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ code: 'AUTH_CSRF_REJECTED' }, 403))
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'replacement-csrf' }))
      .mockResolvedValueOnce(jsonResponse({ ...authPayload, accessToken: 'refreshed-token' }));

    await expect(refreshForRequest(capture)).resolves.toBe(true);
    expect(captureAuthenticatedRequest()?.accessToken).toBe('refreshed-token');
  });
});
