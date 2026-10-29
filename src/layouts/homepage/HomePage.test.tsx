import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import HomePage from './HomePage';
import { getSachBanChay, getSachMoiNhat } from '../../api/SachApi';

jest.mock('../../api/SachApi', () => ({
  getSachBanChay: jest.fn(), getSachMoiNhat: jest.fn(),
}));
jest.mock('./components/Banner', () => () => null);
jest.mock('./components/Carousel', () => () => null);
jest.mock('../products/DanhSachSanPham', () => () => null);
jest.mock('../products/components/SachProps', () => ({ sach }: { sach: { tenSach: string } }) => (
  <p>{sach.tenSach}</p>
));

describe('homepage catalogue recovery', () => {
  beforeEach(() => jest.resetAllMocks());

  it('shows an error and retries only the failed section without hiding a successful sibling', async () => {
    (getSachBanChay as jest.Mock)
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockResolvedValueOnce([{ maSach: 1, tenSach: 'Sách bán chạy đã tải lại' }]);
    (getSachMoiNhat as jest.Mock).mockResolvedValue([{ maSach: 2, tenSach: 'Sách mới có sẵn' }]);
    render(<HomePage />);

    expect(await screen.findByText('Sách mới có sẵn')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Sách bán chạy đã tải lại')).toBeInTheDocument();
    expect(screen.getByText('Sách mới có sẵn')).toBeInTheDocument();
    expect(getSachBanChay).toHaveBeenCalledTimes(2);
    expect(getSachMoiNhat).toHaveBeenCalledTimes(1);
  });

  it('keeps legitimate empty results separate from errors', async () => {
    (getSachBanChay as jest.Mock).mockResolvedValue([]);
    (getSachMoiNhat as jest.Mock).mockResolvedValue([]);
    render(<HomePage />);
    expect(await screen.findAllByText('Chưa có sách trong mục này.')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument();
  });

  it('aborts section requests on unmount and ignores a loader that resolves after cancellation', async () => {
    let finish: ((books: Array<{ maSach: number; tenSach: string }>) => void) | undefined;
    (getSachBanChay as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    (getSachMoiNhat as jest.Mock).mockResolvedValue([]);
    const { unmount } = render(<HomePage />);
    const signal = (getSachBanChay as jest.Mock).mock.calls[0][1] as AbortSignal;
    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => { finish?.([{ maSach: 1, tenSach: 'Kết quả cũ' }]); });
    expect(screen.queryByText('Kết quả cũ')).not.toBeInTheDocument();
    expect(getSachBanChay).toHaveBeenCalledTimes(1);
  });
});
