import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from './NotFound';

describe('NotFound', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.title = '';
  });

  it('tells the visitor the page does not exist and offers a way back', () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: /không tìm thấy/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /trang chủ/i })).toHaveAttribute('href', '/');
  });

  it('is noindex so unknown SPA URLs are not indexed', () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>);

    expect(document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content)
      .toBe('noindex,nofollow');
  });
});
