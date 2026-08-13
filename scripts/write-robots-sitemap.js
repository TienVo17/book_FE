#!/usr/bin/env node
/**
 * Rewrites the `Sitemap:` line in build/robots.txt to the backend origin that
 * serves the sitemap. Browser API URLs intentionally use the same-origin proxy,
 * so this script uses a separate non-browser configuration key.
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_LOCAL_BACKEND_ORIGIN = 'http://localhost:8080';
const DEFAULT_PRODUCTION_BACKEND_ORIGIN = 'https://book-be-jakn.onrender.com';
const robotsPath = path.join(__dirname, '..', 'build', 'robots.txt');

function resolveBackendOrigin(raw, nodeEnv) {
  const value = (raw || '').trim();
  if (!value) {
    return nodeEnv === 'production'
      ? DEFAULT_PRODUCTION_BACKEND_ORIGIN
      : DEFAULT_LOCAL_BACKEND_ORIGIN;
  }

  try {
    const url = new URL(value);
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') ||
        url.username || url.password ||
        !/^\/*$/.test(url.pathname) || url.search || url.hash) {
      throw new Error('unsupported origin');
    }
    return url.origin;
  } catch {
    throw new Error('SITEMAP_BACKEND_ORIGIN must be a valid HTTP(S) origin without credentials, path, query, or fragment.');
  }
}

function fail(message) {
  console.error(`[robots] ${message}`);
  process.exitCode = 1;
}

try {
  const nodeEnv = process.argv.includes('--production')
    ? 'production'
    : process.env.NODE_ENV;
  const origin = resolveBackendOrigin(process.env.SITEMAP_BACKEND_ORIGIN, nodeEnv);

  if (process.argv.includes('--resolve-origin')) {
    process.stdout.write(origin);
  } else {
    if (!fs.existsSync(robotsPath)) {
      throw new Error(`${robotsPath} not found; run this after the build.`);
    }

    const source = fs.readFileSync(robotsPath, 'utf8');
    const updated = source.replace(/^Sitemap:.*$/m, `Sitemap: ${origin}/sitemap.xml`);
    if (!/^Sitemap: /m.test(updated)) {
      throw new Error('no Sitemap: line found in robots.txt');
    }

    fs.writeFileSync(robotsPath, updated);
    console.log(`[robots] Sitemap -> ${origin}/sitemap.xml`);
  }
} catch (error) {
  fail(error instanceof Error ? error.message : 'could not write sitemap origin');
}
