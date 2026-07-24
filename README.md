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
- **Shopping Cart**: Client-side localStorage persistence (no server cart)
- **Checkout**: Multi-step VNPay payment gateway integration
- **Authentication**: JWT tokens (localStorage), login/register/password reset
- **Admin Panel**: Book CRUD, user management, order tracking, review moderation
- **Responsive Design**: Bootstrap Icons, mobile-friendly layouts
- **Performance**: Lazy-load scroll reveal, category search autocomplete

## Authentication & State

- **JWT Storage**: Tokens stored in `localStorage.jwt` (no refresh-token flow)
- **Client-Side State**: Cart and auth state in localStorage only (no Redux/Context)
- **Auth Guards**: Routes protected by `RequireAuth` (presence-check) and `AdminRoute` (expiry + role check)

## Known Limitations

See [System Architecture](./docs/system-architecture.md#known-limitations) for documented issues including:

- **Auth guard inconsistencies**: Three separate guard implementations exist; only `AdminRoute` is wired
- **API deployment configuration**: Production requires `REACT_APP_API_BASE_URL` to identify the deployed backend.
- **Mixed data-access patterns**: Some pages bypass the API modules and call fetch directly

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
