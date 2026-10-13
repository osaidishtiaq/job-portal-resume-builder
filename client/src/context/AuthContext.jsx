import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api, tokenStorage } from '../api/api';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => tokenStorage.get());
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Restore authenticated session on initial load
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const savedToken = tokenStorage.get();
      if (!savedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const response = await api.auth.getMe();
        if (isMounted && response?.data?.user) {
          setUser(response.data.user);
          setToken(savedToken);
        }
      } catch (err) {
        // Token is invalid or expired
        console.warn('Session restoration failed:', err.message);
        tokenStorage.remove();
        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    setAuthError(null);
    try {
      const response = await api.auth.login({ email, password });
      const receivedToken = response?.data?.token;
      const receivedUser = response?.data?.user;

      if (receivedToken) {
        tokenStorage.set(receivedToken);
        setToken(receivedToken);
      }
      if (receivedUser) {
        setUser(receivedUser);
      }

      return response.data;
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    }
  }, []);

  const register = useCallback(async ({ name, email, password, role }) => {
    setAuthError(null);
    try {
      // 1. Create account on backend
      const regResponse = await api.auth.register({ name, email, password, role });

      // 2. Obtain JWT by authenticating with the created credentials
      if (regResponse?.data?.token) {
        tokenStorage.set(regResponse.data.token);
        setToken(regResponse.data.token);
        setUser(regResponse.data.user);
        return regResponse.data;
      }

      // If backend registration returns user without token, log in to establish session
      const loginResponse = await api.auth.login({ email, password });
      const receivedToken = loginResponse?.data?.token;
      const receivedUser = loginResponse?.data?.user || regResponse?.data?.user;

      if (receivedToken) {
        tokenStorage.set(receivedToken);
        setToken(receivedToken);
      }
      if (receivedUser) {
        setUser(receivedUser);
      }

      return loginResponse.data;
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    tokenStorage.remove();
    setToken(null);
    setUser(null);
    setAuthError(null);
  }, []);

  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      loading,
      authError,
      login,
      register,
      logout,
      clearError
    }),
    [user, token, loading, authError, login, register, logout, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
