import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import DangNhap from './DangNhap';
import { loginAuth, logoutAuth } from '../../api/AuthSession';
import {
  claimGuestCartForAccount,
  mergeGuestCartAfterLogin,
  preserveFailedLoginHandoffForLogout,
  readGuestCartSnapshot,
} from '../../api/CartSession';

jest.mock('../../api/AuthSession', () => ({
  loginAuth: jest.fn(),
  logoutAuth: jest.fn(),
}));
jest.mock('../../api/CartSession', () => ({
  claimGuestCartForAccount: jest.fn(),
  mergeGuestCartAfterLogin: jest.fn(),
  preserveFailedLoginHandoffForLogout: jest.fn(),
  readGuestCartSnapshot: jest.fn(),
  signOutCartSession: jest.fn(),
}));

const mockedLoginAuth = loginAuth as jest.MockedFunction<typeof loginAuth>;
const mockedLogoutAuth = logoutAuth as jest.MockedFunction<typeof logoutAuth>;
const mockedClaimGuestCart = claimGuestCartForAccount as jest.MockedFunction<typeof claimGuestCartForAccount>;
const mockedMergeGuestCart = mergeGuestCartAfterLogin as jest.MockedFunction<typeof mergeGuestCartAfterLogin>;
const mockedPreserveFailedHandoff = preserveFailedLoginHandoffForLogout as jest.MockedFunction<typeof preserveFailedLoginHandoffForLogout>;
const mockedReadGuestSnapshot = readGuestCartSnapshot as jest.MockedFunction<typeof readGuestCartSnapshot>;

function ViTriHienTai(): JSX.Element {
  const location = useLocation();
  return <output data-testid="vi-tri">{location.pathname}</output>;
}

function renderLogin(): void {
  render(
    <MemoryRouter initialEntries={['/dang-nhap']}>
      <DangNhap />
      <ViTriHienTai />
    </MemoryRouter>,
  );
}

function submitLogin(): void {
  fireEvent.change(screen.getByLabelText('Tên đăng nhập'), { target: { value: 'customer' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'password' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Đăng nhập' }).closest('form') as HTMLFormElement);
}

describe('DangNhap AuthSession handoff', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockedLoginAuth.mockResolvedValue({
      status: 'authenticated', uid: 1, username: 'customer', roles: ['USER'], capabilities: ['USER'],
    });
    mockedLogoutAuth.mockResolvedValue({ status: 'guest', uid: null, username: null, roles: [], capabilities: [] });
    mockedReadGuestSnapshot.mockReturnValue([]);
    mockedMergeGuestCart.mockResolvedValue(null);
  });

  it('passes controlled credentials and remember-me to AuthSession without persisting a JWT', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ghi nhớ' }));
    submitLogin();

    await waitFor(() => expect(mockedLoginAuth).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockedMergeGuestCart).toHaveBeenCalledTimes(1));
    expect(mockedLoginAuth.mock.calls[0][0]).toMatchObject({
      username: 'customer', password: 'password', rememberMe: true,
    });
    expect(localStorage.length).toBe(0);
  });

  it('captures the guest cart in beforeInstall, merges it, then continues checkout', async () => {
    const snapshot = [{ maSach: 1, sachDto: { tenSach: 'Guest book', giaBan: 100000, hinhAnh: '' }, soLuong: 2 }];
    mockedReadGuestSnapshot.mockReturnValue(snapshot);
    localStorage.setItem('nextPay', 'true');
    mockedLoginAuth.mockImplementation(async (input) => {
      input.beforeInstall?.({ uid: 1, username: 'customer', roles: ['USER'] });
      return { status: 'authenticated', uid: 1, username: 'customer', roles: ['USER'], capabilities: ['USER'] };
    });
    renderLogin();

    submitLogin();

    await waitFor(() => expect(mockedMergeGuestCart).toHaveBeenCalledWith(snapshot));
    expect(mockedReadGuestSnapshot).toHaveBeenCalledTimes(1);
    expect(mockedClaimGuestCart).toHaveBeenCalledWith(1, snapshot);
    expect(screen.getByTestId('vi-tri')).toHaveTextContent('/thanh-toan');
    expect(localStorage.getItem('nextPay')).toBeNull();
  });

  it('ignores a duplicate submit while login is pending', async () => {
    let resolveLogin!: (value: Awaited<ReturnType<typeof loginAuth>>) => void;
    mockedLoginAuth.mockReturnValue(new Promise(resolve => { resolveLogin = resolve; }));
    renderLogin();

    submitLogin();
    fireEvent.submit(screen.getByLabelText('Tên đăng nhập').closest('form') as HTMLFormElement);
    expect(mockedLoginAuth).toHaveBeenCalledTimes(1);

    resolveLogin({ status: 'authenticated', uid: 1, username: 'customer', roles: ['USER'], capabilities: ['USER'] });
    await waitFor(() => expect(mockedMergeGuestCart).toHaveBeenCalledTimes(1));
  });

  it('does not log out or invalidate other tabs when credentials are rejected before install', async () => {
    mockedLoginAuth.mockRejectedValue(new Error('Đăng nhập không thành công.'));
    renderLogin();

    submitLogin();

    expect(await screen.findByRole('alert')).toHaveTextContent('Đăng nhập không thành công.');
    expect(mockedPreserveFailedHandoff).not.toHaveBeenCalled();
    expect(mockedLogoutAuth).not.toHaveBeenCalled();
  });

  it('fails closed when the post-login guest-cart merge fails and preserves checkout intent', async () => {
    localStorage.setItem('nextPay', 'true');
    mockedMergeGuestCart.mockRejectedValue(new Error('Không thể chuyển giỏ hàng'));
    renderLogin();

    submitLogin();

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể chuyển giỏ hàng');
    expect(mockedPreserveFailedHandoff).toHaveBeenCalledTimes(1);
    expect(mockedPreserveFailedHandoff.mock.invocationCallOrder[0])
      .toBeLessThan(mockedLogoutAuth.mock.invocationCallOrder[0]);
    expect(mockedLogoutAuth).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('nextPay')).toBe('true');
    expect(screen.getByTestId('vi-tri')).toHaveTextContent('/dang-nhap');
  });

  it('still logs out when preserving a failed handoff throws', async () => {
    mockedMergeGuestCart.mockRejectedValue(new Error('Không thể chuyển giỏ hàng'));
    mockedPreserveFailedHandoff.mockImplementation(() => {
      throw new DOMException('storage blocked', 'SecurityError');
    });
    renderLogin();

    submitLogin();

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể chuyển giỏ hàng');
    expect(mockedLogoutAuth).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('vi-tri')).toHaveTextContent('/dang-nhap');
  });
});
