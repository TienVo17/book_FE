import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import ThanhToan from './ThanhToan';
import { getDanhSachDiaChi } from '../../api/DiaChiApi';
import { getOneImageOfOneBook } from '../../api/HinhAnhApi';
import { createDonHang, createVNPayPaymentUrl } from '../../api/DonHangApi';
import { addOrUpdateItem, readCart } from '../../api/CartStorage';
import { readIntent } from '../../api/CheckoutIntent';

jest.mock('../../api/DiaChiApi', () => ({ getDanhSachDiaChi: jest.fn() }));
jest.mock('../../api/HinhAnhApi', () => ({ getOneImageOfOneBook: jest.fn() }));
jest.mock('../../api/CouponApi', () => ({ kiemTraCoupon: jest.fn() }));
jest.mock('../../api/DonHangApi', () => ({
  createDonHang: jest.fn(),
  createVNPayPaymentUrl: jest.fn(),
}));
jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockedGetDanhSachDiaChi = getDanhSachDiaChi as jest.MockedFunction<typeof getDanhSachDiaChi>;
const mockedGetOneImage = getOneImageOfOneBook as jest.MockedFunction<typeof getOneImageOfOneBook>;
const mockedCreateDonHang = createDonHang as jest.MockedFunction<typeof createDonHang>;
const mockedCreateVNPayPaymentUrl = createVNPayPaymentUrl as jest.MockedFunction<typeof createVNPayPaymentUrl>;
const mockedToastError = toast.error as jest.Mock;

const address = {
  maDiaChi: 5,
  hoTen: 'Người nhận',
  soDienThoai: '0900000000',
  diaChiDayDu: 'Địa chỉ test',
  macDinh: true,
};

const codResponse = {
  maDonHang: 91,
  tongTien: 100000,
  tongTienSanPham: 100000,
  soTienGiam: 0,
  maCoupon: null,
  phuongThucThanhToan: 'COD' as const,
  trangThaiThanhToan: 0,
  hoTen: 'Người nhận',
  soDienThoai: '0900000000',
  diaChiNhanHang: 'Địa chỉ test',
};

function addCartItem(maSach = 1): void {
  addOrUpdateItem({
    maSach,
    sachDto: { tenSach: `Sách ${maSach}`, giaBan: 100000 },
    soLuong: 1,
    soLuongTonKho: 10,
  });
}

function renderCheckout(): void {
  render(
    <MemoryRouter>
      <ThanhToan />
    </MemoryRouter>,
  );
}

async function waitUntilReady(): Promise<void> {
  await screen.findByRole('button', { name: 'Đặt hàng COD' });
  await waitFor(() => expect(screen.getByText('Người nhận')).toBeInTheDocument());
}

describe('ThanhToan business behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockedGetDanhSachDiaChi.mockResolvedValue([address]);
    mockedGetOneImage.mockResolvedValue([]);
    mockedCreateDonHang.mockResolvedValue(codResponse);
    mockedCreateVNPayPaymentUrl.mockResolvedValue({ paymentUrl: 'https://sandbox.vnpay.test/pay' });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('does not submit when the cart is empty', async () => {
    renderCheckout();

    expect(await screen.findByText('Giỏ hàng trống')).toBeInTheDocument();
    expect(mockedCreateDonHang).not.toHaveBeenCalled();
  });

  it('clears the cart and pending key only after a committed COD response', async () => {
    addCartItem();
    let resolveOrder!: (value: typeof codResponse) => void;
    mockedCreateDonHang.mockReturnValue(new Promise(resolve => { resolveOrder = resolve; }));
    renderCheckout();
    await waitUntilReady();

    fireEvent.click(screen.getByRole('button', { name: 'Đặt hàng COD' }));
    await waitFor(() => expect(mockedCreateDonHang).toHaveBeenCalledTimes(1));

    expect(readCart()).toHaveLength(1);
    expect(readIntent()).not.toBeNull();

    resolveOrder(codResponse);
    await screen.findByText('Đặt hàng COD thành công!');
    expect(readCart()).toEqual([]);
    expect(readIntent()).toBeNull();
  });

  it('reuses the same pending idempotency key after a response-loss retry', async () => {
    addCartItem();
    mockedCreateDonHang
      .mockRejectedValueOnce(new Error('Mất kết nối sau khi gửi yêu cầu'))
      .mockResolvedValueOnce(codResponse);
    renderCheckout();
    await waitUntilReady();

    const submit = screen.getByRole('button', { name: 'Đặt hàng COD' });
    fireEvent.click(submit);
    await waitFor(() => expect(mockedCreateDonHang).toHaveBeenCalledTimes(1));
    const firstKey = mockedCreateDonHang.mock.calls[0][1];
    expect(readIntent()?.key).toBe(firstKey);
    await waitFor(() => expect(submit).not.toBeDisabled());

    fireEvent.click(submit);
    await waitFor(() => expect(mockedCreateDonHang).toHaveBeenCalledTimes(2));
    expect(mockedCreateDonHang.mock.calls[1][1]).toBe(firstKey);
    await screen.findByText('Đặt hàng COD thành công!');
  });

  it('blocks a stale reviewed cart after another tab changes storage', async () => {
    addCartItem(1);
    renderCheckout();
    await waitUntilReady();

    addCartItem(2);
    fireEvent.click(screen.getByRole('button', { name: 'Đặt hàng COD' }));

    expect(mockedCreateDonHang).not.toHaveBeenCalled();
    expect(mockedToastError).toHaveBeenCalledWith(
      'Giỏ hàng vừa thay đổi ở tab khác. Vui lòng kiểm tra lại trước khi đặt hàng.',
    );
    await waitFor(() => expect(screen.getByText('Sách 2')).toBeInTheDocument());
  });

  it('does not redirect when VNPay URL creation fails', async () => {
    addCartItem();
    mockedCreateDonHang.mockResolvedValue({ ...codResponse, phuongThucThanhToan: 'VNPAY' });
    mockedCreateVNPayPaymentUrl.mockRejectedValue(new Error('Không tạo được link'));
    renderCheckout();
    await waitUntilReady();

    await userEvent.click(screen.getByLabelText(/Thanh toán VNPAY/));
    fireEvent.click(screen.getByRole('button', { name: 'Tạo đơn & thanh toán' }));
    await screen.findByText('Đơn hàng đã sẵn sàng để thanh toán!');

    const before = window.location.href;
    fireEvent.click(screen.getByRole('button', { name: /Thanh toán VNPAY/ }));
    await waitFor(() => expect(mockedCreateVNPayPaymentUrl).toHaveBeenCalledWith(91));
    await waitFor(() => expect(mockedToastError).toHaveBeenCalledWith('Không tạo được link'));
    expect(window.location.href).toBe(before);
  });
});
