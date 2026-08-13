import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import KetQuaThanhToan from './KetQuaThanhToan';
import { getVNPayCallbackResult } from '../../api/DonHangApi';
import { refreshCartAfterCheckout } from '../../api/CartSession';

jest.mock('../../api/DonHangApi', () => ({ getVNPayCallbackResult: jest.fn() }));
jest.mock('../../api/CartSession', () => ({ refreshCartAfterCheckout: jest.fn() }));

const mockedGetVNPayCallbackResult = getVNPayCallbackResult as jest.MockedFunction<typeof getVNPayCallbackResult>;
const mockedRefreshCart = refreshCartAfterCheckout as jest.MockedFunction<typeof refreshCartAfterCheckout>;

describe('KetQuaThanhToan behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockedRefreshCart.mockResolvedValue([]);
    window.history.pushState({}, '', '/xu-ly-kq-thanh-toan?vnp_ResponseCode=00&vnp_OrderInfo=9');
  });

  it('classifies an ordersuccess callback as successful', async () => {
    mockedGetVNPayCallbackResult.mockResolvedValue('ordersuccess');
    render(<MemoryRouter><KetQuaThanhToan /></MemoryRouter>);

    expect(await screen.findByText('Thanh toán thành công')).toBeInTheDocument();
    expect(mockedGetVNPayCallbackResult).toHaveBeenCalledWith('?vnp_ResponseCode=00&vnp_OrderInfo=9');
  });

  it('refreshes the authenticated server cart after a successful callback', async () => {
    localStorage.setItem('jwt', 'authenticated');
    mockedGetVNPayCallbackResult.mockResolvedValue('ordersuccess');
    render(<MemoryRouter><KetQuaThanhToan /></MemoryRouter>);

    expect(await screen.findByText('Thanh toán thành công')).toBeInTheDocument();
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
    localStorage.setItem('jwt', 'authenticated');
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
