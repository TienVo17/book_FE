import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { bootstrapAuth, useAuthSession } from './api/AuthSession';

jest.mock('./api/AuthSession', () => ({
  bootstrapAuth: jest.fn(),
  useAuthSession: jest.fn(),
}));

jest.mock('./layouts/utils/RouteMetadata', () => () => null);
jest.mock('./layouts/utils/WishlistBootstrap', () => () => <div>private wishlist hydration</div>);
jest.mock('./layouts/utils/RouteGuard', () => ({ children }: { children: React.ReactNode }) => <>{children}</>);
jest.mock('./layouts/header-footer/Navbar', () => () => <div>navbar</div>);
jest.mock('./layouts/header-footer/Footer', () => () => <div>footer</div>);
jest.mock('./layouts/homepage/HomePage', () => () => <div>public home</div>);
jest.mock('./layouts/products/KetQuaThanhToan', () => () => <div>public VNPay result</div>);
jest.mock('react-toastify', () => ({ ToastContainer: () => null }));

jest.mock('./layouts/about/About', () => () => null);
jest.mock('./layouts/utils/NotFound', () => () => null);
jest.mock('./layouts/products/ChiTietSanPham', () => () => null);
jest.mock('./layouts/user/DangKyNguoiDung', () => () => null);
jest.mock('./layouts/user/KichHoatTaiKhoan', () => () => null);
jest.mock('./layouts/user/DangNhap', () => () => null);
jest.mock('./layouts/admin/layouts/AdminLayout', () => () => null);
jest.mock('./layouts/products/GioHang', () => () => null);
jest.mock('./layouts/products/ThanhToan', () => () => null);
jest.mock('./layouts/products/DonHangUser', () => () => null);
jest.mock('./layouts/products/ChiTietDonHangUser', () => () => null);
jest.mock('./layouts/user/HoSoNguoiDung', () => () => null);
jest.mock('./layouts/user/QuenMatKhau', () => () => null);
jest.mock('./layouts/user/DatLaiMatKhau', () => () => null);
jest.mock('./layouts/user/DanhSachYeuThich', () => () => null);
jest.mock('./layouts/categories/TheLoaiPage', () => () => null);
jest.mock('./layouts/user/DiaChiNguoiDung', () => () => null);
jest.mock('./layouts/search/TimKiemPage', () => () => null);
jest.mock('./layouts/chinh-sach/ChinhSachPage', () => () => null);
jest.mock('./layouts/nhan-tin/HuyNhanTin', () => () => null);
jest.mock('./layouts/nhan-tin/XacNhanNhanTin', () => () => null);

const mockedBootstrapAuth = bootstrapAuth as jest.MockedFunction<typeof bootstrapAuth>;
const mockedUseAuthSession = useAuthSession as jest.MockedFunction<typeof useAuthSession>;

const unknownAuth = {
  status: 'unknown' as const,
  uid: null,
  username: null,
  roles: [],
  capabilities: [],
};

describe('App auth bootstrap boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState({}, '', '/');
    mockedUseAuthSession.mockReturnValue(unknownAuth);
    mockedBootstrapAuth.mockReturnValue(new Promise(() => undefined));
  });

  it('mounts public content without waiting for bootstrap to settle', () => {
    render(<App />);

    expect(screen.getByText('public home')).toBeInTheDocument();
    expect(mockedBootstrapAuth).toHaveBeenCalledTimes(1);
  });

  it('offers a visible retry when bootstrap fails while preserving unknown', async () => {
    mockedBootstrapAuth
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockReturnValueOnce(new Promise(() => undefined));

    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể kiểm tra phiên đăng nhập');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(mockedBootstrapAuth).toHaveBeenCalledTimes(2));
    expect(screen.getByText('public home')).toBeInTheDocument();
  });

  it('offers a visible retry when bootstrap resolves without leaving unknown', async () => {
    mockedBootstrapAuth
      .mockResolvedValueOnce(unknownAuth)
      .mockReturnValueOnce(new Promise(() => undefined));

    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể kiểm tra phiên đăng nhập');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(mockedBootstrapAuth).toHaveBeenCalledTimes(2));
  });

  it('keeps the public VNPay return route available while auth is unknown', () => {
    window.history.replaceState({}, '', '/xu-ly-kq-thanh-toan?vnp_ResponseCode=00');

    render(<App />);

    expect(screen.getByText('public VNPay result')).toBeInTheDocument();
  });

  it('mounts private wishlist hydration only for an authenticated principal', () => {
    mockedUseAuthSession.mockReturnValue({
      status: 'authenticated',
      uid: 7,
      username: 'reader',
      roles: ['USER'],
      capabilities: ['USER'],
    });

    render(<App />);

    expect(screen.getByText('private wishlist hydration')).toBeInTheDocument();
  });

  it('does not mount private wishlist hydration while auth is unknown', () => {
    render(<App />);

    expect(screen.queryByText('private wishlist hydration')).not.toBeInTheDocument();
  });
});
