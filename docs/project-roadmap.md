# Project Roadmap

**Version**: 1.0  
**Last Updated**: 2026-08-14

**Current Phase**: V1.2 (Active; server-side cart synchronization delivered)

## Phase Overview

| Phase | Timeline | Status | Focus |
|-------|----------|--------|-------|
| MVP | Current | Active | Core features: browse, search, cart, checkout, auth, admin |
| V1.1 | Next | Planned | Code quality, refactoring, env config |
| V1.2 | Q3 2026 | Active | Features: wishlist sync, emails, filtering, pagination; server-side cart sync delivered |
| V2.0 | Q4 2026 | Planned | Advanced features: recommendations, analytics |

## Current Phase: MVP (Active)

**Status**: Core functionality complete and deployed.

### Completed Features

- [x] Product browsing & search
- [x] Product detail pages with reviews
- [x] Category filtering
- [x] Guest local cart (100 unique lines) + authenticated backend cart with stable replay-safe login merge
- [x] Checkout flow (VNPay payment) using the current authoritative cart snapshot
- [x] User authentication (register, login, password reset)
- [x] User profile & address management
- [x] Wishlist (basic add/remove)
- [x] Admin panel (book, category, coupon, order, review management)
- [x] Docker deployment with nginx

### Known Issues (Tracked)

1. **Auth guard redundancy** — 3 separate guard implementations; only 1 wired
2. **Mixed API patterns** — Some pages bypass api/ modules and call fetch directly
3. **Cart shape divergence** — Two different GioHangItem interfaces
4. **Dead code** — Test.tsx, RequireAdmin.tsx, ProtectedRoute.tsx
5. **Guest storage boundary** — Guest cart remains browser-local; authenticated cart restores from backend

## Phase V1.1: Code Quality & Refactoring

**Timeline**: 2-3 weeks  
**Priority**: HIGH  
**Goals**: Improve maintainability, consistency, and deployability.

### V1.1.1: Environment Configuration

**Objective**: Externalize hardcoded URLs and configuration.

**Status**: Completed 2026-07-24.

**Delivered**:
- [x] Centralized URL resolution in `src/api/ApiUrl.ts`
- [x] Migrated API modules and direct request sites to the resolver
- [x] Added exact Vercel rewrites for `/api/**`, `/tai-khoan/**`, and `/nguoi-dung/**`
- [x] Added source/config regression tests for same-origin production routing
- [x] Preserved the localhost override for development and local Docker Compose
- [x] Separated sitemap backend origin from browser API routing

**Acceptance Criteria**:
- Vercel production browser requests remain root-relative and preserve backend prefixes
- Local development and supported Docker Compose use `http://localhost:8080`
- Non-local production `REACT_APP_API_BASE_URL` values cannot bypass the proxy

### V1.1.2: Consolidate Auth Guards — DONE

**Objective**: Replace 3 guard implementations with a single reusable guard.

**Tasks**:
- [x] Create unified `RouteGuard.tsx` with a `require` parameter
- [x] Remove `RequireAuth.tsx`, `RequireAdmin.tsx`, `Adminroute.tsx`, `ProtectedRoute.tsx`
- [x] Update all route definitions to use the new guard
- [x] Add expiry validation to all protected routes

**Files Modified**:
- `src/layouts/utils/RouteGuard.tsx` — new single guard
- `src/App.tsx` — route definitions

**Outcome**:
- Protected routes wait while AuthSession is `unknown`, then require an authenticated normalized principal
- Admin routes require capability `ADMIN`; `STAFF` alone is denied
- `/thanh-toan` and `/order` are guarded (previously unguarded)
- Covered by the RouteGuard matrix for unknown, guest, user, staff and admin states

### V1.1.3: Standardize API Patterns

**Objective**: Move all raw fetch calls to api/ modules.

**Tasks**:
- [ ] Create `DonHangApi.ts` for order endpoints
- [ ] Create `DanhGiaApi.ts` for review endpoints (migrate from DanhGiaAPI.ts)
- [ ] Create `AuthApi.ts` for login/register/password-reset (move from page components)
- [ ] Create `AdminApi.ts` extensions for order/review/user endpoints
- [ ] Update pages to use new api/ modules
- [ ] Remove raw fetch calls from components

**Files to Create**:
- `src/api/DonHangApi.ts`
- `src/api/AuthApi.ts`

**Files to Modify**:
- `src/api/DanhGiaAPI.ts` → rename/consolidate
- `src/layouts/products/KetQuaThanhToan.tsx`
- `src/layouts/products/DonHangUser.tsx`
- `src/layouts/user/DangNhap.tsx`
- `src/layouts/user/DangKyNguoiDung.tsx`
- `src/layouts/admin/components/donhang/DonHang.tsx`
- `src/layouts/admin/components/binhluan/DanhSachBinhLuan.tsx`

**Acceptance Criteria**:
- All API calls go through api/ modules
- No raw fetch calls in page components
- Consistent error handling across app
- authRequest used for all authenticated calls

### V1.1.4: Unify Cart Item Model

**Objective**: Single, consistent cart item shape.

**Tasks**:
- [ ] Update `src/models/GioHangModel.ts` to include all cart fields
- [ ] Update `src/api/GioHang.ts` to use unified model
- [ ] Update all component code that references GioHangItem
- [ ] Remove inline interfaces

**Files to Modify**:
- `src/models/GioHangModel.ts`
- `src/api/GioHang.ts`
- `src/layouts/products/CartItemsTable.tsx`
- `src/layouts/products/GioHang.tsx`

**Acceptance Criteria**:
- Single GioHangItem interface used across codebase
- Includes sachDto, soLuongTon fields
- Backward compatible with existing cart data in localStorage

### V1.1.5: Remove Dead Code

**Objective**: Clean up unused files and code.

**Tasks**:
- [ ] Delete `src/layouts/user/Test.tsx`
- [ ] Delete `src/models/Book.ts`
- [ ] Remove route for `/test` from App.tsx
- [ ] Verify no other code references these files

**Acceptance Criteria**:
- No unused imports or dead code
- App builds and runs without errors
- All routes still functional

### V1.1.6: Update Nginx Proxy Configuration

**Objective**: Ensure all frontend requests route correctly through nginx.

**Tasks**:
- [ ] Update nginx.conf to prefix all backend paths with `/api/`
- [ ] Or: update nginx to proxy all non-static requests to backend
- [ ] Verify Docker Compose service discovery works correctly
- [ ] Test with backend at `http://backend:8080` (Docker service name)

**Files to Modify**:
- `nginx.conf`

**Acceptance Criteria**:
- Frontend reaches backend through nginx proxy
- No direct frontend-to-backend connections when proxied
- Works in Docker Compose with service networking

### Estimated Effort

| Task | Hours |
|------|-------|
| V1.1.1: Env Config | 4 |
| V1.1.2: Auth Guards | 6 |
| V1.1.3: API Patterns | 8 |
| V1.1.4: Cart Model | 3 |
| V1.1.5: Dead Code | 1 |
| V1.1.6: Nginx Config | 2 |
| **Total** | **24** |

## Phase V1.2: Features & UX Improvements

**Timeline**: 3-4 weeks  
**Priority**: MEDIUM  
**Goals**: Enhanced user experience and backend integration.

### V1.2.1: Server-Side Cart Sync — DONE

**Objective**: Persist authenticated carts while preserving a fast guest cart.

**Delivered 2026-08-11; session ownership hardened 2026-08-14**:
- [x] `CartApi.ts` validates server cart CRUD and guest-merge responses through shared request helpers
- [x] Guests remain local; authenticated users load and mutate the backend cart, which is the source of truth
- [x] Login captures the latest guest snapshot before installing the memory session, then merges with stable key/payload replay after a lost response
- [x] Cache ownership is canonical `account:<positive numeric uid>`; exact token/revision captures prevent stale request completion while same-UID rotation preserves state
- [x] Authenticated mutations are FIFO; checkout awaits page and shared mutations, detects stale review state, and builds the order from the current authoritative snapshot
- [x] Guest cart is capped at the backend contract of 100 unique lines

**Acceptance Criteria**:
- Authenticated cart persists after logout/login and restores after local cache deletion
- Lost merge responses replay without duplicating quantities
- Account/session transitions cannot expose stale cart cache or intent
- Checkout submits the latest authoritative cart snapshot

### V1.2.2: Server-Side Wishlist Sync

**Objective**: Currently wishlist operations go to backend, but no "load on app start" logic.

**Tasks**:
- [ ] Add `YeuThichApi.getWishlist()` call to app init (useEffect)
- [ ] Sync wishlist to component state (not just server)
- [ ] Display wishlist status in product cards without round-trip

**Acceptance Criteria**:
- Wishlist loads on app init
- Product cards show heart icon state without fetching

### V1.2.3: Email Notifications

**Objective**: Send order confirmation, shipment updates to user email.

**Tasks**:
- [ ] Backend: Implement email sending (Spring Boot, JavaMail or external service)
- [ ] Frontend: Display email subscription toggle in checkout/profile
- [ ] Frontend: Show notification preferences page

**Acceptance Criteria**:
- Users receive order confirmation email
- Users receive shipment update emails
- Notification preferences are respected

### V1.2.4: Advanced Product Filtering

**Objective**: Add price range, rating, author filters to product search.

**Tasks**:
- [ ] Update DanhSachSanPham.tsx to include filter sidebar
- [ ] Extend SachApi.searchBooks with filter parameters
- [ ] Persist filter state in URL query params

**Acceptance Criteria**:
- Users can filter by price range (min/max)
- Users can filter by rating (4.0+, etc.)
- Filter combinations work correctly

### V1.2.5: Pagination Improvements

**Objective**: Replace page-based pagination with infinite scroll or cursor-based.

**Tasks**:
- [ ] Add `useIntersectionObserver` for infinite scroll
- [ ] Or: implement cursor-based pagination in SachApi
- [ ] Update DanhSachSanPham component

**Acceptance Criteria**:
- Scroll to bottom auto-loads next page
- No page reloads; seamless browsing
- Works on mobile

## Phase V2.0: Advanced Features (Future)

**Timeline**: Q4 2026  
**Priority**: LOW  
**Goals**: Personalization, analytics, performance optimization.

### V2.0.1: Personalized Recommendations

**Objective**: Show recommended books based on browsing history.

**Features**:
- Backend: Track page views, purchases, wishlist
- Frontend: Call `/recommendations` endpoint
- Component: Add recommendation carousel to home page

### V2.0.2: Product Analytics

**Objective**: Track user behavior for insights.

**Features**:
- Page view tracking
- Add-to-cart conversion rates
- Search query analytics
- Review sentiment analysis

### V2.0.3: Advanced Admin Dashboard

**Objective**: Richer analytics and reports.

**Features**:
- Revenue charts (daily, weekly, monthly)
- Top-selling books trends
- User growth metrics
- Inventory alerts

### V2.0.4: Performance Optimization

**Features**:
- Code-split admin routes
- Service worker for offline support
- Image lazy-loading with skeleton placeholders
- Request caching strategy

### V2.0.5: Refresh Token Flow — DELIVERED

**Delivered 2026-08-14**:
- [x] Fifteen-minute access JWT remains in frontend module memory only
- [x] Backend issues opaque rotating refresh sessions in Secure, SameSite, HttpOnly cookies
- [x] Controlled remember-me chooses browser-session versus hard 30-day absolute refresh lifetime
- [x] GET/HEAD recovery shares one refresh and replays at most once; sent mutations never replay
- [x] Multi-tab coordination shares metadata only, never credentials or principal data

## Backlog (Prioritization TBD)

### Low Priority

- [ ] Dark mode toggle
- [ ] Multi-language support (i18n)
- [ ] Social media sharing (products, wishlists)
- [ ] Review voting (helpful/not helpful)
- [ ] Customer Q&A section on products
- [ ] Live chat support

### Technical Debt

- [ ] Add unit/integration tests (current: 0%)
- [ ] Improve TypeScript strict mode coverage
- [ ] Optimize bundle size (current: ~500KB gzipped)
- [ ] Add Storybook for component documentation
- [ ] Set up CI/CD pipeline (GitHub Actions, etc.)

## Success Metrics & KPIs

| Metric | Current | Target (MVP) | Target (V1.2) |
|--------|---------|--------------|---------------|
| Page Load Time (Lighthouse) | — | > 80 | > 85 |
| Bundle Size (gzipped) | ~500KB | < 500KB | < 450KB |
| TypeScript Strict Coverage | — | 100% | 100% |
| Test Coverage | 425 tests trên 56 suites (chưa đo % dòng) | Giữ xanh các luồng tới hạn | > 60% |
| Checkout Conversion | TBD | > 70% | > 75% |
| Mobile Accessibility | — | > 85 | > 90 |

## Dependencies on Backend

### V1.1.1: Env Config
- No backend changes needed
- Frontend-only refactor

### V1.1.2: Auth Guards
- No backend changes needed
- Frontend consolidation

### V1.1.3: API Patterns
- No backend changes needed
- Frontend refactor

### V1.2.1: Cart Sync
- **Backend Required**: `/api/gio-hang` CRUD plus `POST /api/gio-hang/merge`
- **Status**: Implemented and integrated 2026-08-11

### V1.2.2: Wishlist Sync
- **Backend Required**: `GET /api/yeu-thich` returns the authenticated user's authoritative flat wishlist snapshot; `POST`/`DELETE /api/yeu-thich/{maSach}` return the updated snapshot.
- **Status**: Likely exists, verify

### V1.2.3: Email Notifications
- **Backend Required**: Email sending on order create/update
- **Status**: Not yet implemented

### V1.2.4: Advanced Filtering
- **Backend Required**: Extend /sach/search with ?priceMin=, ?priceMax=, ?ratingMin=
- **Status**: Not yet implemented

## Timeline & Milestones

### MVP (Current) ✓
- **Launch Date**: Deployed
- **Features**: Core browsing, checkout, admin, auth
- **Status**: COMPLETE

### V1.1 (Next Sprint)
- **Start Date**: 2026-07-15 (estimated)
- **End Date**: 2026-08-05 (estimated)
- **Duration**: 3 weeks
- **Focus**: Code quality, refactoring
- **Blockers**: None

### V1.2 (Following Sprint)
- **Start Date**: 2026-08-06 (estimated)
- **End Date**: 2026-09-02 (estimated)
- **Duration**: 4 weeks
- **Focus**: Features, UX
- **Blockers**: Cart APIs are integrated; email and filtering APIs must be ready

### V2.0 (Long-Term)
- **Start Date**: 2026-10-01 (estimated)
- **Focus**: Advanced features, optimization
- **Blockers**: TBD based on business priorities

## Rollback & Risk Mitigation

### V1.1 Risks

| Risk | Mitigation |
|------|-----------|
| Env config breaks build | Test builds locally before merge |
| Auth guard consolidation breaks routes | Comprehensive route testing; manual QA |
| API refactor breaks components | Create feature branch; gradual rollout |

### Rollback Plan

Each phase includes:
- Feature branch with clear diff
- Manual testing on staging before prod merge
- Ability to revert last commit if issues
- Git tags for each release version

## Related Documentation

- [Project Overview & PDR](./project-overview-pdr.md) — Requirements
- [System Architecture](./system-architecture.md) — Current design & limitations
- [Code Standards](./code-standards.md) — Development conventions
- [Codebase Summary](./codebase-summary.md) — Source inventory
