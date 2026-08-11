import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GioHang from './GioHang';
import {
  loadCart,
  readCartForCurrentSession,
  removeCartItem,
  setCartItemQuantity,
} from '../../api/CartSession';
import { getOneImageOfOneBook } from '../../api/HinhAnhApi';

jest.mock('../../api/CartSession', () => ({
  loadCart: jest.fn(),
  readCartForCurrentSession: jest.fn(() => []),
  removeCartItem: jest.fn(),
  setCartItemQuantity: jest.fn(),
}));
jest.mock('../../api/HinhAnhApi', () => ({ getOneImageOfOneBook: jest.fn() }));
jest.mock('react-toastify', () => ({
  toast: { error: jest.fn() },
}));

const mockedLoadCart = loadCart as jest.MockedFunction<typeof loadCart>;
const mockedReadCart = readCartForCurrentSession as jest.MockedFunction<typeof readCartForCurrentSession>;
const mockedRemoveCartItem = removeCartItem as jest.MockedFunction<typeof removeCartItem>;
const mockedSetQuantity = setCartItemQuantity as jest.MockedFunction<typeof setCartItemQuantity>;
const mockedGetImage = getOneImageOfOneBook as jest.MockedFunction<typeof getOneImageOfOneBook>;

const item = {
  maSach: 1,
  sachDto: { tenSach: 'Sách A', giaBan: 100000, hinhAnh: '' },
  soLuong: 2,
  soLuongTonKho: 20,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderCart(): void {
  render(
    <MemoryRouter>
      <GioHang />
    </MemoryRouter>,
  );
}

describe('GioHang server cart UX', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockedReadCart.mockReturnValue([]);
    mockedGetImage.mockResolvedValue([]);
    mockedRemoveCartItem.mockResolvedValue([]);
    mockedSetQuantity.mockImplementation(async (_maSach, soLuong) => [{ ...item, soLuong }]);
  });

  it('does not show an empty cart before the authoritative load completes', async () => {
    const request = deferred<Awaited<ReturnType<typeof loadCart>>>();
    mockedLoadCart.mockReturnValue(request.promise);
    renderCart();

    expect(screen.getByRole('status')).toHaveTextContent('Đang tải giỏ hàng');
    expect(screen.queryByText('Giỏ hàng trống')).not.toBeInTheDocument();

    request.resolve([]);
    expect(await screen.findByText('Giỏ hàng trống')).toBeInTheDocument();
  });

  it('keeps a load error visible and retries on demand', async () => {
    mockedLoadCart
      .mockRejectedValueOnce(new Error('Máy chủ tạm thời không phản hồi'))
      .mockResolvedValueOnce([]);
    renderCart();

    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ tạm thời không phản hồi');
    expect(screen.queryByText('Giỏ hàng trống')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tải lại giỏ hàng' }));
    expect(await screen.findByText('Giỏ hàng trống')).toBeInTheDocument();
    expect(mockedLoadCart).toHaveBeenCalledTimes(2);
  });

  it('locks one cart line while its server mutation is pending', async () => {
    mockedLoadCart.mockResolvedValue([item]);
    const mutation = deferred<Awaited<ReturnType<typeof setCartItemQuantity>>>();
    mockedSetQuantity.mockReturnValue(mutation.promise);
    renderCart();

    const increase = await screen.findByRole('button', { name: 'Tăng số lượng Sách A' });
    fireEvent.click(increase);
    fireEvent.click(increase);

    expect(mockedSetQuantity).toHaveBeenCalledTimes(1);
    expect(increase).toBeDisabled();
    expect(increase.closest('.cart-item')).toHaveAttribute('aria-busy', 'true');

    mutation.resolve([{ ...item, soLuong: 3 }]);
    await waitFor(() => expect(increase).not.toBeDisabled());
  });

  it('edits quantity as a draft and sends only one request on blur', async () => {
    mockedLoadCart.mockResolvedValue([item]);
    renderCart();

    const quantity = await screen.findByRole('spinbutton', { name: 'Số lượng Sách A' });
    fireEvent.change(quantity, { target: { value: '12' } });
    expect(mockedSetQuantity).not.toHaveBeenCalled();

    fireEvent.blur(quantity);
    await waitFor(() => expect(mockedSetQuantity).toHaveBeenCalledWith(1, 12));
    expect(mockedSetQuantity).toHaveBeenCalledTimes(1);
  });
});
