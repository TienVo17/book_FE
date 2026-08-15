# Project Overview & Product Development Requirements

**Project**: Web Bán Sách (Bookstore Frontend)  
**Version**: 0.1.0  
**Last Updated**: 2026-08-14
**Owner**: Team

## Executive Summary

Web Bán Sách is a React-based e-commerce frontend for an online bookstore, providing customers with browsing, search, shopping cart, checkout, and account management features. It integrates with a Spring Boot backend for product data, order processing, and user management. Admin staff can manage inventory, categories, coupons, and orders via a dedicated admin panel.

## Functional Requirements

### F1: Public Product Browsing

**Description**: Unauthenticated users can discover and view books.

**Requirements**:
- List all books with pagination/infinite scroll
- Search books by title or keyword
- Filter by category (The Loai)
- View product detail page with:
  - Title, author, price, stock availability
  - Multi-image gallery (react-responsive-carousel)
  - Customer ratings and reviews
  - Related products recommendation
  - Add to cart / Add to wishlist (requires login)
- Display best-sellers and newest arrivals on homepage
- Category landing page by slug (e.g., `/the-loai/action`)

**Acceptance Criteria**:
- Search results load in < 2 seconds
- Product images render from Cloudinary via HinhAnhModel
- Related products displayed without additional page reload
- Reviews show customer name, rating (1-5), comment, date

### F2: User Authentication & Account Management

**Description**: Users can register, login, manage profile and addresses.

**Requirements**:
- Register with email, password, phone, full name, address
- Email confirmation flow (activation token)
- Login sends a controlled `rememberMe` choice and never stores the password
- Keep the 15-minute access token and CSRF value only in `AuthSession.ts` module memory
- Keep the rotating opaque refresh token in a Secure, SameSite, HttpOnly cookie
- Password reset via email link
- Profile page: view/edit name, email, phone, address
- Change password endpoint
- Address book (multiple shipping addresses per user)
- Logout invalidates local auth before a best-effort server cookie/session revocation

**Acceptance Criteria**:
- Normalized principal includes immutable numeric `uid`, username and roles; the public snapshot exposes identity/capabilities but no token, CSRF value, expiry or revision.
- Unchecked remember-me uses a browser-session refresh cookie; checked uses a hard 30-day absolute refresh expiry.
- Bootstrap distinguishes retryable `unknown`, terminal `guest` and `authenticated` without premature private-route redirect.
- A current GET/HEAD `401` may refresh once and replay once; sent mutations never replay, and business `403` does not log the user out.
- Only capability `ADMIN` grants admin access; `STAFF` alone is denied.
- Address CRUD works without page refresh (modal or form)
- Password reset link valid for 24 hours (backend enforced)

### F3: Shopping Cart & Checkout

**Description**: Users add items to cart and proceed to payment.

**Requirements**:
- Guest cart stored in `localStorage.gioHang`; maximum 100 unique book lines
- Authenticated cart persisted by `/api/gio-hang` and treated as the source of truth
- Guest snapshot merged after login with a stable idempotency key and exact payload
- The local render cache must be isolated by canonical `account:<positive numeric uid>` ownership; exact access-token/revision captures must block stale request completion
- View cart page with:
  - Product image, name, price, quantity
  - Remove / Update quantity buttons
  - Subtotal per item and total price
  - Apply coupon code input
- Two-step checkout:
  - Step 1: Review items, select shipping address, apply coupon
  - Step 2: Confirm order, redirect to VNPay payment gateway
- Checkout requires authentication; there is no guest quick-order path
- Order history page (authenticated users)
- VNPay payment result page (ThanhToan result status)

**Acceptance Criteria**:
- Guest cart persists across browser sessions; authenticated cart survives local cache deletion
- Retrying a lost login-merge response cannot add quantity twice
- Cart cache, merge intent and checkout intent never leak between UIDs; same-UID access-token rotation preserves account-owned state
- Retrying a lost merge response reuses its persisted, exact guest payload and idempotency key
- Authenticated cart writes are serialized; checkout waits for in-flight cart mutations, detects a reviewed-cart mismatch, and submits the current authoritative snapshot
- Coupon validation: amount validation, discount calculation
- Order creates with status "PENDING" before payment
- VNPay return URL populates with orderId and payment status
- Checkout requires authentication; order confirmation email complements account order history

### F4: Admin Panel

**Description**: `ADMIN` users manage books, categories, coupons, orders, reviews, users.

**Acceptance Criteria**:
- Access gated by an authenticated AuthSession snapshot plus capability `ADMIN`; while auth is `unknown`, the guard waits instead of redirecting (`STAFF` alone is denied)
- Nested routing under `/quan-ly/*` with sidebar navigation
- Features:
  - **Dashboard**: Order count, revenue, top-selling books
  - **Book Management**: Create, read, update, delete books with image upload
  - **Category Management**: Create, read, update, delete categories
  - **Coupon Management**: Create, read, update, delete coupons with discount rules
  - **Order Management**: List orders, update status
  - **Review Moderation**: List and delete customer reviews
  - **User Management**: List users, view roles and status

### F5: Responsive Design

**Description**: Frontend works across desktop, tablet, and mobile browsers.

**Requirements**:
- React-responsive-carousel for mobile-friendly carousels
- Bootstrap Icons for consistent icon set
- Responsive grid layouts in product listing
- Mobile menu / hamburger navigation

**Acceptance Criteria**:
- Page renders correctly on 320px+ width (mobile)
- Touch-friendly buttons and inputs on mobile
- No horizontal scroll on mobile views

### F6: Error Handling & Notifications

**Description**: Users receive clear feedback on success, errors, and loading states.

**Requirements**:
- Toast notifications for add-to-cart, remove-from-cart, login, logout
- Error messages for failed API calls (display via react-toastify)
- Loading spinners on async operations
- GET/HEAD `401` recovery is bounded to one shared refresh and at most one replay
- A sent mutation is never blindly replayed after `401`, timeout, or network uncertainty
- Business `403` surfaces to the caller without refresh or logout
- Form validation feedback (email, password requirements)

**Acceptance Criteria**:
- Error toast shows API error message (or generic fallback)
- Success toast auto-dismisses after 3 seconds
- Loading state prevents double-submit

## Non-Functional Requirements

### N1: Performance

- Page load time < 3 seconds (Core Web Vitals)
- Product search results < 2 seconds
- Bundle size optimized (CRA production build)

### N2: Security

- Fifteen-minute access JWT and CSRF value are module-memory only; neither enters Web Storage, URLs, logs, or cross-tab messages
- Rotating opaque refresh token stays in a Secure, SameSite, HttpOnly cookie with browser-session or hard 30-day absolute lifetime according to `rememberMe`
- No credentials in environment files or version control
- Production auth uses exact same-origin Vercel rewrites plus backend Origin/Referer and CSRF enforcement
- CORS headers handled by backend Spring Boot

### N3: Compatibility

- Support: Chrome, Firefox, Safari, Edge (latest 2 versions)
- TypeScript strict mode enabled
- No IE11 support

### N4: Maintainability

- Type-safe TypeScript across all components
- Organized by feature area (layouts/, api/, models/)
- API modules centralized (DRY principle)
- No global state library; component state is local, while auth and wishlist use narrow immutable external stores

### N5: Scalability

- Stateless frontend (no server-side sessions)
- Horizontal scaling: any instance can serve the frontend
- Docker containerization for easy deployment

## Technical Constraints

1. **Server session boundary**: Backend persists rotating refresh sessions; business APIs remain Bearer-only and never authenticate from the refresh cookie alone.
2. **Memory access token**: The 15-minute access JWT is owned only by `AuthSession.ts`; components and domain modules do not decode or persist it.
3. **No broad State Management Library**: Avoid Redux and broad auth Context; use narrow external stores, component state, and approved cart/checkout metadata only.
4. **Native Fetch**: No axios; use native browser Fetch API through `Request.ts` or the dedicated `AuthSession.ts` transport.
5. **Create React App**: Locked to react-scripts 5.0.1; eject only as last resort.
6. **API Routing**: Vercel production uses root-relative requests through exact same-origin rewrites; development and local Docker Compose may use the explicit `http://localhost:8080` override.

## Success Metrics

| Metric | Target |
|--------|--------|
| Page Load Time (Lighthouse) | > 80 |
| Product Search Latency | < 2s |
| Cart Operations Latency | Guest < 500ms local; authenticated depends on API |
| Mobile Accessibility Score | > 85 |
| Checkout Completion Rate | > 70% (tracked by backend) |
| Auth Error Recovery | One GET/HEAD refresh/replay maximum; no mutation replay; business 403 preserves session |

## Dependencies

### Backend
- Spring Boot 3.x API; local development defaults to `http://localhost:8080`, while Vercel production reaches the canonical backend through same-origin rewrites
- Requires MySQL database for user, book, order, review data

### Frontend Runtime
- Node.js 18+ for build
- npm 9+ for package management
- Modern browser with ES2020+ support

### External Services
- Cloudinary (image hosting for book covers)
- VNPay (payment gateway for checkout)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Access-token theft through persistent browser storage | Keep access/CSRF values in module memory only; refresh credential remains an HttpOnly cookie; enforce CSP and source-scan tests |
| Guest cart lost on localStorage clear | Explain guest storage boundary; authenticated carts restore from backend |
| Incorrect production API routing | Test exact Vercel rewrites, canonical backend destination, no-store headers, and backend canonical-origin policy |
| Mixed API patterns (fetch vs modules) | Standardize on api/ modules (code review) |

## Roadmap

### Current Phase (MVP)
- Public browsing, search, product detail
- User auth (register, login, profile)
- Shopping cart, checkout, VNPay payment
- Admin panel (book, category, coupon CRUD)

### Current Security Foundation
- Unified `RouteGuard` over AuthSession status and capabilities
- Memory-only 15-minute access token with rotating HttpOnly refresh sessions
- Numeric UID ownership for cart/wishlist and stale request isolation

### Future Phase
- Google identity login, then Facebook identity login after separate release gates
- Advanced filtering (price range, rating, author)
- Email notifications (order confirmation, shipment updates)

## Glossary

| Term | Definition |
|------|-----------|
| Sach | Book |
| The Loai | Category |
| Gio Hang | Shopping Cart |
| Yeu Thich | Wishlist |
| Thanh Toan | Checkout / Payment |
| Don Hang | Order |
| Binh Luan | Review |
| Dia Chi | Address |
| Kupon | Coupon/Discount Code |
| Nguoi Dung | User |

## Related Documentation

- [Codebase Summary](./codebase-summary.md) — Source file inventory
- [Code Standards](./code-standards.md) — Development conventions
- [System Architecture](./system-architecture.md) — Design patterns, data flow
- [Deployment Guide](./deployment-guide.md) — Setup and operations
