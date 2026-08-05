import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import KetQuaThanhToan from './KetQuaThanhToan';
import { getVNPayCallbackResult } from '../../api/DonHangApi';

jest.mock('../../api/DonHangApi', () => ({ getVNPayCallbackResult: jest.fn() }));

const mockedGetVNPayCallbackResult = getVNPayCallbackResult as jest.MockedFunction<typeof getVNPayCallbackResult>;

describe('KetQuaThanhToan behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.pushState({}, '', '/xu-ly-kq-thanh-toan?vnp_ResponseCode=00&vnp_OrderInfo=9');
  });

  it('classifies an ordersuccess callback as successful', async () => {
    mockedGetVNPayCallbackResult.mockResolvedValue('ordersuccess');
    render(<MemoryRouter><KetQuaThanhToan /></MemoryRouter>);

    expect(await screen.findByText('Thanh toán thành công')).toBeInTheDocument();
    expect(mockedGetVNPayCallbackResult).toHaveBeenCalledWith('?vnp_ResponseCode=00&vnp_OrderInfo=9');
  });

  it.each([
    ['orderfail', false],
    ['unexpected', false],
  ])('classifies %s as failure', async (result) => {
    mockedGetVNPayCallbackResult.mockResolvedValue(result as string);
    render(<MemoryRouter><KetQuaThanhToan /></MemoryRouter>);

    expect(await screen.findByText('Thanh toán thất bại')).toBeInTheDocument();
  });

  it('shows failure when the callback request itself fails', async () => {
    mockedGetVNPayCallbackResult.mockRejectedValue(new Error('network'));
    render(<MemoryRouter><KetQuaThanhToan /></MemoryRouter>);

    expect(await screen.findByText('Thanh toán thất bại')).toBeInTheDocument();
  });
});
