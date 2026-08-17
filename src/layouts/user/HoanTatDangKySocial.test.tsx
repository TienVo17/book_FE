import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import HoanTatDangKySocial from './HoanTatDangKySocial';
import { bootstrapAuth } from '../../api/AuthSession';
import {
  guiMaXacMinhEmail,
  hoanTatDangKy,
  layHoSoDangKy,
  SocialSignupError,
  xacMinhEmail,
} from '../../api/SocialAuthApi';

jest.mock('../../api/AuthSession', () => ({
  bootstrapAuth: jest.fn(),
}));
jest.mock('../../api/SocialAuthApi', () => {
  class SocialSignupError extends Error {
    readonly code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }
  return {
    layHoSoDangKy: jest.fn(),
    guiMaXacMinhEmail: jest.fn(),
    xacMinhEmail: jest.fn(),
    hoanTatDangKy: jest.fn(),
    SocialSignupError,
  };
});

const mockedHoSo = layHoSoDangKy as jest.MockedFunction<typeof layHoSoDangKy>;
const mockedGuiMa = guiMaXacMinhEmail as jest.MockedFunction<typeof guiMaXacMinhEmail>;
const mockedXacMinh = xacMinhEmail as jest.MockedFunction<typeof xacMinhEmail>;
const mockedHoanTat = hoanTatDangKy as jest.MockedFunction<typeof hoanTatDangKy>;
const mockedBootstrap = bootstrapAuth as jest.MockedFunction<typeof bootstrapAuth>;

function renderForm(): void {
  render(
    <MemoryRouter initialEntries={['/tai-khoan/oauth/ket-qua']}>
      <Routes>
        <Route
          path="/tai-khoan/oauth/ket-qua"
          element={<HoanTatDangKySocial tiepTuc="/" />}
        />
        <Route path="/" element={<div>trang chu</div>} />
        <Route path="/dang-nhap" element={<div>trang dang nhap</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const NUT_HOAN_TAT = 'Hoàn tất đăng ký';

describe('HoanTatDangKySocial', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedBootstrap.mockResolvedValue({
      status: 'authenticated', uid: 7, username: 'reader', roles: ['USER'], capabilities: ['USER'],
    });
  });

  /** Google đã xác minh sẵn địa chỉ, nên không bắt người dùng nhập lại mã lần nữa. */
  it('lets a provider-verified address submit without a code', async () => {
    mockedHoSo.mockResolvedValue({
      provider: 'google', email: 'nguoi@example.com', emailDaXacMinh: true, tenHienThi: 'Vo Tien',
    });

    renderForm();

    await screen.findByLabelText('Email');
    expect(screen.getByRole('button', { name: NUT_HOAN_TAT })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Gửi mã xác minh' })).not.toBeInTheDocument();
  });

  /**
   * Facebook không bao giờ chứng minh được địa chỉ. Mở nút hoàn tất khi chưa có bằng chứng
   * chỉ dẫn tới một lần gửi bị máy chủ từ chối.
   */
  it('keeps completion closed until an unverified address is proven', async () => {
    mockedHoSo.mockResolvedValue({
      provider: 'facebook', email: null, emailDaXacMinh: false, tenHienThi: 'Vo Tien',
    });
    mockedGuiMa.mockResolvedValue();
    mockedXacMinh.mockResolvedValue();

    renderForm();

    await screen.findByLabelText('Email');
    expect(screen.getByRole('button', { name: NUT_HOAN_TAT })).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Email'), 'nguoi@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi mã xác minh' }));
    await userEvent.type(await screen.findByLabelText('Mã xác minh'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Xác minh' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: NUT_HOAN_TAT })).toBeEnabled());
  });

  /**
   * Máy chủ xoá bằng chứng khi địa chỉ đổi. Giao diện phải theo đúng, nếu không nút hoàn tất
   * mở ra cho một địa chỉ chưa ai xác minh.
   */
  it('drops the proof when the address is edited', async () => {
    mockedHoSo.mockResolvedValue({
      provider: 'google', email: 'nguoi@example.com', emailDaXacMinh: true, tenHienThi: null,
    });

    renderForm();

    const email = await screen.findByLabelText('Email');
    expect(screen.getByRole('button', { name: NUT_HOAN_TAT })).toBeEnabled();

    await userEvent.type(email, 'x');

    expect(screen.getByRole('button', { name: NUT_HOAN_TAT })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Gửi mã xác minh' })).toBeInTheDocument();
  });

  /** Phiên mới nằm trong cookie refresh; không bootstrap thì tab này vẫn là khách. */
  it('bootstraps the session before leaving the page', async () => {
    mockedHoSo.mockResolvedValue({
      provider: 'google', email: 'nguoi@example.com', emailDaXacMinh: true, tenHienThi: 'Vo Tien',
    });
    mockedHoanTat.mockResolvedValue();

    renderForm();

    await userEvent.type(await screen.findByLabelText('Tên đăng nhập'), 'reader');
    await userEvent.click(screen.getByRole('button', { name: NUT_HOAN_TAT }));

    await waitFor(() => expect(mockedBootstrap).toHaveBeenCalled());
    expect(mockedHoanTat).toHaveBeenCalledWith(
      expect.objectContaining({ tenDangNhap: 'reader', email: 'nguoi@example.com' }));
    expect(await screen.findByText('trang chu')).toBeInTheDocument();
  });

  /** Tên trùng là lỗi sửa được: giữ nguyên form thay vì đá người dùng ra ngoài. */
  it('reports a taken username without discarding the form', async () => {
    mockedHoSo.mockResolvedValue({
      provider: 'google', email: 'nguoi@example.com', emailDaXacMinh: true, tenHienThi: null,
    });
    mockedHoanTat.mockRejectedValue(new SocialSignupError('USERNAME_TAKEN'));

    renderForm();

    await userEvent.type(await screen.findByLabelText('Tên đăng nhập'), 'reader');
    await userEvent.click(screen.getByRole('button', { name: NUT_HOAN_TAT }));

    expect(await screen.findByRole('alert')).toHaveTextContent('đã có người dùng');
    expect(screen.getByLabelText('Tên đăng nhập')).toHaveValue('reader');
  });

  /** Hồ sơ hết hạn thì form vô nghĩa; phải dẫn người dùng quay lại đăng nhập. */
  it('sends the user back to login when the intent is gone', async () => {
    mockedHoSo.mockRejectedValue(new SocialSignupError('SIGNUP_INTENT_INVALID'));

    renderForm();

    expect(await screen.findByRole('alert')).toHaveTextContent('hết hạn');
    expect(screen.getByRole('button', { name: 'Quay lại đăng nhập' })).toBeInTheDocument();
  });
});
