import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { api } from '../api/api';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [verifying, setVerifying] = useState(false);
  const [profileResult, setProfileResult] = useState(null);
  const [profileError, setProfileError] = useState(null);

  const handleVerifySession = async () => {
    setVerifying(true);
    setProfileError(null);
    try {
      const data = await api.auth.getMe();
      setProfileResult(data);
    } catch (err) {
      setProfileError(err.message || 'Failed to verify session');
    } finally {
      setVerifying(false);
    }
  };

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Recently';

  return (
    <div className="card dashboard-card">
      <div className="dashboard-header">
        <div>
          <span className="title-badge">AUTHENTICATED SESSION</span>
          <h2>Welcome, {user?.name}!</h2>
          <p className="subtitle">You are successfully logged in via JWT authentication</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={logout}>
          Sign Out
        </button>
      </div>

      <div className="grid">
        <div className="info-box">
          <div className="info-title">Account Role</div>
          <div className="info-value">
            <span className={`role-badge role-${user?.role || 'candidate'}`}>
              {user?.role?.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="info-box">
          <div className="info-title">Registered Email</div>
          <div className="info-value text-truncate" title={user?.email}>
            {user?.email}
          </div>
        </div>

        <div className="info-box">
          <div className="info-title">Member Since</div>
          <div className="info-value">{formattedDate}</div>
        </div>

        <div className="info-box">
          <div className="info-title">Database ID</div>
          <div className="info-value text-mono text-truncate" title={user?.id}>
            {user?.id}
          </div>
        </div>
      </div>

      {user?.role === 'employer' ? (
        <div className="role-banner employer-banner">
          <div className="banner-icon">🏢</div>
          <div>
            <h4>Employer Portal</h4>
            <p>
              In upcoming milestones, you will be able to publish job listings, view applications,
              and manage candidates.
            </p>
          </div>
        </div>
      ) : (
        <div className="role-banner candidate-banner">
          <div className="banner-icon">💼</div>
          <div>
            <h4>Candidate Portal</h4>
            <p>
              In upcoming milestones, you will be able to search jobs, create professional resumes,
              and track job applications.
            </p>
          </div>
        </div>
      )}

      <div className="session-verification-section">
        <div className="section-header-inline">
          <div>
            <h3>Verify Authenticated API Call</h3>
            <p className="section-subtext">
              Calls <code>GET /api/auth/me</code> with <code>Authorization: Bearer &lt;token&gt;</code> to verify JWT validation.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleVerifySession}
            disabled={verifying}
          >
            {verifying ? 'Checking...' : 'Test GET /api/auth/me'}
          </button>
        </div>

        {profileError && (
          <div className="alert alert-error" role="alert">
            <span className="alert-icon">⚠️</span>
            <span>{profileError}</span>
          </div>
        )}

        {profileResult && (
          <div>
            <div className="info-title" style={{ marginTop: '12px' }}>
              Live Server Response (200 OK)
            </div>
            <pre className="json-preview">
              {JSON.stringify(profileResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="footer-note">
        Session active: JWT token stored in sessionStorage and validated against MongoDB on every request.
      </div>
    </div>
  );
}
