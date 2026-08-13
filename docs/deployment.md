# Deployment

## Platform

The frontend is deployed to Vercel from the GitHub repository `TienVo17/book_FE`.

- Vercel project: `book-fe`
- Production branch: `master`
- Framework preset: Create React App
- Node.js: 24.x
- Build command: `npm run build`
- Output: Create React App `build/` directory

## Production URL

- Public application: https://tienvo17.vercel.app

Vercel also assigns team and branch aliases. Those aliases may require Vercel authentication when Deployment Protection is enabled, so use the public application URL for external health checks.

## Release Flow

1. Create a focused branch from `origin/master`.
2. Run the pre-merge gates:

   ```bash
   npm ci
   npx tsc --noEmit
   npx eslint src --ext .ts,.tsx --no-cache
   CI=true npm test -- --watchAll=false --runInBand
   CI=true npm run build
   ```

3. Push the branch and open a pull request to `master`.
4. Wait for the Vercel Preview check to reach `Ready`.
5. Squash-merge the pull request.
6. Vercel automatically deploys the new `master` commit to Production.

No manual `vercel --prod` command is required for the normal release flow.

## Environment Variables

Production browser requests are root-relative. `vercel.json` forwards the exact
`/api/**`, `/tai-khoan/**`, and `/nguoi-dung/**` prefixes to the backend, so the
browser never needs a direct Render origin.

- `REACT_APP_API_BASE_URL` — optional localhost-only override for development or
  the supported local Docker Compose build. Non-local production values are
  ignored so Vercel remains same-origin.
- `SITEMAP_BACKEND_ORIGIN` — optional credential-free HTTP(S) backend origin used
  only to generate the `Sitemap:` line in `build/robots.txt`. Production defaults
  to `https://book-be-jakn.onrender.com`.

Do not commit environment-specific values or credentials. Changing a Create
React App build-time variable requires a new deployment.

## Health Check

Verify the production root returns HTTP 200 and the React HTML shell:

```bash
curl -fsS https://tienvo17.vercel.app/
```

Also test a React Router deep link such as `/sach/1` after routing changes.

## Rollback

Prefer a reviewed Git rollback:

1. Revert the faulty squash-merge commit on a new branch.
2. Run the full pre-merge gates.
3. Open and merge the rollback pull request.
4. Wait for the replacement Vercel Production deployment to reach `Ready`.

For an urgent service restoration, promote a known-good deployment from the Vercel dashboard, then follow with a Git revert so `master` remains the source of truth.

## Backend Connectivity

Vercel preserves the browser request prefix while proxying to
`https://book-be-jakn.onrender.com`. The backend must allow the canonical
`https://tienvo17.vercel.app` origin for the credentialed auth/session routes.
Verify the three rewrite prefixes, response status/body, `Set-Cookie`, relative
`Location`, `X-Trace-Id`, and no-store headers before enabling refresh sessions.
