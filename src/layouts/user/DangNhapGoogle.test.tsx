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
}));

const mockedStatus = getSocialProviderStatus as jest.MockedFunction<typeof getSocialProviderStatus>;

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
    mockedStatus.mockResolvedValue({ google: true });

    renderLogin();

    expect(await screen.findByRole('link', { name: GOOGLE_LABEL })).toBeInTheDocument();
  });

  /**
   * Rendering the button while the provider is off would send users to an endpoint that
   * answers 404, which reads as a broken site rather than a disabled feature.
   */
  it('hides the Google button when the backend reports it disabled', async () => {
    mockedStatus.mockResolvedValue({ google: false });

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
    mockedStatus.mockResolvedValue({ google: true });

    renderLogin();

    const link = await screen.findByRole('link', { name: GOOGLE_LABEL });
    expect(link).toHaveAttribute('href', '/tai-khoan/oauth/google/start');
  });

  it('keeps the password form usable alongside the provider button', async () => {
    mockedStatus.mockResolvedValue({ google: true });

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
    mockedStatus.mockResolvedValue({ google: true });

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
    mockedStatus.mockResolvedValue({ google: true });

    renderLogin();

    const link = await screen.findByRole('link', { name: GOOGLE_LABEL });
    expect(link).toHaveClass('btn-social-google');
    expect(link).not.toHaveClass('btn-modern-outline-primary');
  });

  /** The mark is decorative; the visible label already names the action. */
  it('hides the decorative logo from assistive technology', async () => {
    mockedStatus.mockResolvedValue({ google: true });

    renderLogin();

    const link = await screen.findByRole('link', { name: GOOGLE_LABEL });
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(link).toHaveAccessibleName(GOOGLE_LABEL);
  });
});
