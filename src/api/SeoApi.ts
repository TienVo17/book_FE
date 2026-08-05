import { publicRequest } from './Request';
import { apiUrl } from './ApiUrl';
import { SeoMetaModel } from '../models/SeoModel';

/**
 * Fetches server-rendered SEO metadata for a book. SEO is best-effort: a
 * failure here must never break the product page, so callers get null and fall
 * back to the visible product fields.
 */
export async function getSeoMeta(maSach: number): Promise<SeoMetaModel | null> {
  try {
    return await publicRequest<SeoMetaModel>(apiUrl(`/api/seo/sach/${maSach}`));
  } catch {
    return null;
  }
}
