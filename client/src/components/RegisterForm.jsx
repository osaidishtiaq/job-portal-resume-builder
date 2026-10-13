import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';

export default function RegisterForm({ onSwitchToLogin }) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'candidate'
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleRoleSelect = (role) => {
    setFormData((prev) => ({ ...prev, role }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    const nameTrimmed = formData.name.trim();
    const emailTrimmed = formData.email.trim();

    // Client-side validations
    if (!nameTrimmed) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (nameTrimmed.length < 2 || nameTrimmed.length > 50) {
      setErrorMessage('Name must be between 2 and 50 characters.');
      return;
    }
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
      setErrorMessage('Please enter a password.');
      return;
    }
    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: nameTrimmed,
        email: emailTrimmed,
        password: formData.password,
        role: formData.role
      });
      // Session automatically set in AuthContext
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card form-card">
      <div className="form-header">
        <span className="title-badge">NEW ACCOUNT</span>
        <h2>Create an Account</h2>
        <p className="subtitle">Join as a Candidate or an Employer</p>
      </div>

      {errorMessage && (
        <div className="alert alert-error" role="alert">
          <span className="alert-icon">⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="auth-form">
        <div className="form-group">
          <label>I want to register as</label>
          <div className="role-selector" role="radiogroup" aria-label="Role selection">
            <button
              type="button"
              role="radio"
              aria-checked={formData.role === 'candidate'}
              className={`role-option ${formData.role === 'candidate' ? 'active' : ''}`}
              onClick={() => handleRoleSelect('candidate')}
              disabled={loading}
            >
              <div className="role-option-title">👤 Candidate</div>
              <div className="role-option-desc">Search jobs & build resumes</div>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={formData.role === 'employer'}
              className={`role-option ${formData.role === 'employer' ? 'active' : ''}`}
              onClick={() => handleRoleSelect('employer')}
              disabled={loading}
            >
              <div className="role-option-title">🏢 Employer</div>
              <div className="role-option-desc">Post jobs & hire talent</div>
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="reg-name">Full Name</label>
          <input
            id="reg-name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Alex Morgan"
            required
            autoComplete="name"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg-email">Email Address</label>
          <input
            id="reg-email"
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
          <label htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="At least 6 characters"
            required
            autoComplete="new-password"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={loading}
          id="register-submit-btn"
        >
          {loading ? (
            <>
              <span className="spinner"></span> Creating Account...
            </>
          ) : (
            `Register as ${formData.role === 'employer' ? 'Employer' : 'Candidate'}`
          )}
        </button>
      </form>

      <div className="form-footer">
        <span>Already have an account? </span>
        <button
          type="button"
          className="link-button"
          onClick={onSwitchToLogin}
          disabled={loading}
        >
          Sign in here
        </button>
      </div>
    </div>
  );
}
