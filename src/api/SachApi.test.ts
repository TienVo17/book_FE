import { findAll, findByBook, getGoiYTimKiem } from './SachApi';
import { apiUrl } from './ApiUrl';

function createJwt(): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 }));
  return `header.${payload}.signature`;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('SachApi admin listing', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.setItem('jwt', createJwt());
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({
      content: [],
      totalPages: 0,
      totalElements: 0,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  });

  afterEach(() => {
    localStorage.clear();
    global.fetch = originalFetch;
  });

  it('uses the authenticated request boundary for /api/admin/sach', async () => {
    await findAll(2);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(apiUrl('/api/admin/sach?page=2'));
    expect(new Headers(options.headers).get('Authorization')).toMatch(/^Bearer /);
  });
});

describe('SachApi.findByBook - mở rộng sort/giaMin/giaMax cho trang /tim-kiem', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('gửi đủ tham số sort, giaMin, giaMax khi được truyền qua options', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ content: [], totalPages: 0, totalElements: 0 }),
    );

    await findByBook('may', 3, 1, { sort: 'gia-tang', giaMin: 10000, giaMax: 50000 });

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('page=1');
    expect(calledUrl).toContain('tensach=may');
    expect(calledUrl).toContain('maTheLoai=3');
    expect(calledUrl).toContain('sort=gia-tang');
    expect(calledUrl).toContain('giaMin=10000');
    expect(calledUrl).toContain('giaMax=50000');
  });

  it('không thêm tham số mới khi không truyền option nào (giữ hành vi cũ cho HomePage/TheLoaiPage)', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ content: [], totalPages: 0, totalElements: 0 }),
    );

    await findByBook('', 0, 0);

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('sort=');
    expect(calledUrl).not.toContain('giaMin=');
    expect(calledUrl).not.toContain('giaMax=');
    expect(calledUrl).not.toContain('tensach=');
    expect(calledUrl).not.toContain('maTheLoai=');
  });
});

describe('SachApi.getGoiYTimKiem - gợi ý tìm kiếm', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('không gọi API khi từ khóa rỗng sau khi trim', async () => {
    global.fetch = jest.fn();

    const ketQua = await getGoiYTimKiem('   ');

    expect(ketQua).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('gọi đúng endpoint với q đã mã hóa và limit truyền vào', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse([]));

    await getGoiYTimKiem('trinh tham', 5);

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('/api/sach/goi-y');
    expect(calledUrl).toContain(`q=${encodeURIComponent('trinh tham')}`);
    expect(calledUrl).toContain('limit=5');
  });

  it('lọc bỏ phần tử sai hình dạng thay vì ép kiểu mù quáng (giống getThongKe)', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse([
      { maSach: 1, tenSach: 'Sách hợp lệ', slug: 'sach-hop-le', urlAnh: 'a.jpg', giaBan: 10000 },
      { maSach: 'khong-phai-so', tenSach: 'Thiếu mã hợp lệ', slug: 'x', urlAnh: 'b.jpg', giaBan: 1000 },
      { tenSach: 'Thiếu urlAnh', slug: 'y', giaBan: 1000 },
      null,
    ]));

    const ketQua = await getGoiYTimKiem('abc');

    expect(ketQua).toHaveLength(1);
    expect(ketQua[0].tenSach).toBe('Sách hợp lệ');
  });

  it('trả về mảng rỗng khi response không phải mảng', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ error: 'not found' }));

    const ketQua = await getGoiYTimKiem('abc');

    expect(ketQua).toEqual([]);
  });

  /**
   * Backend trả `urlAnh: null` cho sách chưa có ảnh nào. Coi đó là "sai hình dạng"
   * thì mọi cuốn chưa kịp gắn ảnh sẽ biến mất khỏi gợi ý trong im lặng — đúng kiểu
   * hỏng mà bộ xác thực này sinh ra để chặn. `AnhSach` đã tự vẽ ảnh thay thế.
   */
  it('giữ lại sách chưa có ảnh (urlAnh null)', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse([
      { maSach: 7, tenSach: 'Sách chưa có ảnh', slug: 'sach-chua-co-anh', urlAnh: null, giaBan: 12000 },
    ]));

    const ketQua = await getGoiYTimKiem('abc');

    expect(ketQua).toHaveLength(1);
    expect(ketQua[0].urlAnh).toBeNull();
  });

  it('ném lỗi khi backend trả 404, để nơi gọi (Navbar) tự quyết định suy biến êm', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ message: 'not found' }, 404));

    await expect(getGoiYTimKiem('abc')).rejects.toThrow();
  });
});
