const ACCESS_TOKEN_KEY = 'researchx_token';
const REFRESH_TOKEN_KEY = 'researchx_refresh_token';
const USER_CACHE_KEY = 'researchx_user';

export function getAccessToken() {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function getRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function getCachedUser() {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthSession({ token, accessToken, refreshToken, user }) {
  try {
    const access = accessToken || token;
    if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    if (user) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function setCachedUser(user) {
  try {
    if (user) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  } catch {
    // Ignore storage errors
  }
}

export function clearAuthSession() {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_CACHE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function parseJwtExpiryMs(token) {
  if (!token || typeof token !== 'string') return 0;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return 0;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_CACHE_KEY };
