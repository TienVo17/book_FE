# System Architecture

**Version**: 1.2
**Last Updated**: 2026-08-14

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
│ │ ┌──────────────────────────────┐    │ │
│ │ │ AuthSession (memory only)    │    │ │
│ │ │ access token + public state  │    │ │
│ │ └──────────────────────────────┘    │ │
│ └─────────────────────────────────────┘ │
│ localStorage: guest cart + scoped cache │
│ HttpOnly cookie: opaque refresh token   │
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

### Authenticated Request (memory-only access token)

```
User clicks "Add to Wishlist"
    ↓
YeuThichApi.themYeuThich(bookId)
    ↓
Request.ts::authRequest captures {accessToken, revision} from AuthSession
    ↓
Fetch /api/yeu-thich/{bookId}
Header: Authorization: Bearer {memory-only access token}
    ↓
Backend authorizes and returns the result
```

For a current capture, a `GET`/`HEAD` response with `401` starts one shared
refresh and replays the original request at most once. A mutation that already
reached the server is never replayed; refresh may only repair later requests.
Business `403` responses do not refresh or log the user out. Stale failures from
an older token/revision cannot clear a newly installed session.

### Shopping Cart (Guest Local, Account Server-Side)

```
Add/update/remove cart item
    ↓
CartSession.ts checks the AuthSession snapshot and request capture
    ├── Guest → CartStorage.ts → localStorage.gioHang
    └── Authenticated → CartApi.ts → authRequest → /api/gio-hang
                                      ↓
                              backend summary response
                                      ↓
                    CartStorage.ts writes account-owned render cache
                                      ↓
                         cartUpdated / storage events refresh UI
```

`CartStorage.ts` is the only direct owner of `localStorage.gioHang`. Guest carts use it as the source of truth and cannot exceed 100 unique book lines. Authenticated carts use the backend as the source of truth; the local value is only a render cache whose canonical `cartCacheOwner` is `account:<positive numeric uid>`. Legacy username/token/fingerprint owners are cleared rather than mapped.

After a valid login response arrives but before the session is published, `DangNhap.tsx` captures the latest guest snapshot and passes it to `CartSession.mergeGuestCartAfterLogin()`. The merge request carries a stable `Idempotency-Key` and exact payload. If the response is lost, `cartMergeIntent` retains the same owner, key, and items so the next login/cart load safely replays the request instead of adding quantity twice.

Authenticated mutations run through a FIFO queue. Cache writes and pending-intent cleanup require the immutable account uid and exact access-token/revision capture from request start, so a late response cannot overwrite a rotated or replacement session. Same-uid token rotation preserves cart and wishlist state; logout or uid change clears private state before public auth subscribers observe the transition. Checkout waits for its component mutations and the shared queue, then compares its reviewed cart with the current snapshot. It either asks for review after an external change or creates the order from that authoritative snapshot.

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
RouteGuard checks: authenticated AuthSession snapshot + ADMIN capability
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
| `gioHang` | JSON array | Guest persistence / authenticated render cache | Canonical cart snapshot |
| `cartCacheOwner` | string | Authenticated session | Canonical `account:<positive numeric uid>` owner |
| `cartMergeIntent` | JSON object | Login merge until acknowledged | Owner + stable merge key + exact payload for safe replay |
| `nextPay` | boolean-like string | Buy-now login handoff | Continue to checkout after successful merge |
| `checkoutIdempotencyIntent` | JSON object | Checkout retry until committed response | Stable key + exact checkout fingerprint |
| `book-fe-auth-coordination` | short-lived JSON metadata | Cross-tab auth notification | Signal type, nonce, sender, expiry only; never credentials |
| `book-fe-auth-coordination-lease` | short-lived JSON metadata | Web Locks fallback | Bounded owner/expiry lease; never credentials |

Auth coordination prefers `navigator.locks` with bounded acquisition. Browsers
without Web Locks use the expiring lease key with periodic renewal and a bounded
wait. The fallback proves lease ownership immediately before publishing local auth
state; later lease-metadata changes cannot turn an already-installed session into a
reported failure.

### Component State

| Pattern | Scope | Example |
|---------|-------|---------|
| Form input | Local component | DangNhap, SachForm |
| Loading/error | Local component | DanhSachSanPham loading spinner |
| Modal open/close | Local component | Admin delete confirmation |
| Filtered/sorted | Local component | DanhSachSanPham current filters |

**Rule**: No global state library (Redux, broad auth Context). Keep component UI state local; `AuthSession.ts` and `WishlistSession.ts` use immutable external stores, while localStorage is limited to approved cart/checkout metadata.

### Auth Session

`AuthSession.ts` owns the only in-memory access token, CSRF value, expiry, and monotonic revision. Its frozen public snapshot exposes only:

```typescript
{
  status: 'unknown' | 'guest' | 'authenticated',
  uid: number | null,
  username: string | null,
  roles: readonly string[],
  capabilities: readonly string[]
}
```

Bootstrap obtains CSRF and rotates the refresh session through same-origin `/tai-khoan/**` endpoints with `credentials: 'include'`. The opaque refresh token remains in a Secure, SameSite, HttpOnly cookie and never becomes JavaScript state. Unchecked remember-me creates a browser-session cookie; checked creates a refresh session with a hard 30-day absolute expiry. The password is sent only for the login request and is never persisted.

`Request.ts` obtains an exact `{accessToken, revision}` capture and injects Bearer for `/api/**`. Components, route guards, cart, and wishlist never decode JWTs. `RouteGuard` is UX only; the backend remains the authorization authority.

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

### Pattern 2: Raw Fetch (Forbidden outside transport boundaries)

Page components and domain API modules must not construct Bearer headers or call `fetch()` directly. `Request.ts` is the business transport boundary; `AuthSession.ts` is the dedicated CSRF/login/refresh/logout transport boundary. Source-scan tests keep direct fetch and credential sinks from spreading beyond them.

## Error Handling Architecture

### HTTP-Level Errors

Handled by `Request.ts::authRequest`:

- Current-capture `GET`/`HEAD` `401`: one shared refresh, then at most one replay.
- Stale `401`: no refresh, replay, or clearing of the replacement session.
- Mutation `401`: may refresh for future requests but never replays the sent mutation.
- Business `403`: surfaces as `ApiRequestError` and preserves the session.
- Network/timeout mutations are not blindly retried; idempotency remains a domain concern.
- Other failures preserve `ApiRequestError` status, code, trace ID, and path.

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

- **Type**: 15-minute Bearer access JWT plus server-side rotating refresh session
- **Storage**: access token/CSRF in module memory; opaque refresh token in Secure HttpOnly cookie
- **Flow**: bootstrap and login install a normalized principal; refresh rotates the cookie session and replaces the memory access token
- **Remember me**: browser-session cookie when unchecked; hard 30-day absolute refresh expiry when checked
- **Cross-tab**: only bounded `auth-changed`/`auth-invalidated` metadata is shared; credentials and principal data are never broadcast

### Authorization

- **Role-based**: Users have roles (USER, ADMIN, STAFF) embedded in JWT claims
- **Frontend guards**: `RouteGuard` yêu cầu capability `ADMIN` cho khu vực quản trị (`STAFF` không có `ADMIN` bị từ chối)
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

`RouteGuard.tsx` is the active guard for user and admin routes. While auth is `unknown` it renders a neutral pending state and does not redirect. User routes require an authenticated principal; admin routes additionally require the `ADMIN` capability (`STAFF` alone is denied). Auth transitions clear account-owned private state before public subscribers observe logout or uid replacement. Legacy unused guard files remain dead-code cleanup candidates but are not wired into routing.

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

Every application API call goes through a module in `src/api/`. `Request.ts` owns public/business fetch behavior and Bearer injection; `AuthSession.ts` separately owns CSRF, login, refresh, and logout transport to avoid an import cycle. Errors surface as `ApiRequestError` with `status`, `code`, `traceId`, and `path`. Only terminal current-session `401` invalidates auth; business `403` does not. Source-scan tests keep direct fetch calls and credential sinks outside these two boundaries from reappearing.

### 4. Browser-Reachable Docker API Origin

The supported local Docker Compose image embeds
`REACT_APP_API_BASE_URL=http://localhost:8080`; the browser reaches the backend
through the host's published port. A value such as `http://backend:8080` is
invalid because `backend` is only a Docker network hostname.

Non-local production API origins are ignored to preserve the same-origin browser
contract. A public Docker deployment must therefore add reverse-proxy routes for
`/api/`, `/tai-khoan/`, and `/nguoi-dung/`; the current nginx configuration is
not a supported public same-origin deployment until all three are present.

### 5. Canonical Cart-Item Shape (resolved)

`src/models/GioHangModel.ts` re-exports the canonical cart types owned by
`src/api/CartStorage.ts`, and `src/api/GioHang.ts` consumes the same shape. New
cart code must use this canonical model rather than declaring another inline
interface. `CartStorage.ts` remains the sole owner of the guest/cart-cache
`localStorage.gioHang` representation.

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
- narrowly scoped localStorage caching for guest cart and authenticated render metadata
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
