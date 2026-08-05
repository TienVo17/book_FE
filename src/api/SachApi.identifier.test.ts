import { getBookByIdentifier } from './SachApi';
import { apiUrl } from './ApiUrl';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

const book = { maSach: 7, tenSach: 'Nhà Giả Kim', slug: 'nha-gia-kim', giaBan: 100000 };

describe('getBookByIdentifier', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // A Response body can only be read once, so hand each call a fresh one.
    global.fetch = jest.fn().mockImplementation(() => Promise.resolve(jsonResponse(book)));
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('treats an all-digits identifier as a numeric id (legacy deep links stay working)', async () => {
    const result = await getBookByIdentifier('7');

    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(apiUrl('/api/sach/7'));
    expect(result?.maSach).toBe(7);
  });

  it('treats a non-numeric identifier as a slug, which is what canonical URLs use', async () => {
    const result = await getBookByIdentifier('nha-gia-kim');

    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(apiUrl('/api/sach/slug/nha-gia-kim'));
    expect(result?.maSach).toBe(7);
  });

  it('resolves the same product from both the numeric and the canonical slug URL', async () => {
    const byId = await getBookByIdentifier('7');
    const bySlug = await getBookByIdentifier('nha-gia-kim');

    expect(bySlug?.maSach).toBe(byId?.maSach);
    expect(bySlug?.slug).toBe(byId?.slug);
  });

  it('encodes slugs so a crafted identifier cannot alter the request path', async () => {
    await getBookByIdentifier('a/../../admin');

    expect((global.fetch as jest.Mock).mock.calls[0][0])
      .toBe(apiUrl('/api/sach/slug/a%2F..%2F..%2Fadmin'));
  });

  it('returns null for a blank identifier without calling the API', async () => {
    const result = await getBookByIdentifier('');

    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // A title like "1984" slugifies to the all-digit slug "1984", which the
  // backend publishes as that book's canonical URL. Treating it only as a
  // primary key would 404 the site's own canonical link.
  describe('all-digit slug', () => {
    const numericSlugBook = { maSach: 42, tenSach: '1984', slug: '1984', giaBan: 90000 };

    it('falls back to a slug lookup when the numeric id lookup finds nothing', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ status: 404 }), { status: 404 }))
        .mockResolvedValueOnce(jsonResponse(numericSlugBook));

      const result = await getBookByIdentifier('1984');

      const calls = (global.fetch as jest.Mock).mock.calls.map(c => c[0]);
      expect(calls[0]).toBe(apiUrl('/api/sach/1984'));
      expect(calls[1]).toBe(apiUrl('/api/sach/slug/1984'));
      expect(result?.maSach).toBe(42);
    });

    it('does not make a second request when the numeric id resolves', async () => {
      const result = await getBookByIdentifier('7');

      expect((global.fetch as jest.Mock)).toHaveBeenCalledTimes(1);
      expect(result?.maSach).toBe(7);
    });

    it('returns null when neither the id nor the slug matches', async () => {
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ status: 404 }), { status: 404 })));

      await expect(getBookByIdentifier('999999')).resolves.toBeNull();
    });
  });
});
