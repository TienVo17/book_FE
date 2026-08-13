const LOCAL_API_HOST = 'localhost';
const LOCAL_API_PORT = 8080;
const LOCAL_API_BASE_URL = `http://${LOCAL_API_HOST}:${LOCAL_API_PORT}`;

function normalizeLocalApiBaseUrl(baseUrl: string): string {
  try {
    const parsedUrl = new URL(baseUrl.trim());
    if ((parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') ||
        parsedUrl.hostname !== LOCAL_API_HOST ||
        parsedUrl.username || parsedUrl.password ||
        !/^\/*$/.test(parsedUrl.pathname) || parsedUrl.search || parsedUrl.hash) {
      throw new Error('invalid localhost origin');
    }
    return parsedUrl.origin;
  } catch {
    throw new Error('REACT_APP_API_BASE_URL must be a localhost HTTP(S) origin during development.');
  }
}

export function getApiBaseUrl(environment: string = process.env.NODE_ENV): string {
  const configuredBaseUrl = process.env.REACT_APP_API_BASE_URL?.trim();
  if (environment === 'production') {
    if (configuredBaseUrl) {
      try {
        return normalizeLocalApiBaseUrl(configuredBaseUrl);
      } catch {
        return '';
      }
    }
    return '';
  }

  return normalizeLocalApiBaseUrl(configuredBaseUrl || LOCAL_API_BASE_URL);
}

export function apiUrl(path: string, environment: string = process.env.NODE_ENV): string {
  if (path === '') {
    return getApiBaseUrl(environment);
  }
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('API paths must be root-relative.');
  }
  return `${getApiBaseUrl(environment)}${path}`;
}
