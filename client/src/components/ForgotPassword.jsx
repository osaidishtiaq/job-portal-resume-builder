import React, { useState } from 'react';
import { api } from '../api/api';

export default function ForgotPassword({ onSwitchToLogin }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await api.auth.forgotPassword(emailTrimmed);
      setSubmitted(true);
    } catch (err) {
      setErrorMessage(err.message || 'Unable to request password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    if (onSwitchToLogin) {
      onSwitchToLogin();
    } else {
      window.location.hash = 'login';
    }
  };

  return (
    <div className="card form-card">
      <div className="form-header">
        <span className="title-badge">ACCOUNT SECURITY</span>
        <h2>Forgot Password</h2>
        <p className="subtitle">
          Enter your email address and we will send you a link to reset your password.
        </p>
      </div>

      {errorMessage && (
        <div className="alert alert-error" role="alert">
          <span className="alert-icon">⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {submitted ? (
        <div className="form-success-state" style={{ textAlign: 'center', padding: '16px 0' }}>
          <div
            style={{
              fontSize: '2.5rem',
              marginBottom: '12px'
            }}
          >
            ✉️
          </div>
          <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>Check Your Email</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
            If an account with that email exists, a password reset link has been sent.
            Please check your inbox (and spam folder) and follow the instructions to reset your password.
            The link will expire in 20 minutes.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={handleBackToLogin}
          >
            Back to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="auth-form">
          <div className="form-group">
            <label htmlFor="forgot-email">Email Address</label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="you@example.com"
              required
              autoComplete="email"
              disabled={loading}
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            id="forgot-submit-btn"
          >
            {loading ? (
              <>
                <span className="spinner"></span> Sending Reset Link...
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>
      )}

      <div className="form-footer" style={{ marginTop: '20px' }}>
        <span>Remember your password? </span>
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
