import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CheckoutSidebar from './CheckoutSidebar';

const address = {
  maDiaChi: 5,
  hoTen: 'Người nhận',
  soDienThoai: '0900000000',
  diaChiDayDu: 'Địa chỉ test',
  macDinh: true,
};

function renderSidebar(overrides: Partial<React.ComponentProps<typeof CheckoutSidebar>> = {}) {
  const props: React.ComponentProps<typeof CheckoutSidebar> = {
    danhSachDiaChi: [address],
    diaChiDaChon: 5,
    onChonDiaChi: jest.fn(),
    phuongThucThanhToan: 'COD',
    onChonPhuongThucThanhToan: jest.fn(),
    maCoupon: '',
    onChangeCoupon: jest.fn(),
    onApCoupon: jest.fn(),
    couponResult: null,
    tongTienGoc: 100000,
    soTienGiam: 0,
    tongThanhToan: 100000,
    dangTao: false,
    onDatHang: jest.fn(),
    ...overrides,
  };
  render(<MemoryRouter><CheckoutSidebar {...props} /></MemoryRouter>);
  return props;
}

describe('CheckoutSidebar accessibility', () => {
  it('groups address and payment radios so their purpose is announced', () => {
    renderSidebar();

    expect(screen.getByRole('radiogroup', { name: /Địa chỉ giao hàng/ })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /Phương thức thanh toán/ })).toBeInTheDocument();
  });

  it('associates the coupon input with a programmatic label', () => {
    renderSidebar();

    expect(screen.getByLabelText('Mã giảm giá')).toBeInTheDocument();
  });

  it('announces coupon feedback through a live region, not colour alone', () => {
    renderSidebar({
      couponResult: {
        hopLe: false,
        soTienGiam: 0,
        tongTienSauGiam: 100000,
        thongBao: 'Mã giảm giá không tồn tại.',
      },
    });

    const feedback = screen.getByRole('alert');
    expect(feedback).toHaveTextContent('Mã giảm giá không tồn tại.');
  });

  it('announces a successful coupon as a status rather than an alert', () => {
    renderSidebar({
      couponResult: {
        hopLe: true,
        soTienGiam: 10000,
        tongTienSauGiam: 90000,
        maCoupon: 'SAVE10',
        thongBao: 'Đã áp dụng mã SAVE10',
      },
    });

    expect(screen.getByRole('status')).toHaveTextContent('Đã áp dụng mã SAVE10');
  });

  it('keeps the submit button reachable and operable by keyboard', async () => {
    const props = renderSidebar();
    const submit = screen.getByRole('button', { name: /Đặt hàng COD/ });

    submit.focus();
    expect(submit).toHaveFocus();
    await userEvent.keyboard('{Enter}');

    expect(props.onDatHang).toHaveBeenCalledTimes(1);
  });

  it('marks the submit control busy while an order is being created', () => {
    renderSidebar({ dangTao: true });

    const submit = screen.getByRole('button', { name: /Đang xử lý/ });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
  });
});
