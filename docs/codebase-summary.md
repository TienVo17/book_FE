# Codebase Summary

**Generated**: 2026-07-08
**Updated**: 2026-08-11
**Framework**: React 18.3 + TypeScript 4.9  
**Build**: Create React App (react-scripts 5.0.1)

## Overview

```
src/
├── api/                 # Data access layer (fetch-based, ~3KB total)
├── models/              # TypeScript domain types (~10KB)
├── layouts/             # Feature-organized page components (~70KB)
├── hooks/               # Custom React hooks (~2KB)
├── App.tsx              # Main router & layout shell
├── index.tsx            # React entry point
└── [CRA boilerplate]    # setupTests.ts, react-app-env.d.ts, reportWebVitals.ts
```

## Directory Structure & Contents

### src/api/ — HTTP & Data Access

Fetch-based API modules (no axios). Backend request sites use `src/api/ApiUrl.ts`, which resolves the credential-free HTTP(S) origin from `REACT_APP_API_BASE_URL` and falls back to `http://localhost:8080` for local development.

| File | Exports | Purpose |
|------|---------|---------|
| `Request.ts` | `my_request`, `authRequest`, `getJwtPayload`, `getValidJwtOrThrow` | HTTP helpers; Bearer JWT injection; auto-logout on 401/403 |
| `SachApi.ts` | `listBooks`, `searchBooks`, `getBookDetail`, `getBestsellers`, `getNewest`, `getRelatedBooks` | Book listing & detail retrieval |
| `AdminApi.ts` | `getDashboardStats`, `createBook`, `updateBook`, `deleteBook`, `uploadBookImage` | Admin book CRUD & image upload |
| `TheLoaiApi.ts` | `getCategories` (public), `getCategoryById`, `createCategory`, `updateCategory`, `deleteCategory` | Category management |
| `CouponApi.ts` | `validateCoupon`, `getCouponList`, `createCoupon`, `updateCoupon`, `deleteCoupon` | Coupon validation & admin CRUD |
| `DiaChiApi.ts` | `getUserAddresses`, `createAddress`, `updateAddress`, `deleteAddress` | User shipping addresses |
| `DanhGiaAPI.ts` | `getReviewsByBook`, `submitReview` | Review retrieval & submission |
| `HinhAnhApi.ts` | `uploadImage` | Image upload wrapper |
| `NguoiDungApi.ts` | `getUserList` | Admin user listing |
| `UserApi.ts` | `getProfile`, `updateProfile`, `changePassword`, `requestPasswordReset`, `resetPassword` | User profile & auth |
| `YeuThichApi.ts` | `getWishlist`, `addToWishlist`, `removeFromWishlist` | Wishlist management |
| `CartStorage.ts` | Cart read/write helpers, fingerprints and `CartItem` | Sole direct owner of `localStorage.gioHang`; guest source of truth with a 100-unique-line limit; authenticated render cache |
| `CartSession.ts` | `loadCart`, cart mutations, login merge, checkout refresh | Selects guest/server behavior; owns account/exact-token cache isolation, stable merge replay and FIFO mutation ordering |
| `CartApi.ts` | Server cart CRUD and merge | Validates typed `/api/gio-hang` summaries and calls the boundary through `authRequest` and `apiUrl` |
| `GioHang.ts` | `useGioHang()` hook | Compatibility hook built on `CartSession` |

**Notes**:
- Application API calls use domain modules and the shared `Request.ts` fetch boundary.
- `CartSession.ts` binds authenticated cart cache effects to both account owner and the exact JWT that started the request. It serializes authenticated writes and keeps a stable pending merge key/payload for safe replay.
- Checkout waits for page-level and shared cart mutations, then builds its order request from the current fingerprint-validated cart snapshot.
- No axios dependency; Fetch API only

### src/models/ — Domain Types

TypeScript interfaces for backend response shapes.

| File | Exports |
|------|---------|
| `SachModel.ts` | `SachModel` (book with detail, images, categories, reviews) |
| `NguoiDungModel.ts` | `NguoiDungModel` (user profile + roles) |
| `TheLoaiModel.ts` | `TheLoaiModel`, `TheLoaiAdminModel` (category public vs admin) |
| `DanhGiaModel.ts` | `DanhGiaModel` (review: customer name, rating, comment, date) |
| `HinhAnhModel.ts` | `HinhAnhModel` (image with Cloudinary URL + metadata) |
| `CouponModel.ts` | `CouponModel`, `KetQuaKiemTraCoupon` (coupon + validation result) |
| `DiaChiModel.ts` | `DiaChiModel` (user address) |
| `GioHangModel.ts` | `GioHangItem` (cart line: product, quantity, price) |
| `ThongKeModel.ts` | `ThongKeModel` (dashboard stats: order count, revenue, top books) |
| `Book.ts` | `Book` (legacy English-named model, appears unused) |

### src/layouts/ — Page Components

Organized by feature area. Each layout composes child components.

#### Homepage (`layouts/homepage/`)

| Component | Purpose |
|-----------|---------|
| `HomePage.tsx` | Main landing page; composes Banner + Carousel + SachRow components |
| `components/Banner.tsx` | Hero banner (static image or announcement) |
| `components/Carousel.tsx` | Bootstrap JS carousel for featured books |
| `components/SachRow.tsx` | Horizontal book row (best-sellers or newest) |

#### Products (`layouts/products/`)

| Component | Purpose |
|-----------|---------|
| `DanhSachSanPham.tsx` | Product listing grid; search, category filter, pagination |
| `ChiTietSanPham.tsx` | Product detail page; gallery, reviews, related, cart actions |
| `HinhAnhSanPham.tsx` (components/) | Multi-image carousel (react-responsive-carousel) |
| `SachProps.tsx` (components/) | Product card component (reusable in grids) |
| `DanhGiaSanPham.tsx` (components/) | Reviews section + submit form (raw fetch to `/danh-gia/them`) |
| `GioHang.tsx` | Shopping cart page; authoritative loading/error states, quantity drafts and per-line mutation locks |
| `CartItemsTable.tsx` | Checkout cart rows with accessible controls and quantity commit on blur/Enter |
| `CheckoutSidebar.tsx` | Cart summary sidebar (price, tax, total) |
| `ThanhToan.tsx` | 2-step checkout page; waits for cart mutations, verifies the current cart snapshot, creates an idempotent order, then generates a VNPay link |
| `DonHangUser.tsx` | User order history page (uses `api/DonHangApi.ts`) |
| `KetQuaThanhToan.tsx` | VNPay payment result handler (uses `api/DonHangApi.ts`) |

#### User (`layouts/user/`)

| Component | Purpose |
|-----------|---------|
| `DangNhap.tsx` | Login form; validates email + password; stores JWT |
| `DangKyNguoiDung.tsx` | Register form; validates email, password, phone, name |
| `KichHoatTaiKhoan.tsx` | Account activation via email token |
| `QuenMatKhau.tsx` | Forgot password; requests reset email |
| `DatLaiMatKhau.tsx` | Reset password via token link |
| `HoSoNguoiDung.tsx` | User profile; view/edit name, email, phone; change password |
| `DiaChiNguoiDung.tsx` | Address book; CRUD shipping addresses |
| `DanhSachYeuThich.tsx` | Wishlist page; list saved products |
| `Test.tsx` | Dev scratch page (reads different localStorage key `'token'`; wired to `/test`; dead code) |

#### Categories (`layouts/categories/`)

| Component | Purpose |
|-----------|---------|
| `TheLoaiPage.tsx` | Category landing page by slug; lists books in category |

#### Search (`layouts/search/`)

| Component | Purpose |
|-----------|---------|
| `TimKiemPage.tsx` | Search results page at `/tim-kiem`; the URL query string (`q`, `maTheLoai`, `sort`, `giaMin`, `giaMax`, `page`) is the single source of truth, so direct URLs, refresh, share links, and the browser Back button all work. Owns sort, price-range filtering, removable filter chips, and reuses `DanhSachSanPham`'s error/empty sub-components. |

#### About (`layouts/about/`)

| Component | Purpose |
|-----------|---------|
| `About.tsx` | Static about page |

#### Header & Footer (`layouts/header-footer/`)

| Component | Purpose |
|-----------|---------|
| `Navbar.tsx` | Site navigation; search bar, category dropdown, cart badge, auth menu |
| `Footer.tsx` | Site footer; links, newsletter signup (non-functional) |

#### Admin (`layouts/admin/`)

**Routing Shell**:
- `layouts/AdminLayout.tsx` — Nested admin routing container
- `layouts/utils/RouteGuard.tsx` — the single auth guard (JWT validity + expiry;
  `require="admin"` also requires `isAdmin === true`). `isStaff` grants no admin access.
- `layouts/RequireAdmin.tsx` — Alternate HOC guard (dead code, not wired)

**Features**:
- `components/AdminSidebar.tsx` — Role-aware navigation menu
- `components/UploadFile.tsx` — File upload UI

**Book Management**:
- `components/book/DanhSachSach.tsx` — Book listing with edit/delete buttons
- `components/book/SachForm.tsx` — Book form (create/edit shared UI)
- `components/book/CapNhatSach.tsx` — Edit existing book page

**Category Management**:
- `components/category/TheLoaiList.tsx` — Category CRUD

**Coupon Management**:
- `components/coupon/QuanLyCoupon.tsx` — Coupon CRUD

**Dashboard**:
- `components/dashboard/ThongKeDashboard.tsx` — Stats dashboard (order count, revenue, top books)

**Order Management**:
- `components/donhang/DonHang.tsx` — Order listing; raw fetch to `/don-hang/danh-sach`

**Review Moderation**:
- `components/binhluan/DanhSachBinhLuan.tsx` — Review listing; raw fetch + delete endpoint

**User Management**:
- `components/user/index.tsx` — User listing; mixed API modules + raw fetch

#### Utilities (`layouts/utils/`)

| Component | Purpose |
|-----------|---------|
| `RequireAuth.tsx` | Route guard for authenticated-only routes (presence check only; no expiry verification) |
| `ProtectedRoute.tsx` | Route guard for guest-only routes (currently unused/unwired) |
| `PhanTrang.tsx` | Pagination component |
| `DinhDangSo.tsx` | Vietnamese number formatter (for prices) |
| `GioHangUtils.tsx` | Add-to-cart utility | Delegates to `CartSession.addCartItem`; it does not access `localStorage.gioHang` directly |

### src/hooks/ — Custom Hooks

| File | Export | Purpose |
|------|--------|---------|
| `ScrollToTop.tsx` | `useScrollToTop()` | Auto-scroll to top on route change |
| `UseScrollReveal.ts` | `useScrollReveal()` | IntersectionObserver-based reveal-on-scroll animation |

### src/App.tsx — Main Router

Defines all routes using react-router-dom v6.

**Public Routes**:
- `/` (HomePage)
- `/about` (About)
- `/the-loai/:slug` (Category browse)
- `/tim-kiem` (Search results; query string is the source of truth)
- `/sach/:maSach` (Product detail)
- `/dang-ky` (Register)
- `/dang-nhap` (Login)
- `/gio-hang` (Cart)
- `/thanh-toan` (Checkout, authenticated)
- `/order` (Order history, authenticated)
- `/xu-ly-kq-thanh-toan` (VNPay result)
- `/kich-hoat/:email/:maKichHoat` (Account activation)
- `/quen-mat-khau` (Forgot password)
- `/dat-lai-mat-khau/:email/:token` (Reset password)
- `/test` (Dev page; dead code)

**Protected Routes** (RequireAuth):
- `/profile` (User profile)
- `/dia-chi` (Address book)
- `/yeu-thich` (Wishlist)

**Admin Routes** (Adminroute guard):
- `/quan-ly/*` (nested admin routes):
  - `/quan-ly/dashboard` (Dashboard)
  - `/quan-ly/danh-sach-sach` (Book listing)
  - `/quan-ly/them-sach` (Create book)
  - `/quan-ly/cap-nhat-sach/:maSach` (Edit book)
  - `/quan-ly/danh-sach-nguoi-dung` (User listing)
  - `/quan-ly/danh-sach-binh-luan` (Review moderation)
  - `/quan-ly/danh-sach-don-hang` (Order management)
  - `/quan-ly/quan-ly-coupon` (Coupon management)
  - `/quan-ly/quan-ly-the-loai` (Category management)

### Build & Configuration

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts, metadata |
| `tsconfig.json` | TypeScript compiler options (strict mode enabled) |
| `Dockerfile` | 2-stage build: node:18-alpine → nginx:alpine |
| `nginx.conf` | nginx config; serves static SPA, proxies `/api/` to backend |
| `public/manifest.json` | PWA manifest (CRA default) |

## Dependencies (package.json)

### Core
- `react` 18.3.1
- `react-dom` 18.3.1
- `typescript` 4.9.5
- `react-scripts` 5.0.1 (Create React App)

### Routing
- `react-router-dom` 6.27.0

### UI & Icons
- `react-bootstrap-icons` 1.11.4 (icon set)
- `@mui/icons-material` 6.1.6 (Material Design icons, no @mui/material)
- `react-responsive-carousel` 3.2.23 (carousel component)
- `react-toastify` 10.0.6 (toast notifications)

### Utilities
- `jwt-decode` 4.0.0 (JWT parsing, hand-rolled base64url decode in Request.ts)
- `date-fns` 4.1.0 (date formatting)

### Testing & Types
- `@testing-library/react` 13.4.0
- `@testing-library/jest-dom` 5.17.0
- `@types/react` 18.3.10
- `@types/node` 16.18.112
- `@types/jest` 27.5.2

**Notable Absences**:
- No `axios` (uses native Fetch)
- No `redux` or `@reduxjs/toolkit` (no global state lib)
- No `@mui/material` (only icons from @mui/icons-material)

## Key Patterns & Observations

### Data Access
- **Centralized API modules** in `src/api/`; modules export higher-level functions
- **Request.ts helpers**: `my_request` (public GET), `authRequest` (authenticated, injects Bearer JWT)
- **Auto-logout on 401/403**: authRequest clears localStorage.jwt and returns error
- **Mixed patterns**: Some pages bypass api/ modules and call `fetch()` directly, but still resolve backend URLs through `apiUrl(...)`

### State Management
- **No Redux/Context**: All state client-side via component `useState` or localStorage
- **localStorage.jwt**: Global auth token; cleared on logout or 401
- **GioHang (cart)**: `CartStorage.ts` exclusively owns `localStorage.gioHang`. For guests it is the local source of truth (maximum 100 unique book lines); for authenticated sessions it is only a cache of the backend cart, bound to the account and exact JWT token. `CartSession.ts` serializes authenticated writes and safely replays a retained login-merge intent after a lost response.

### Component Organization
- **Feature-area folders**: Products, User, Admin, Categories; colocates related components
- **Presentational sub-components**: CartItemsTable, CheckoutSidebar, HinhAnhSanPham
- **Page components**: DanhSachSanPham, ChiTietSanPham, etc. (Vietnamese naming)

### Routing
- **react-router-dom v6**: `<Routes>`, `<Route>`, `<Navigate>`
- **Multiple guards**: RequireAuth (presence), Adminroute (expiry + role), ProtectedRoute (unused)
- **Nested admin routing**: AdminLayout wraps all admin routes

### Styling
- **No CSS-in-JS library** (Emotion, Styled-components); likely inline styles or CSS files (not shown)
- **Bootstrap Icons**: Imported directly in components
- **Responsive design**: Manual media queries or responsive grid (CRA default CSS support)

## Known Code Issues (for future refactoring)

1. **Three auth guards** (RequireAuth, Adminroute, RequireAdmin, ProtectedRoute); only one actively wired
2. **Mixed data-access patterns**: api/ modules vs raw fetch calls in page components
3. **Divergent cart-item shapes**: GioHangModel.ts vs inline GioHangItem in GioHang.ts
4. **Dead code**: Test.tsx, RequireAdmin.tsx, ProtectedRoute.tsx (unwired)

## Related Documentation

- [Project Overview & PDR](./project-overview-pdr.md)
- [Code Standards](./code-standards.md)
- [System Architecture](./system-architecture.md)
