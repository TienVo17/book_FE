import {
  getDanhSachYeuThich,
  themYeuThich,
  xoaYeuThich,
} from './YeuThichApi';
import { apiUrl } from './ApiUrl';

function createJwt(): string {
  const payload = btoa(JSON.stringify({
    exp: Math.floor((Date.now() + 60_000) / 1000),
    sub: 'customer-a',
  }));
  return `header.${payload}.signature`;
}

const wishlist = [{
  maSach: 7,
  tenSach: 'Sách kiểm thử',
  giaBan: 125000,
  hinhAnh: 'cover.jpg',
}];

describe('YeuThichApi', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('jwt', createJwt());
    global.fetch = jest.fn().mockImplementation(() => Promise.resolve(
      new Response(JSON.stringify(wishlist), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));
  });

  afterEach(() => {
    localStorage.clear();
    global.fetch = originalFetch;
  });

  it('uses the canonical wishlist endpoint and returns the flat snapshot', async () => {
    await expect(getDanhSachYeuThich()).resolves.toEqual(wishlist);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(apiUrl('/api/yeu-thich'));
    expect(new Headers(options.headers).get('Authorization')).toMatch(/^Bearer /);
  });

  it('keeps the legacy mutation URLs but returns authoritative snapshots', async () => {
    await expect(themYeuThich(7)).resolves.toEqual(wishlist);
    await expect(xoaYeuThich(7)).resolves.toEqual(wishlist);

    const calls = (global.fetch as jest.Mock).mock.calls as Array<[string, RequestInit]>;
    expect(calls[0][0]).toBe(apiUrl('/api/yeu-thich/7'));
    expect(calls[0][1].method).toBe('POST');
    expect(calls[1][0]).toBe(apiUrl('/api/yeu-thich/7'));
    expect(calls[1][1].method).toBe('DELETE');
  });

  it('rejects raw entities or malformed fields at the HTTP boundary', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify([{
      maSach: 7,
      tenSach: 'Sách kiểm thử',
      giaBan: 125000,
      hinhAnh: 'cover.jpg',
      sach: { maSach: 7 },
    }]), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(getDanhSachYeuThich()).rejects.toThrow('Dữ liệu danh sách yêu thích không hợp lệ.');

    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify([{
      maSach: 7,
      tenSach: 'Sách kiểm thử',
      giaBan: '125000',
      hinhAnh: 'cover.jpg',
    }]), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(getDanhSachYeuThich()).rejects.toThrow('Dữ liệu danh sách yêu thích không hợp lệ.');
  });
});
