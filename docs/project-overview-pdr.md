# Project Overview & Product Development Requirements

**Project**: Web Bán Sách (Bookstore Frontend)  
**Version**: 0.1.0  
**Last Updated**: 2026-07-08  
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
- Login with JWT token storage in localStorage
- Password reset via email link
- Profile page: view/edit name, email, phone, address
- Change password endpoint
- Address book (multiple shipping addresses per user)
- Logout clears localStorage.jwt

**Acceptance Criteria**:
- JWT token includes user ID, email, roles (USER/ADMIN/STAFF)
- 401 response auto-clears token from localStorage
- Address CRUD works without page refresh (modal or form)
- Password reset link valid for 24 hours (backend enforced)

### F3: Shopping Cart & Checkout

**Description**: Users add items to cart and proceed to payment.

**Requirements**:
- Client-side cart stored in localStorage (GioHangModel)
- View cart page with:
  - Product image, name, price, quantity
  - Remove / Update quantity buttons
  - Subtotal per item and total price
  - Apply coupon code input
- Two-step checkout:
  - Step 1: Review items, select shipping address, apply coupon
  - Step 2: Confirm order, redirect to VNPay payment gateway
- Guest quick-order (DatHangNhanh) for unauthenticated users
- Order history page (authenticated users)
- VNPay payment result page (ThanhToan result status)

**Acceptance Criteria**:
- Cart persists across browser sessions (localStorage)
- Coupon validation: amount validation, discount calculation
- Order creates with status "PENDING" before payment
- VNPay return URL populates with orderId and payment status
- Guest users get order confirmation email instead of account history

### F4: Admin Panel

**Description**: Admin/Staff users manage books, categories, coupons, orders, reviews, users.

**Acceptance Criteria**:
- Access gated by isAdmin || isStaff role check + JWT expiry
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
- 401/403 responses trigger logout and redirect to login
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

- JWT tokens in localStorage (inherent XSS risk; mitigated by Content Security Policy in nginx)
- No credentials in environment files or version control
- Refresh token flow not implemented (single JWT, no expiry extension)
- CORS headers handled by backend Spring Boot

### N3: Compatibility

- Support: Chrome, Firefox, Safari, Edge (latest 2 versions)
- TypeScript strict mode enabled
- No IE11 support

### N4: Maintainability

- Type-safe TypeScript across all components
- Organized by feature area (layouts/, api/, models/)
- API modules centralized (DRY principle)
- No global state library (localStorage only)

### N5: Scalability

- Stateless frontend (no server-side sessions)
- Horizontal scaling: any instance can serve the frontend
- Docker containerization for easy deployment

## Technical Constraints

1. **No Server-Side Session State**: All state client-side or persisted in backend database
2. **Single JWT Token**: No refresh-token rotation; one token per session
3. **No State Management Library**: Avoid Redux/Context; use localStorage + component state
4. **Native Fetch**: No axios; use native browser Fetch API
5. **Create React App**: Locked to react-scripts 5.0.1; eject only as last resort
6. **API Base URL**: Backend request sites resolve from build-time `REACT_APP_API_BASE_URL`, with `http://localhost:8080` as the local-development fallback.

## Success Metrics

| Metric | Target |
|--------|--------|
| Page Load Time (Lighthouse) | > 80 |
| Product Search Latency | < 2s |
| Cart Operations Latency | < 500ms (local) |
| Mobile Accessibility Score | > 85 |
| Checkout Completion Rate | > 70% (tracked by backend) |
| 401/403 Error Recovery | Auto-logout + redirect to login |

## Dependencies

### Backend
- Spring Boot 3.x API; local development defaults to `http://localhost:8080`, while deployed builds use `REACT_APP_API_BASE_URL`
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
| XSS via localStorage JWT | CSP headers in nginx; sanitize user inputs |
| Lost cart on localStorage clear | Sync cart to backend (future enhancement) |
| Incorrect API origin in production | Validate `REACT_APP_API_BASE_URL` during the production build and verify backend CORS |
| Mixed API patterns (fetch vs modules) | Standardize on api/ modules (code review) |

## Roadmap

### Current Phase (MVP)
- Public browsing, search, product detail
- User auth (register, login, profile)
- Shopping cart, checkout, VNPay payment
- Admin panel (book, category, coupon CRUD)

### Future Phase
- Server-side cart persistence
- Unify auth guards (consolidate 3 implementations)
- Refresh token flow
- Advanced filtering (price range, rating, author)
- Wishlist persistence on backend
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
