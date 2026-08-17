import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import KetQuaDangNhapSocial from './KetQuaDangNhapSocial';
import { bootstrapAuth } from '../../api/AuthSession';
import { layHoSoDangKy } from '../../api/SocialAuthApi';

jest.mock('../../api/AuthSession', () => ({
  bootstrapAuth: jest.fn(),
}));
jest.mock('../../api/SocialAuthApi', () => ({
  layHoSoDangKy: jest.fn(),
  guiMaXacMinhEmail: jest.fn(),
  xacMinhEmail: jest.fn(),
  hoanTatDangKy: jest.fn(),
  SocialSignupError: class SocialSignupError extends Error {},
}));

const mockedBootstrap = bootstrapAuth as jest.MockedFunction<typeof bootstrapAuth>;
const mockedHoSo = layHoSoDangKy as jest.MockedFunction<typeof layHoSoDangKy>;

function ViTri(): JSX.Element {
  const location = useLocation();
  // <div> chứ không phải <output>: <output> mang sẵn role="status" và sẽ đụng với vùng
  // thông báo của chính trang đang được kiểm tra.
  return <div data-testid="vi-tri">{location.pathname}</div>;
}

function renderResult(search: string): void {
  render(
    <MemoryRouter initialEntries={[`/tai-khoan/oauth/ket-qua${search}`]}>
      <Routes>
        <Route path="/tai-khoan/oauth/ket-qua" element={<KetQuaDangNhapSocial />} />
        <Route path="*" element={<div>trang khac</div>} />
      </Routes>
      <ViTri />
    </MemoryRouter>,
  );
}

describe('KetQuaDangNhapSocial', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Đặt ở đây chứ không ở factory: cấu hình Jest của CRA bật `resetMocks`, nên
    // implementation khai trong factory bị xoá trước mỗi test.
    //
    // Hồ sơ treo mãi để trang giữ nguyên trạng thái đang tải, nhờ đó phép kiểm tra không
    // phụ thuộc vào việc lời gọi mạng thắng hay thua cuộc đua với lần render đầu.
    mockedHoSo.mockReturnValue(new Promise(() => undefined));
    mockedBootstrap.mockResolvedValue({
      status: 'authenticated', uid: 7, username: 'reader', roles: ['USER'], capabilities: ['USER'],
    });
  });

  /**
   * The callback only says the login succeeded; the access token lives in memory and this tab
   * does not have one yet. Bootstrapping is what turns the cookie into a usable session.
   */
  it('bootstraps the session before leaving the result page', async () => {
    renderResult('?ket-qua=thanh-cong&tiep-tuc=%2F');

    await waitFor(() => expect(mockedBootstrap).toHaveBeenCalledTimes(1));
  });

  it('returns the user to the allowlisted continue path after a successful login', async () => {
    renderResult('?ket-qua=thanh-cong&tiep-tuc=%2Fgio-hang');

    await waitFor(() => expect(screen.getByTestId('vi-tri')).toHaveTextContent('/gio-hang'));
  });

  /**
   * The backend already sanitises the return path, but the frontend must not trust a query
   * parameter either: an absolute URL here would be a client-side open redirect.
   */
  it('refuses an absolute continue target and goes home instead', async () => {
    renderResult('?ket-qua=thanh-cong&tiep-tuc=https%3A%2F%2Fevil.example');

    await waitFor(() => expect(screen.getByTestId('vi-tri')).toHaveTextContent('/'));
    expect(screen.getByTestId('vi-tri')).not.toHaveTextContent('evil.example');
  });

  /**
   * Nhánh này từng là ngõ cụt: nó giải thích rằng cần đăng ký rồi dừng, nên mọi lần đăng
   * nhập social đều kết thúc ở đó vì không có gì tạo ra `auth_identity`. Giờ nó phải mở ra
   * form hoàn tất.
   *
   * Bất biến cũ vẫn giữ nguyên: chưa có tài khoản thì chưa được nhận phiên. Bootstrap chỉ
   * được gọi sau khi form hoàn tất thành công, không phải khi vừa vào trang.
   */
  it('opens the completion form without claiming a session', async () => {
    renderResult('?ket-qua=can-dang-ky&tiep-tuc=%2F');

    expect(await screen.findByRole('status')).toHaveTextContent('Đang tải thông tin đăng ký');
    expect(mockedBootstrap).not.toHaveBeenCalled();
  });

  /**
   * An email that already belongs to a password account must never be linked automatically;
   * the page has to send the user to prove ownership by signing in.
   */
  it('asks the user to sign in with a password when the email already exists', async () => {
    renderResult('?ket-qua=can-lien-ket&tiep-tuc=%2F');

    expect(await screen.findByRole('status')).toHaveTextContent('đã có tài khoản');
    expect(mockedBootstrap).not.toHaveBeenCalled();
  });

  it('shows a neutral failure message for a rejected flow', async () => {
    renderResult('?ket-qua=loi&tiep-tuc=%2F');

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể đăng nhập');
    expect(mockedBootstrap).not.toHaveBeenCalled();
  });

  it('treats an unknown or missing outcome as a failure', async () => {
    renderResult('?tiep-tuc=%2F');

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể đăng nhập');
  });

  /** A failed bootstrap must not strand the user on a blank page. */
  it('surfaces a retry path when bootstrapping fails', async () => {
    mockedBootstrap.mockRejectedValue(new TypeError('offline'));

    renderResult('?ket-qua=thanh-cong&tiep-tuc=%2F');

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể đăng nhập');
  });
});
