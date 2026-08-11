import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import DangNhap from './DangNhap';
import Navbar from '../header-footer/Navbar';
import { dangNhap } from '../../api/TaiKhoanApi';
import {
  loadCart,
  mergeGuestCartAfterLogin,
  readCartForCurrentSession,
  readGuestCartSnapshot,
} from '../../api/CartSession';
import { getAllTheLoai } from '../../api/TheLoaiApi';
import {
  AUTH_SESSION_CHANGED_EVENT,
} from '../../api/SessionCleanup';

jest.mock('../../api/TaiKhoanApi', () => ({ dangNhap: jest.fn() }));
jest.mock('../../api/CartSession', () => ({
  mergeGuestCartAfterLogin: jest.fn(),
  readGuestCartSnapshot: jest.fn(),
  readPendingCartMerge: jest.fn(() => null),
  readCartForCurrentSession: jest.fn(() => []),
  loadCart: jest.fn(() => Promise.resolve([])),
  signOutCartSession: jest.fn(),
}));
jest.mock('../../api/TheLoaiApi', () => ({ getAllTheLoai: jest.fn(() => Promise.resolve([])) }));
jest.mock('../../api/SachApi', () => ({ getGoiYTimKiem: jest.fn(() => Promise.resolve([])) }));

jest.mock('../../api/SessionCleanup', () => ({
  ...jest.requireActual('../../api/SessionCleanup'),
  clearAuthenticatedSessionState: jest.fn(),
}));

const mockedDangNhap = dangNhap as jest.MockedFunction<typeof dangNhap>;
const mockedLoadCart = loadCart as jest.MockedFunction<typeof loadCart>;
const mockedMergeGuestCart = mergeGuestCartAfterLogin as jest.MockedFunction<typeof mergeGuestCartAfterLogin>;
const mockedReadCartForCurrentSession = readCartForCurrentSession as jest.MockedFunction<typeof readCartForCurrentSession>;
const mockedReadGuestSnapshot = readGuestCartSnapshot as jest.MockedFunction<typeof readGuestCartSnapshot>;
const mockedGetAllTheLoai = getAllTheLoai as jest.MockedFunction<typeof getAllTheLoai>;

function ViTriHienTai(): JSX.Element {
  const location = useLocation();
  return <output data-testid="vi-tri">{location.pathname}</output>;
}

function renderLogin(withNavbar = false): void {
  render(
    <MemoryRouter initialEntries={['/dang-nhap']}>
      {withNavbar && <Navbar />}
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

describe('DangNhap cart handoff', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockedDangNhap.mockResolvedValue({ jwt: 'new-jwt' });
    mockedLoadCart.mockResolvedValue([]);
    mockedReadGuestSnapshot.mockReturnValue([]);
    mockedReadCartForCurrentSession.mockReturnValue([]);
    mockedMergeGuestCart.mockResolvedValue(null);
    mockedGetAllTheLoai.mockResolvedValue([]);
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('stores the JWT, awaits guest-cart merge, then continues to checkout', async () => {
    const snapshot = [{
      maSach: 1,
      sachDto: { tenSach: 'Guest book', giaBan: 100000, hinhAnh: '' },
      soLuong: 2,
    }];
    mockedReadGuestSnapshot.mockReturnValue(snapshot);
    localStorage.setItem('nextPay', 'true');
    renderLogin();

    submitLogin();

    await waitFor(() => expect(mockedMergeGuestCart).toHaveBeenCalledWith(snapshot));
    expect(localStorage.getItem('jwt')).toBe('new-jwt');
    await waitFor(() => expect(screen.getByTestId('vi-tri')).toHaveTextContent('/thanh-toan'));
    expect(localStorage.getItem('nextPay')).toBeNull();
  });

  it('notifies the new auth session before a pending cart merge resolves', async () => {
    let resolveMerge!: () => void;
    const sessionChanged = jest.fn();
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, sessionChanged);
    mockedMergeGuestCart.mockReturnValue(new Promise(resolve => { resolveMerge = () => resolve(null); }));
    renderLogin();

    submitLogin();
    await waitFor(() => expect(mockedMergeGuestCart).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem('jwt')).toBe('new-jwt');
    expect(sessionChanged).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('vi-tri')).toHaveTextContent('/dang-nhap');

    resolveMerge();
    await waitFor(() => expect(screen.getByTestId('vi-tri')).toHaveTextContent('/'));
    window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, sessionChanged);
  });

  it('captures guest items added while the login request is pending', async () => {
    let resolveLogin!: (value: { jwt: string }) => void;
    mockedDangNhap.mockReturnValue(new Promise(resolve => { resolveLogin = resolve; }));
    const latestSnapshot = [{
      maSach: 4,
      sachDto: { tenSach: 'Added during login', giaBan: 80000, hinhAnh: '' },
      soLuong: 1,
    }];
    mockedReadGuestSnapshot.mockReturnValue(latestSnapshot);
    renderLogin();

    submitLogin();
    expect(mockedReadGuestSnapshot).not.toHaveBeenCalled();
    resolveLogin({ jwt: 'new-jwt' });

    await waitFor(() => expect(mockedMergeGuestCart).toHaveBeenCalledWith(latestSnapshot));
  });

  it('ignores a duplicate submit while login is pending', async () => {
    let resolveLogin!: (value: { jwt: string }) => void;
    mockedDangNhap.mockReturnValue(new Promise(resolve => { resolveLogin = resolve; }));
    renderLogin();

    submitLogin();
    fireEvent.submit(screen.getByLabelText('Tên đăng nhập').closest('form') as HTMLFormElement);
    expect(mockedDangNhap).toHaveBeenCalledTimes(1);

    resolveLogin({ jwt: 'new-jwt' });
    await waitFor(() => expect(mockedMergeGuestCart).toHaveBeenCalledTimes(1));
  });

  it('updates the mounted Navbar after login without a page reload', async () => {
    const payload = btoa(JSON.stringify({
      exp: Math.floor((Date.now() + 60_000) / 1000),
      sub: 'customer',
    }));
    mockedDangNhap.mockResolvedValue({ jwt: `header.${payload}.signature` });
    renderLogin(true);

    expect(screen.getByRole('link', { name: /đăng nhập/i })).toBeInTheDocument();
    submitLogin();

    await waitFor(() => expect(screen.getByRole('button', { name: /customer/i })).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /đăng nhập/i })).not.toBeInTheDocument();
  });
});
