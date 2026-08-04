import { applySeoMeta, resetSeoMeta } from './SeoMeta';

const SITE = 'BookStore';

function metaContent(selector: string): string | null {
  return document.head.querySelector<HTMLMetaElement>(selector)?.content ?? null;
}

function linkHref(rel: string): string | null {
  return document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)?.href ?? null;
}

function jsonLd(): unknown {
  const el = document.head.querySelector('script[type="application/ld+json"]');
  return el?.textContent ? JSON.parse(el.textContent) : null;
}

describe('applySeoMeta', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.title = '';
  });

  it('sets title, description and canonical for a public page', () => {
    applySeoMeta({
      title: 'Nhà Giả Kim',
      description: 'Một cuốn tiểu thuyết nổi tiếng.',
      canonical: 'http://localhost:3000/sach/nha-gia-kim',
    });

    expect(document.title).toContain('Nhà Giả Kim');
    expect(metaContent('meta[name="description"]')).toBe('Một cuốn tiểu thuyết nổi tiếng.');
    expect(linkHref('canonical')).toBe('http://localhost:3000/sach/nha-gia-kim');
  });

  it('marks private routes noindex,nofollow and omits canonical', () => {
    applySeoMeta({ title: 'Giỏ hàng', noindex: true });

    expect(metaContent('meta[name="robots"]')).toBe('noindex,nofollow');
    expect(linkHref('canonical')).toBeNull();
  });

  it('replaces stale tags instead of appending duplicates on navigation', () => {
    applySeoMeta({ title: 'A', description: 'first', canonical: 'http://x/a' });
    applySeoMeta({ title: 'B', description: 'second', canonical: 'http://x/b' });

    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(metaContent('meta[name="description"]')).toBe('second');
    expect(linkHref('canonical')).toBe('http://x/b');
  });

  it('clears a previous noindex when navigating to a public page', () => {
    applySeoMeta({ title: 'Giỏ hàng', noindex: true });
    applySeoMeta({ title: 'Trang chủ', canonical: 'http://x/' });

    expect(metaContent('meta[name="robots"]')).toBe('index,follow');
  });

  it('emits OpenGraph tags that match the visible title and description', () => {
    applySeoMeta({
      title: 'Nhà Giả Kim',
      description: 'Mô tả sách.',
      canonical: 'http://x/sach/nha-gia-kim',
      ogImage: 'https://cdn.example/nha-gia-kim.jpg',
      ogType: 'book',
    });

    expect(metaContent('meta[property="og:title"]')).toContain('Nhà Giả Kim');
    expect(metaContent('meta[property="og:description"]')).toBe('Mô tả sách.');
    expect(metaContent('meta[property="og:url"]')).toBe('http://x/sach/nha-gia-kim');
    expect(metaContent('meta[property="og:image"]')).toBe('https://cdn.example/nha-gia-kim.jpg');
    expect(metaContent('meta[property="og:type"]')).toBe('book');
  });

  it('injects JSON-LD and replaces it rather than accumulating blocks', () => {
    applySeoMeta({ title: 'A', jsonLd: { '@type': 'Book', name: 'A' } });
    applySeoMeta({ title: 'B', jsonLd: { '@type': 'Book', name: 'B' } });

    expect(document.head.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1);
    expect(jsonLd()).toMatchObject({ name: 'B' });
  });

  it('drops JSON-LD entirely when a page has none, leaving no stale structured data', () => {
    applySeoMeta({ title: 'A', jsonLd: { '@type': 'Book', name: 'A' } });
    applySeoMeta({ title: 'Trang chủ' });

    expect(document.head.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it('falls back to the site name when SEO data is missing', () => {
    applySeoMeta({});

    expect(document.title).toBe(SITE);
    // A missing description must not render an empty tag that overrides the
    // static one in index.html with nothing.
    expect(metaContent('meta[name="description"]')).not.toBe('');
  });

  it('resetSeoMeta restores an indexable default', () => {
    applySeoMeta({ title: 'Giỏ hàng', noindex: true, canonical: 'http://x/gio-hang' });
    resetSeoMeta();

    expect(metaContent('meta[name="robots"]')).toBe('index,follow');
    expect(linkHref('canonical')).toBeNull();
  });
});
