import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { refreshAccessToken } from '../services/api';
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  getAccessToken,
  getRefreshToken,
  getCachedUser,
  setAuthSession,
  setCachedUser,
  clearAuthSession,
  parseJwtExpiryMs,
} from '../services/authStorage';

const AuthContext = createContext(null);

const REFRESH_BUFFER_MS = 10 * 60 * 1000; // Refresh silently 10 mins before access token expiry

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const ensureFreshTokenIfNeeded = useCallback(async () => {
    const token = getAccessToken();
    const refreshToken = getRefreshToken();
    if (!refreshToken) return;

    const expMs = parseJwtExpiryMs(token);
    if (!token || !expMs || expMs - Date.now() <= REFRESH_BUFFER_MS) {
      try {
        await refreshAccessToken();
      } catch {
        // Transient network error leaves tokens intact; explicit 401/403 is handled in refreshAccessToken
      }
    }
  }, []);

  const loadUser = useCallback(async () => {
    const token = getAccessToken();
    const refreshToken = getRefreshToken();
    const cachedUser = getCachedUser();

    if (!token && !refreshToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      if (!token && refreshToken) {
        await refreshAccessToken();
      }
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setCachedUser(data.user);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403 || err.isAuthRejection) {
        clearAuthSession();
        setUser(null);
      } else if (cachedUser) {
        // Preserve session across transient offline/cold-start blips instead of logging user out
        setUser(cachedUser);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Silent background token refresh & cross-tab explicit sign-out synchronization
  useEffect(() => {
    const handleAuthExpired = () => {
      clearAuthSession();
      setUser(null);
    };

    const handleAuthRefreshed = (evt) => {
      if (evt.detail) setUser(evt.detail);
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        ensureFreshTokenIfNeeded();
      }
    };

    const handleStorageSync = (evt) => {
      if (evt.key === ACCESS_TOKEN_KEY || evt.key === REFRESH_TOKEN_KEY) {
        if (!getAccessToken() && !getRefreshToken()) {
          setUser(null);
        } else {
          const nextCached = getCachedUser();
          if (nextCached) setUser(nextCached);
        }
      }
    };

    window.addEventListener('researchx:auth-expired', handleAuthExpired);
    window.addEventListener('researchx:auth-refreshed', handleAuthRefreshed);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('storage', handleStorageSync);

    const intervalId = setInterval(() => {
      ensureFreshTokenIfNeeded();
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('researchx:auth-expired', handleAuthExpired);
      window.removeEventListener('researchx:auth-refreshed', handleAuthRefreshed);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('storage', handleStorageSync);
      clearInterval(intervalId);
    };
  }, [ensureFreshTokenIfNeeded]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAuthSession(data);
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    setAuthSession(data);
    setUser(data.user);
    return data.user;
  };

  const updateProfile = async (payload) => {
    const { data } = await api.patch('/auth/me', payload);
    setCachedUser(data.user);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    clearAuthSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, updateProfile, logout, reloadUser: loadUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
