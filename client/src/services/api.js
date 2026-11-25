import axios from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  setAuthSession,
  clearAuthSession,
} from './authStorage';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 65000,
});

const MAX_TRANSIENT_RETRIES = 2;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let refreshPromise = null;

function isTransientRetryable(error) {
  const config = error?.config;
  if (!config || config.retry === false) return false;

  const method = (config.method || 'get').toLowerCase();
  const url = config.url || '';
  const isSafeMethod = method === 'get' || method === 'head' || method === 'options';
  const isSafeAuthRetry = url.includes('/auth/me') || url.includes('/auth/refresh');

  if (!isSafeMethod && !isSafeAuthRetry) return false;

  const status = error.response?.status;
  const isNetworkFailure = !error.response;
  const isTransientServer = status === 502 || status === 503 || status === 504;

  return isNetworkFailure || isTransientServer;
}

export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw Object.assign(new Error('No refresh token available'), { isAuthRejection: true });
  }

  refreshPromise = axios
    .post(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
      { timeout: 30000 }
    )
    .then(({ data }) => {
      setAuthSession(data);
      window.dispatchEvent(new CustomEvent('researchx:auth-refreshed', { detail: data.user }));
      return data;
    })
    .catch((err) => {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        clearAuthSession();
        window.dispatchEvent(new CustomEvent('researchx:auth-expired'));
        err.isAuthRejection = true;
      }
      throw err;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = originalRequest?.url || '';

    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout');

    // 1. Automatic 401 silent refresh + retry
    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        const refreshed = await refreshAccessToken();
        const nextToken = refreshed.accessToken || refreshed.token;
        if (nextToken) {
          originalRequest.headers.Authorization = `Bearer ${nextToken}`;
        }
        return api(originalRequest);
      } catch (refreshErr) {
        const message =
          refreshErr.response?.data?.error ||
          error.response?.data?.error ||
          'Your session could not be renewed. Please sign in again.';
        refreshErr.friendlyMessage = message;
        return Promise.reject(refreshErr);
      }
    }

    // 2. Automatic transient network / 5xx gateway retry (up to 2 retries)
    if (isTransientRetryable(error)) {
      const retryCount = originalRequest._transientRetries || 0;
      if (retryCount < MAX_TRANSIENT_RETRIES) {
        originalRequest._transientRetries = retryCount + 1;
        await sleep(800 * (retryCount + 1));
        return api(originalRequest);
      }
    }

    const message =
      error.response?.data?.error ||
      error.message ||
      'A network error occurred while communicating with RESEARCHX AI.';
    error.friendlyMessage = message;
    return Promise.reject(error);
  }
);

export default api;
