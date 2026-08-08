import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applySeoMeta, SITE_NAME } from './SeoMeta';
import { timChinhSach } from '../chinh-sach/noiDungChinhSach';

/**
 * Route prefixes that must never be indexed: anything behind auth, anything
 * carrying a one-time token in the URL, and the transient cart/checkout/payment
 * funnel. Matching is prefix-based so nested paths inherit the rule.
 */
const PRIVATE_PREFIXES = [
  '/quan-ly',
  '/gio-hang',
  '/thanh-toan',
  '/order',
  '/profile',
  '/dia-chi',
  '/yeu-thich',
  '/xu-ly-kq-thanh-toan',
  '/dang-nhap',
  '/dang-ky',
  '/quen-mat-khau',
  '/dat-lai-mat-khau',
  '/kich-hoat',
  // Mang khoa huy dang ky dung mot lan trong URL, giong /dat-lai-mat-khau va /kich-hoat.
  // De no duoc index nghia la mot lien ket huy nhan tin cua mot nguoi cu the nam trong
  // ket qua tim kiem cong khai.
  '/huy-nhan-tin',
  '/xac-nhan-nhan-tin',
];

export function isPrivateRoute(pathname: string): boolean {
  return PRIVATE_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Tam trang chinh sach phai co tieu de rieng: chung deu duoc index, va de ca tam trang
 * dung chung mot tieu de thi cong cu tim kiem coi do la noi dung trung lap. Lay thang tu
 * noi dung chinh sach de khong co ban sao thu hai phai dong bo bang tay.
 */
function tieuDeChinhSach(slug: string): string {
  return timChinhSach(slug)?.tieuDe ?? 'Chính sách';
}

function titleForPath(pathname: string): string | undefined {
  if (pathname === '/') return SITE_NAME;
  if (pathname === '/about') return 'Giới thiệu';
  if (pathname.startsWith('/the-loai/')) {
    const slug = decodeURIComponent(pathname.replace('/the-loai/', '')).replace(/-/g, ' ').trim();
    return slug ? `Thể loại ${slug}` : 'Thể loại sách';
  }
  if (pathname === '/tim-kiem') return 'Tìm kiếm sách';
  if (pathname.startsWith('/chinh-sach/')) {
    return tieuDeChinhSach(pathname.replace('/chinh-sach/', ''));
  }
  if (pathname === '/gio-hang') return 'Giỏ hàng';
  if (pathname === '/thanh-toan') return 'Thanh toán';
  if (pathname === '/order') return 'Đơn hàng của tôi';
  if (pathname === '/profile') return 'Hồ sơ';
  if (pathname === '/dia-chi') return 'Địa chỉ giao hàng';
  if (pathname === '/yeu-thich') return 'Sách yêu thích';
  if (pathname === '/dang-nhap') return 'Đăng nhập';
  if (pathname === '/dang-ky') return 'Đăng ký';
  return undefined;
}

/**
 * Applies per-route metadata. Product pages are deliberately excluded: they load
 * real SEO data for a specific book, and stamping a generic title here would
 * briefly contradict the visible content and the canonical URL.
 */
export default function RouteMetadata(): null {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname.startsWith('/sach/')) {
      return;
    }

    const noindex = isPrivateRoute(pathname);
    const title = titleForPath(pathname);

    applySeoMeta({
      title,
      description: pathname === '/'
        ? 'Cửa hàng sách trực tuyến: khám phá, tìm kiếm và đặt mua sách theo thể loại.'
        : undefined,
      canonical: noindex ? undefined : `${window.location.origin}${pathname}`,
      noindex,
    });
  }, [pathname]);

  return null;
}
