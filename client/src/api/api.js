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
  const hasAuthHeader = Object.keys(headers).some(
    (key) => key.toLowerCase() === 'authorization'
  );
  if (token && typeof token === 'string' && token.trim() && !hasAuthHeader) {
    headers.Authorization = `Bearer ${token.trim()}`;
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
    // If a protected request (token provided and not explicit login) is rejected with 401, invalidate session
    if (response.status === 401 && token && !endpoint.includes('/auth/login')) {
      tokenStorage.remove();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired', {
          detail: { message: data?.message || 'Session expired. Please log in again.' }
        }));
      }
    }

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
      }),
    updateMe: (profileData) =>
      request('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(profileData)
      })
  },

  jobs: {
    /** GET /api/jobs/my (employer only) */
    getMyJobs: () =>
      request('/jobs/my', { method: 'GET' }),

    list: (params = {}) => {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.append('search', params.search);
      if (params.location) searchParams.append('location', params.location);
      if (params.jobType) searchParams.append('jobType', params.jobType);
      if (params.workplaceMode) searchParams.append('workplaceMode', params.workplaceMode);
      if (params.salaryMin !== undefined && params.salaryMin !== null && params.salaryMin !== '') {
        searchParams.append('salaryMin', params.salaryMin);
      }
      if (params.salaryMax !== undefined && params.salaryMax !== null && params.salaryMax !== '') {
        searchParams.append('salaryMax', params.salaryMax);
      }
      if (params.page !== undefined && params.page !== null && params.page !== '') {
        searchParams.append('page', params.page);
      }
      if (params.limit !== undefined && params.limit !== null && params.limit !== '') {
        searchParams.append('limit', params.limit);
      }

      const queryString = searchParams.toString();
      const endpoint = queryString ? `/jobs?${queryString}` : '/jobs';
      return request(endpoint, { method: 'GET' });
    },

    getById: (id) =>
      request(`/jobs/${encodeURIComponent(id)}`, {
        method: 'GET'
      }),

    create: (jobData) =>
      request('/jobs', {
        method: 'POST',
        body: JSON.stringify(jobData)
      }),

    // Update an existing job (PUT /api/jobs/:id)
    update: (id, payload) =>
      request(`/jobs/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      }),

    // Close a job (soft‑delete via DELETE /api/jobs/:id)
    close: (id) =>
      request(`/jobs/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      })
  },

  health: {
    check: () => request('/health', { method: 'GET' })
  },

  // ==================== Resume API ====================
  resumes: {
    /** GET /api/resumes/my */
    getMyResume: () => request('/resumes/my', { method: 'GET' }),

    /** PUT /api/resumes/my */
    saveMyResume: (data) => request('/resumes/my', {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },

  // ==================== Applications API ====================
  applications: {
    /** POST /api/jobs/:jobId/apply */
    apply: (jobId, data = {}) =>
      request(`/jobs/${encodeURIComponent(jobId)}/apply`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    /** GET /api/applications/my */
    getMyApplications: (params = {}) => {
      const searchParams = new URLSearchParams();
      if (params.page !== undefined && params.page !== null && params.page !== '') {
        searchParams.append('page', params.page);
      }
      if (params.limit !== undefined && params.limit !== null && params.limit !== '') {
        searchParams.append('limit', params.limit);
      }
      const queryString = searchParams.toString();
      const endpoint = queryString ? `/applications/my?${queryString}` : '/applications/my';
      return request(endpoint, { method: 'GET' });
    },

    /** GET /api/applications/job/:jobId */
    getJobApplications: (jobId, params = {}) => {
      const searchParams = new URLSearchParams();
      if (params.page !== undefined && params.page !== null && params.page !== '') {
        searchParams.append('page', params.page);
      }
      if (params.limit !== undefined && params.limit !== null && params.limit !== '') {
        searchParams.append('limit', params.limit);
      }
      const queryString = searchParams.toString();
      const endpoint = queryString
        ? `/applications/job/${encodeURIComponent(jobId)}?${queryString}`
        : `/applications/job/${encodeURIComponent(jobId)}`;
      return request(endpoint, { method: 'GET' });
    },

    /** PATCH /api/applications/:applicationId/status */
    updateApplicationStatus: (applicationId, status) => {
      return request(`/applications/${encodeURIComponent(applicationId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    }
  }
};
