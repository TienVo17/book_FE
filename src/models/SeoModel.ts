/** Shape returned by the backend `GET /api/seo/sach/{id}` contract. */
export interface SeoJsonLd {
  '@context'?: string;
  '@type'?: string;
  name?: string;
  author?: string;
  isbn?: string;
  description?: string;
  url?: string;
  image?: string;
  offers?: {
    '@type'?: string;
    price?: number;
    priceCurrency?: string;
  };
}

export interface SeoMetaModel {
  title?: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: string;
  jsonLd?: SeoJsonLd;
}
