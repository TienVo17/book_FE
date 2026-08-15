import { facebookLoginUrl, getSocialProviderStatus, googleLoginUrl } from './SocialAuthApi';
import { publicRequest } from './Request';

jest.mock('./Request', () => ({
  publicRequest: jest.fn(),
}));

const mockedPublicRequest = publicRequest as jest.MockedFunction<typeof publicRequest>;

describe('SocialAuthApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockJson(body: unknown): void {
    mockedPublicRequest.mockResolvedValue(body as never);
  }

  it('reports google as available when the backend enables it', async () => {
    mockJson({ google: true, facebook: false });

    await expect(getSocialProviderStatus()).resolves.toEqual({ google: true, facebook: false });
  });

  it('reports google as unavailable when the backend disables it', async () => {
    mockJson({ google: false, facebook: false });

    await expect(getSocialProviderStatus()).resolves.toEqual({ google: false, facebook: false });
  });

  /** Each provider is gated independently, so one being live must not imply the other. */
  it('reports each provider independently', async () => {
    mockJson({ google: false, facebook: true });
    await expect(getSocialProviderStatus()).resolves.toEqual({ google: false, facebook: true });

    mockJson({ google: true, facebook: true });
    await expect(getSocialProviderStatus()).resolves.toEqual({ google: true, facebook: true });
  });

  /** A backend that predates Facebook support omits the field entirely. */
  it('treats a missing facebook field as unavailable', async () => {
    mockJson({ google: true });

    await expect(getSocialProviderStatus()).resolves.toEqual({ google: true, facebook: false });
  });

  /**
   * A failed or malformed status check must hide the button rather than render one that
   * leads to a 404, which would look like a broken site to the user.
   */
  it('treats an unreachable or malformed status as unavailable', async () => {
    mockedPublicRequest.mockRejectedValue(new TypeError('offline'));
    await expect(getSocialProviderStatus()).resolves.toEqual({ google: false, facebook: false });

    mockJson({ google: 'yes', facebook: 1 });
    await expect(getSocialProviderStatus()).resolves.toEqual({ google: false, facebook: false });

    mockJson(null);
    await expect(getSocialProviderStatus()).resolves.toEqual({ google: false, facebook: false });
  });

  /** A 404 while the provider is disabled surfaces as a rejection from the shared layer. */
  it('treats an error response as unavailable', async () => {
    mockedPublicRequest.mockRejectedValue(new Error('Không thể truy cập'));

    await expect(getSocialProviderStatus()).resolves.toEqual({ google: false, facebook: false });
  });

  it('requests the status through the shared API resolver', async () => {
    mockJson({ google: false });

    await getSocialProviderStatus();

    const [url] = mockedPublicRequest.mock.calls[0];
    // Development keeps the localhost origin; production resolves the same path
    // root-relative so it travels through the same-origin proxy.
    expect(url).toMatch(/^(http:\/\/localhost:8080)?\/tai-khoan\/oauth\/trang-thai$/);
  });

  /**
   * Login start is a top-level navigation, not a fetch: the browser must follow the redirect
   * to Google and carry the binding cookie the backend sets.
   */
  it('exposes the google start path through the shared API resolver', () => {
    expect(googleLoginUrl()).toMatch(
      /^(http:\/\/localhost:8080)?\/tai-khoan\/oauth\/google\/start$/);
  });

  /**
   * The provider URL is built server-side. If the frontend pointed straight at Google, the
   * state and PKCE challenge would never be minted and the flow would be unverifiable.
   */
  it('never points the login target at the provider directly', () => {
    expect(googleLoginUrl()).not.toContain('accounts.google.com');
    expect(googleLoginUrl()).toContain('/tai-khoan/oauth/google/start');

    expect(facebookLoginUrl()).not.toContain('facebook.com');
    expect(facebookLoginUrl()).toContain('/tai-khoan/oauth/facebook/start');
  });

  it('exposes the facebook start path through the shared API resolver', () => {
    expect(facebookLoginUrl()).toMatch(
      /^(http:\/\/localhost:8080)?\/tai-khoan\/oauth\/facebook\/start$/);
  });
});
