import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
  diaChiNhanHang: '1 Đường Sách',
  trangThaiThanhToan: 1,
  trangThaiGiaoHang: 2,
  phuongThucThanhToan: 'VNPAY',
  tenPhuongThucThanhToan: 'Thanh toán VNPay',
  tenHinhThucGiaoHang: 'Giao hàng tận nơi',
  tongTienSanPham: 100000,
  soTienGiam: 0,
  chiPhiGiaoHang: 10000,
  chiPhiThanhToan: 0,
  tongTien: 110000,
  danhSachChiTietDonHang: [{
    maSach: 3,
    tenSach: 'Sách kiểm thử',
    soLuong: 1,
    giaBan: 100000,
    thanhTien: 100000,
  }],
};

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/order/91']}>
      <Routes>
        <Route path="/order/:maDonHang" element={<ChiTietDonHangUser />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ChiTietDonHangUser accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('announces the loading state', async () => {
    let resolveDetail!: (value: typeof detail) => void;
    mockedGetDonHangDetail.mockReturnValue(new Promise(resolve => { resolveDetail = resolve; }));

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Đang tải chi tiết đơn hàng');
    resolveDetail(detail);
    expect(await screen.findByRole('heading', { name: 'Chi tiết đơn hàng #91' })).toBeInTheDocument();
  });

  it('uses headings, scoped table headers and accessible navigation links', async () => {
    mockedGetDonHangDetail.mockResolvedValue(detail);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Chi tiết đơn hàng #91' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Thông tin nhận hàng' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sản phẩm' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.getByRole('link', { name: 'Xem sách Sách kiểm thử' })).toHaveAttribute('href', '/sach/3');
    expect(screen.getByRole('link', { name: /Quay lại đơn hàng của tôi/ })).toHaveAttribute('href', '/order');
    expect(screen.getByLabelText('Trạng thái đơn hàng')).toHaveTextContent('Đã thanh toán');
    expect(screen.getByLabelText('Trạng thái đơn hàng')).toHaveTextContent('Đã nhận hàng');
  });
});
