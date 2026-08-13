import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { getThongKe } from '../../../../api/AdminApi';
import { ThongKeModel } from '../../../../models/ThongKeModel';
import ThongKeDashboard from './ThongKeDashboard';

jest.mock('../../../../api/AdminApi', () => ({
  getThongKe: jest.fn(),
}));

const mockedGetThongKe = getThongKe as jest.MockedFunction<typeof getThongKe>;

const dashboardData: ThongKeModel = {
  tongDonHang: 1032,
  tongDoanhThu: 284500000,
  donHangHomNay: 18,
  doanhThuHomNay: 6240000,
  tongNguoiDung: 4860,
  donChoXuLy: 7,
  topSachBanChay: [
    { maSach: 1, tenSach: 'Đắc Nhân Tâm', soLuongBan: 486 },
    { maSach: 2, tenSach: 'Nhà Giả Kim', soLuongBan: 412 },
  ],
};

describe('ThongKeDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('announces loading and then renders mapped dashboard data', async () => {
    mockedGetThongKe.mockResolvedValue(dashboardData);

    render(<ThongKeDashboard />);

    expect(screen.getByRole('status')).toHaveTextContent('Đang tải thống kê');
    expect(await screen.findByText('284.500.000đ')).toBeInTheDocument();
    expect(screen.getByText('6.240.000đ')).toBeInTheDocument();
    expect(screen.getByText('1.032')).toBeInTheDocument();
    expect(screen.getByText('4.860')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Xếp hạng sách theo số lượng đã bán' })).toBeInTheDocument();
    expect(screen.getByText('Đắc Nhân Tâm')).toBeInTheDocument();
    expect(screen.getByText('Nhà Giả Kim')).toBeInTheDocument();
  });

  it('shows a helpful empty state when no top books exist', async () => {
    mockedGetThongKe.mockResolvedValue({ ...dashboardData, topSachBanChay: [] });

    render(<ThongKeDashboard />);

    expect(await screen.findByRole('heading', { name: 'Chưa có dữ liệu' })).toBeInTheDocument();
    expect(screen.getByText('Dữ liệu sách bán chạy sẽ hiển thị ở đây.')).toBeInTheDocument();
  });

  it('shows an inline error and retries the request', async () => {
    mockedGetThongKe
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(dashboardData);

    render(<ThongKeDashboard />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể tải dữ liệu thống kê');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    await waitFor(() => expect(mockedGetThongKe).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('284.500.000đ')).toBeInTheDocument();
  });
});
