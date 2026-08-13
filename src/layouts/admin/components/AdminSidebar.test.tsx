import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { signOutCartSession } from '../../../api/CartSession';
import AdminSidebar from './AdminSidebar';

jest.mock('../../../api/CartSession', () => ({
  signOutCartSession: jest.fn(),
}));

const mockedSignOut = signOutCartSession as jest.MockedFunction<typeof signOutCartSession>;

const encodePayload = (payload: Record<string, unknown>) => {
  const encoded = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${encoded}.signature`;
};

interface RenderSidebarOptions {
  route?: string;
  isOpen?: boolean;
  onRequestOpen?: jest.Mock;
  onRequestClose?: jest.Mock;
}

const renderSidebar = ({
  route = '/quan-ly/dashboard',
  isOpen = false,
  onRequestOpen = jest.fn(),
  onRequestClose = jest.fn(),
}: RenderSidebarOptions = {}) => {
  const menuButtonRef = React.createRef<HTMLButtonElement>();
  return {
    onRequestOpen,
    onRequestClose,
    ...render(
      <MemoryRouter initialEntries={[route]}>
        <AdminSidebar
          isOpen={isOpen}
          menuButtonRef={menuButtonRef}
          onRequestOpen={onRequestOpen}
          onRequestClose={onRequestClose}
        />
      </MemoryRouter>,
    ),
  };
};

describe('AdminSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('jwt', encodePayload({ sub: 'admin@book.vn', isAdmin: true }));
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders admin-only navigation and exposes submenu state', () => {
    renderSidebar();

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quản lý thể loại' })).toBeInTheDocument();

    const booksButton = screen.getByRole('button', { name: 'Quản lý sách' });
    expect(booksButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(booksButton);
    expect(booksButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('opens the submenu that contains the active deep link', () => {
    renderSidebar({ route: '/quan-ly/danh-sach-don-hang' });

    expect(screen.getByRole('button', { name: 'Quản lý đơn hàng' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('wires the mobile menu button to layout callbacks', () => {
    const onRequestOpen = jest.fn();
    const onRequestClose = jest.fn();
    renderSidebar({ isOpen: true, onRequestOpen, onRequestClose });

    const openButton = screen.getByRole('button', { name: 'Mở menu quản trị' });
    expect(openButton).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(openButton);
    expect(onRequestOpen).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Đóng menu quản trị' }));
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });

  it('keeps logout session cleanup behavior', () => {
    const onRequestClose = jest.fn();
    renderSidebar({ onRequestClose });

    fireEvent.click(screen.getByRole('button', { name: /admin@book.vn/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Đăng xuất' }));

    expect(mockedSignOut).toHaveBeenCalledTimes(1);
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });
});
