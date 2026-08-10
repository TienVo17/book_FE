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

describe('DonHangUser accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetDonHangHistory.mockResolvedValue({ content: [pendingOrder], totalPages: 1, totalElements: 1 });
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('announces a history load failure and exposes a retry control', async () => {
    mockedGetDonHangHistory.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<MemoryRouter><DonHangUser /></MemoryRouter>);

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể tải danh sách đơn hàng');
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    expect(screen.queryByText('Chưa có đơn hàng')).not.toBeInTheDocument();
  });

  it('announces the loading state with status semantics', async () => {
    render(<MemoryRouter><DonHangUser /></MemoryRouter>);

    expect(screen.getByRole('status')).toHaveTextContent(/Đang tải đơn hàng/);
    await screen.findByRole('button', { name: /Hủy đơn hàng #7/ });
  });

  it('gives every detail link an order-specific accessible name', async () => {
    render(<MemoryRouter><DonHangUser /></MemoryRouter>);

    expect(await screen.findByRole('link', { name: 'Xem chi tiết đơn hàng #7' }))
      .toHaveAttribute('href', '/order/7');
  });

  it('gives every cancel button an order-specific accessible name', async () => {
    render(<MemoryRouter><DonHangUser /></MemoryRouter>);

    expect(await screen.findByRole('button', { name: 'Hủy đơn hàng #7' })).toBeInTheDocument();
  });

  it('shows a cancellation conflict as an inline alert instead of a window dialog', async () => {
    mockedCancelDonHang.mockRejectedValue(new ApiRequestError('Đơn hàng đã được xử lý.', 409, 'CONFLICT', 'trace-cancel'));
    render(<MemoryRouter><DonHangUser /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: 'Hủy đơn hàng #7' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Đơn hàng đã được xử lý.');
  });

  it('marks the in-flight cancel control as busy', async () => {
    let resolveCancel!: (value: { noiDung: string }) => void;
    mockedCancelDonHang.mockReturnValue(new Promise(resolve => { resolveCancel = resolve; }));
    render(<MemoryRouter><DonHangUser /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: 'Hủy đơn hàng #7' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Hủy đơn hàng #7/ })).toHaveAttribute('aria-busy', 'true');
    });
    resolveCancel({ noiDung: 'Hủy đơn hàng thành công' });
  });
});
