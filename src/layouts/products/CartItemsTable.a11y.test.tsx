import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CartItemsTable from './CartItemsTable';

const gioHang = [
  {
    maSach: 1,
    sachDto: { tenSach: 'Sách A', giaBan: 100000, hinhAnh: '' },
    soLuong: 2,
  },
];

function renderTable() {
  render(
    <MemoryRouter>
      <CartItemsTable
        gioHang={gioHang}
        onIncrease={jest.fn()}
        onDecrease={jest.fn()}
        onChangeQty={jest.fn()}
        onRemove={jest.fn()}
      />
    </MemoryRouter>,
  );
}

describe('CartItemsTable accessibility', () => {
  it('names every quantity control per line so they are distinguishable by assistive tech', () => {
    renderTable();

    expect(screen.getByRole('button', { name: 'Giảm số lượng Sách A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tăng số lượng Sách A' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Số lượng Sách A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xóa Sách A khỏi giỏ hàng' })).toBeInTheDocument();
  });

  it('exposes each line as a list item so the cart size is announced', () => {
    renderTable();

    expect(screen.getByRole('list', { name: 'Sản phẩm trong giỏ hàng' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('keeps the decorative delete icon out of the accessibility tree', () => {
    renderTable();

    const remove = screen.getByRole('button', { name: 'Xóa Sách A khỏi giỏ hàng' });
    expect(remove.querySelector('i')).toHaveAttribute('aria-hidden', 'true');
  });
});
