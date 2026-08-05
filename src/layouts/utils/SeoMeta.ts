/**
 * Minimal document-head metadata helper.
 *
 * Uses the DOM directly rather than adding a helmet-style dependency: this app
 * needs title/description/canonical/OG/JSON-LD on a handful of routes, and a
 * new runtime dependency would cost more than it saves.
 *
 * Every call rewrites the same managed tags, so navigating between routes can
 * never leave a previous page's canonical, robots value or JSON-LD behind.
 */
import { SeoJsonLd } from '../../models/SeoModel';

export const SITE_NAME = 'BookStore';

export interface SeoMetaInput {
  title?: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
  jsonLd?: SeoJsonLd | null;
}

const MANAGED_ATTR = 'data-seo-managed';
const JSON_LD_ID = 'seo-json-ld';

function upsertMeta(key: 'name' | 'property', value: string, content: string): void {
  const selector = `meta[${key}="${value}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(key, value);
    el.setAttribute(MANAGED_ATTR, 'true');
    document.head.appendChild(el);
  }
  el.content = content;
}

function removeManaged(selector: string): void {
  document.head.querySelectorAll(selector).forEach(el => {
    // Only remove tags this helper owns; the static tags shipped in index.html
    // stay untouched.
    if (el.hasAttribute(MANAGED_ATTR)) {
      el.remove();
    }
  });
}

function setCanonical(url?: string): void {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!url) {
    existing?.remove();
    return;
  }
  const el = existing ?? document.createElement('link');
  el.setAttribute('rel', 'canonical');
  el.setAttribute(MANAGED_ATTR, 'true');
  el.href = url;
  if (!existing) {
    document.head.appendChild(el);
  }
}

function setJsonLd(data?: SeoJsonLd | null): void {
  const existing = document.getElementById(JSON_LD_ID);
  if (!data) {
    existing?.remove();
    return;
  }
  const el = existing ?? document.createElement('script');
  el.id = JSON_LD_ID;
  el.setAttribute('type', 'application/ld+json');
  el.textContent = JSON.stringify(data);
  if (!existing) {
    document.head.appendChild(el);
  }
}

export function applySeoMeta(input: SeoMetaInput): void {
  const title = input.title ? `${input.title} | ${SITE_NAME}` : SITE_NAME;
  document.title = input.title === SITE_NAME ? SITE_NAME : title;

  if (input.description) {
    upsertMeta('name', 'description', input.description);
  }

  // Private routes must not advertise a canonical URL, or a crawler that
  // ignores robots still learns the address.
  setCanonical(input.noindex ? undefined : input.canonical);
  upsertMeta('name', 'robots', input.noindex ? 'noindex,nofollow' : 'index,follow');

  const ogTitle = input.ogTitle ?? title;
  upsertMeta('property', 'og:title', ogTitle);
  upsertMeta('property', 'og:site_name', SITE_NAME);
  upsertMeta('property', 'og:type', input.ogType ?? 'website');
  if (input.ogDescription ?? input.description) {
    upsertMeta('property', 'og:description', (input.ogDescription ?? input.description) as string);
  }
  if (!input.noindex && input.canonical) {
    upsertMeta('property', 'og:url', input.canonical);
  } else {
    removeManaged('meta[property="og:url"]');
  }
  if (input.ogImage) {
    upsertMeta('property', 'og:image', input.ogImage);
  } else {
    removeManaged('meta[property="og:image"]');
  }

  setJsonLd(input.jsonLd);
}

/** Restores an indexable, product-free default. */
export function resetSeoMeta(): void {
  applySeoMeta({});
}
