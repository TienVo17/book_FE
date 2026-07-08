# Codebase Summary

**Generated**: 2026-07-08  
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

Fetch-based API modules (no axios). All modules hardcode `http://localhost:8080` as BASE.

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
| `GioHang.ts` | `useGioHang()` hook | Client-side localStorage cart (not a server API) |

**Notes**:
- Login, Register, Account Activation implemented as raw `fetch()` calls directly in page components (not in api/ modules)
- No shared HTTP client wrapper; each module imports `Request.ts` helpers
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
| `GioHang.tsx` | Shopping cart page; review items, adjust quantities, coupon input |
| `CartItemsTable.tsx` | Cart items table (presentational sub-component) |
| `CheckoutSidebar.tsx` | Cart summary sidebar (price, tax, total) |
| `ThanhToan.tsx` | 2-step checkout page; order review → VNPay link generation |
| `DatHangNhanh.tsx` | Guest quick-order form (no login required) |
| `DonHangUser.tsx` | User order history page (raw fetch to `/don-hang/nguoi-dung`) |
| `KetQuaThanhToan.tsx` | VNPay payment result handler (raw fetch) |

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
- `components/route/Adminroute.tsx` — Auth guard (checks isAdmin || isStaff + expiry); **actively used**
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
| `GioHangUtils.tsx` | localStorage cart helpers; dispatches `storage` event for sync |

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
- `/sach/:maSach` (Product detail)
- `/dang-ky` (Register)
- `/dang-nhap` (Login)
- `/gio-hang` (Cart)
- `/thanh-toan` (Checkout)
- `/dat-hang-nhanh` (Guest quick-order)
- `/order` (Guest order history?)
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
- **Mixed patterns**: Some pages bypass api/ and call fetch directly with hardcoded URLs

### State Management
- **No Redux/Context**: All state client-side via component `useState` or localStorage
- **localStorage.jwt**: Global auth token; cleared on logout or 401
- **GioHang (cart)**: Client-side localStorage; `GioHangUtils.tsx` dispatches `storage` event for multi-tab sync

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
2. **Hardcoded `http://localhost:8080`** in all api/ modules and raw fetch calls
3. **Mixed data-access patterns**: api/ modules vs raw fetch calls in page components
4. **Divergent cart-item shapes**: GioHangModel.ts vs inline GioHangItem in GioHang.ts
5. **Dead code**: Test.tsx, RequireAdmin.tsx, ProtectedRoute.tsx (unwired)
6. **No env-based configuration**: No .env or environment variable support for API base URL

## Related Documentation

- [Project Overview & PDR](./project-overview-pdr.md)
- [Code Standards](./code-standards.md)
- [System Architecture](./system-architecture.md)
