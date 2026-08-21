import React from 'react';
import { act, render, screen } from '@testing-library/react';
import ThongBaoMayChuKhoiDong from './ThongBaoMayChuKhoiDong';
import { beginServerWakeWatch, resetServerWakeForTests } from '../../api/ServerWakeSignal';

describe('ThongBaoMayChuKhoiDong', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetServerWakeForTests();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stays out of the way while the server answers normally', () => {
    render(<ThongBaoMayChuKhoiDong />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('explains the wait instead of letting the page look broken', () => {
    render(<ThongBaoMayChuKhoiDong />);

    let dispose = () => undefined as void;
    act(() => {
      dispose = beginServerWakeWatch();
      jest.advanceTimersByTime(5_000);
    });

    expect(screen.getByRole('status')).toHaveTextContent('Máy chủ đang khởi động');

    act(() => {
      dispose();
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
