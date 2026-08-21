import React from 'react';
import { useServerWake } from '../../api/ServerWakeSignal';

/**
 * Backend chạy trên gói miễn phí nên ngủ khi vắng traffic; lần truy cập đầu tiên
 * phải đợi nó khởi động lại. Trước đây trang chỉ im lặng rồi báo lỗi, khiến người
 * dùng tưởng hệ thống hỏng. Dải này nói rõ đang đợi cái gì.
 */
function ThongBaoMayChuKhoiDong(): JSX.Element | null {
  const dangKhoiDong = useServerWake();
  if (!dangKhoiDong) {
    return null;
  }

  return (
    <div
      role="status"
      className="text-center py-2"
      style={{
        background: 'var(--color-surface-alt, #fff8e1)',
        color: 'var(--color-text-secondary, #5f5f5f)',
        fontSize: '0.9rem',
      }}
    >
      Máy chủ đang khởi động, vui lòng đợi trong giây lát…
    </div>
  );
}

export default ThongBaoMayChuKhoiDong;
