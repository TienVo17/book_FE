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

- Public application: https://book-fe-gray.vercel.app

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

The frontend resolves every backend request from the following Vercel build-time variable:

- `REACT_APP_API_BASE_URL` — credential-free backend HTTP(S) origin with no path, query, or fragment, for example `https://api.example.com`

Whitespace and trailing slashes are removed before requests are constructed. When the variable is absent, local development falls back to `http://localhost:8080`; production builds therefore require an appropriate backend origin to make backend-dependent features available. Store values in Vercel project settings. Do not commit production values or credentials to the repository. Changing a build-time variable requires a new deployment.

## Health Check

Verify the production root returns HTTP 200 and the React HTML shell:

```bash
curl -fsS https://book-fe-gray.vercel.app/
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

A production build needs `REACT_APP_API_BASE_URL` to point to the deployed backend, and that backend must permit the Vercel origin through CORS. This document does not assert that either configuration has been applied.
