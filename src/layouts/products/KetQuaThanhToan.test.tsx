import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import KetQuaThanhToan from './KetQuaThanhToan';
import { getVNPayCallbackResult } from '../../api/DonHangApi';
import { refreshCartAfterCheckout } from '../../api/CartSession';
import { bootstrapAuth, getAuthSnapshot } from '../../api/AuthSession';

jest.mock('../../api/DonHangApi', () => ({ getVNPayCallbackResult: jest.fn() }));
jest.mock('../../api/CartSession', () => ({ refreshCartAfterCheckout: jest.fn() }));
jest.mock('../../api/AuthSession', () => ({ bootstrapAuth: jest.fn(), getAuthSnapshot: jest.fn() }));

const mockedGetVNPayCallbackResult = getVNPayCallbackResult as jest.MockedFunction<typeof getVNPayCallbackResult>;
const mockedRefreshCart = refreshCartAfterCheckout as jest.MockedFunction<typeof refreshCartAfterCheckout>;
const mockedBootstrapAuth = bootstrapAuth as jest.MockedFunction<typeof bootstrapAuth>;
const mockedGetAuthSnapshot = getAuthSnapshot as jest.MockedFunction<typeof getAuthSnapshot>;

describe('KetQuaThanhToan behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockedRefreshCart.mockResolvedValue([]);
    mockedBootstrapAuth.mockResolvedValue({ status: 'guest', uid: null, username: null, roles: [], capabilities: [] });
    mockedGetAuthSnapshot.mockReturnValue({ status: 'guest', uid: null, username: null, roles: [], capabilities: [] });
    window.history.pushState({}, '', '/xu-ly-kq-thanh-toan?vnp_ResponseCode=00&vnp_OrderInfo=9');
  });

  it('classifies an ordersuccess callback as successful', async () => {
    mockedGetVNPayCallbackResult.mockResolvedValue('ordersuccess');
    render(<MemoryRouter><KetQuaThanhToan /></MemoryRouter>);

    expect(await screen.findByText('Thanh toán thành công')).toBeInTheDocument();
    expect(mockedGetVNPayCallbackResult).toHaveBeenCalledWith('?vnp_ResponseCode=00&vnp_OrderInfo=9');
  });

  it('refreshes a terminal authenticated server cart without a redundant bootstrap', async () => {
    mockedGetAuthSnapshot.mockReturnValue({ status: 'authenticated', uid: 1, username: 'reader', roles: ['USER'], capabilities: ['USER'] });
    mockedGetVNPayCallbackResult.mockResolvedValue('ordersuccess');
    render(<MemoryRouter><KetQuaThanhToan /></MemoryRouter>);

    expect(await screen.findByText('Thanh toán thành công')).toBeInTheDocument();
    expect(mockedBootstrapAuth).not.toHaveBeenCalled();
    expect(mockedRefreshCart).toHaveBeenCalledTimes(1);
  });

  it('waits for an unknown session bootstrap before refreshing the cart', async () => {
    mockedGetAuthSnapshot
      .mockReturnValueOnce({ status: 'unknown', uid: null, username: null, roles: [], capabilities: [] })
      .mockReturnValueOnce({ status: 'authenticated', uid: 1, username: 'reader', roles: ['USER'], capabilities: ['USER'] });
    mockedBootstrapAuth.mockResolvedValue({ status: 'authenticated', uid: 1, username: 'reader', roles: ['USER'], capabilities: ['USER'] });
    mockedGetVNPayCallbackResult.mockResolvedValue('ordersuccess');
    render(<MemoryRouter><KetQuaThanhToan /></MemoryRouter>);

    await screen.findByText('Thanh toán thành công');
    expect(mockedBootstrapAuth).toHaveBeenCalledTimes(1);
    expect(mockedRefreshCart).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['orderfail', false],
    ['unexpected', false],
  ])('classifies %s as failure', async (result) => {
    mockedGetVNPayCallbackResult.mockResolvedValue(result as string);
    render(<MemoryRouter><KetQuaThanhToan /></MemoryRouter>);

    expect(await screen.findByText('Thanh toán thất bại')).toBeInTheDocument();
  });

  it('shows a distinct support result when payment arrives after cancellation', async () => {
    mockedGetVNPayCallbackResult.mockResolvedValue('ordercancelledpaid');
    render(<MemoryRouter><KetQuaThanhToan /></MemoryRouter>);

    expect(await screen.findByText('Đã nhận thanh toán, nhưng đơn hàng đã hủy')).toBeInTheDocument();
    expect(screen.getByText(/VNPay đã xác nhận thanh toán, nhưng đơn hàng đã bị hủy trước đó/)).toBeInTheDocument();
    expect(screen.getByText(/Vui lòng liên hệ hỗ trợ để được kiểm tra và hướng dẫn xử lý khoản tiền này/)).toBeInTheDocument();
    expect(screen.queryByText(/đơn hàng.*sẽ được giao/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tự động hoàn tiền/i)).not.toBeInTheDocument();
    expect(mockedRefreshCart).not.toHaveBeenCalled();
  });

  it('shows failure when the callback request itself fails', async () => {
    mockedGetVNPayCallbackResult.mockRejectedValue(new Error('network'));
    render(<MemoryRouter><KetQuaThanhToan /></MemoryRouter>);

    expect(await screen.findByText('Thanh toán thất bại')).toBeInTheDocument();
  });
});
