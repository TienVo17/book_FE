# System Architecture

**Version**: 1.1
**Last Updated**: 2026-08-11

## Architecture Overview

Web Bán Sách is a client-side single-page application (SPA) that interfaces with a Spring Boot backend API. UI state is ephemeral or cached in localStorage; authenticated carts, orders and other account data are persisted by the backend.

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
│ (jwt, guest cart, account cart cache)   │
└─────────────────────────────────────────┘
             │
         HTTPS/HTTP
             │
        ┌────────────────────────────────┐
        │   Spring Boot Backend API      │
        │ prod: Vercel same-origin proxy │
        │ local: http://localhost:8080   │
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
Fetch to /api/sach/{id} in production
(or http://localhost:8080/api/sach/{id} locally)
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
Fetch to /api/yeu-thich/{bookId} in production (localhost origin locally)
Header: Authorization: Bearer {jwt}
    ↓
Backend validates JWT, updates wishlist
    ↓
Response OK (200) → setState(wishlist)
    ↓
Display toast: "Added to wishlist"

----- Or -----

Response 401/403 for the token that started the request
    ↓
authRequest invokes shared authenticated-session cleanup
    ↓
JWT, account cart cache and checkout intent are cleared
    ↓
authSessionChanged refreshes mounted auth/cart UI

A late 401/403 from an older token never clears a newer session.
```

### Shopping Cart (Guest Local, Account Server-Side)

```
Add/update/remove cart item
    ↓
CartSession.ts checks valid JWT owner
    ├── Guest → CartStorage.ts → localStorage.gioHang
    └── Authenticated → CartApi.ts → authRequest → /api/gio-hang
                                      ↓
                              backend summary response
                                      ↓
                    CartStorage.ts writes account-owned render cache
                                      ↓
                         cartUpdated / storage events refresh UI
```

`CartStorage.ts` is the only direct owner of `localStorage.gioHang`. Guest carts use it as the source of truth and cannot exceed 100 unique book lines. Authenticated carts use the backend as the source of truth; the local value is only a render cache associated with `cartCacheOwner`, which uses the account subject when present and otherwise a token fingerprint.

Immediately before storing a newly issued JWT, `DangNhap.tsx` captures the latest guest snapshot and passes it to `CartSession.mergeGuestCartAfterLogin()`. The merge request carries a stable `Idempotency-Key` and exact payload. If the response is lost, `cartMergeIntent` retains the same owner, key, and items so the next login/cart load safely replays the request instead of adding quantity twice.

Authenticated mutations run through a FIFO queue. Cache writes and pending-intent cleanup require the account owner and exact JWT captured when the request started, so a late response cannot overwrite a rotated or replacement session. Checkout waits for its component mutations and the shared queue, then compares its reviewed cart with the current snapshot. It either asks for review after an external change or creates the order from that authoritative snapshot.

### Checkout Flow

```
User on /thanh-toan page
    ↓
ThanhToan.tsx
    ↓
Step 1: Load current cart (backend for authenticated users), select address, apply coupon
    ↓
Step 2: Confirm order
    ↓
CouponApi.validateCoupon(couponCode)  // Validate discount
    ↓
DonHangApi.createDonHang({ items, maDiaChiGiaoHang, maHinhThucGiaoHang, phuongThucThanhToan, maCoupon }, idempotencyKey)  // Create backend order
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
DonHangApi.getVNPayCallbackResult(window.location.search)
    ↓
Render payment result (success/failure)
    ↓
Committed order → refresh backend cart; keep newer concurrent cart changes
```

### Admin Book Management

```
Admin on /quan-ly/cap-nhat-sach/:maSach
    ↓
CapNhatSach.tsx (guarded by RouteGuard require="admin")
    ↓
RouteGuard checks: JWT validity/expiry + isAdmin === true
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
| `gioHang` | JSON array | Guest persistence / authenticated render cache | Canonical cart snapshot |
| `cartCacheOwner` | string | Authenticated session | Binds cached cart to an account subject or fallback token fingerprint |
| `cartMergeIntent` | JSON object | Login merge until acknowledged | Owner + stable merge key + exact payload for safe replay |
| `nextPay` | boolean-like string | Buy-now login handoff | Continue to checkout after successful merge |

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

**Storage**: `localStorage.jwt` (plain text). Token nằm trong localStorage nên script chạy được trong trang sẽ đọc được — đây là đánh đổi đã biết, chưa chuyển sang HttpOnly cookie. Giảm thiểu bằng hai lớp: mô tả sách render dưới dạng text thuần (không `dangerouslySetInnerHTML`), và CSP giới hạn `script-src` (khai báo trong `vercel.json` cho Vercel, `nginx.conf` cho Docker).

**Usage**:
- `Request.ts` reads it and injects as `Authorization: Bearer {jwt}`
- `RouteGuard` là guard duy nhất; kiểm tra token hợp lệ và chưa hết hạn, `require="admin"` yêu cầu thêm `isAdmin === true`
- Guard phía client chỉ để điều hướng; quyền thực sự do backend quyết định trên từng request

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
- **Frontend guards**: `RouteGuard` kiểm tra `isAdmin === true` cho khu vực quản trị (token chỉ có `STAFF` bị từ chối)
- **Backend enforcement**: Spring Boot @PreAuthorize annotations on endpoints

### Network Security

- **HTTPS only** (enforced in production)
- **CORS**: Configured on backend (Spring Boot @CrossOrigin or global config)
- **Security headers**: `vercel.json` (production trên Vercel) và `nginx.conf` (Docker) khai báo cùng một chính sách: CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`. Hai file phải được cập nhật đồng thời.
- **CSP**: `script-src` chỉ cho phép self và `cdn.jsdelivr.net`. `img-src` để rộng (`https:`) vì ảnh sách do admin nhập URL tự do; ảnh không phải vector thực thi script nên đánh đổi này chấp nhận được.
- **X-Real-IP header**: Proxied via nginx to backend for logging

### Secrets Management

- **No secrets in frontend**: API key, DB credentials stay backend-only
- **.env files**: Never committed; add to .gitignore
- **Deployment**: CRA environment values are supplied before `npm start` or `npm run build`; runtime container variables cannot change an existing bundle

## Known Limitations

### 1. Auth Guard Consolidation (Resolved)

`RouteGuard.tsx` is the active guard for user and admin routes. It rejects missing, malformed and expired tokens; admin routes additionally require `isAdmin === true`. Invalid-session cleanup also clears account-owned cart cache and checkout intent. Legacy unused guard files remain dead-code cleanup candidates but are not wired into routing.

### 2. API Routing by Deployment

Backend request sites use `src/api/ApiUrl.ts`. Vercel production resolves to
root-relative paths and forwards `/api/**`, `/tai-khoan/**`, and
`/nguoi-dung/**` through exact rewrites. Local development and the supported
Docker Compose build use the explicit `http://localhost:8080` override.

Create React App embeds `REACT_APP_*` values during `npm run build`, but the
resolver intentionally ignores non-local production API origins. The sitemap
backend origin is a separate post-build concern controlled by
`SITEMAP_BACKEND_ORIGIN`.

### 3. Single Data-Access Boundary (resolved)

Every application API call now goes through a module in `src/api/`.
`Request.ts` holds the only two `fetch()` call sites — `publicRequest` for
public endpoints and `authRequest` for authenticated ones — so Bearer-token
injection, error parsing and trace-id extraction live in one place.

Errors surface as `ApiRequestError` with `status`, `code`, `traceId` and
`path`; `401`/`403` clears the stored JWT. A source-scan test keeps new
direct `fetch()` calls from reappearing outside `Request.ts`.

### 4. Browser-Reachable Docker API Origin

The supported local Docker Compose image embeds
`REACT_APP_API_BASE_URL=http://localhost:8080`; the browser reaches the backend
through the host's published port. A value such as `http://backend:8080` is
invalid because `backend` is only a Docker network hostname.

Non-local production API origins are ignored to preserve the same-origin browser
contract. A public Docker deployment must therefore add reverse-proxy routes for
`/api/`, `/tai-khoan/`, and `/nguoi-dung/`; the current nginx configuration is
not a supported public same-origin deployment until all three are present.

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

### 6. Guest Cart Is Device-Local

**Constraint**: Anonymous users have no server identity, so their cart remains in localStorage until login.

**Impact**:
- A guest cart is not shared across browsers/devices.
- Clearing browser storage removes an unmerged guest cart.

**Mitigation**: Login merges the current guest snapshot into the account cart with retry-safe idempotency. Authenticated carts are persisted by the backend.

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
