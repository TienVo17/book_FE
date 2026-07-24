# Code Standards & Development Conventions

**Version**: 1.0  
**Last Updated**: 2026-07-08

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

**401/403 Handling**: Automatically handled by `authRequest` in Request.ts (clears JWT, optionally redirects).

## State Management

### localStorage for Auth & Cart

```typescript
// Set JWT after login
localStorage.setItem('jwt', token);

// Read JWT in Request.ts
const token = localStorage.getItem('jwt');

// Clear on logout
localStorage.removeItem('jwt');
```

### Component State for UI

Use `useState` for component-local state (form inputs, modals, UI toggles).

```typescript
const [isModalOpen, setIsModalOpen] = useState(false);
const [formData, setFormData] = useState<{ email: string; password: string }>({
  email: '',
  password: '',
});
```

### Cart State (Client-Side)

Use `useGioHang()` hook from `api/GioHang.ts` for cart operations.

```typescript
const { cart, addItem, removeItem, updateQuantity } = useGioHang();

// Cart auto-syncs via localStorage + storage event
```

**Do NOT** create a new cart hook or introduce global state (Redux, Context). Future enhancement: sync cart to backend.

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

Three separate guard implementations exist (RequireAuth, Adminroute, RequireAdmin, ProtectedRoute):
- **RequireAuth**: Checks JWT presence only (no expiry verification)
- **Adminroute**: Checks JWT expiry + (isAdmin || isStaff role) — **actively used**
- **RequireAdmin**: HOC variant (dead code, not wired)
- **ProtectedRoute**: Inverse guard for guest-only routes (unused, not wired)

**Action**: Consolidate into single guard with role parameter. See [roadmap](./project-roadmap.md).

### Mixed Data-Access Patterns

Several pages bypass `src/api/` modules and call `fetch()` directly:
- DanhSachBinhLuan, DonHang, DatHangNhanh, KetQuaThanhToan, DonHangUser
- Login/Register/Activation pages

**Action**: Refactor to use api/ modules. Low priority but improves consistency.

### API Base URL

All backend request sites resolve URLs through `src/api/ApiUrl.ts`. `REACT_APP_API_BASE_URL` must be a credential-free HTTP(S) origin; local development falls back to `http://localhost:8080`.

Because Create React App substitutes `REACT_APP_*` values at build time, production deployments must configure the backend origin before running `npm run build`.

### Cart Shape Divergence

Two cart-item shapes exist:
- `models/GioHangModel.ts`: `GioHangItem` (minimal)
- `src/api/GioHang.ts`: Inline `GioHangItem` (adds `sachDto`, `soLuongTon`)

**Action**: Unify in single model; update all references.

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
