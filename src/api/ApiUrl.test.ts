import { apiUrl, getApiBaseUrl } from './ApiUrl';

const configuredApiBaseUrl = process.env.REACT_APP_API_BASE_URL;

describe('API URL resolver', () => {
  afterEach(() => {
    if (configuredApiBaseUrl === undefined) {
      delete process.env.REACT_APP_API_BASE_URL;
    } else {
      process.env.REACT_APP_API_BASE_URL = configuredApiBaseUrl;
    }
  });

  it('uses root-relative production paths without a direct backend origin', () => {
    delete process.env.REACT_APP_API_BASE_URL;

    expect(getApiBaseUrl('production')).toBe('');
    expect(apiUrl('/api/sach', 'production')).toBe('/api/sach');
    expect(apiUrl('/tai-khoan/dang-nhap', 'production')).toBe('/tai-khoan/dang-nhap');
    expect(apiUrl('/nguoi-dung/search/existsByEmail', 'production')).toBe(
      '/nguoi-dung/search/existsByEmail',
    );
  });

  it('ignores nonlocal origins in production but preserves the Docker localhost override', () => {
    process.env.REACT_APP_API_BASE_URL = 'https://book-be-jakn.onrender.com';
    expect(getApiBaseUrl('production')).toBe('');

    process.env.REACT_APP_API_BASE_URL = 'http://localhost:8080';
    expect(apiUrl('/tai-khoan/dang-nhap', 'production')).toBe(
      'http://localhost:8080/tai-khoan/dang-nhap',
    );
  });

  it('uses the local API URL when no base URL is configured during development', () => {
    delete process.env.REACT_APP_API_BASE_URL;

    expect(getApiBaseUrl('development')).toBe('http://localhost:8080');
    expect(apiUrl('/tai-khoan/dang-nhap', 'development')).toBe('http://localhost:8080/tai-khoan/dang-nhap');
  });

  it('uses an explicit localhost-only development API URL', () => {
    process.env.REACT_APP_API_BASE_URL = 'http://localhost:8080/';

    expect(getApiBaseUrl('development')).toBe('http://localhost:8080');
    expect(apiUrl('/api/sach?sort=maSach,desc&page=0', 'development')).toBe(
      'http://localhost:8080/api/sach?sort=maSach,desc&page=0',
    );
  });

  it('rejects non-local direct origins during development', () => {
    process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

    expect(() => getApiBaseUrl('development')).toThrow(
      'REACT_APP_API_BASE_URL must be a localhost HTTP(S) origin during development.',
    );
  });

  it('rejects non-root-relative paths', () => {
    expect(() => apiUrl('api/sach', 'production')).toThrow('API paths must be root-relative.');
  });

  it('rejects configured local URLs with a path or credentials', () => {
    process.env.REACT_APP_API_BASE_URL = 'http://localhost:8080/backend';
    expect(() => getApiBaseUrl('development')).toThrow('REACT_APP_API_BASE_URL must be a localhost HTTP(S) origin during development.');

    process.env.REACT_APP_API_BASE_URL = 'https://user:secret@localhost:8080';
    expect(() => getApiBaseUrl('development')).toThrow('REACT_APP_API_BASE_URL must be a localhost HTTP(S) origin during development.');
  });
});
