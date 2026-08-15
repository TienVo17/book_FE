import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ThanhToan from './ThanhToan';
import { getDanhSachDiaChi } from '../../api/DiaChiApi';
import { getOneImageOfOneBook } from '../../api/HinhAnhApi';
import { createDonHang, getHinhThucGiaoHang } from '../../api/DonHangApi';
import { ApiRequestError } from '../../api/Request';
import { addOrUpdateItem } from '../../api/CartStorage';
import { getAuthSnapshot, useAuthSession } from '../../api/AuthSession';

jest.mock('../../api/DiaChiApi', () => ({ getDanhSachDiaChi: jest.fn() }));
jest.mock('../../api/HinhAnhApi', () => ({ getOneImageOfOneBook: jest.fn() }));
jest.mock('../../api/CouponApi', () => ({ kiemTraCoupon: jest.fn() }));
jest.mock('../../api/DonHangApi', () => ({
  createDonHang: jest.fn(),
  createVNPayPaymentUrl: jest.fn(),
  getHinhThucGiaoHang: jest.fn(),
}));
jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('../../api/AuthSession', () => ({
  useAuthSession: jest.fn(),
  getAuthSnapshot: jest.fn(() => ({
    status: 'guest', uid: null, username: null, roles: [], capabilities: [],
  })),
  captureAuthenticatedRequest: jest.fn(() => null),
  isCurrentAuthCapture: jest.fn(() => false),
  subscribeAuthTransition: jest.fn(() => () => undefined),
}));

const mockedGetDanhSachDiaChi = getDanhSachDiaChi as jest.MockedFunction<typeof getDanhSachDiaChi>;
const mockedGetOneImage = getOneImageOfOneBook as jest.MockedFunction<typeof getOneImageOfOneBook>;
const mockedCreateDonHang = createDonHang as jest.MockedFunction<typeof createDonHang>;
const mockedGetHinhThucGiaoHang = getHinhThucGiaoHang as jest.MockedFunction<typeof getHinhThucGiaoHang>;
const mockedUseAuth = useAuthSession as jest.MockedFunction<typeof useAuthSession>;
const mockedGetAuthSnapshot = getAuthSnapshot as jest.MockedFunction<typeof getAuthSnapshot>;

const address = {
  maDiaChi: 5,
  hoTen: 'Người nhận',
  soDienThoai: '0900000000',
  diaChiDayDu: 'Địa chỉ test',
  macDinh: true,
};

function addCartItem(maSach = 1): void {
  addOrUpdateItem({
    maSach,
    sachDto: { tenSach: `Sách ${maSach}`, giaBan: 100000 },
    soLuong: 1,
    soLuongTonKho: 10,
  });
}

async function renderCheckout(): Promise<void> {
  render(<MemoryRouter><ThanhToan /></MemoryRouter>);
  await screen.findByRole('button', { name: 'Đặt hàng COD' });
  await waitFor(() => expect(screen.getByText('Người nhận')).toBeInTheDocument());
  fireEvent.click(screen.getByLabelText(/Giao hàng tận nơi/));
}

describe('ThanhToan accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    const guestAuth = { status: 'guest' as const, uid: null, username: null, roles: [], capabilities: [] };
    mockedUseAuth.mockReturnValue(guestAuth);
    mockedGetAuthSnapshot.mockReturnValue(guestAuth);
    mockedGetDanhSachDiaChi.mockResolvedValue([address]);
    mockedGetOneImage.mockResolvedValue([]);
    mockedGetHinhThucGiaoHang.mockResolvedValue([
      {
        maHinhThucGiaoHang: 1,
        tenHinhThucGiaoHang: 'Giao hàng tận nơi',
        moTa: 'Giao đến địa chỉ nhận hàng',
        chiPhiGiaoHang: 10000,
      },
    ]);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders a failed checkout as an inline actionable alert, not colour or toast alone', async () => {
    addCartItem();
    mockedCreateDonHang.mockRejectedValue(new ApiRequestError('Sách không đủ tồn kho.', 409, 'STOCK_CONFLICT', 'trace-a11y'));
    await renderCheckout();

    fireEvent.click(screen.getByRole('button', { name: 'Đặt hàng COD' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Sách không đủ tồn kho.');
  });

  it('exposes a safe support reference when the server returned a trace id', async () => {
    addCartItem();
    mockedCreateDonHang.mockRejectedValue(new ApiRequestError('Máy chủ không thể xử lý yêu cầu.', 500, 'INTERNAL_ERROR', 'trace-support-123'));
    await renderCheckout();

    fireEvent.click(screen.getByRole('button', { name: 'Đặt hàng COD' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('trace-support-123');
  });

  it('announces a stale cross-tab cart through a live region before submitting', async () => {
    addCartItem(1);
    await renderCheckout();

    addCartItem(2);
    fireEvent.click(screen.getByRole('button', { name: 'Đặt hàng COD' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/thay đổi/i);
    expect(mockedCreateDonHang).not.toHaveBeenCalled();
  });

  it('marks the review step with an accessible heading structure', async () => {
    addCartItem();
    await renderCheckout();

    expect(screen.getByRole('heading', { name: /Xác nhận đơn hàng/ })).toBeInTheDocument();
  });
});
