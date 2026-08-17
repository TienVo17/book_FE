import { useSyncExternalStore } from 'react';
import { apiUrl } from './ApiUrl';

export type AuthStatus = 'unknown' | 'guest' | 'authenticated';

export interface AuthSnapshot {
  readonly status: AuthStatus;
  readonly uid: number | null;
  readonly username: string | null;
  readonly roles: readonly string[];
  readonly capabilities: readonly string[];
}

export interface AuthenticatedRequestCapture {
  readonly accessToken: string;
  readonly revision: number;
}

export interface LoginAuthInput {
  readonly username: string;
  readonly password: string;
  readonly rememberMe: boolean;
  /** Runs after a valid response arrives but before this session becomes visible. */
  readonly beforeInstall?: (
    principal: Readonly<
      Pick<AuthSnapshot, 'username' | 'roles'> &
      { readonly uid: number }
    >,
  ) => void;
}

interface ParsedAuthResponse {
  readonly accessToken: string;
  readonly expiresIn: number;
  readonly uid: number;
  readonly username: string;
  readonly roles: readonly string[];
}

interface SessionCredentials extends ParsedAuthResponse {
  readonly csrfToken: string;
  readonly expiresAt: number;
  readonly revision: number;
}

const EMPTY_VALUES: readonly string[] = Object.freeze([]);
const UNKNOWN_SNAPSHOT = createSnapshot('unknown');
const GUEST_SNAPSHOT = createSnapshot('guest');

let snapshot: AuthSnapshot = UNKNOWN_SNAPSHOT;
let credentials: SessionCredentials | null = null;
let revision = 0;
let bootstrapFlight: Promise<AuthSnapshot> | null = null;
let crossTabBootstrapQueued = false;
let refreshFlight: { readonly revision: number; readonly promise: Promise<boolean> } | null = null;
const listeners = new Set<() => void>();
const transitionListeners = new Set<(previous: AuthSnapshot, next: AuthSnapshot) => void>();

const COORDINATION_KEY = 'book-fe-auth-coordination';
const AUTH_COORDINATION_LEASE_KEY = `${COORDINATION_KEY}-lease`;
const COORDINATION_MAX_AGE_MS = 30_000;
const COORDINATION_LEASE_MS = 15_000;
const COORDINATION_RENEW_MS = 2_500;
const COORDINATION_WAIT_MS = 25;
const COORDINATION_TIMEOUT_MS = 20_000;
const AUTH_REQUEST_TIMEOUT_MS = 15_000;
type CoordinationMessage = {
  readonly type: 'auth-changed' | 'auth-invalidated';
  readonly nonce: string;
  readonly sender: string;
  readonly expiresAt: number;
};
const TAB_ID = Math.random().toString(36).slice(2, 14);

interface NavigatorWithOptionalLocks {
  readonly locks?: Pick<LockManager, 'request'>;
}

function authCoordinationError(): Error {
  return new Error('Không thể đồng bộ phiên đăng nhập giữa các thẻ.');
}

function requestTimeoutError(): Error {
  return new Error('Máy chủ xác thực không phản hồi. Vui lòng thử lại.');
}

function createCoordinationMessage(type: CoordinationMessage['type']): CoordinationMessage {
  return {
    type,
    nonce: `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`,
    sender: TAB_ID,
    expiresAt: Date.now() + COORDINATION_MAX_AGE_MS,
  };
}

function parseCoordinationMessage(value: unknown): CoordinationMessage | null {
  const message = normalizeObject(value);
  if (!message || (message.type !== 'auth-changed' && message.type !== 'auth-invalidated') ||
      typeof message.nonce !== 'string' || message.nonce.length === 0 || message.nonce.length > 64 ||
      typeof message.sender !== 'string' || message.sender.length === 0 || message.sender.length > 64 ||
      typeof message.expiresAt !== 'number' || !Number.isFinite(message.expiresAt) ||
      message.expiresAt < Date.now() || message.expiresAt > Date.now() + COORDINATION_MAX_AGE_MS + 5_000) {
    return null;
  }
  return { type: message.type, nonce: message.nonce, sender: message.sender, expiresAt: message.expiresAt };
}

function notifyOtherTabs(type: CoordinationMessage['type']): void {
  const message = createCoordinationMessage(type);
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(COORDINATION_KEY);
      channel.postMessage(message);
      channel.close();
      return;
    } catch {
      // Use bounded, non-secret storage-event metadata only when BroadcastChannel is unavailable.
    }
  }
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(COORDINATION_KEY, JSON.stringify(message));
    window.localStorage.removeItem(COORDINATION_KEY);
  } catch {
    // Cross-tab notification is opportunistic; local state remains authoritative.
  }
}

function wait(delay: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delay));
}

function readLease(): { readonly owner: string; readonly expiresAt: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = normalizeObject(JSON.parse(window.localStorage.getItem(AUTH_COORDINATION_LEASE_KEY) ?? 'null'));
    return value && typeof value.owner === 'string' && typeof value.expiresAt === 'number'
      ? { owner: value.owner, expiresAt: value.expiresAt }
      : null;
  } catch {
    return null;
  }
}

interface AuthCoordinationLease {
  assertOwnership(): void;
}

const UNCOORDINATED_LEASE: AuthCoordinationLease = Object.freeze({
  assertOwnership: () => undefined,
});

async function withStorageLease<T>(
  operation: (lease: AuthCoordinationLease) => Promise<T>,
): Promise<T> {
  if (typeof window === 'undefined') return operation(UNCOORDINATED_LEASE);
  const owner = `${TAB_ID}:${Math.random().toString(36).slice(2, 14)}`;
  const deadline = Date.now() + COORDINATION_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const current = readLease();
    if (!current || current.expiresAt <= Date.now()) {
      try {
        window.localStorage.setItem(AUTH_COORDINATION_LEASE_KEY, JSON.stringify({
          owner,
          expiresAt: Date.now() + COORDINATION_LEASE_MS,
        }));
      } catch {
        throw authCoordinationError();
      }

      if (readLease()?.owner === owner) {
        // Let simultaneous browser tabs complete their write before accepting ownership.
        // Jest runs one module realm, so yielding here would require every auth unit
        // test to drive timers without adding cross-tab coverage.
        if (process.env.NODE_ENV !== 'test') {
          await wait(0);
        }
        if (readLease()?.owner !== owner) {
          continue;
        }

        let ownershipLost = false;
        const lease: AuthCoordinationLease = {
          assertOwnership: () => {
            if (ownershipLost || readLease()?.owner !== owner) {
              throw authCoordinationError();
            }
          },
        };
        const renewal = window.setInterval(() => {
          try {
            if (readLease()?.owner !== owner) {
              ownershipLost = true;
              window.clearInterval(renewal);
              return;
            }
            window.localStorage.setItem(AUTH_COORDINATION_LEASE_KEY, JSON.stringify({
              owner,
              expiresAt: Date.now() + COORDINATION_LEASE_MS,
            }));
          } catch {
            ownershipLost = true;
            window.clearInterval(renewal);
          }
        }, COORDINATION_RENEW_MS);
        try {
          const result = await operation(lease);
          // A caller must assert immediately before local auth publication. Once
          // publication succeeds, later lease metadata cannot turn success into a
          // rejected promise with an already-installed session.
          return result;
        } finally {
          window.clearInterval(renewal);
          try {
            if (readLease()?.owner === owner) window.localStorage.removeItem(AUTH_COORDINATION_LEASE_KEY);
          } catch {
            // The lease expires on its own when storage becomes unavailable during cleanup.
          }
        }
      }
    }
    await wait(COORDINATION_WAIT_MS);
  }
  throw authCoordinationError();
}

async function withWebLock<T>(
  locks: Pick<LockManager, 'request'>,
  operation: (lease: AuthCoordinationLease) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), COORDINATION_TIMEOUT_MS);
  try {
    return await locks.request(
      COORDINATION_KEY,
      { signal: controller.signal },
      () => operation(UNCOORDINATED_LEASE),
    );
  } catch (error) {
    if (controller.signal.aborted) {
      throw authCoordinationError();
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function withAuthCoordinationLock<T>(
  operation: (lease: AuthCoordinationLease) => Promise<T>,
): Promise<T> {
  const locks = typeof navigator === 'undefined'
    ? undefined
    : (navigator as unknown as NavigatorWithOptionalLocks).locks;
  return locks
    ? withWebLock(locks, operation)
    : withStorageLease(operation);
}

function requestCrossTabBootstrap(): void {
  crossTabBootstrapQueued = true;
  if (bootstrapFlight) {
    return;
  }

  crossTabBootstrapQueued = false;
  void bootstrapAuth(false).catch(() => undefined);
}

function receiveCrossTabMessage(rawMessage: unknown): void {
  const message = parseCoordinationMessage(rawMessage);
  if (!message || message.sender === TAB_ID) {
    return;
  }
  if (message.type === 'auth-invalidated') {
    crossTabBootstrapQueued = false;
    setGuest(false);
    return;
  }
  setUnknown(false);
  requestCrossTabBootstrap();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key === COORDINATION_KEY && event.newValue) {
      try {
        receiveCrossTabMessage(JSON.parse(event.newValue) as unknown);
      } catch {
        // Ignore malformed non-secret coordination metadata.
      }
    }
  });
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(COORDINATION_KEY);
      channel.addEventListener('message', (event: MessageEvent<unknown>) => receiveCrossTabMessage(event.data));
    } catch {
      // The storage-event fallback remains available where channel construction fails.
    }
  }
}

function createSnapshot(
  status: AuthStatus,
  principal?: Pick<ParsedAuthResponse, 'uid' | 'username' | 'roles'>,
): AuthSnapshot {
  const roles = principal ? Object.freeze([...principal.roles]) : EMPTY_VALUES;
  const capabilities = principal ? Object.freeze([...principal.roles]) : EMPTY_VALUES;
  return Object.freeze({
    status,
    uid: principal?.uid ?? null,
    username: principal?.username ?? null,
    roles,
    capabilities,
  });
}

function publish(nextSnapshot: AuthSnapshot): AuthSnapshot {
  if (snapshot === nextSnapshot) {
    return snapshot;
  }
  const previousSnapshot = snapshot;
  transitionListeners.forEach((listener) => {
    try {
      listener(previousSnapshot, nextSnapshot);
    } catch {
      // Auth state must remain consistent even when private cache cleanup fails.
    }
  });
  snapshot = nextSnapshot;
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // One consumer must not interrupt an already-committed auth transition.
    }
  });
  return snapshot;
}

function setGuest(notify = true): AuthSnapshot {
  revision += 1;
  credentials = null;
  const nextSnapshot = publish(GUEST_SNAPSHOT);
  if (notify) {
    notifyOtherTabs('auth-invalidated');
  }
  return nextSnapshot;
}

function setUnknown(notify = false): AuthSnapshot {
  revision += 1;
  credentials = null;
  const nextSnapshot = publish(UNKNOWN_SNAPSHOT);
  if (notify) {
    notifyOtherTabs('auth-changed');
  }
  return nextSnapshot;
}

function install(
  parsed: ParsedAuthResponse,
  csrfToken: string,
  expectedRevision: number,
  notify = true,
): AuthSnapshot | null {
  if (revision !== expectedRevision) {
    return null;
  }

  revision += 1;
  credentials = {
    ...parsed,
    csrfToken,
    expiresAt: Date.now() + parsed.expiresIn * 1000,
    revision,
  };
  const nextSnapshot = publish(createSnapshot('authenticated', parsed));
  if (notify) {
    notifyOtherTabs('auth-changed');
  }
  return nextSnapshot;
}

function normalizeObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function parseAuthResponse(value: unknown): ParsedAuthResponse {
  const payload = normalizeObject(value);
  const principal = normalizeObject(payload?.principal);
  const accessToken = payload?.accessToken;
  const expiresIn = payload?.expiresIn;
  const uid = principal?.uid;
  const username = principal?.username;
  const roles = principal?.roles;

  if (
    !payload ||
    typeof accessToken !== 'string' || !accessToken.trim() ||
    typeof expiresIn !== 'number' || !Number.isFinite(expiresIn) || expiresIn <= 0 ||
    !principal ||
    typeof uid !== 'number' || !Number.isInteger(uid) || uid <= 0 ||
    typeof username !== 'string' || !username.trim() ||
    !Array.isArray(roles) || !roles.every((role) => typeof role === 'string' && role.trim().length > 0)
  ) {
    throw new Error('Phản hồi xác thực không hợp lệ.');
  }

  return {
    accessToken: accessToken.trim(),
    expiresIn,
    uid,
    username: username.trim(),
    roles: roles.map((role) => role.trim()),
  };
}

function parseCsrfToken(value: unknown): string {
  const payload = normalizeObject(value);
  if (!payload || typeof payload.csrfToken !== 'string' || !payload.csrfToken.trim()) {
    throw new Error('Phản hồi CSRF không hợp lệ.');
  }
  return payload.csrfToken.trim();
}

interface AuthResponse {
  readonly response: Response;
  readonly body: unknown;
}

async function fetchAuth(
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<AuthResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    AUTH_REQUEST_TIMEOUT_MS,
  );
  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    const text = await response.text();
    if (!text) {
      return { response, body: null };
    }
    try {
      return {
        response,
        body: JSON.parse(text) as unknown,
      };
    } catch {
      if (!response.ok) {
        return { response, body: text };
      }
      throw new Error('Phản hồi máy chủ không hợp lệ.');
    }
  } catch (error) {
    if (controller.signal.aborted) {
      throw requestTimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function hasCsrfRejectionCode(body: unknown): boolean {
  const payload = normalizeObject(body);
  return payload?.code === 'AUTH_CSRF_REJECTED';
}

async function fetchCsrf(): Promise<string> {
  const result = await fetchAuth(apiUrl('/tai-khoan/csrf'), { credentials: 'include' });
  if (!result.response.ok) {
    throw new Error('Không thể khởi tạo bảo vệ CSRF.');
  }
  return parseCsrfToken(result.body);
}

async function postAuth(path: string, csrfToken: string, body?: unknown, accessToken?: string): Promise<AuthResponse> {
  const headers = new Headers({ 'X-CSRF-Token': csrfToken });
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return fetchAuth(apiUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export interface PreSessionResult {
  readonly ok: boolean;
  readonly status: number;
  readonly body: unknown;
}

/**
 * GET cho các luồng chạy khi CHƯA có phiên: cookie đi kèm là thứ duy nhất nhận dạng người
 * gọi, nên bắt buộc `credentials: 'include'`.
 */
export async function getPreSessionResource(path: string): Promise<PreSessionResult> {
  const result = await fetchAuth(apiUrl(path), { credentials: 'include' });
  return { ok: result.response.ok, status: result.response.status, body: result.body };
}

/**
 * POST có bảo vệ CSRF cho các luồng chạy khi chưa có phiên — hiện là bước hoàn tất đăng ký
 * bằng provider.
 *
 * Nằm ở đây chứ không phải trong `SocialAuthApi` vì chỉ một module được sở hữu CSRF token.
 * Nhân bản chỗ lấy token ra nơi khác là mở thêm một chỗ nữa có thể quên vòng lấy lại khi
 * máy chủ từ chối token cũ.
 */
export async function postPreSessionMutation(
  path: string,
  body?: unknown,
): Promise<PreSessionResult> {
  let csrfToken = await fetchCsrf();
  let result = await postAuth(path, csrfToken, body);
  if (result.response.status === 403 && hasCsrfRejectionCode(result.body)) {
    csrfToken = await fetchCsrf();
    result = await postAuth(path, csrfToken, body);
  }
  return { ok: result.response.ok, status: result.response.status, body: result.body };
}

function validateLoginInput(input: LoginAuthInput): void {
  if (!input || typeof input.username !== 'string' || !input.username.trim() ||
      typeof input.password !== 'string' || !input.password || typeof input.rememberMe !== 'boolean') {
    throw new Error('Thông tin đăng nhập không hợp lệ.');
  }
  if (input.beforeInstall !== undefined && typeof input.beforeInstall !== 'function') {
    throw new Error('beforeInstall phải là một hàm đồng bộ.');
  }
}

function currentSession(): SessionCredentials | null {
  return credentials && snapshot.status === 'authenticated' ? credentials : null;
}

async function refreshWithCsrf(
  expectedRevision: number,
  csrfToken: string,
  retryCsrf: boolean,
  notify = true,
  lease: AuthCoordinationLease = UNCOORDINATED_LEASE,
): Promise<boolean> {
  let result: AuthResponse;
  try {
    result = await postAuth('/tai-khoan/refresh', csrfToken);
  } catch (error) {
    if (revision === expectedRevision) {
      setUnknown();
    }
    throw error;
  }

  const { response, body: responseBody } = result;
  if (response.status === 401) {
    if (revision === expectedRevision) {
      setGuest();
    }
    return false;
  }

  if (response.status === 403 && retryCsrf && hasCsrfRejectionCode(responseBody)) {
    let replacementCsrf: string;
    try {
      replacementCsrf = await fetchCsrf();
    } catch (error) {
      if (revision === expectedRevision) {
        setUnknown();
      }
      throw error;
    }
    return refreshWithCsrf(expectedRevision, replacementCsrf, false, notify, lease);
  }

  if (!response.ok) {
    if (revision === expectedRevision) {
      setUnknown();
    }
    return false;
  }

  let parsed: ParsedAuthResponse;
  try {
    parsed = parseAuthResponse(responseBody);
  } catch (error) {
    if (revision === expectedRevision) {
      setUnknown();
    }
    throw error;
  }

  lease.assertOwnership();
  return install(parsed, csrfToken, expectedRevision, notify) !== null;
}

export function subscribeAuthSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Runs before public subscribers can observe an authentication transition. */
export function subscribeAuthTransition(
  listener: (previous: AuthSnapshot, next: AuthSnapshot) => void,
): () => void {
  transitionListeners.add(listener);
  return () => transitionListeners.delete(listener);
}

export function getAuthSnapshot(): AuthSnapshot {
  currentSession();
  return snapshot;
}

export function useAuthSession(): AuthSnapshot {
  return useSyncExternalStore(subscribeAuthSession, getAuthSnapshot, getAuthSnapshot);
}

export async function bootstrapAuth(notify = false): Promise<AuthSnapshot> {
  if (bootstrapFlight) {
    return bootstrapFlight;
  }

  const flight = withAuthCoordinationLock(async (lease) => {
    const expectedRevision = revision;
    try {
      const csrfToken = await fetchCsrf();
      lease.assertOwnership();
      await refreshWithCsrf(expectedRevision, csrfToken, true, notify, lease);
      return getAuthSnapshot();
    } catch (error) {
      if (revision === expectedRevision) {
        setUnknown();
      }
      throw error;
    }
  }).finally(() => {
    if (bootstrapFlight === flight) {
      bootstrapFlight = null;
    }
    if (crossTabBootstrapQueued && snapshot.status === 'unknown') {
      requestCrossTabBootstrap();
    } else {
      crossTabBootstrapQueued = false;
    }
  });
  bootstrapFlight = flight;
  return flight;
}

export async function loginAuth(input: LoginAuthInput): Promise<AuthSnapshot> {
  validateLoginInput(input);
  return withAuthCoordinationLock(async (lease) => {
    const expectedRevision = revision;
    const csrfToken = await fetchCsrf();
    const result = await postAuth('/tai-khoan/dang-nhap', csrfToken, {
      username: input.username.trim(),
      password: input.password,
      rememberMe: input.rememberMe,
    });
    if (!result.response.ok) {
      throw new Error('Đăng nhập không thành công.');
    }
    const parsed = parseAuthResponse(result.body);
    try {
      const callbackResult = input.beforeInstall?.(Object.freeze({
        uid: parsed.uid,
        username: parsed.username,
        roles: parsed.roles,
      }));
      if (callbackResult && typeof (callbackResult as PromiseLike<unknown>).then === 'function') {
        throw new Error('beforeInstall phải hoàn tất đồng bộ.');
      }
      lease.assertOwnership();
      const installed = install(parsed, csrfToken, expectedRevision);
      if (!installed) {
        throw new Error('Phiên đăng nhập đã bị thay thế.');
      }
      return installed;
    } catch (error) {
      try {
        await postAuth('/tai-khoan/dang-xuat', csrfToken, undefined, parsed.accessToken);
      } catch {
        // The local session was never installed; the server attempt is best-effort compensation.
      }
      throw error;
    }
  });
}

export async function logoutAuth(): Promise<AuthSnapshot> {
  const session = currentSession();
  setGuest();
  if (!session) {
    return getAuthSnapshot();
  }

  try {
    await withAuthCoordinationLock(async () => {
      let csrfToken = session.csrfToken;
      try {
        csrfToken = await fetchCsrf();
      } catch {
        // Use the captured CSRF value when refreshing it is unavailable.
      }
      const result = await postAuth('/tai-khoan/dang-xuat', csrfToken);
      if (!result.response.ok) {
        throw new Error('Đăng xuất trên máy chủ không thành công.');
      }
    });
  } catch {
    // Local logout is complete even when an offline client cannot notify the server.
  }
  return getAuthSnapshot();
}

export function captureAuthenticatedRequest(): AuthenticatedRequestCapture | null {
  const session = currentSession();
  return session ? Object.freeze({ accessToken: session.accessToken, revision: session.revision }) : null;
}

export function isCurrentAuthCapture(capture: AuthenticatedRequestCapture | null): boolean {
  const session = currentSession();
  return Boolean(capture && session && capture.revision === session.revision && capture.accessToken === session.accessToken);
}

export async function refreshForRequest(capture: AuthenticatedRequestCapture | null): Promise<boolean> {
  if (!capture || !isCurrentAuthCapture(capture)) {
    return false;
  }
  const captureRevision = capture.revision;
  if (refreshFlight?.revision === captureRevision) {
    return refreshFlight.promise;
  }

  const session = currentSession();
  if (!session) {
    return false;
  }
  const flightRevision = captureRevision;
  const promise = withAuthCoordinationLock((lease) => refreshWithCsrf(
    flightRevision,
    session.csrfToken,
    true,
    false,
    lease,
  )).finally(() => {
      if (refreshFlight?.revision === flightRevision) {
        refreshFlight = null;
      }
    });
  refreshFlight = { revision: flightRevision, promise };
  return promise;
}

/** Invalidates only the session that began the failed request. */
export function invalidateAuthCapture(capture: AuthenticatedRequestCapture | null): boolean {
  if (!isCurrentAuthCapture(capture)) {
    return false;
  }
  setGuest();
  return true;
}

/** Test-only reset to keep the external singleton isolated between Jest cases. */
export function resetAuthSessionForTests(): void {
  snapshot = UNKNOWN_SNAPSHOT;
  credentials = null;
  revision = 0;
  bootstrapFlight = null;
  crossTabBootstrapQueued = false;
  refreshFlight = null;
  listeners.clear();
  transitionListeners.clear();
}
