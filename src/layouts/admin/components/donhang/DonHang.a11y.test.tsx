import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DonHang from './DonHang';
import { capNhatTrangThaiGiaoHang, getDonHangHistory } from '../../../../api/DonHangApi';

jest.mock('../../../../api/DonHangApi', () => ({
  capNhatTrangThaiGiaoHang: jest.fn(),
  getDonHangHistory: jest.fn(),
}));
jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockedAdvance = capNhatTrangThaiGiaoHang as jest.MockedFunction<typeof capNhatTrangThaiGiaoHang>;
const mockedGetHistory = getDonHangHistory as jest.MockedFunction<typeof getDonHangHistory>;

const order = {
  maDonHang: 15,
  ngayTao: '2026-08-03T01:00:00Z',
  diaChiNhanHang: 'Địa chỉ admin test',
  phuongThucThanhToan: 'COD',
  trangThaiThanhToan: 0,
  trangThaiGiaoHang: 0,
  tongTien: 200000,
};

describe('admin DonHang accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetHistory.mockResolvedValue({ content: [order], totalPages: 1, totalElements: 1 });
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('gives the advance-status control an order-specific accessible name', async () => {
    render(<DonHang />);

    expect(await screen.findByRole('button', { name: 'Cập nhật trạng thái giao hàng đơn #15' })).toBeInTheDocument();
  });

  it('announces the loading state with status semantics', () => {
    render(<DonHang />);

    expect(screen.getByRole('status')).toHaveTextContent(/Đang tải/);
  });

  it('exposes an inline alert when the update fails', async () => {
    mockedAdvance.mockRejectedValue(new Error('conflict'));
    render(<DonHang />);

    fireEvent.click(await screen.findByRole('button', { name: 'Cập nhật trạng thái giao hàng đơn #15' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Lỗi cập nhật trạng thái/);
  });

  it('marks the filter tabs as a labelled group operable by keyboard', async () => {
    render(<DonHang />);
    await screen.findByRole('button', { name: 'Cập nhật trạng thái giao hàng đơn #15' });

    const group = screen.getByRole('group', { name: 'Lọc đơn hàng theo trạng thái' });
    expect(group).toBeInTheDocument();

    const daGiao = screen.getByRole('button', { name: /^Đã giao/ });
    daGiao.focus();
    expect(daGiao).toHaveFocus();
    fireEvent.click(daGiao);
    await waitFor(() => expect(daGiao).toHaveAttribute('aria-pressed', 'true'));
  });
});
