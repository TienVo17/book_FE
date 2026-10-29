import { apiUrl } from './ApiUrl';
import { publicRequest } from './Request';
import { getServerWakeSnapshot, resetServerWakeForTests } from './ServerWakeSignal';

const catalogueUrl = apiUrl('/api/sach?page=0');

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

async function flush(): Promise<void> {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
}

async function advance(ms: number): Promise<void> {
  for (let elapsed = 0; elapsed < ms; elapsed += 1_000) {
    jest.advanceTimersByTime(Math.min(1_000, ms - elapsed));
    await flush();
  }
}

describe('catalogue recovery after an idle backend', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    resetServerWakeForTests();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    global.fetch = originalFetch;
    resetServerWakeForTests();
  });

  it.each([502, 503, 504])('recovers a catalogue read after HTTP %s', async status => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(json({ message: 'starting' }, status))
      .mockResolvedValueOnce(json({ content: [{ maSach: 1 }] }));
    const request = publicRequest(catalogueUrl);
    request.catch(() => undefined);
    await flush();
    await advance(2_000);
    await expect(request).resolves.toEqual({ content: [{ maSach: 1 }] });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('recovers a transport failure without changing the request URL or options', async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(json([]));
    const request = publicRequest(catalogueUrl, { headers: { Accept: 'application/json' } });
    request.catch(() => undefined);
    await flush();
    await advance(2_000);
    await expect(request).resolves.toEqual([]);
    expect((global.fetch as jest.Mock).mock.calls[1]).toEqual([
      catalogueUrl, expect.objectContaining({ headers: { Accept: 'application/json' } }),
    ]);
  });

  it('does not mistake an HTML loading page with HTTP 200 for catalogue data', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(new Response('<!doctype html><h1>Starting</h1>', {
        headers: { 'Content-Type': 'text/html' },
      }))
      .mockResolvedValueOnce(json({ content: [] }));
    const request = publicRequest(catalogueUrl);
    request.catch(() => undefined);
    await flush();
    await advance(2_000);
    await expect(request).resolves.toEqual({ content: [] });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it.each([200, 503])('stops persistent HTTP %s failures within four minutes', async status => {
    (global.fetch as jest.Mock).mockImplementation(() => Promise.resolve(
      status === 200 ? new Response('<html>Starting</html>') : json({}, status),
    ));
    const request = publicRequest(catalogueUrl);
    request.catch(() => undefined);
    await flush();
    await advance(240_000);
    await expect(request).rejects.toThrow('Máy chủ không phản hồi');
    expect((global.fetch as jest.Mock).mock.calls.length).toBeLessThanOrEqual(20);
    expect(getServerWakeSnapshot()).toBe(false);
  });

  it('can recover after the old 90-second window and releases the slow-server notice', async () => {
    let ready = false;
    (global.fetch as jest.Mock).mockImplementation(() => Promise.resolve(
      ready ? json({ content: [] }) : json({}, 503),
    ));
    const request = publicRequest(catalogueUrl);
    request.catch(() => undefined);
    await flush();
    await advance(100_000);
    expect(getServerWakeSnapshot()).toBe(true);
    ready = true;
    await advance(15_000);
    await expect(request).resolves.toEqual({ content: [] });
    expect(getServerWakeSnapshot()).toBe(false);
  });

  it('honors caller cancellation during the retry delay', async () => {
    const parent = new AbortController();
    (global.fetch as jest.Mock).mockResolvedValue(json({}, 503));
    const request = publicRequest(catalogueUrl, { signal: parent.signal });
    request.catch(() => undefined);
    await flush();
    parent.abort();
    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    await advance(60_000);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(getServerWakeSnapshot()).toBe(false);
  });

  it.each([401, 403, 404, 429, 500])('does not retry HTTP %s as a cold start', async status => {
    (global.fetch as jest.Mock).mockResolvedValue(json({}, status));
    await expect(publicRequest(catalogueUrl)).rejects.toMatchObject({ status });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['https://foreign.example/api/sach', 'GET'],
    [apiUrl('/api/don-hang/submitOrder'), 'GET'],
    [apiUrl('/tai-khoan/kich-hoat'), 'GET'],
    [apiUrl('/tai-khoan/refresh'), 'POST'],
    [apiUrl('/api/gio-hang/items'), 'POST'],
    [catalogueUrl, 'POST'],
    [apiUrl('/api/sach/1/unknown-operation'), 'GET'],
  ])('does not extend replay to %s (%s)', async (url, method) => {
    (global.fetch as jest.Mock).mockResolvedValue(json({}, 503));
    await expect(publicRequest(url, { method })).rejects.toMatchObject({ status: 503 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('does not add a preflight to successful warm reads', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(json({ content: [] }));
    await expect(publicRequest(catalogueUrl)).resolves.toEqual({ content: [] });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(getServerWakeSnapshot()).toBe(false);
  });

  it('retries a hanging fetch after 45 seconds and recovers', async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce((_url, options: RequestInit) => new Promise((_resolve, reject) => {
        options.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      }))
      .mockResolvedValueOnce(json({ content: [] }));
    const request = publicRequest(catalogueUrl);
    await flush();
    await advance(45_000);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(getServerWakeSnapshot()).toBe(true);
    await advance(2_000);
    await expect(request).resolves.toEqual({ content: [] });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(getServerWakeSnapshot()).toBe(false);
  });

  it.each(['fetch', 'body'])('aborts a hanging %s at the total deadline, including a shortened final attempt', async phase => {
    const started = Date.now();
    const starts: number[] = [];
    const signals: AbortSignal[] = [];
    (global.fetch as jest.Mock).mockImplementation((_url, options: RequestInit) => {
      starts.push(Date.now() - started);
      signals.push(options.signal!);
      const pending = () => new Promise((_resolve, reject) => {
        options.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
      return phase === 'fetch' ? pending() : Promise.resolve({
        ok: true, status: 200, headers: new Headers(), text: pending,
      });
    });
    const request = publicRequest(catalogueUrl);
    request.catch(() => undefined);
    await flush();
    await advance(239_999);
    expect(starts).toEqual([0, 47_000, 96_000, 149_000, 209_000]);
    expect(signals[4].aborted).toBe(false);
    await advance(1);
    await expect(request).rejects.toThrow('Máy chủ không phản hồi');
    expect(signals[4].aborted).toBe(true);
    await advance(60_000);
    expect(global.fetch).toHaveBeenCalledTimes(5);
    expect(getServerWakeSnapshot()).toBe(false);
  });

  it('honors caller cancellation while a fetch is pending', async () => {
    const parent = new AbortController();
    (global.fetch as jest.Mock).mockImplementation((_url, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    const request = publicRequest(catalogueUrl, { signal: parent.signal });
    request.catch(() => undefined);
    await advance(5_000);
    expect(getServerWakeSnapshot()).toBe(true);
    parent.abort();
    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    await advance(60_000);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(getServerWakeSnapshot()).toBe(false);
  });

  it('rejects malformed non-HTML success without hiding it behind retries', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(new Response('invalid catalogue'));
    await expect(publicRequest(catalogueUrl)).rejects.toThrow('Dữ liệu sách trả về không hợp lệ');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
