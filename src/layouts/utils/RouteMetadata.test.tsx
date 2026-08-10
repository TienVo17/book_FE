import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RouteMetadata, { isPrivateRoute } from './RouteMetadata';

function robots(): string | null {
  return document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content ?? null;
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <RouteMetadata />
      <Routes>
        <Route path="*" element={<div>page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RouteMetadata noindex matrix', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.title = '';
  });

  const privateRoutes = [
    '/gio-hang',
    '/thanh-toan',
    '/order',
    '/order/7',
    '/profile',
    '/dia-chi',
    '/yeu-thich',
    '/xu-ly-kq-thanh-toan',
    '/quan-ly',
    '/quan-ly/sach',
    '/dang-nhap',
    '/dang-ky',
    '/quen-mat-khau',
    '/dat-lai-mat-khau/a@b.test/tok',
    '/kich-hoat/a@b.test/code',
    // Mang khoa huy dang ky dung mot lan, cung ho voi hai duong ngay tren.
    '/huy-nhan-tin/3f2b1c4d-0000-0000-0000-000000000000',
    '/xac-nhan-nhan-tin/3f2b1c4d-0000-0000-0000-000000000000',
  ];

  it.each(privateRoutes)('marks %s as noindex', (path) => {
    expect(isPrivateRoute(path)).toBe(true);
    renderAt(path);
    expect(robots()).toBe('noindex,nofollow');
  });

  const publicRoutes = [
    '/', '/about', '/the-loai/tieu-thuyet', '/sach/1', '/sach/nha-gia-kim', '/tim-kiem',
    '/chinh-sach/dieu-khoan-su-dung',
  ];

  it.each(publicRoutes)('leaves %s indexable', (path) => {
    expect(isPrivateRoute(path)).toBe(false);
    renderAt(path);
    expect(robots()).not.toBe('noindex,nofollow');
  });

  it('sets a descriptive title for the home page', () => {
    renderAt('/');
    expect(document.title).toMatch(/BookStore/);
    expect(document.title).not.toMatch(/Create React App|React App/);
  });

  it('sets a category title from the slug', () => {
    renderAt('/the-loai/tieu-thuyet');
    expect(document.title).toMatch(/BookStore/);
  });

  it('sets a descriptive title for the search results page, which now has its own URL', () => {
    renderAt('/tim-kiem');
    expect(document.title).toMatch(/Tìm kiếm sách/);
  });

  it('sets a private detail title for nested order routes', () => {
    renderAt('/order/7');
    expect(document.title).toMatch(/Chi tiết đơn hàng/);
    expect(robots()).toBe('noindex,nofollow');
  });

  /**
   * Tam trang chinh sach dung chung mot tieu de se bi cong cu tim kiem coi la noi dung
   * trung lap. Test kiem ca tam de khong con trang nao bi bo sot.
   */
  it.each([
    ['/chinh-sach/dieu-khoan-su-dung', 'Điều khoản sử dụng'],
    ['/chinh-sach/chinh-sach-bao-mat', 'Chính sách bảo mật'],
    ['/chinh-sach/bao-mat-thanh-toan', 'Bảo mật thanh toán'],
    ['/chinh-sach/he-thong-nha-sach', 'Hệ thống nhà sách'],
    ['/chinh-sach/doi-tra-hoan-tien', 'Đổi trả - Hoàn tiền'],
    ['/chinh-sach/bao-hanh-boi-hoan', 'Bảo hành - Bồi hoàn'],
    ['/chinh-sach/chinh-sach-van-chuyen', 'Chính sách vận chuyển'],
    ['/chinh-sach/chinh-sach-khach-si', 'Chính sách khách sỉ'],
  ])('%s co tieu de rieng', (path, tieuDe) => {
    renderAt(path);
    expect(document.title).toMatch(tieuDe);
  });

  it('slug chinh sach la thi van co tieu de chung, khong de trong', () => {
    renderAt('/chinh-sach/khong-ton-tai');
    expect(document.title).toMatch(/Chính sách/);
  });

  it('does not override product metadata, which the product page owns', () => {
    renderAt('/sach/nha-gia-kim');
    // The product page fetches real SEO data; RouteMetadata must not stamp a
    // generic title over it or the canonical would contradict the content.
    expect(document.title).toBe('');
  });
});
