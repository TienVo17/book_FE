# System Architecture

**Version**: 1.0  
**Last Updated**: 2026-07-08

## Architecture Overview

Web Bán Sách is a **stateless, client-side single-page application (SPA)** that interfaces with a Spring Boot backend API. All state is either ephemeral (component state) or persisted locally (localStorage).

```
┌─────────────────────────────────────────┐
│         Browser (Client)                │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │    React App (React Router v6)      │ │
│ │ ┌──────────────────────────────┐    │ │
│ │ │   Layouts (Page Components)  │    │ │
│ │ │  (DanhSachSanPham, etc.)     │    │ │
│ │ └──────────────────────────────┘    │ │
│ │ ┌──────────────────────────────┐    │ │
│ │ │   API Modules                │    │ │
│ │ │   (SachApi, UserApi, etc.)   │    │ │
│ │ └──────────────────────────────┘    │ │
│ │ ┌──────────────────────────────┐    │ │
│ │ │   Request Helpers            │    │ │
│ │ │   (my_request, authRequest)  │    │ │
│ │ └──────────────────────────────┘    │ │
│ └─────────────────────────────────────┘ │
│                   │                      │
│              localStorage               │
│  (jwt token, cart, user preferences)    │
└─────────────────────────────────────────┘
             │
         HTTPS/HTTP
             │
        ┌────────────────────────────────┐
        │   Spring Boot Backend API      │
        │ REACT_APP_API_BASE_URL origin │
        │ (local: http://localhost:8080) │
        ├────────────────────────────────┤
        │   Controllers (REST endpoints) │
        │   - /sach/*, /tai-khoan/*      │
        │   - /don-hang/*, /danh-gia/*   │
        │   - /admin/*, /coupon/*        │
        └────────────────────────────────┘
             │
        ┌────────────────────────────────┐
        │   MySQL Database               │
        ├────────────────────────────────┤
        │   - users, books, categories   │
        │   - orders, reviews, images    │
        │   - coupons, addresses         │
        └────────────────────────────────┘
```

## Frontend Component Hierarchy

### Root Level

```
App.tsx (Router)
├── Navbar (Header)
├── <Outlet> / Routes
│   ├── HomePage
│   ├── DanhSachSanPham (Product Listing)
│   ├── ChiTietSanPham (Product Detail)
│   ├── GioHang (Cart Page)
│   ├── ThanhToan (Checkout)
│   ├── DangNhap (Login)
│   ├── DangKyNguoiDung (Register)
│   ├── HoSoNguoiDung (Profile)
│   ├── AdminLayout (Admin Routes)
│   │   ├── ThongKeDashboard
│   │   ├── DanhSachSach (Book CRUD)
│   │   ├── TheLoaiList (Category CRUD)
│   │   ├── QuanLyCoupon (Coupon CRUD)
│   │   ├── DonHang (Order Management)
│   │   ├── DanhSachBinhLuan (Review Moderation)
│   │   └── User Management
│   └── [Other routes]
└── Footer
```

## Data Flow Patterns

### Public Product Browsing

```
User navigates to /sach/:maSach
    ↓
ChiTietSanPham.tsx mounts
    ↓
useEffect(() => { 
  SachApi.getBookById(maSach)  // Calls my_request (no auth)
})
    ↓
api/SachApi.ts
    ↓
Request.ts::my_request (GET)
    ↓
Fetch to {REACT_APP_API_BASE_URL}/api/sach/{id}
(or local fallback origin)
    ↓
Backend returns SachModel (with nested images, categories, reviews)
    ↓
Component setState(product)
    ↓
Render HinhAnhSanPham, DanhGiaSanPham, RelatedProducts
```

### Authenticated Request (with JWT)

```
User clicks "Add to Wishlist"
    ↓
DanhSachYeuThich.tsx
    ↓
YeuThichApi.themYeuThich(bookId)
    ↓
api/YeuThichApi.ts
    ↓
Request.ts::authRequest (GET/POST)
    ↓
Fetch to {REACT_APP_API_BASE_URL}/api/yeu-thich/{bookId}
Header: Authorization: Bearer {jwt}
    ↓
Backend validates JWT, updates wishlist
    ↓
Response OK (200) → setState(wishlist)
    ↓
Display toast: "Added to wishlist"

----- Or -----

Response 401 (Unauthorized)
    ↓
authRequest catches error
    ↓
localStorage.removeItem('jwt')
    ↓
<Navigate to="/dang-nhap" />  [Not auto-implemented; add if needed]
```

### Shopping Cart (Client-Side Only)

```
User clicks "Add to Cart"
    ↓
SachProps.tsx
    ↓
const { addItem } = useGioHang()
    ↓
api/GioHang.ts::useGioHang() hook
    ↓
localStorage.setItem('gio-hang', JSON.stringify([...items, newItem]))
    ↓
Dispatch 'storage' event (for multi-tab sync)
    ↓
toast.success("Added to cart")
    ↓
Navbar updates cart badge (listens to storage event)
```

**Note**: Cart is never sent to backend during browsing. Only sent at checkout (order creation).

### Checkout Flow

```
User on /thanh-toan page
    ↓
ThanhToan.tsx
    ↓
Step 1: Review cart (from localStorage), select address, apply coupon
    ↓
Step 2: Confirm order
    ↓
CouponApi.validateCoupon(couponCode)  // Validate discount
    ↓
AdminApi.createOrder({ items, addressId, coupon })  // Create backend order
    ↓
Backend returns orderId + VNPay payment URL
    ↓
<Navigate to VNPay URL>  (Off-site payment)
    ↓
VNPay processes payment
    ↓
VNPay redirects to /xu-ly-kq-thanh-toan?...
    ↓
KetQuaThanhToan.tsx
    ↓
fetch(apiUrl('/api/don-hang/vnpay-payment') + window.location.search)
    ↓
Render payment result (success/failure)
    ↓
Clear cart: localStorage.removeItem('gio-hang')
```

### Admin Book Management

```
Admin on /quan-ly/cap-nhat-sach/:maSach
    ↓
CapNhatSach.tsx (guards via Adminroute)
    ↓
Adminroute checks: JWT expiry + (isAdmin || isStaff)
    ↓
AdminApi.getBookDetail(maSach)  // Calls authRequest
    ↓
SachForm.tsx (presentational, no API calls)
    ↓
On submit:
    ↓
AdminApi.updateBook(bookId, { title, price, ... })
    ↓
AdminApi.uploadBookImage(file, bookId)  (separate call)
    ↓
Backend returns updated book
    ↓
navigate(-1)  (back to list)
```

## State Management Strategy

### localStorage State

| Key | Type | Lifecycle | Scope |
|-----|------|-----------|-------|
| `jwt` | string (JWT) | Login → Logout / 401 | Global auth token |
| `gio-hang` | JSON array | Session persist | Shopping cart |
| `user-preferences` | JSON object | Optional | Wishlist? (not currently stored client-side) |

### Component State

| Pattern | Scope | Example |
|---------|-------|---------|
| Form input | Local component | DangNhap, SachForm |
| Loading/error | Local component | DanhSachSanPham loading spinner |
| Modal open/close | Local component | Admin delete confirmation |
| Filtered/sorted | Local component | DanhSachSanPham current filters |

**Rule**: No global state library (Redux, Context). Keep component state local or in localStorage.

### JWT Token

**Structure** (via jwt-decode):
```typescript
{
  sub: "user@example.com",
  email: "user@example.com",
  roles: ["ROLE_USER"] | ["ROLE_ADMIN"] | ["ROLE_STAFF"],
  iat: 1234567890,
  exp: 1234571490  // 1 hour typical
}
```

**Storage**: `localStorage.jwt` (plain text, XSS risk; mitigated by CSP in nginx.conf)

**Usage**:
- `Request.ts` reads it and injects as `Authorization: Bearer {jwt}`
- `RequireAuth` guards check presence
- `Adminroute` guard validates expiry + role before rendering protected routes

## API Request Patterns

### Pattern 1: API Module (Recommended)

```typescript
// src/api/SachApi.ts
export async function listBooks(page: number): Promise<SachModel[]> {
  return my_request(apiUrl(`/api/sach?page=${page}`));
}

// Component
useEffect(() => {
  SachApi.listBooks(0).then(setBooks).catch(handleError);
}, []);
```

**Benefits**:
- Centralized API contracts
- Easy to update if backend changes
- Type-safe via TypeScript

### Pattern 2: Raw Fetch (Discouraged, but present in codebase)

```typescript
// Inside a page component
useEffect(() => {
  fetch(apiUrl('/api/don-hang/findAll'), {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt')}` }
  })
    .then(r => r.json())
    .then(setOrders)
    .catch(err => toast.error(err.message));
}, []);
```

**Issues**:
- Duplicates Bearer logic (`authRequest` does this)
- Error handling varies per component
- Makes authentication behavior harder to update centrally

**Action**: Gradually move these to api/ modules (see [roadmap](./project-roadmap.md)).

## Error Handling Architecture

### HTTP-Level Errors

Handled by `Request.ts::authRequest`:

```typescript
export async function authRequest(url: string): Promise<any> {
  const jwt = getValidJwtOrThrow();
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${jwt}` }
  });
  
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('jwt');  // Auto-logout
    throw new Error('Session expired');
  }
  
  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }
  
  return response.json();
}
```

### Application-Level Errors

Handled in components via try/catch or .catch():

```typescript
try {
  const product = await SachApi.getBookDetail(id);
  setProduct(product);
} catch (error) {
  toast.error(error instanceof Error ? error.message : 'Unknown error');
  setError(error);
}
```

### Validation Errors

- **Form validation**: On blur and submit (client-side)
- **Business logic**: Backend returns 400/422 with error details
- **Coupon validation**: Special endpoint (CouponApi.validateCoupon) returns validation result object

## Security Architecture

### Authentication

- **Type**: Stateless JWT (no server-side session)
- **Storage**: localStorage.jwt (XSS risk, trade-off accepted for simplicity)
- **Flow**: Backend issues JWT on login; frontend stores and injects on authorized requests
- **Expiry**: Backend-controlled (typically 1 hour)
- **No refresh token**: Single JWT per session; extend by re-logging in

### Authorization

- **Role-based**: Users have roles (USER, ADMIN, STAFF) embedded in JWT claims
- **Frontend guards**: `Adminroute` checks isAdmin || isStaff before rendering admin pages
- **Backend enforcement**: Spring Boot @PreAuthorize annotations on endpoints

### Network Security

- **HTTPS only** (enforced in production)
- **CORS**: Configured on backend (Spring Boot @CrossOrigin or global config)
- **CSP headers**: Set in nginx.conf to mitigate XSS
- **X-Real-IP header**: Proxied via nginx to backend for logging

### Secrets Management

- **No secrets in frontend**: API key, DB credentials stay backend-only
- **.env files**: Never committed; add to .gitignore
- **Deployment**: CRA environment values are supplied before `npm start` or `npm run build`; runtime container variables cannot change an existing bundle

## Known Limitations

### 1. Auth Guard Inconsistency

**Issue**: Three separate guard implementations exist.

- `RequireAuth.tsx`: Presence-only check (no expiry validation)
- `Adminroute.tsx` (in route/): Expiry + role check — **actively used**
- `RequireAdmin.tsx`: HOC variant (dead code)
- `ProtectedRoute.tsx`: Guest-only guard (unused)

**Impact**: Maintenance burden; inconsistent behavior across routes.

**Mitigation**: Use only `Adminroute` for protected routes. Consolidate in future refactor.

### 2. Build-Time API Base URL

Backend request sites use `src/api/ApiUrl.ts`. It accepts a credential-free HTTP(S) origin from `REACT_APP_API_BASE_URL`, normalizes it, and falls back to `http://localhost:8080` for local development.

Create React App embeds this value in the static bundle during `npm run build`. Vercel or Docker production builds must therefore provide the deployed backend origin before the build starts; changing a runtime container variable does not update an existing bundle.

### 3. Mixed Data-Access Patterns

**Issue**: Some pages bypass api/ modules and call fetch directly.

Pages affected: DonHangUser, DonHang (admin), DanhSachBinhLuan, KetQuaThanhToan, DatHangNhanh, DanhGiaSanPham (submit), Login/Register/Activation.

**Impact**:
- Inconsistent error handling
- Bearer token injection duplicated
- Difficult to refactor API structure
- No central place to add middleware (caching, retry logic)

**Mitigation**: Gradually move these to api/ modules.

### 4. Browser-Reachable Docker API Origin

**Constraint**: The static bundle calls the absolute origin embedded through `REACT_APP_API_BASE_URL`; nginx does not proxy those requests. The value must therefore be reachable by the user's browser, not only from the frontend container.

For local Docker Compose, the default `http://localhost:8080` works while the backend publishes port 8080 to the host. A value such as `http://backend:8080` is invalid for browser clients because `backend` is only a Docker network hostname. Production Docker builds must embed the public HTTPS backend origin with `--build-arg REACT_APP_API_BASE_URL=...`.

### 5. Two Divergent Cart-Item Shapes

**Issue**: Two different TypeScript interfaces for cart items.

```typescript
// src/models/GioHangModel.ts
interface GioHangItem {
  id: string;
  sachId: string;
  soLuong: number;
}

// src/api/GioHang.ts (inline)
interface GioHangItem {
  id: string;
  sachId: string;
  soLuong: number;
  sachDto: SachModel;    // Extra fields
  soLuongTon: number;
}
```

**Impact**: Type inconsistency; unclear which one to use in new code.

**Mitigation**: Consolidate into one model in `src/models/GioHangModel.ts`.

### 6. Client-Side Cart Only

**Issue**: Cart stored only in localStorage; not synced to backend.

**Impact**: 
- Cart lost if browser cache cleared
- Cannot restore abandoned carts
- No server-side analytics on cart contents

**Mitigation**: (Roadmap) Sync cart to backend via `/cart/sync` endpoint.

### 7. Dead Code

Files not wired into any route or component:

- `src/layouts/user/Test.tsx`: Dev scratch page, reads different localStorage key
- `src/layouts/admin/layouts/RequireAdmin.tsx`: Unused HOC guard
- `src/layouts/utils/ProtectedRoute.tsx`: Guest-only guard, not wired
- `src/models/Book.ts`: Legacy English-named model

**Mitigation**: Remove or refactor in future cleanup pass.

## Performance Considerations

### Bundle Size

Current dependencies: ~500KB gzipped (typical CRA project).

**Optimization opportunities**:
- Code-split admin routes (lazy load)
- Remove unused @mui/icons-material icons
- Compress images (Cloudinary handles this)

### Runtime Performance

**Current strengths**:
- Client-side routing (no full page reloads)
- localStorage caching (cart, auth token)
- Component memoization available (React.memo, useMemo)

**Current weaknesses**:
- No request caching (each navigation re-fetches same data)
- No infinite scroll pagination (hard page reloads on navigation)
- No service worker or offline support

### Scalability

**Stateless frontend** → horizontally scalable.
- All state client-side or in backend DB
- No server-side sessions to manage
- Any frontend instance can serve any user

## Related Documentation

- [Project Overview & PDR](./project-overview-pdr.md) — Feature requirements
- [Code Standards](./code-standards.md) — Development conventions
- [Codebase Summary](./codebase-summary.md) — File inventory
- [Deployment Guide](./deployment-guide.md) — Build & operations
