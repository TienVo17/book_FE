import {
  beginServerWakeWatch,
  getServerWakeSnapshot,
  resetServerWakeForTests,
  subscribeServerWake,
} from './ServerWakeSignal';

describe('ServerWakeSignal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetServerWakeForTests();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stays quiet for a request that answers before the slow threshold', () => {
    const dispose = beginServerWakeWatch();
    jest.advanceTimersByTime(4_999);
    dispose();
    jest.advanceTimersByTime(60_000);

    expect(getServerWakeSnapshot()).toBe(false);
  });

  it('announces the wake-up once a request passes the slow threshold', () => {
    const listener = jest.fn();
    subscribeServerWake(listener);

    const dispose = beginServerWakeWatch();
    jest.advanceTimersByTime(5_000);

    expect(getServerWakeSnapshot()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    dispose();
    expect(getServerWakeSnapshot()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('keeps announcing until the last slow request settles', () => {
    const first = beginServerWakeWatch();
    const second = beginServerWakeWatch();
    jest.advanceTimersByTime(5_000);

    expect(getServerWakeSnapshot()).toBe(true);

    first();
    expect(getServerWakeSnapshot()).toBe(true);

    second();
    expect(getServerWakeSnapshot()).toBe(false);
  });

  // Một request bị huỷ có thể chạy nhánh dọn dẹp nhiều lần; nếu bộ đếm trôi âm
  // thì lần chậm kế tiếp sẽ không bao giờ hiện được thông báo nữa.
  it('absorbs a repeated dispose so the counter cannot drift', () => {
    const dispose = beginServerWakeWatch();
    jest.advanceTimersByTime(5_000);
    dispose();
    dispose();

    const next = beginServerWakeWatch();
    jest.advanceTimersByTime(5_000);
    expect(getServerWakeSnapshot()).toBe(true);

    next();
    expect(getServerWakeSnapshot()).toBe(false);
  });

  it('stops notifying a listener that unsubscribed', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeServerWake(listener);
    unsubscribe();

    const dispose = beginServerWakeWatch();
    jest.advanceTimersByTime(5_000);
    dispose();

    expect(listener).not.toHaveBeenCalled();
  });
});
