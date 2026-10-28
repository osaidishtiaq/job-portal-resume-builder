import React, { useState } from 'react';
import { api } from '../api/api';

export default function ResetPassword({ token: propToken, onSwitchToLogin }) {
  // Extract token from prop or from hash query string
  const token = propToken || (() => {
    try {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash.includes('?')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        return params.get('token') || '';
      }
      if (hash.includes('/')) {
        return hash.split('/')[1] || '';
      }
    } catch {
      return '';
    }
    return '';
  })();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleBackToLogin = () => {
    if (onSwitchToLogin) {
      onSwitchToLogin();
    } else {
      window.location.hash = 'login';
    }
  };

  const handleRequestNewLink = () => {
    window.location.hash = 'forgot-password';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage('Reset token is missing or malformed. Please request a new password reset link.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter a new password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your new password.');
      return;
    }

    setLoading(true);
    try {
      await api.auth.resetPassword({ token, password });
      setSuccess(true);
    } catch (err) {
      setErrorMessage(
        err.message || 'Password reset link is invalid or has expired. Please request a new link.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card form-card">
      <div className="form-header">
        <span className="title-badge">ACCOUNT RECOVERY</span>
        <h2>Reset Password</h2>
        <p className="subtitle">Choose a new, strong password for your account</p>
      </div>

      {errorMessage && (
        <div className="alert alert-error" role="alert">
          <span className="alert-icon">⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {!token ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            No password reset token was provided in the URL.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={handleRequestNewLink}
          >
            Request New Reset Link
          </button>
        </div>
      ) : success ? (
        <div className="form-success-state" style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✅</div>
          <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>Password Reset Complete</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
            Your password has been successfully updated. All previous sessions have been invalidated for your security.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={handleBackToLogin}
          >
            Sign In with New Password
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="auth-form">
          <div className="form-group">
            <label htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="At least 6 characters"
              required
              autoComplete="new-password"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Confirm New Password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Re-enter your new password"
              required
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            id="reset-submit-btn"
          >
            {loading ? (
              <>
                <span className="spinner"></span> Updating Password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>
      )}

      <div className="form-footer" style={{ marginTop: '20px' }}>
        <span>Remembered your credentials? </span>
        <button
          type="button"
          className="link-button"
          onClick={handleBackToLogin}
          disabled={loading}
        >
          Back to Sign In
        </button>
      </div>
    </div>
  );
}
