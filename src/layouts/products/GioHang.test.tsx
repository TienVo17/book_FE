import React, { act } from 'react';
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
import { useAuthSession } from '../../api/AuthSession';
import { toast } from 'react-toastify';

jest.mock('../../api/CartSession', () => ({
  loadCart: jest.fn(),
  readCartForCurrentSession: jest.fn(() => []),
  removeCartItem: jest.fn(),
  setCartItemQuantity: jest.fn(),
}));
jest.mock('../../api/HinhAnhApi', () => ({ getOneImageOfOneBook: jest.fn() }));
jest.mock('../../api/AuthSession', () => ({ useAuthSession: jest.fn() }));
jest.mock('react-toastify', () => ({
  toast: { error: jest.fn() },
}));

const mockedLoadCart = loadCart as jest.MockedFunction<typeof loadCart>;
const mockedReadCart = readCartForCurrentSession as jest.MockedFunction<typeof readCartForCurrentSession>;
const mockedRemoveCartItem = removeCartItem as jest.MockedFunction<typeof removeCartItem>;
const mockedSetQuantity = setCartItemQuantity as jest.MockedFunction<typeof setCartItemQuantity>;
const mockedGetImage = getOneImageOfOneBook as jest.MockedFunction<typeof getOneImageOfOneBook>;
const mockedUseAuth = useAuthSession as jest.MockedFunction<typeof useAuthSession>;
const mockedToastError = toast.error as jest.MockedFunction<typeof toast.error>;

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
    mockedUseAuth.mockReturnValue({
      status: 'guest', uid: null, username: null, roles: [], capabilities: [],
    });
    mockedReadCart.mockReturnValue([]);
    mockedGetImage.mockResolvedValue([]);
    mockedRemoveCartItem.mockResolvedValue([]);
    mockedSetQuantity.mockImplementation(async (_maSach, soLuong) => [{ ...item, soLuong }]);
  });

  it('keeps the cart neutral and does not load before authentication settles', () => {
    mockedUseAuth.mockReturnValue({
      status: 'unknown', uid: null, username: null, roles: [], capabilities: [],
    });
    mockedLoadCart.mockResolvedValue([]);

    renderCart();

    expect(screen.getByRole('status')).toHaveTextContent('Đang tải giỏ hàng');
    expect(screen.queryByText('Giỏ hàng trống')).not.toBeInTheDocument();
    expect(mockedLoadCart).not.toHaveBeenCalled();
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

  it('reloads a different account cart and ignores the old account response', async () => {
    const accountA = {
      status: 'authenticated' as const,
      uid: 1,
      username: 'reader-a',
      roles: ['USER'],
      capabilities: ['USER'],
    };
    const accountB = {
      ...accountA,
      uid: 2,
      username: 'reader-b',
    };
    let currentAuth = accountA;
    mockedUseAuth.mockImplementation(() => currentAuth);

    const oldLoad = deferred<Awaited<ReturnType<typeof loadCart>>>();
    mockedLoadCart
      .mockReturnValueOnce(oldLoad.promise)
      .mockResolvedValueOnce([
        {
          ...item,
          maSach: 2,
          sachDto: {
            ...item.sachDto,
            tenSach: 'Sách B',
          },
          soLuong: 1,
        },
      ]);

    const view = render(
      <MemoryRouter>
        <GioHang />
      </MemoryRouter>,
    );

    currentAuth = accountB;
    act(() => {
      view.rerender(
        <MemoryRouter>
          <GioHang />
        </MemoryRouter>,
      );
    });

    expect(await screen.findByText('Sách B')).toBeInTheDocument();
    expect(mockedLoadCart).toHaveBeenCalledTimes(2);

    oldLoad.resolve([item]);
    await waitFor(() => {
      expect(screen.queryByText('Sách A')).not.toBeInTheDocument();
      expect(screen.getByText('Sách B')).toBeInTheDocument();
    });
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

  it('does not let a pending account-A mutation overwrite the account-B cart', async () => {
    const accountA = {
      status: 'authenticated' as const,
      uid: 1,
      username: 'reader-a',
      roles: ['USER'],
      capabilities: ['USER'],
    };
    const accountB = {
      ...accountA,
      uid: 2,
      username: 'reader-b',
    };
    let currentAuth = accountA;
    mockedUseAuth.mockImplementation(() => currentAuth);
    const accountBItem = {
      ...item,
      maSach: 2,
      sachDto: {
        ...item.sachDto,
        tenSach: 'Sách B',
      },
      soLuong: 1,
    };
    mockedLoadCart
      .mockResolvedValueOnce([item])
      .mockResolvedValueOnce([accountBItem]);
    const accountAMutation = deferred<Awaited<ReturnType<typeof setCartItemQuantity>>>();
    mockedSetQuantity.mockReturnValue(accountAMutation.promise);

    const view = render(
      <MemoryRouter>
        <GioHang />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Tăng số lượng Sách A' }));
    currentAuth = accountB;
    act(() => {
      view.rerender(
        <MemoryRouter>
          <GioHang />
        </MemoryRouter>,
      );
    });

    expect(await screen.findByText('Sách B')).toBeInTheDocument();
    await act(async () => {
      accountAMutation.resolve([{ ...item, soLuong: 3 }]);
      await accountAMutation.promise;
    });

    await waitFor(() => {
      expect(screen.queryByText('Sách A')).not.toBeInTheDocument();
      expect(screen.getByText('Sách B')).toBeInTheDocument();
    });
  });

  it('does not show an account-A mutation error after switching to account B', async () => {
    const accountA = {
      status: 'authenticated' as const,
      uid: 1,
      username: 'reader-a',
      roles: ['USER'],
      capabilities: ['USER'],
    };
    const accountB = {
      ...accountA,
      uid: 2,
      username: 'reader-b',
    };
    let currentAuth = accountA;
    mockedUseAuth.mockImplementation(() => currentAuth);
    const accountBItem = {
      ...item,
      maSach: 2,
      sachDto: {
        ...item.sachDto,
        tenSach: 'Sách B',
      },
      soLuong: 1,
    };
    mockedLoadCart
      .mockResolvedValueOnce([item])
      .mockResolvedValueOnce([accountBItem]);
    const accountAMutation = deferred<Awaited<ReturnType<typeof setCartItemQuantity>>>();
    mockedSetQuantity.mockReturnValue(accountAMutation.promise);

    const view = render(
      <MemoryRouter>
        <GioHang />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Tăng số lượng Sách A' }));
    currentAuth = accountB;
    act(() => {
      view.rerender(
        <MemoryRouter>
          <GioHang />
        </MemoryRouter>,
      );
    });

    expect(await screen.findByText('Sách B')).toBeInTheDocument();
    await act(async () => {
      accountAMutation.reject(new Error('Không thể cập nhật giỏ hàng A'));
      await expect(accountAMutation.promise).rejects.toThrow('Không thể cập nhật giỏ hàng A');
    });

    expect(mockedToastError).not.toHaveBeenCalledWith('Không thể cập nhật giỏ hàng A');
    expect(screen.getByText('Sách B')).toBeInTheDocument();
  });

  it('does not let an account-A pending lock disable the same book for account B', async () => {
    const accountA = {
      status: 'authenticated' as const,
      uid: 1,
      username: 'reader-a',
      roles: ['USER'],
      capabilities: ['USER'],
    };
    const accountB = {
      ...accountA,
      uid: 2,
      username: 'reader-b',
    };
    let currentAuth = accountA;
    mockedUseAuth.mockImplementation(() => currentAuth);
    const accountBItem = {
      ...item,
      sachDto: {
        ...item.sachDto,
        tenSach: 'Sách B',
      },
      soLuong: 1,
    };
    mockedLoadCart
      .mockResolvedValueOnce([item])
      .mockResolvedValueOnce([accountBItem]);
    const accountAMutation = deferred<Awaited<ReturnType<typeof setCartItemQuantity>>>();
    mockedSetQuantity.mockReturnValueOnce(accountAMutation.promise);

    const view = render(
      <MemoryRouter>
        <GioHang />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Tăng số lượng Sách A' }));
    currentAuth = accountB;
    act(() => {
      view.rerender(
        <MemoryRouter>
          <GioHang />
        </MemoryRouter>,
      );
    });

    const accountBIncrease = await screen.findByRole('button', { name: 'Tăng số lượng Sách B' });
    expect(accountBIncrease).not.toBeDisabled();
    fireEvent.click(accountBIncrease);
    expect(mockedSetQuantity).toHaveBeenCalledTimes(2);

    accountAMutation.resolve([{ ...item, soLuong: 3 }]);
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
