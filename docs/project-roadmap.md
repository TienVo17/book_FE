# Project Roadmap

**Version**: 1.0  
**Last Updated**: 2026-07-24

**Current Phase**: MVP (Active)

## Phase Overview

| Phase | Timeline | Status | Focus |
|-------|----------|--------|-------|
| MVP | Current | Active | Core features: browse, search, cart, checkout, auth, admin |
| V1.1 | Next | Planned | Code quality, refactoring, env config |
| V1.2 | Q3 2026 | Planned | Features: wishlist sync, cart sync, emails |
| V2.0 | Q4 2026 | Planned | Advanced features: recommendations, analytics |

## Current Phase: MVP (Active)

**Status**: Core functionality complete and deployed.

### Completed Features

- [x] Product browsing & search
- [x] Product detail pages with reviews
- [x] Category filtering
- [x] Shopping cart (client-side localStorage)
- [x] Checkout flow (VNPay payment)
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
5. **No cart sync** — Cart only client-side; lost on browser clear

## Phase V1.1: Code Quality & Refactoring

**Timeline**: 2-3 weeks  
**Priority**: HIGH  
**Goals**: Improve maintainability, consistency, and deployability.

### V1.1.1: Environment Configuration

**Objective**: Externalize hardcoded URLs and configuration.

**Status**: Completed 2026-07-24.

**Delivered**:
- [x] Centralized URL resolution in `src/api/ApiUrl.ts`
- [x] Migrated API modules and direct request sites to `REACT_APP_API_BASE_URL`
- [x] Added source-level regression tests for loopback request hosts
- [x] Ignored local `.env` inputs
- [x] Added Docker build argument wiring

**Acceptance Criteria**:
- Builds successfully with a browser-reachable API origin supplied at build time
- Local development falls back to `http://localhost:8080`
- No loopback request host remains outside the deliberate resolver fallback

### V1.1.2: Consolidate Auth Guards

**Objective**: Replace 3 guard implementations with single, reusable guard.

**Tasks**:
- [ ] Create unified `ProtectedRoute.tsx` with role parameter
- [ ] Remove `RequireAuth.tsx`, `RequireAdmin.tsx`, `Adminroute.tsx`
- [ ] Update all route definitions to use new guard
- [ ] Add expiry validation to all protected routes
- [ ] Add auto-redirect to login on 401/403

**Files to Modify**:
- `src/layouts/utils/ProtectedRoute.tsx` — Rewrite
- `src/App.tsx` — Update route definitions
- `src/layouts/admin/layouts/AdminLayout.tsx` — Remove local guard

**Acceptance Criteria**:
- All protected routes redirect to login on expiry
- Admin routes still check (isAdmin || isStaff) role
- User routes only check presence
- Guest routes prevent logged-in users from accessing

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

### V1.2.1: Server-Side Cart Sync

**Objective**: Persist and sync cart to backend.

**Description**: Cart currently lives in localStorage only. Add backend /cart/sync endpoint to save cart state, enabling cart recovery and analytics.

**Tasks**:
- [ ] Create `CartApi.ts` with `syncCart`, `getCart` endpoints
- [ ] Call `CartApi.syncCart` on checkout, before logout
- [ ] Call `CartApi.getCart` on app load to restore cart
- [ ] Handle merge logic if cart exists both locally and on server

**Acceptance Criteria**:
- Cart persists after logout/login
- Cart restored from backend if localStorage is cleared
- Works in multi-tab scenario

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

### V2.0.5: Refresh Token Flow

**Objective**: Improve security with token rotation.

**Features**:
- Backend: Issue refresh tokens
- Frontend: Auto-refresh expired tokens
- Transparent token refresh (no logout prompt)

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
| Test Coverage | 0% | 0% (optional) | > 60% |
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
- **Backend Required**: POST /api/cart/sync, GET /api/cart/me
- **Status**: Not yet implemented

### V1.2.2: Wishlist Sync
- **Backend Required**: GET /api/wishlist/me returns user wishlist
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
- **Blockers**: Backend cart/email/filter APIs must be ready

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
