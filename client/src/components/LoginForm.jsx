import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';

export default function LoginForm({ onSwitchToRegister }) {
  const { login, authError, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
    if (authError && clearError) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    if (clearError) clearError();

    const emailTrimmed = formData.email.trim();
    if (!emailTrimmed) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!formData.password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      await login(emailTrimmed, formData.password);
      // Auth state updates in context; parent view will automatically transition
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const displayError = errorMessage || authError;

  return (
    <div className="card form-card">
      <div className="form-header">
        <span className="title-badge">AUTHENTICATION</span>
        <h2>Welcome Back</h2>
        <p className="subtitle">Sign in to your account to continue</p>
      </div>

      {displayError && (
        <div className="alert alert-error" role="alert">
          <span className="alert-icon">⚠️</span>
          <span>{displayError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="auth-form">
        <div className="form-group">
          <label htmlFor="login-email">Email Address</label>
          <input
            id="login-email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
            autoComplete="email"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={loading}
          id="login-submit-btn"
        >
          {loading ? (
            <>
              <span className="spinner"></span> Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <div className="form-footer">
        <span>Don't have an account? </span>
        <button
          type="button"
          className="link-button"
          onClick={onSwitchToRegister}
          disabled={loading}
        >
          Create an account
        </button>
      </div>
    </div>
  );
}
