import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DonHangUser from './DonHangUser';
import { ApiRequestError } from '../../api/Request';
import { cancelDonHang, getDonHangHistory } from '../../api/DonHangApi';
import { useAuthSession } from '../../api/AuthSession';

jest.mock('../../api/DonHangApi', () => ({
  cancelDonHang: jest.fn(),
  getDonHangHistory: jest.fn(),
}));
jest.mock('../../api/AuthSession', () => ({
  useAuthSession: jest.fn(),
}));

const mockedCancelDonHang = cancelDonHang as jest.MockedFunction<typeof cancelDonHang>;
const mockedGetDonHangHistory = getDonHangHistory as jest.MockedFunction<typeof getDonHangHistory>;
const mockedUseAuth = useAuthSession as jest.MockedFunction<typeof useAuthSession>;

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
    mockedUseAuth.mockReturnValue({
      status: 'authenticated', uid: 1, username: 'reader-a', roles: ['USER'], capabilities: ['USER'],
    });
    mockedGetDonHangHistory.mockResolvedValue(page());
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    jest.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows a load failure instead of claiming the history is empty, then retries', async () => {
    mockedGetDonHangHistory
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(page());
    render(<MemoryRouter><DonHangUser /></MemoryRouter>);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Không thể tải danh sách đơn hàng. Vui lòng thử lại sau.',
    );
    expect(screen.queryByText('Chưa có đơn hàng')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(await screen.findByRole('link', { name: 'Xem chi tiết đơn hàng #7' })).toBeInTheDocument();
    expect(mockedGetDonHangHistory).toHaveBeenCalledTimes(2);
  });

  it('reloads history for a different authenticated account and ignores the old response', async () => {
    const accountA = {
      status: 'authenticated' as const, uid: 1, username: 'reader-a', roles: ['USER'], capabilities: ['USER'],
    };
    const accountB = {
      ...accountA, uid: 2, username: 'reader-b',
    };
    let currentAuth = accountA;
    mockedUseAuth.mockImplementation(() => currentAuth);

    let resolveAccountA!: (value: ReturnType<typeof page>) => void;
    mockedGetDonHangHistory
      .mockReturnValueOnce(new Promise(resolve => { resolveAccountA = resolve; }))
      .mockResolvedValueOnce(page([{
        ...pendingOrder,
        maDonHang: 8,
      }]));

    const view = render(
      <MemoryRouter>
        <DonHangUser />
      </MemoryRouter>,
    );

    currentAuth = accountB;
    act(() => {
      view.rerender(
        <MemoryRouter>
          <DonHangUser />
        </MemoryRouter>,
      );
    });

    expect(await screen.findByRole('link', { name: 'Xem chi tiết đơn hàng #8' })).toBeInTheDocument();
    expect(mockedGetDonHangHistory).toHaveBeenCalledTimes(2);

    resolveAccountA(page());
    await waitFor(() => {
      expect(screen.queryByText('#7')).not.toBeInTheDocument();
      expect(screen.getByText('#8')).toBeInTheDocument();
    });
  });

  it('links each order to its protected detail page', async () => {
    render(<MemoryRouter><DonHangUser /></MemoryRouter>);

    expect(await screen.findByRole('link', { name: 'Xem chi tiết đơn hàng #7' }))
      .toHaveAttribute('href', '/order/7');
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
