# Web Bán Sách (Bookstore Frontend)

React 18.3 + TypeScript single-page application for an online bookstore. Pairs with a Spring Boot backend to provide search, browsing, cart management, checkout, and admin functionality for book sales.

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Installation & Development

```bash
npm install
npm start
```

Runs on http://localhost:3000. Hot-reload enabled.

### Build & Deployment

```bash
npm run build
docker build -t book-fe .
docker run -p 3000:3000 --network book-network book-fe
```

See [Deployment Guide](./docs/deployment-guide.md) for production setup with Docker Compose.

## Project Structure

```
src/
  api/              # Data access layer (fetch-based, no axios)
  models/           # TypeScript domain types
  layouts/          # Page components by feature area
  hooks/            # Custom React hooks
  App.tsx           # Main router & app container
  index.tsx         # React entry point
```

Key directories:

- **src/api/** — Request helpers and API modules (SachApi, AdminApi, UserApi, etc.)
- **src/layouts/** — Feature-organized page components (homepage, products, user, admin, categories)
- **src/models/** — TypeScript type definitions for backend responses

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Language | TypeScript | 4.9 |
| Framework | React | 18.3 |
| Routing | react-router-dom | 6.27 |
| HTTP | Fetch API (native) | — |
| Icons | react-bootstrap-icons, @mui/icons-material | Latest |
| Carousel | react-responsive-carousel | 3.2 |
| Notifications | react-toastify | 10.0 |
| Date Utils | date-fns | 4.1 |
| Auth Session | Memory-only access token + rotating HttpOnly refresh cookie | — |
| Build | react-scripts (CRA) | 5.0.1 |

## Key Features

- **Product Browsing**: Search, category filters, detailed product views with ratings
- **Shopping Cart**: guest carts persist in localStorage with at most 100 unique
  book lines; authenticated carts use the backend as source of truth. Login
  merges a guest snapshot with a stable, replay-safe key and payload.
- **Checkout**: authenticated two-step flow (COD or VNPay sandbox). It waits for
  queued cart writes, verifies the current cart snapshot, and uses an idempotency
  key so a retry cannot duplicate an order
- **Authentication**: password login with controlled remember-me, memory-only access tokens, rotating HttpOnly refresh sessions, registration, and password reset
- **Admin Panel**: Book CRUD, user management, order tracking, review moderation
- **Responsive Design**: Bootstrap Icons, mobile-friendly layouts
- **Performance**: Lazy-load scroll reveal, category search autocomplete

## Authentication & State

- **Credential storage**: the 15-minute access token and CSRF value remain private
  to `AuthSession.ts` memory. The opaque rotating refresh token is available only
  to the backend through a same-origin `HttpOnly` cookie. No application token or
  password is stored in Web Storage.
- **Remember me**: unchecked login uses a browser-session refresh cookie; checked
  login has a hard 30-day refresh-session expiry. The application never remembers
  or stores the password itself.
- **Bootstrap**: the app starts in `unknown` and checks the refresh session without
  blocking public routes. Missing/expired refresh becomes `guest`; temporary
  transport failure remains retryable `unknown` and does not cause a premature
  redirect or guest CTA.
- **Auth guards**: one `RouteGuard` uses the public session snapshot.
  `require="user"` needs an authenticated principal; `require="admin"` needs the
  `ADMIN` capability. Guards are UX; the backend authorizes every request.
- **State model**: component state plus narrowly scoped localStorage cart/checkout
  metadata (no Redux/Context); authenticated cart mutations persist through the
  backend API.
- **Cart**: `CartStorage.ts` is the only direct writer of
  `localStorage.gioHang`. Guest carts are limited to 100 unique lines. For an
  authenticated user, `CartSession.ts` serializes mutations through `CartApi.ts`;
  backend responses are authoritative and the local render cache is bound to
  `account:<numeric uid>` plus an exact in-memory request revision.
- **Login handoff**: immediately before installing a validated session, login
  captures the guest cart. A stable `Idempotency-Key` and exact payload are
  retained for safe replay if the merge response is lost.
- **Wishlist**: authenticated wishlist state is held in one in-memory external
  store and hydrated from `/api/yeu-thich`. Card, detail, and wishlist pages read
  the same server-authoritative snapshot; exact request-revision guards reject
  stale responses and per-book queues serialize rapid toggles.
- **Checkout**: waits for component and shared cart mutations, compares the
  reviewed cart with the current snapshot, then submits that authoritative
  snapshot with an `Idempotency-Key`. A lost order response can be retried
  without creating a second order.

## Known Limitations

This is a portfolio demo running on test data — no real payments, no real
customer data, and no SLA. See
[System Architecture](./docs/system-architecture.md#known-limitations) for detail.

- **Production success-path evidence**: refresh-session security and negative
  production contracts are verified, but checked/unchecked live login, rotation,
  browser-restart, and logout still require a manual smoke with an authorized test
  account before frontend production promotion.
- **API deployment configuration**: production browser requests are root-relative
  and Vercel rewrites `/api/**`, `/tai-khoan/**`, and `/nguoi-dung/**` to the
  backend. `REACT_APP_API_BASE_URL` is development-only and accepts a localhost
  HTTP(S) origin. `SITEMAP_BACKEND_ORIGIN` independently selects the backend
  origin used in the generated `robots.txt` sitemap line.
- **SPA 404s**: unknown routes render a client `NotFound` screen, but the origin
  still answers HTTP 200 because of the history fallback.
- **VNPay**: sandbox contract only; a live callback has not been demonstrated.

## Documentation

- [Project Overview & PDR](./docs/project-overview-pdr.md) — Feature requirements and acceptance criteria
- [Codebase Summary](./docs/codebase-summary.md) — Generated overview of all source files
- [Code Standards](./docs/code-standards.md) — Conventions, patterns, and style guidelines
- [System Architecture](./docs/system-architecture.md) — Component hierarchy, data flow, known limitations
- [Deployment Guide](./docs/deployment-guide.md) — Docker, nginx, environment configuration
- [Project Roadmap](./docs/project-roadmap.md) — Feature backlog and improvement priorities

## Available Scripts

```bash
npm start      # Dev server (port 3000)
npm run build  # Production build to build/ folder
npm test       # Jest test runner
npm run eject  # Expose Create React App config (one-way)
```

## Backend

Production requests stay on the frontend origin and are forwarded by the exact
Vercel rewrites in `vercel.json`. Local development falls back to
`http://localhost:8080`; `REACT_APP_API_BASE_URL` may override it only with a
localhost HTTP(S) origin. Set `SITEMAP_BACKEND_ORIGIN` only when the generated
sitemap must use a backend origin other than the production default.

For backend docs, see the paired repository at `../book_BE`.

## Contributing

Follow [Code Standards](./docs/code-standards.md) when adding features. Update API module exports in `src/api/` rather than calling fetch directly in page components.

## License

Private project. All rights reserved.
