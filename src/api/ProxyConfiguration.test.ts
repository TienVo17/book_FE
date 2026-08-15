import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';

describe('production same-origin proxy configuration', () => {
  const projectRoot = resolve(__dirname, '..', '..');
  const config = JSON.parse(readFileSync(join(projectRoot, 'vercel.json'), 'utf8')) as {
    rewrites: Array<{ source: string; destination: string }>;
    headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
  };

  it('keeps API, account, and registration-validation prefixes during rewrites without caching', () => {
    expect(config.rewrites).toEqual([
      {
        source: '/api/:path*',
        destination: 'https://book-be-jakn.onrender.com/api/:path*',
      },
      {
        source: '/tai-khoan/oauth/ket-qua',
        destination: '/index.html',
      },
      {
        source: '/tai-khoan/:path*',
        destination: 'https://book-be-jakn.onrender.com/tai-khoan/:path*',
      },
      {
        source: '/nguoi-dung/:path*',
        destination: 'https://book-be-jakn.onrender.com/nguoi-dung/:path*',
      },
    ]);

    for (const source of ['/api/:path*', '/tai-khoan/:path*', '/nguoi-dung/:path*']) {
      const headers = config.headers.find((rule) => rule.source === source)?.headers;
      expect(headers).toEqual(expect.arrayContaining([
        { key: 'Cache-Control', value: 'no-store, private' },
        { key: 'CDN-Cache-Control', value: 'no-store' },
      ]));
    }
  });

  /**
   * The social result page is a SPA route that happens to sit under /tai-khoan. Without an
   * earlier, more specific rewrite it would be proxied to the backend, which has no such
   * route, so every Google login would end on an error instead of the result page.
   */
  it('serves the social result route from the SPA instead of proxying it', () => {
    const spaRoute = config.rewrites.find((rule) => rule.source === '/tai-khoan/oauth/ket-qua');
    const backendPrefix = config.rewrites.findIndex((rule) => rule.source === '/tai-khoan/:path*');

    expect(spaRoute?.destination).toBe('/index.html');
    expect(config.rewrites.indexOf(spaRoute!)).toBeLessThan(backendPrefix);
  });

  it('keeps browser connections same-origin and excludes direct Render access', () => {
    const apiUrlSource = readFileSync(join(projectRoot, 'src', 'api', 'ApiUrl.ts'), 'utf8');
    const taiKhoanApiSource = readFileSync(join(projectRoot, 'src', 'api', 'TaiKhoanApi.ts'), 'utf8');
    const csp = config.headers
      .flatMap((rule) => rule.headers)
      .find((header) => header.key === 'Content-Security-Policy')?.value;

    expect(apiUrlSource).not.toContain('book-be-jakn.onrender.com');
    expect(taiKhoanApiSource).toContain('/nguoi-dung/search/existsByTenDangNhap');
    expect(taiKhoanApiSource).toContain('/nguoi-dung/search/existsByEmail');
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain('https://book-be-jakn.onrender.com');
  });

  it('uses a dedicated backend sitemap origin rather than the browser API setting', () => {
    const scriptPath = join(projectRoot, 'scripts', 'write-robots-sitemap.js');
    const packageConfig = JSON.parse(
      readFileSync(join(projectRoot, 'package.json'), 'utf8'),
    ) as { scripts: { build: string } };
    expect(packageConfig.scripts.build).toContain(
      'write-robots-sitemap.js --production',
    );
    const resolveOrigin = (
      nodeEnv: 'development' | 'production' | undefined,
      sitemapOrigin: string,
      productionFlag = false,
    ) => {
      const env = Object.fromEntries(
        Object.entries(process.env).filter(
          ([key, value]) => key !== 'NODE_ENV' && value !== undefined,
        ),
      ) as { [key: string]: string };
      if (nodeEnv !== undefined) {
        env.NODE_ENV = nodeEnv;
      }
      env.SITEMAP_BACKEND_ORIGIN = sitemapOrigin;
      env.REACT_APP_API_BASE_URL = 'https://browser-origin.example';
      return spawnSync(
        process.execPath,
        [
          scriptPath,
          '--resolve-origin',
          ...(productionFlag ? ['--production'] : []),
        ],
        {
          env: env as unknown as NodeJS.ProcessEnv,
          encoding: 'utf8',
        },
      );
    };

    const configured = resolveOrigin('production', 'https://book-be-jakn.onrender.com/');
    expect(configured.status).toBe(0);
    expect(configured.stdout.trim()).toBe('https://book-be-jakn.onrender.com');

    const productionDefault = resolveOrigin('production', '');
    expect(productionDefault.status).toBe(0);
    expect(productionDefault.stdout.trim()).toBe('https://book-be-jakn.onrender.com');

    const buildDefault = resolveOrigin(undefined, '', true);
    expect(buildDefault.status).toBe(0);
    expect(buildDefault.stdout.trim()).toBe('https://book-be-jakn.onrender.com');

    const developmentDefault = resolveOrigin('development', '');
    expect(developmentDefault.status).toBe(0);
    expect(developmentDefault.stdout.trim()).toBe('http://localhost:8080');

    const invalid = resolveOrigin('production', 'https://backend.example/path');
    expect(invalid.status).not.toBe(0);
    expect(invalid.stderr).toContain('SITEMAP_BACKEND_ORIGIN');
  });
});
