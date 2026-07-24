const LOCAL_API_HOST = 'localhost';
const LOCAL_API_PORT = 8080;
const LOCAL_API_BASE_URL = `http://${LOCAL_API_HOST}:${LOCAL_API_PORT}`;

function normalizeApiBaseUrl(baseUrl: string): string {
  try {
    const parsedUrl = new URL(baseUrl.trim());
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('unsupported protocol');
    }
    if (parsedUrl.username || parsedUrl.password) {
      throw new Error('credentials are not allowed');
    }
    if (!/^\/*$/.test(parsedUrl.pathname) || parsedUrl.search || parsedUrl.hash) {
      throw new Error('path, query string, or fragment is not allowed');
    }

    return parsedUrl.origin;
  } catch {
    throw new Error('REACT_APP_API_BASE_URL must be a credential-free HTTP(S) origin.');
  }
}

export function getApiBaseUrl(): string {
  const configuredBaseUrl = process.env.REACT_APP_API_BASE_URL?.trim();
  return normalizeApiBaseUrl(configuredBaseUrl || LOCAL_API_BASE_URL);
}

export function apiUrl(path: string): string {
  if (path === '') {
    return getApiBaseUrl();
  }

  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('API paths must be root-relative.');
  }

  return `${getApiBaseUrl()}${path}`;
}
