# Code Standards & Development Conventions

**Version**: 1.2
**Last Updated**: 2026-08-14

## Overview

This document defines coding conventions, architectural patterns, and best practices for the Web Bán Sách frontend. All contributions must follow these standards.

## Language & Type Safety

### TypeScript

**Strict Mode**: Enabled in `tsconfig.json`.

```typescript
// ✓ Good: Explicit types
function fetchBooks(page: number): Promise<SachModel[]> {
  return my_request(apiUrl(`/api/sach?page=${page}`));
}

// ✗ Avoid: Implicit any
function fetchBooks(categoryId, limit) {
  // ...
}
```

**Rules**:
- Always annotate function parameters and return types
- Avoid `any` unless explicitly necessary (document why)
- Use union types instead of optional parameters when appropriate
- Keep interfaces in `src/models/` separate from component logic

### File Naming

| Entity | Pattern | Example |
|--------|---------|---------|
| Components (`.tsx`) | PascalCase | `DanhSachSanPham.tsx`, `CheckoutSidebar.tsx` |
| Utilities (`.ts`) | camelCase or descriptive | `GioHangUtils.ts`, `DinhDangSo.tsx` |
| API modules | Descriptive + Api suffix | `SachApi.ts`, `AdminApi.ts` |
| Models | Descriptive + Model suffix | `SachModel.ts`, `NguoiDungModel.ts` |
| Hooks | Hook-namespaced + .ts/.tsx | `UseScrollReveal.ts`, `ScrollToTop.tsx` |

### Directory Structure

```
src/
├── api/              # HTTP & data-access layer
├── models/           # TypeScript domain types
├── layouts/          # Feature-area page components
│   ├── homepage/
│   ├── products/
│   ├── user/
│   ├── admin/
│   ├── categories/
│   └── utils/        # Route guards, formatters, utilities
├── hooks/            # Custom React hooks
├── App.tsx
└── index.tsx
```

**Colocate related files**: If a page uses 3+ child components, create a subdirectory and put components there.

## React & JSX Conventions

### Functional Components

Use only functional components with hooks. Class components not allowed.

```typescript
// ✓ Good
const DanhSachSanPham: React.FC<{ searchQuery: string }> = ({ searchQuery }) => {
  const [books, setBooks] = useState<SachModel[]>([]);
  useEffect(() => {
    // fetch books
  }, [searchQuery]);
  return <div>{/* render */}</div>;
};

export default DanhSachSanPham;

// ✗ Avoid: Class components
class DanhSachSanPham extends React.Component {
  // ...
}
```

### Props & Interfaces

Define props interfaces at the top of the file.

```typescript
interface DanhSachSanPhamProps {
  searchQuery: string;
  categoryId?: string;
  onProductSelect: (product: SachModel) => void;
}

const DanhSachSanPham: React.FC<DanhSachSanPhamProps> = ({ 
  searchQuery, 
  categoryId, 
  onProductSelect 
}) => {
  // component logic
};
```

### Hooks Usage

**useEffect dependencies**: Always specify dependency array. Omit only if intentional (document why).

```typescript
// ✓ Good: Clear dependencies
useEffect(() => {
  fetchProduct(productId);
}, [productId]);

// ✗ Avoid: Missing dependencies
useEffect(() => {
  fetchProduct(productId); // eslint-disable-next-line missing-dependency warning
});
```

**Custom hooks**: Place in `src/hooks/`. Export a named function starting with "use".

```typescript
// src/hooks/useProductDetail.ts
export function useProductDetail(productId: string) {
  const [product, setProduct] = useState<SachModel | null>(null);
  // logic
  return { product, isLoading, error };
}
```

## Data Access & HTTP Requests

### API Modules (src/api/)

- One module per domain (SachApi.ts, UserApi.ts, AdminApi.ts)
- Export higher-level functions; hide implementation details
- Always use `authRequest` or `my_request` from Request.ts

```typescript
// src/api/SachApi.ts
import { apiUrl } from './ApiUrl';

export async function getBookDetail(bookId: string): Promise<SachModel> {
  return my_request(apiUrl(`/api/sach/${bookId}`));
}

export async function getWishlist(): Promise<SachModel[]> {
  return authRequest(apiUrl('/api/yeu-thich'));
}
```

### Forbidden Patterns

**✗ Do NOT**:
- Call `fetch()` directly in page components; use api/ modules instead
- Hardcode `http://localhost:8080` in page components
- Manually inject Bearer headers; use `authRequest` helper

**✓ Instead**:
```typescript
// Page component
const [wishlist, setWishlist] = useState<SachModel[]>([]);

useEffect(() => {
  YeuThichApi.getWishlist()
    .then(setWishlist)
    .catch(err => toast.error(err.message));
}, []);
```

### Error Handling

All API calls must handle errors gracefully.

```typescript
try {
  const product = await SachApi.getBookDetail(bookId);
  setProduct(product);
} catch (error) {
  if (error instanceof Error) {
    toast.error(error.message);
  } else {
    toast.error('An unexpected error occurred');
  }
}
```

**Auth failure handling**: `authRequest` may refresh and replay a current-capture `GET`/`HEAD` once after `401`. It never replays a sent mutation. Business `403` preserves the session. Callers still handle the resulting `ApiRequestError`.

## State Management

### AuthSession and Approved Browser Storage

Never persist an access token, refresh token, CSRF value, password, or raw principal in `localStorage`, `sessionStorage`, URLs, logs, or cross-tab payloads.

```typescript
// UI: consume only the frozen public snapshot
const auth = useAuthSession();

// Domain API: let Request.ts capture memory credentials
return authRequest(apiUrl('/api/yeu-thich'));
```

`AuthSession.ts` is the only owner of in-memory access/CSRF credentials. The refresh token is backend-only through an HttpOnly cookie. Browser storage remains allowed for guest cart, canonical `cartCacheOwner`, exact cart/checkout idempotency intents, `nextPay`, and bounded metadata-only auth coordination.

### Component State for UI

Use `useState` for component-local state (form inputs, modals, UI toggles).

```typescript
const [isModalOpen, setIsModalOpen] = useState(false);
const [formData, setFormData] = useState<{ email: string; password: string }>({
  email: '',
  password: '',
});
```

### Cart State

Use the existing cart boundaries rather than reading or writing `gioHang` directly:

```typescript
// Page or utility code
const items = await loadCart();
await addCartItem(item);
await setCartItemQuantity(maSach, soLuong);
await removeCartItem(maSach);
```

- `CartStorage.ts` is the only module allowed to access `localStorage.gioHang` directly. It owns migration, normalization, stock clamping, the 100-unique-line guest limit, and `cartUpdated` events.
- `CartSession.ts` selects behavior: guest mutations remain local; authenticated mutations enter its FIFO queue, call `CartApi.ts`, and cache only the authoritative server response.
- `CartApi.ts` must use `authRequest` and `apiUrl`; page components must not call `/api/gio-hang` directly.
- Preserve `cartCacheOwner` as `account:<positive numeric uid>` and use exact access-token/revision captures only in memory for stale-response guards. Clear legacy username/token/fingerprint owners instead of mapping them. Preserve a pending `cartMergeIntent`'s owner, stable key, and exact payload so a lost merge response can be replayed without duplicating quantities.
- Checkout code must await its in-flight mutations and `waitForCartMutations()`, then compare the reviewed cart with the current snapshot before creating the order.
- Keep the existing `useGioHang()` compatibility hook for hook-based callers. Do not introduce Redux/Context solely for cart state.

## Routing Conventions

### Route Protection

Use existing guards in `src/layouts/utils/`:

**Authenticated-only routes**:
```typescript
<Route element={<RequireAuth />}>
  <Route path="/profile" element={<HoSoNguoiDung />} />
  <Route path="/dia-chi" element={<DiaChiNguoiDung />} />
  <Route path="/yeu-thich" element={<DanhSachYeuThich />} />
</Route>
```

**Admin routes**:
```typescript
<Route element={<Adminroute />}>
  <Route path="/quan-ly/*" element={<AdminLayout />} />
</Route>
```

**Guest-only routes** (if needed):
```typescript
<Route element={<ProtectedRoute />}>
  <Route path="/dang-nhap" element={<DangNhap />} />
  <Route path="/dang-ky" element={<DangKyNguoiDung />} />
</Route>
```

Note: `ProtectedRoute` currently not wired into routes; use `RequireAuth` guard with inverse logic if needed.

### Route Parameters

Use lowercase, dash-separated slugs in URLs.

```typescript
// ✓ Good
<Route path="/sach/:maSach" element={<ChiTietSanPham />} />
<Route path="/the-loai/:slug" element={<TheLoaiPage />} />
<Route path="/quan-ly/cap-nhat-sach/:maSach" element={<CapNhatSach />} />

// ✗ Avoid
<Route path="/sach/:sachId" element={<ChiTietSanPham />} /> // Inconsistent naming
<Route path="/san-pham-chi-tiet" element={<ChiTietSanPham />} /> // Hard to debug URLs
```

## UI & Styling

### Icons

Use `react-bootstrap-icons` for general UI icons; `@mui/icons-material` for Material icons.

```typescript
import { Search, ShoppingCart, User } from 'react-bootstrap-icons';
import { FavoriteBorder, Favorite } from '@mui/icons-material';

// Use in JSX
<Search size={20} className="icon" />
<FavoriteBorder />
```

### Responsive Design

Use CSS media queries or React context for responsive behavior. If component needs responsive logic:

```typescript
import { useMediaQuery } from 'react-responsive'; // or inline media queries

const SachRow: React.FC = () => {
  const isMobile = window.innerWidth < 768;
  return <div>{/* Render based on viewport */}</div>;
};
```

Use `react-responsive-carousel` for touch-friendly carousels.

### Notifications

All user feedback via `react-toastify`:

```typescript
import { toast } from 'react-toastify';

// Success
toast.success('Added to cart');

// Error
toast.error('Failed to add item');

// Info (optional)
toast.info('Processing...');

// Loading (custom)
const id = toast.loading('Uploading...');
// Later: toast.update(id, { render: 'Done!', type: 'success', isLoading: false });
```

## Form Handling

### Input Validation

Validate on blur and submit.

```typescript
interface FormErrors {
  email?: string;
  password?: string;
}

const [formData, setFormData] = useState({ email: '', password: '' });
const [errors, setErrors] = useState<FormErrors>({});

const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const handleBlur = (field: string) => {
  if (field === 'email' && !validateEmail(formData.email)) {
    setErrors({ ...errors, email: 'Invalid email' });
  }
};

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  const newErrors = {};
  if (!formData.email) newErrors.email = 'Email required';
  if (!formData.password) newErrors.password = 'Password required';
  
  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }
  
  // Submit form
};
```

## Testing

### Unit Tests

Run with `npm test`. Use React Testing Library (already included).

```typescript
// src/components/SachProps.test.tsx
import { render, screen } from '@testing-library/react';
import SachProps from './SachProps';

describe('SachProps', () => {
  it('renders product card with title', () => {
    const product = { /* mock product */ };
    render(<SachProps product={product} />);
    expect(screen.getByText(product.title)).toBeInTheDocument();
  });
});
```

No mandatory test coverage %, but aim for > 60% on critical paths (auth, checkout, cart).

## Code Review Checklist

Before committing, ensure:

- [ ] TypeScript strict mode passes (no `any` without justification)
- [ ] No hardcoded `http://localhost:8080` in page components
- [ ] All API calls use `src/api/` modules or `authRequest`/`my_request`
- [ ] Props interfaces defined at top of file
- [ ] Route parameters are lowercase/dash-separated
- [ ] Error handling present (try/catch or .catch())
- [ ] Notifications use `react-toastify`
- [ ] Dependencies in useEffect are complete
- [ ] No console.log left in production code (use during dev, remove before commit)
- [ ] File/component naming follows conventions

## Known Limitations & Tech Debt

### Auth Guards

`RouteGuard` is the active guard for protected routes. It preserves `unknown` without redirecting, requires an authenticated principal for `require="user"`, and requires the `ADMIN` capability for `require="admin"`; `STAFF` alone grants no admin access. Frontend guards are UX and the backend authorizes independently. Legacy `RequireAdmin`/`ProtectedRoute` files remain dead code and are not wired.

**Action**: Consolidate into single guard with role parameter. See [roadmap](./project-roadmap.md).

### Data-Access Boundary

All application API calls go through `src/api/` modules. `Request.ts` owns public and business API transport; `AuthSession.ts` owns only CSRF/login/refresh/logout transport. No other module may call `fetch()` directly or construct Bearer headers.

Failures surface as `ApiRequestError` carrying `status`, `code`, `traceId`, and `path`. A current-session `401` follows the finite refresh matrix; stale `401` and business `403` never clear a replacement session.

### API Base URL

All backend request sites resolve URLs through `src/api/ApiUrl.ts`. Vercel
production uses root-relative paths and exact rewrites for `/api/**`,
`/tai-khoan/**`, and `/nguoi-dung/**`. `REACT_APP_API_BASE_URL` is limited to a
credential-free localhost HTTP(S) origin for development and local Docker
Compose; non-local production values are ignored.

Sitemap generation is independent: use `SITEMAP_BACKEND_ORIGIN` when the
production backend differs from the canonical default.

### Cart Compatibility Types

`CartStorage.ts` exports the canonical persisted `CartItem` shape used by cart and checkout flows. `models/GioHangModel.ts` remains only as a legacy import compatibility alias; new code must import cart types and operations from `CartStorage.ts`/`CartSession.ts` rather than introducing another inline shape.

## Naming Conventions (Vietnamese)

| Vietnamese | English | Usage |
|-----------|---------|-------|
| Sach | Book | SachApi, SachModel, SachProps |
| Nguoi Dung | User | NguoiDungModel, UserApi |
| Yeu Thich | Wishlist | YeuThichApi |
| Gio Hang | Shopping Cart | GioHang.ts, GioHangModel |
| Thanh Toan | Checkout/Payment | ThanhToan.tsx |
| Don Hang | Order | DonHang.tsx |
| Binh Luan | Review/Comment | DanhGiaAPI, DanhGiaSanPham |
| The Loai | Category | TheLoaiApi, TheLoaiModel |
| Dia Chi | Address | DiaChiApi, DiaChiNguoiDung |
| Kupon | Coupon | CouponApi, CouponModel |
| Hinh Anh | Image | HinhAnhApi, HinhAnhModel |

Use Vietnamese naming to match backend entity names and maintain consistency with existing codebase.

## Performance Guidelines

1. **Lazy load images**: Use `loading="lazy"` on product images
2. **Memoize expensive components**: `React.memo()` for SachProps, ProductCard
3. **Debounce search input**: Delay API call by 300ms while typing
4. **Optimize bundle**: Code-split admin routes with `React.lazy()` + `Suspense`

Example:
```typescript
const AdminLayout = React.lazy(() => import('./layouts/admin/layouts/AdminLayout'));

<Suspense fallback={<div>Loading...</div>}>
  <Route path="/quan-ly/*" element={<AdminLayout />} />
</Suspense>
```

## Related Documentation

- [Project Overview & PDR](./project-overview-pdr.md) — Requirements
- [Codebase Summary](./codebase-summary.md) — File inventory
- [System Architecture](./system-architecture.md) — Design patterns
- [Deployment Guide](./deployment-guide.md) — Build & operations
