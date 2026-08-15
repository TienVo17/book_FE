import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ChiTietSanPham from './ChiTietSanPham';
import { getBookByIdentifier, getSachLienQuan } from '../../api/SachApi';
import { getSeoMeta } from '../../api/SeoApi';
import { getDanhSachYeuThich } from '../../api/YeuThichApi';
import { useAuthSession } from '../../api/AuthSession';

jest.mock('../../api/SachApi', () => ({
  getBookByIdentifier: jest.fn(),
  getSachLienQuan: jest.fn(),
}));
jest.mock('../../api/SeoApi', () => ({ getSeoMeta: jest.fn() }));
jest.mock('../../api/AuthSession', () => ({
  useAuthSession: jest.fn(),
  getAuthSnapshot: jest.fn(() => ({
    status: 'guest', uid: null, username: null, roles: [], capabilities: [],
  })),
  captureAuthenticatedRequest: jest.fn(() => null),
  isCurrentAuthCapture: jest.fn(() => false),
  subscribeAuthTransition: jest.fn(() => () => undefined),
}));
jest.mock('../../api/YeuThichApi', () => ({
  getDanhSachYeuThich: jest.fn(),
  themYeuThich: jest.fn(),
  xoaYeuThich: jest.fn(),
}));
jest.mock('./components/HinhAnhSanPham', () => ({ __esModule: true, default: () => null }));
jest.mock('./components/DanhGiaSanPham', () => ({
  __esModule: true,
  default: () => null,
  renderStars: () => null,
}));
jest.mock('./components/SachProps', () => ({ __esModule: true, default: () => null }));

const mockedGetBook = getBookByIdentifier as jest.MockedFunction<typeof getBookByIdentifier>;
const mockedGetSachLienQuan = getSachLienQuan as jest.MockedFunction<typeof getSachLienQuan>;
const mockedGetSeoMeta = getSeoMeta as jest.MockedFunction<typeof getSeoMeta>;
const mockedGetYeuThich = getDanhSachYeuThich as jest.MockedFunction<typeof getDanhSachYeuThich>;
const mockedUseAuth = useAuthSession as jest.MockedFunction<typeof useAuthSession>;

const book = {
  maSach: 7,
  tenSach: 'Nhà Giả Kim',
  slug: 'nha-gia-kim',
  giaBan: 150000,
  soLuong: 10,
  tenTacGia: 'Paulo Coelho',
  moTaNgan: 'Mô tả ngắn.',
};

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/sach/:maSach" element={<ChiTietSanPham />} />
      </Routes>
    </MemoryRouter>,
  );
}

const canonical = () =>
  document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null;
const jsonLd = () => {
  const el = document.head.querySelector('script[type="application/ld+json"]');
  return el?.textContent ? JSON.parse(el.textContent) : null;
};

describe('ChiTietSanPham SEO integration', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.title = '';
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      status: 'guest', uid: null, username: null, roles: [], capabilities: [],
    });
    mockedGetBook.mockResolvedValue(book as never);
    mockedGetSachLienQuan.mockResolvedValue([]);
    mockedGetYeuThich.mockResolvedValue([]);
  });

  it('applies server SEO metadata that matches the visible product', async () => {
    mockedGetSeoMeta.mockResolvedValue({
      title: 'Nhà Giả Kim',
      description: 'Mô tả SEO.',
      canonical: 'http://localhost/sach/nha-gia-kim',
      ogImage: 'https://cdn.example/bia.jpg',
      ogType: 'book',
      jsonLd: {
        '@type': 'Book',
        name: 'Nhà Giả Kim',
        offers: { price: 150000, priceCurrency: 'VND' },
      },
    });

    renderAt('/sach/nha-gia-kim');

    const heading = await screen.findByRole('heading', { level: 1 });
    await waitFor(() => expect(canonical()).toBe('http://localhost/sach/nha-gia-kim'));

    // Structured data must not contradict what the visitor can see.
    expect(jsonLd().name).toBe(heading.textContent);
    expect(jsonLd().offers.price).toBe(book.giaBan);
    expect(document.title).toContain('Nhà Giả Kim');
  });

  it('keys SEO off the resolved product id, so a numeric URL yields the slug canonical', async () => {
    mockedGetSeoMeta.mockResolvedValue({
      title: 'Nhà Giả Kim',
      canonical: 'http://localhost/sach/nha-gia-kim',
    });

    renderAt('/sach/7');

    await waitFor(() => expect(mockedGetSeoMeta).toHaveBeenCalledWith(7));
    await waitFor(() => expect(canonical()).toBe('http://localhost/sach/nha-gia-kim'));
  });

  it('falls back to visible product fields when SEO data is unavailable', async () => {
    mockedGetSeoMeta.mockResolvedValue(null);

    renderAt('/sach/nha-gia-kim');

    await waitFor(() => expect(canonical()).toContain('/sach/nha-gia-kim'));
    expect(document.title).toContain('Nhà Giả Kim');
    // No fabricated structured data when the server had none.
    expect(document.head.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it('does not leave a stale canonical or JSON-LD behind after unmount', async () => {
    mockedGetSeoMeta.mockResolvedValue({
      title: 'Nhà Giả Kim',
      canonical: 'http://localhost/sach/nha-gia-kim',
      jsonLd: { '@type': 'Book', name: 'Nhà Giả Kim' },
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={['/sach/nha-gia-kim']}>
        <Routes>
          <Route path="/sach/:maSach" element={<ChiTietSanPham />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(canonical()).not.toBeNull());

    unmount();

    expect(canonical()).toBeNull();
    expect(document.head.querySelector('script[type="application/ld+json"]')).toBeNull();
  });
});
