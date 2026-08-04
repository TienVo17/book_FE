import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DonHang from './DonHang';
import { capNhatTrangThaiGiaoHang, getDonHangHistory } from '../../../../api/DonHangApi';
import { toast } from 'react-toastify';

jest.mock('../../../../api/DonHangApi', () => ({
  capNhatTrangThaiGiaoHang: jest.fn(),
  getDonHangHistory: jest.fn(),
}));
jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockedAdvance = capNhatTrangThaiGiaoHang as jest.MockedFunction<typeof capNhatTrangThaiGiaoHang>;
const mockedGetHistory = getDonHangHistory as jest.MockedFunction<typeof getDonHangHistory>;
const mockedToastError = toast.error as jest.Mock;

const order = {
  maDonHang: 15,
  ngayTao: '2026-08-03T01:00:00Z',
  diaChiNhanHang: 'Địa chỉ admin test',
  phuongThucThanhToan: 'COD',
  trangThaiThanhToan: 0,
  trangThaiGiaoHang: 0,
  tongTien: 200000,
};

describe('admin DonHang behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetHistory.mockResolvedValue({ content: [order], totalPages: 1, totalElements: 1 });
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the authenticated API module and reports an update failure', async () => {
    mockedAdvance.mockRejectedValue(new Error('conflict'));
    render(<DonHang />);

    fireEvent.click(await screen.findByTitle('Cập nhật trạng thái giao hàng (tiến 1 bước)'));

    await waitFor(() => expect(mockedAdvance).toHaveBeenCalledWith(15));
    await waitFor(() => expect(mockedToastError).toHaveBeenCalledWith('Lỗi cập nhật trạng thái'));
    expect(mockedGetHistory).toHaveBeenCalledTimes(1);
  });

  it('refreshes the list after an update succeeds', async () => {
    mockedAdvance.mockResolvedValue({});
    render(<DonHang />);

    fireEvent.click(await screen.findByTitle('Cập nhật trạng thái giao hàng (tiến 1 bước)'));

    await waitFor(() => expect(mockedAdvance).toHaveBeenCalledWith(15));
    await waitFor(() => expect(mockedGetHistory).toHaveBeenCalledTimes(2));
  });
});
