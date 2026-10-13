/**
 * Centralized API client and session storage manager for the Job Portal frontend.
 *
 * NOTE ON SECURITY:
 * For this internship demonstration, JWT persistence uses sessionStorage so that
 * the user session survives page refreshes within the tab.
 * In a production enterprise system, storing tokens in browser storage (localStorage/sessionStorage)
 * exposes them to potential Cross-Site Scripting (XSS) attacks. Production applications
 * should preferably use secure, HttpOnly, SameSite cookies managed by the backend.
 */

const TOKEN_KEY = 'job_portal_auth_token';

export const tokenStorage = {
  get: () => {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token) => {
    try {
      if (token) {
        sessionStorage.setItem(TOKEN_KEY, token);
      }
    } catch (e) {
      console.warn('Unable to write to sessionStorage:', e);
    }
  },
  remove: () => {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.warn('Unable to remove from sessionStorage:', e);
    }
  }
};

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

/**
 * Low-level HTTP request wrapper
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // Automatically attach Bearer token if available
  const token = tokenStorage.get();
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers
    });
  } catch (err) {
    const networkError = new Error('Network error: Unable to connect to backend server. Make sure the API is running on port 5000.');
    networkError.status = 0;
    networkError.original = err;
    throw networkError;
  }

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorMsg = data?.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  auth: {
    register: (userData) =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      }),

    login: (credentials) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      }),

    getMe: () =>
      request('/auth/me', {
        method: 'GET'
      })
  },

  health: {
    check: () => request('/health', { method: 'GET' })
  }
};
