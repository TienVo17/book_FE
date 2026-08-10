import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ApiRequestError } from '../../api/Request';
import { getDonHangDetail } from '../../api/DonHangApi';
import ChiTietDonHangUser from './ChiTietDonHangUser';

jest.mock('../../api/DonHangApi', () => ({
  getDonHangDetail: jest.fn(),
}));

const mockedGetDonHangDetail = getDonHangDetail as jest.MockedFunction<typeof getDonHangDetail>;

const detail = {
  maDonHang: 91,
  ngayTao: '2026-08-10T08:00:00Z',
  hoTen: 'Nguyễn Văn A',
  soDienThoai: '0900000000',
  diaChiNhanHang: '1 Đường Sách, TP.HCM',
  trangThaiThanhToan: 0,
  trangThaiGiaoHang: 1,
  phuongThucThanhToan: 'COD',
  tenPhuongThucThanhToan: 'Thanh toán khi nhận hàng',
  tenHinhThucGiaoHang: 'Giao hàng tận nơi',
  tongTienSanPham: 200000,
  soTienGiam: 10000,
  chiPhiGiaoHang: 10000,
  chiPhiThanhToan: 0,
  tongTien: 200000,
  danhSachChiTietDonHang: [{
    maSach: 3,
    tenSach: 'Sách kiểm thử',
    soLuong: 2,
    giaBan: 100000,
    thanhTien: 200000,
  }],
};

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/order/:maDonHang" element={<ChiTietDonHangUser />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ChiTietDonHangUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetDonHangDetail.mockResolvedValue(detail);
  });

  it('renders receiver, statuses, line items and the authoritative financial breakdown', async () => {
    renderAt('/order/91');

    expect(await screen.findByRole('heading', { name: 'Chi tiết đơn hàng #91' })).toBeInTheDocument();
    expect(mockedGetDonHangDetail).toHaveBeenCalledWith(91);
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('Chưa thanh toán')).toBeInTheDocument();
    expect(screen.getByText('Đang giao')).toBeInTheDocument();
    expect(screen.getByText('Thanh toán khi nhận hàng')).toBeInTheDocument();
    expect(screen.getByText('Giao hàng tận nơi')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem sách Sách kiểm thử' })).toHaveAttribute('href', '/sach/3');
    expect(screen.getByText('−10.000đ')).toBeInTheDocument();
    expect(screen.getAllByText('200.000đ')).toHaveLength(3);
  });

  it.each(['/order/abc', '/order/0', '/order/-2', '/order/1.5']) (
    'rejects invalid route id %s without calling the API',
    async path => {
      renderAt(path);

      expect(await screen.findByRole('alert')).toHaveTextContent('Mã đơn hàng không hợp lệ.');
      expect(mockedGetDonHangDetail).not.toHaveBeenCalled();
      expect(screen.getByRole('link', { name: 'Quay lại đơn hàng của tôi' })).toHaveAttribute('href', '/order');
    },
  );

  it('shows the server-provided 404 message inline', async () => {
    mockedGetDonHangDetail.mockRejectedValue(new ApiRequestError('Đơn hàng không tồn tại.', 404));
    renderAt('/order/999');

    expect(await screen.findByRole('alert')).toHaveTextContent('Đơn hàng không tồn tại.');
    expect(screen.getByRole('link', { name: 'Quay lại đơn hàng của tôi' })).toBeInTheDocument();
  });

  it('shows a safe fallback when the network request fails', async () => {
    mockedGetDonHangDetail.mockRejectedValue(new TypeError('Failed to fetch'));
    renderAt('/order/91');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Không thể tải chi tiết đơn hàng. Vui lòng thử lại sau.',
    );
  });

  it('describes zero-cost delivery as free', async () => {
    mockedGetDonHangDetail.mockResolvedValue({
      ...detail,
      soTienGiam: 0,
      chiPhiGiaoHang: 0,
      tongTien: 200000,
      tenHinhThucGiaoHang: 'Tự lấy hàng tại cửa hàng',
    });
    renderAt('/order/91');

    expect(await screen.findByText('Miễn phí')).toBeInTheDocument();
    expect(screen.queryByText(/Giảm giá/)).not.toBeInTheDocument();
  });
});
