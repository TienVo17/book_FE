import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DangNhap from './DangNhap';
import { getSocialProviderStatus } from '../../api/SocialAuthApi';

jest.mock('../../api/AuthSession', () => ({
  loginAuth: jest.fn(),
  logoutAuth: jest.fn(),
}));
jest.mock('../../api/CartSession', () => ({
  claimGuestCartForAccount: jest.fn(),
  mergeGuestCartAfterLogin: jest.fn(),
  preserveFailedLoginHandoffForLogout: jest.fn(),
  readGuestCartSnapshot: jest.fn(() => []),
  signOutCartSession: jest.fn(),
}));
jest.mock('../../api/SocialAuthApi', () => ({
  getSocialProviderStatus: jest.fn(),
  googleLoginUrl: () => '/tai-khoan/oauth/google/start',
  facebookLoginUrl: () => '/tai-khoan/oauth/facebook/start',
}));

const mockedStatus = getSocialProviderStatus as jest.MockedFunction<typeof getSocialProviderStatus>;
const FACEBOOK_LABEL = 'Đăng nhập bằng Facebook';

function renderLogin(): void {
  render(
    <MemoryRouter initialEntries={['/dang-nhap']}>
      <DangNhap />
    </MemoryRouter>,
  );
}

const GOOGLE_LABEL = 'Đăng nhập bằng Google';

describe('DangNhap Google provider button', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('shows the Google button when the backend reports it enabled', async () => {
    mockedStatus.mockResolvedValue({ google: true, facebook: false });

    renderLogin();

    expect(await screen.findByRole('link', { name: GOOGLE_LABEL })).toBeInTheDocument();
  });

  /**
   * Rendering the button while the provider is off would send users to an endpoint that
   * answers 404, which reads as a broken site rather than a disabled feature.
   */
  it('hides the Google button when the backend reports it disabled', async () => {
    mockedStatus.mockResolvedValue({ google: false, facebook: false });

    renderLogin();

    await waitFor(() => expect(mockedStatus).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('link', { name: GOOGLE_LABEL })).not.toBeInTheDocument();
  });

  it('hides the Google button while the status is still unknown', () => {
    mockedStatus.mockReturnValue(new Promise(() => undefined));

    renderLogin();

    expect(screen.queryByRole('link', { name: GOOGLE_LABEL })).not.toBeInTheDocument();
  });

  it('hides the Google button when the status check fails', async () => {
    mockedStatus.mockRejectedValue(new TypeError('offline'));

    renderLogin();

    await waitFor(() => expect(mockedStatus).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('link', { name: GOOGLE_LABEL })).not.toBeInTheDocument();
  });

  /**
   * The flow must start as a real navigation so the browser follows the backend redirect and
   * stores the binding cookie. A fetch-driven button would break the flow silently.
   */
  it('starts the flow as a top-level navigation to the backend', async () => {
    mockedStatus.mockResolvedValue({ google: true, facebook: false });

    renderLogin();

    const link = await screen.findByRole('link', { name: GOOGLE_LABEL });
    expect(link).toHaveAttribute('href', '/tai-khoan/oauth/google/start');
  });

  it('keeps the password form usable alongside the provider button', async () => {
    mockedStatus.mockResolvedValue({ google: true, facebook: false });

    renderLogin();

    await screen.findByRole('link', { name: GOOGLE_LABEL });
    expect(screen.getByLabelText('Tên đăng nhập')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument();
  });

  /**
   * Google's brand terms require the four-colour mark to be used as-is. A monochrome icon
   * font would inherit the site's text colour, and the hover state that flips text to white
   * would erase the logo entirely.
   */
  it('renders the four-colour Google mark rather than a recolourable glyph', async () => {
    mockedStatus.mockResolvedValue({ google: true, facebook: false });

    renderLogin();

    const link = await screen.findByRole('link', { name: GOOGLE_LABEL });
    const logo = link.querySelector('svg.social-logo');
    expect(logo).toBeInTheDocument();

    const fills = Array.from(logo!.querySelectorAll('path'))
      .map((node) => node.getAttribute('fill'));
    expect(fills).toEqual(
      expect.arrayContaining(['#EA4335', '#4285F4', '#FBBC05', '#34A853']));
    expect(link.querySelector('i.fab')).toBeNull();
  });

  /** The site's outline button flips its text to white on hover, which would hide the mark. */
  it('does not reuse the site button style that recolours its contents', async () => {
    mockedStatus.mockResolvedValue({ google: true, facebook: false });

    renderLogin();

    const link = await screen.findByRole('link', { name: GOOGLE_LABEL });
    expect(link).toHaveClass('btn-social-google');
    expect(link).not.toHaveClass('btn-modern-outline-primary');
  });

  /** The mark is decorative; the visible label already names the action. */
  it('hides the decorative logo from assistive technology', async () => {
    mockedStatus.mockResolvedValue({ google: true, facebook: false });

    renderLogin();

    const link = await screen.findByRole('link', { name: GOOGLE_LABEL });
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(link).toHaveAccessibleName(GOOGLE_LABEL);
  });
});

describe('DangNhap Facebook provider button', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('shows the Facebook button when the backend reports it enabled', async () => {
    mockedStatus.mockResolvedValue({ google: false, facebook: true });

    renderLogin();

    const link = await screen.findByRole('link', { name: FACEBOOK_LABEL });
    expect(link).toHaveAttribute('href', '/tai-khoan/oauth/facebook/start');
  });

  it('hides the Facebook button when the backend reports it disabled', async () => {
    mockedStatus.mockResolvedValue({ google: true, facebook: false });

    renderLogin();

    await screen.findByRole('link', { name: GOOGLE_LABEL });
    expect(screen.queryByRole('link', { name: FACEBOOK_LABEL })).not.toBeInTheDocument();
  });

  /** Each provider is gated on its own, so one being live must not surface the other. */
  it('shows each provider independently', async () => {
    mockedStatus.mockResolvedValue({ google: true, facebook: true });

    renderLogin();

    expect(await screen.findByRole('link', { name: GOOGLE_LABEL })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: FACEBOOK_LABEL })).toBeInTheDocument();
  });

  /**
   * Facebook's brand guidelines require the mark on its own blue, unaltered. The site's
   * outline button would recolour it on hover exactly as it did to the Google mark.
   */
  it('renders the Facebook mark with its own brand colour', async () => {
    mockedStatus.mockResolvedValue({ google: false, facebook: true });

    renderLogin();

    const link = await screen.findByRole('link', { name: FACEBOOK_LABEL });
    const logo = link.querySelector('svg.social-logo');
    expect(logo).toBeInTheDocument();
    expect(logo!.querySelector('path')?.getAttribute('fill')).toBe('#FFFFFF');
    expect(link).toHaveClass('btn-social-facebook');
    expect(link).not.toHaveClass('btn-modern-outline-primary');
    expect(link.querySelector('i.fab')).toBeNull();
  });

  it('hides the decorative Facebook logo from assistive technology', async () => {
    mockedStatus.mockResolvedValue({ google: false, facebook: true });

    renderLogin();

    const link = await screen.findByRole('link', { name: FACEBOOK_LABEL });
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(link).toHaveAccessibleName(FACEBOOK_LABEL);
  });

  it('shows the divider only when at least one provider is available', async () => {
    mockedStatus.mockResolvedValue({ google: false, facebook: false });

    const { container } = render(
      <MemoryRouter initialEntries={['/dang-nhap']}>
        <DangNhap />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mockedStatus).toHaveBeenCalledTimes(1));
    expect(container.querySelector('.auth-divider')).toBeNull();
  });
});
