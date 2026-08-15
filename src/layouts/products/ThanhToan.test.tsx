import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import ThanhToan from './ThanhToan';
import { getDanhSachDiaChi } from '../../api/DiaChiApi';
import { getOneImageOfOneBook } from '../../api/HinhAnhApi';
import { kiemTraCoupon } from '../../api/CouponApi';
import { createDonHang, createVNPayPaymentUrl, getHinhThucGiaoHang } from '../../api/DonHangApi';
import { addOrUpdateItem, readCart } from '../../api/CartStorage';
import { readIntent } from '../../api/CheckoutIntent';
import { getAuthSnapshot, useAuthSession } from '../../api/AuthSession';

jest.mock('../../api/DiaChiApi', () => ({ getDanhSachDiaChi: jest.fn() }));
jest.mock('../../api/HinhAnhApi', () => ({ getOneImageOfOneBook: jest.fn() }));
jest.mock('../../api/CouponApi', () => ({ kiemTraCoupon: jest.fn() }));
jest.mock('../../api/DonHangApi', () => ({
  createDonHang: jest.fn(),
  createVNPayPaymentUrl: jest.fn(),
  getHinhThucGiaoHang: jest.fn(),
}));
jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
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
const mockedKiemTraCoupon = kiemTraCoupon as jest.MockedFunction<typeof kiemTraCoupon>;
const mockedCreateDonHang = createDonHang as jest.MockedFunction<typeof createDonHang>;
const mockedCreateVNPayPaymentUrl = createVNPayPaymentUrl as jest.MockedFunction<typeof createVNPayPaymentUrl>;
const mockedGetHinhThucGiaoHang = getHinhThucGiaoHang as jest.MockedFunction<typeof getHinhThucGiaoHang>;
const mockedToastError = toast.error as jest.Mock;
const mockedUseAuth = useAuthSession as jest.MockedFunction<typeof useAuthSession>;
const mockedGetAuthSnapshot = getAuthSnapshot as jest.MockedFunction<typeof getAuthSnapshot>;

const address = {
  maDiaChi: 5,
  hoTen: 'Người nhận',
  soDienThoai: '0900000000',
  diaChiDayDu: 'Địa chỉ test',
  macDinh: true,
};

const deliveryMethods = [
  {
    maHinhThucGiaoHang: 2,
    tenHinhThucGiaoHang: 'Tự lấy hàng tại cửa hàng',
    moTa: 'Nhận trực tiếp tại cửa hàng',
    chiPhiGiaoHang: 0,
  },
  {
    maHinhThucGiaoHang: 1,
    tenHinhThucGiaoHang: 'Giao hàng tận nơi',
    moTa: 'Giao đến địa chỉ nhận hàng',
    chiPhiGiaoHang: 10000,
  },
];

const codResponse = {
  maDonHang: 91,
  tongTien: 100000,
  tongTienSanPham: 100000,
  soTienGiam: 0,
  phiVanChuyen: 0,
  tenHinhThucGiaoHang: 'Tự lấy hàng tại cửa hàng',
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
  await userEvent.click(screen.getByLabelText(/Tự lấy hàng tại cửa hàng/));
}

describe('ThanhToan business behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    const guestAuth = { status: 'guest' as const, uid: null, username: null, roles: [], capabilities: [] };
    mockedUseAuth.mockReturnValue(guestAuth);
    mockedGetAuthSnapshot.mockReturnValue(guestAuth);
    mockedGetDanhSachDiaChi.mockResolvedValue([address]);
    mockedGetOneImage.mockResolvedValue([]);
    mockedGetHinhThucGiaoHang.mockResolvedValue(deliveryMethods);
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

  it('requires an explicit shipping choice before it calculates and submits the total', async () => {
    addCartItem();
    renderCheckout();
    await screen.findByRole('button', { name: 'Đặt hàng COD' });
    await waitFor(() => expect(screen.getByText('Người nhận')).toBeInTheDocument());

    expect(screen.getByText('Chưa chọn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đặt hàng COD' })).toBeDisabled();

    await userEvent.click(screen.getByLabelText(/Giao hàng tận nơi/));

    expect(screen.getAllByText('10.000đ')).toHaveLength(2);
    expect(screen.getByText('110.000đ')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Đặt hàng COD' }));
    await waitFor(() => expect(mockedCreateDonHang).toHaveBeenCalledTimes(1));
    expect(mockedCreateDonHang.mock.calls[0][0]).toMatchObject({
      maHinhThucGiaoHang: 1,
    });
  });

  it('requires delivery methods to load before an order can be submitted', async () => {
    addCartItem();
    mockedGetHinhThucGiaoHang.mockRejectedValue(new Error('Không tải được'));
    renderCheckout();

    await screen.findByRole('alert', { name: /lỗi hình thức giao hàng/i });
    expect(screen.getByRole('button', { name: 'Đặt hàng COD' })).toBeDisabled();
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

  it('preserves newer cart changes made while the order request is pending', async () => {
    addCartItem(1);
    let resolveOrder!: (value: typeof codResponse) => void;
    mockedCreateDonHang.mockReturnValue(new Promise(resolve => { resolveOrder = resolve; }));
    renderCheckout();
    await waitUntilReady();

    fireEvent.click(screen.getByRole('button', { name: 'Đặt hàng COD' }));
    await waitFor(() => expect(mockedCreateDonHang).toHaveBeenCalledTimes(1));

    addCartItem(2);
    resolveOrder(codResponse);

    await screen.findByText('Đặt hàng COD thành công!');
    expect(readCart().map(item => item.maSach)).toEqual([1, 2]);
    expect(toast.info).toHaveBeenCalledWith(
      'Đơn hàng đã được tạo. Giỏ hàng có thay đổi mới nên được giữ lại.',
    );
    expect(readIntent()).toBeNull();
  });

  it('ignores a coupon response when the cart changes while validation is pending', async () => {
    addCartItem();
    let resolveCoupon!: (value: {
      hopLe: boolean;
      soTienGiam: number;
      tongTienSauGiam: number;
      maCoupon: string;
      thongBao: string;
    }) => void;
    mockedKiemTraCoupon.mockReturnValue(new Promise(resolve => { resolveCoupon = resolve; }));
    renderCheckout();
    await waitUntilReady();

    await userEvent.type(screen.getByLabelText('Mã giảm giá'), 'SAVE10');
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
    await waitFor(() => expect(mockedKiemTraCoupon).toHaveBeenCalledTimes(1));

    const quantityInput = screen.getByLabelText('Số lượng Sách 1');
    fireEvent.change(quantityInput, { target: { value: '2' } });
    fireEvent.blur(quantityInput);
    resolveCoupon({
      hopLe: true,
      soTienGiam: 10000,
      tongTienSauGiam: 90000,
      maCoupon: 'SAVE10',
      thongBao: 'Đã áp dụng mã SAVE10',
    });

    await waitFor(() => expect(screen.getAllByText('200.000đ')).toHaveLength(3));
    expect(screen.queryByText('-10.000đ')).not.toBeInTheDocument();
    expect(screen.queryByText('Đã áp dụng mã SAVE10')).not.toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('invalidates a checked coupon when cart quantities change', async () => {
    addCartItem();
    mockedKiemTraCoupon.mockResolvedValue({
      hopLe: true,
      soTienGiam: 10000,
      tongTienSauGiam: 90000,
      maCoupon: 'SAVE10',
      thongBao: 'Đã áp dụng mã SAVE10',
    });
    renderCheckout();
    await waitUntilReady();

    await userEvent.type(screen.getByLabelText('Mã giảm giá'), 'SAVE10');
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
    await screen.findByText('Đã áp dụng mã SAVE10');
    expect(screen.getByText('-10.000đ')).toBeInTheDocument();

    const quantityInput = screen.getByLabelText('Số lượng Sách 1');
    fireEvent.change(quantityInput, { target: { value: '2' } });
    fireEvent.blur(quantityInput);

    await waitFor(() => {
      expect(screen.queryByText('-10.000đ')).not.toBeInTheDocument();
      expect(screen.queryByText('Đã áp dụng mã SAVE10')).not.toBeInTheDocument();
      expect(screen.getAllByText('200.000đ')).toHaveLength(3);
    });
  });

  it('invalidates a checked coupon after a cross-tab cart update', async () => {
    addCartItem();
    mockedKiemTraCoupon.mockResolvedValue({
      hopLe: true,
      soTienGiam: 10000,
      tongTienSauGiam: 90000,
      maCoupon: 'SAVE10',
      thongBao: 'Đã áp dụng mã SAVE10',
    });
    renderCheckout();
    await waitUntilReady();

    await userEvent.type(screen.getByLabelText('Mã giảm giá'), 'SAVE10');
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
    await screen.findByText('Đã áp dụng mã SAVE10');

    addCartItem(2);
    window.dispatchEvent(new StorageEvent('storage', { key: 'gioHang' }));

    await waitFor(() => expect(screen.getByText('Sách 2')).toBeInTheDocument());
    expect(screen.queryByText('-10.000đ')).not.toBeInTheDocument();
    expect(screen.queryByText('Đã áp dụng mã SAVE10')).not.toBeInTheDocument();
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

  it('submits the latest quantity when checkout starts while its mutation is pending', async () => {
    addCartItem(1);
    renderCheckout();
    await waitUntilReady();

    const quantityInput = screen.getByLabelText('Số lượng Sách 1');
    fireEvent.change(quantityInput, { target: { value: '2' } });
    fireEvent.blur(quantityInput);
    fireEvent.click(screen.getByRole('button', { name: 'Đặt hàng COD' }));

    await waitFor(() => expect(mockedCreateDonHang).toHaveBeenCalledTimes(1));
    expect(mockedCreateDonHang.mock.calls[0][0].items).toEqual([
      { maSach: 1, soLuong: 2 },
    ]);
    expect(mockedToastError).not.toHaveBeenCalledWith(
      'Giỏ hàng vừa thay đổi ở tab khác. Vui lòng kiểm tra lại trước khi đặt hàng.',
    );
  });

  it('blocks a stale reviewed cart after another tab changes storage', async () => {
    addCartItem(1);
    renderCheckout();
    await waitUntilReady();

    addCartItem(2);
    fireEvent.click(screen.getByRole('button', { name: 'Đặt hàng COD' }));

    expect(mockedCreateDonHang).not.toHaveBeenCalled();
    await waitFor(() => expect(mockedToastError).toHaveBeenCalledWith(
      'Giỏ hàng vừa thay đổi ở tab khác. Vui lòng kiểm tra lại trước khi đặt hàng.',
    ));
    await waitFor(() => expect(screen.getByText('Sách 2')).toBeInTheDocument());
  });

  it('blocks checkout when an external line appears with a local cart change', async () => {
    addCartItem(1);
    renderCheckout();
    await waitUntilReady();

    const quantityInput = screen.getByLabelText('Số lượng Sách 1');
    fireEvent.change(quantityInput, { target: { value: '2' } });

    // An external tab changes storage before this tab commits its quantity
    // draft. The local mutation response includes both transitions, so checkout
    // must not treat that entire cart as implicitly reviewed.
    addCartItem(2);
    fireEvent.blur(quantityInput);
    fireEvent.click(screen.getByRole('button', { name: 'Đặt hàng COD' }));

    await waitFor(() => expect(mockedToastError).toHaveBeenCalledWith(
      'Giỏ hàng vừa thay đổi ở tab khác. Vui lòng kiểm tra lại trước khi đặt hàng.',
    ));
    expect(mockedCreateDonHang).not.toHaveBeenCalled();
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
