import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DonHangUser from './DonHangUser';
import { ApiRequestError } from '../../api/Request';
import { cancelDonHang, getDonHangHistory } from '../../api/DonHangApi';

jest.mock('../../api/DonHangApi', () => ({
  cancelDonHang: jest.fn(),
  getDonHangHistory: jest.fn(),
}));

const mockedCancelDonHang = cancelDonHang as jest.MockedFunction<typeof cancelDonHang>;
const mockedGetDonHangHistory = getDonHangHistory as jest.MockedFunction<typeof getDonHangHistory>;

const pendingOrder = {
  maDonHang: 7,
  ngayTao: '2026-08-03T01:00:00Z',
  diaChiNhanHang: 'Địa chỉ test',
  phuongThucThanhToan: 'COD',
  trangThaiThanhToan: 0,
  trangThaiGiaoHang: 0,
  tongTien: 100000,
};

function page(content = [pendingOrder]) {
  return { content, totalPages: 1, totalElements: content.length };
}

describe('DonHangUser behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetDonHangHistory.mockResolvedValue(page());
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    jest.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('refreshes order history after cancellation succeeds', async () => {
    mockedCancelDonHang.mockResolvedValue({ noiDung: 'Hủy đơn hàng thành công' });
    render(<MemoryRouter><DonHangUser /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: 'Hủy đơn hàng #7' }));

    await waitFor(() => expect(mockedCancelDonHang).toHaveBeenCalledWith(7));
    await waitFor(() => expect(mockedGetDonHangHistory).toHaveBeenCalledTimes(2));
  });

  it('shows the API conflict message inline and keeps the current list when cancellation fails', async () => {
    mockedCancelDonHang.mockRejectedValue(new ApiRequestError('Đơn hàng đã được xử lý.', 409));
    render(<MemoryRouter><DonHangUser /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: 'Hủy đơn hàng #7' }));

    // The failure is surfaced inline (assistive-tech reachable), not via window.alert.
    expect(await screen.findByRole('alert')).toHaveTextContent('Đơn hàng đã được xử lý.');
    expect(window.alert).not.toHaveBeenCalled();
    expect(mockedGetDonHangHistory).toHaveBeenCalledTimes(1);
    expect(screen.getByText('#7')).toBeInTheDocument();
  });
});
