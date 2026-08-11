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
| JWT Decode | jwt-decode | 4.0 |
| Build | react-scripts (CRA) | 5.0.1 |

## Key Features

- **Product Browsing**: Search, category filters, detailed product views with ratings
- **Shopping Cart**: guest carts persist in localStorage with at most 100 unique
  book lines; authenticated carts use the backend as source of truth. Login
  merges a guest snapshot with a stable, replay-safe key and payload.
- **Checkout**: authenticated two-step flow (COD or VNPay sandbox). It waits for
  queued cart writes, verifies the current cart snapshot, and uses an idempotency
  key so a retry cannot duplicate an order
- **Authentication**: JWT tokens (localStorage), login/register/password reset
- **Admin Panel**: Book CRUD, user management, order tracking, review moderation
- **Responsive Design**: Bootstrap Icons, mobile-friendly layouts
- **Performance**: Lazy-load scroll reveal, category search autocomplete

## Authentication & State

- **JWT Storage**: token in `localStorage.jwt` (no refresh-token flow)
- **State Model**: component state plus localStorage caches (no Redux/Context);
  authenticated cart mutations are persisted through the backend API
- **Auth Guards**: one `RouteGuard`. `require="user"` needs a valid non-expired JWT;
  `require="admin"` also needs `isAdmin === true`. Guards are UX; the backend
  authorizes every request independently.
- **Cart**: `CartStorage.ts` is the only direct writer of the local
  `localStorage.gioHang` snapshot. The guest cart is limited to 100 unique book
  lines. For authenticated users, `CartSession.ts` serializes mutations through
  `CartApi.ts`; backend responses are authoritative and the local snapshot is an
  account- and exact-token-bound render cache.
- **Login handoff**: immediately before storing the new JWT, login captures the
  guest snapshot. A stable `Idempotency-Key` and exact payload are retained for
  safe replay if the merge response is lost.
- **Wishlist**: authenticated wishlist state is held in one in-memory external
  store and hydrated from `/api/yeu-thich`. Card, detail, and wishlist pages read
  the same server-authoritative snapshot; exact-token guards reject stale account
  responses and per-book queues serialize rapid toggles.
- **Checkout**: waits for component and shared cart mutations, compares the
  reviewed cart with the current snapshot, then submits that authoritative
  snapshot with an `Idempotency-Key`. A lost order response can be retried
  without creating a second order.

## Known Limitations

This is a portfolio demo running on test data — no real payments, no real
customer data, and no SLA. See
[System Architecture](./docs/system-architecture.md#known-limitations) for detail.

- **Bearer token in `localStorage`**: readable by any script on the page. Adequate
  for a demo; a production go-live would need HttpOnly cookies plus CSRF defence.
- **API deployment configuration**: `REACT_APP_API_BASE_URL` is embedded at build
  time, so a production build must be given the deployed backend origin.
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

Resolves Spring Boot API requests from the credential-free HTTP(S) origin in `REACT_APP_API_BASE_URL`; local development falls back to `http://localhost:8080`.

For backend docs, see the paired repository at `../book_BE`.

## Contributing

Follow [Code Standards](./docs/code-standards.md) when adding features. Update API module exports in `src/api/` rather than calling fetch directly in page components.

## License

Private project. All rights reserved.
