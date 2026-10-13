import React from 'react';
import { useAuth } from '../context/useAuth';

export default function Navbar({ currentView, setCurrentView }) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-brand" onClick={() => setCurrentView(isAuthenticated ? 'dashboard' : 'login')}>
        <span className="brand-badge">DAY 6</span>
        <span className="brand-title">Job Portal</span>
      </div>

      <nav className="navbar-actions">
        {isAuthenticated ? (
          <div className="navbar-user-info">
            <span className="user-greeting">
              Signed in as <strong>{user?.name}</strong>
            </span>
            <span className={`role-badge role-${user?.role || 'candidate'}`}>
              {user?.role}
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={logout}
              id="logout-btn"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="navbar-nav-links">
            <button
              type="button"
              className={`nav-tab ${currentView === 'login' ? 'active' : ''}`}
              onClick={() => setCurrentView('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`nav-tab ${currentView === 'register' ? 'active' : ''}`}
              onClick={() => setCurrentView('register')}
            >
              Register
            </button>
            <button
              type="button"
              className={`nav-tab ${currentView === 'health' ? 'active' : ''}`}
              onClick={() => setCurrentView('health')}
            >
              API Health
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}
