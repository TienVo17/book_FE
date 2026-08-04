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
  ];

  it.each(privateRoutes)('marks %s as noindex', (path) => {
    expect(isPrivateRoute(path)).toBe(true);
    renderAt(path);
    expect(robots()).toBe('noindex,nofollow');
  });

  const publicRoutes = ['/', '/about', '/the-loai/tieu-thuyet', '/sach/1', '/sach/nha-gia-kim'];

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

  it('does not override product metadata, which the product page owns', () => {
    renderAt('/sach/nha-gia-kim');
    // The product page fetches real SEO data; RouteMetadata must not stamp a
    // generic title over it or the canonical would contradict the content.
    expect(document.title).toBe('');
  });
});
