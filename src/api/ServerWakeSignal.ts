import { useSyncExternalStore } from 'react';

/**
 * Instance backend trên gói miễn phí ngủ sau một khoảng không có traffic, và lần
 * đánh thức mất hàng chục giây. Trong cửa sổ đó server vẫn sống, chỉ là chưa trả
 * lời được — trang cần nói đúng điều đó thay vì để người dùng nhìn màn hình trống.
 *
 * Store này chỉ đếm số request đã chậm quá ngưỡng. Nó không giữ URL, không giữ
 * token và không biết gì về nội dung request.
 */
const SLOW_REQUEST_MS = 5_000;

let slowRequestCount = 0;
let snapshot = false;
const listeners = new Set<() => void>();

function publish(next: boolean): void {
  if (snapshot === next) {
    return;
  }
  snapshot = next;
  listeners.forEach(listener => listener());
}

/**
 * Bắt đầu theo dõi một request. Hàm trả về phải được gọi khi request kết thúc dù
 * thành công hay thất bại; gọi nhiều lần là vô hại để nhánh dọn dẹp trùng lặp
 * không làm bộ đếm trôi âm.
 */
export function beginServerWakeWatch(): () => void {
  let counted = false;
  let released = false;

  const timer = setTimeout(() => {
    counted = true;
    slowRequestCount += 1;
    publish(true);
  }, SLOW_REQUEST_MS);

  return () => {
    if (released) {
      return;
    }
    released = true;
    clearTimeout(timer);
    if (counted) {
      slowRequestCount -= 1;
      publish(slowRequestCount > 0);
    }
  };
}

export function subscribeServerWake(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getServerWakeSnapshot(): boolean {
  return snapshot;
}

export function useServerWake(): boolean {
  return useSyncExternalStore(subscribeServerWake, getServerWakeSnapshot, getServerWakeSnapshot);
}

export function resetServerWakeForTests(): void {
  slowRequestCount = 0;
  snapshot = false;
  listeners.clear();
}
