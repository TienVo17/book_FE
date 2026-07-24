import { apiUrl, getApiBaseUrl } from './ApiUrl';

const configuredApiBaseUrl = process.env.REACT_APP_API_BASE_URL;

describe('API URL resolver', () => {
  afterEach(() => {
    if (configuredApiBaseUrl === undefined) {
      delete process.env.REACT_APP_API_BASE_URL;
      return;
    }

    process.env.REACT_APP_API_BASE_URL = configuredApiBaseUrl;
  });

  it('uses the configured API base URL', () => {
    process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

    expect(getApiBaseUrl()).toBe('https://api.example.com');
    expect(apiUrl('/api/sach')).toBe('https://api.example.com/api/sach');
  });

  it('uses the local API URL when no base URL is configured', () => {
    delete process.env.REACT_APP_API_BASE_URL;

    expect(apiUrl('/tai-khoan/dang-nhap')).toBe('http://localhost:8080/tai-khoan/dang-nhap');
  });

  it('trims whitespace and trailing slashes from the configured base URL', () => {
    process.env.REACT_APP_API_BASE_URL = '  https://api.example.com///  ';

    expect(apiUrl('/api/sach')).toBe('https://api.example.com/api/sach');
  });

  it('preserves query strings while resolving root-relative API paths', () => {
    process.env.REACT_APP_API_BASE_URL = 'https://api.example.com/';

    expect(apiUrl('/api/sach?sort=maSach,desc&page=0')).toBe(
      'https://api.example.com/api/sach?sort=maSach,desc&page=0',
    );
  });

  it('rejects non-root-relative paths', () => {
    expect(() => apiUrl('api/sach')).toThrow('API paths must be root-relative.');
  });

  it('rejects configured base URLs with a path', () => {
    process.env.REACT_APP_API_BASE_URL = 'https://api.example.com/backend';

    expect(() => getApiBaseUrl()).toThrow('REACT_APP_API_BASE_URL must be a credential-free HTTP(S) origin.');
  });

  it('rejects configured base URLs with credentials', () => {
    process.env.REACT_APP_API_BASE_URL = 'https://user:secret@api.example.com';

    expect(() => getApiBaseUrl()).toThrow('REACT_APP_API_BASE_URL must be a credential-free HTTP(S) origin.');
  });

  it('rejects malformed configured base URLs', () => {
    process.env.REACT_APP_API_BASE_URL = '/backend';

    expect(() => getApiBaseUrl()).toThrow('REACT_APP_API_BASE_URL must be a credential-free HTTP(S) origin.');
  });
});
