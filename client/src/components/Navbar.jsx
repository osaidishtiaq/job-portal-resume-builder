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
            {/* Browse Jobs navigation */}
            <button
              type="button"
              className={`btn btn-sm ${currentView === 'jobs' || currentView.startsWith('jobs/') ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCurrentView('jobs')}
              id="jobs-nav-btn"
            >
              Browse Jobs
            </button>
            {/* Candidate-only Applications navigation */}
            {user?.role === 'candidate' && (
              <button
                type="button"
                className={`btn btn-sm ${currentView === 'applications/my' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCurrentView('applications/my')}
                id="my-applications-nav-btn"
              >
                My Applications
              </button>
            )}
            {/* Candidate-only Resume Builder navigation */}
            {user?.role === 'candidate' && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setCurrentView('resume')}
                id="resume-nav-btn"
              >
                Resume Builder
              </button>
            )}
            {/* Employer-only Post a Job navigation */}
{user?.role === 'employer' && (
  <>
    <button
      type="button"
      className="btn btn-primary btn-sm"
      onClick={() => setCurrentView('employer/jobs/new')}
      id="post-job-nav-btn"
    >
      Post a Job
    </button>
    <button
      type="button"
      className={`btn btn-sm ${currentView === 'employer/jobs' ? 'btn-primary' : 'btn-secondary'}`}
      onClick={() => setCurrentView('employer/jobs')}
      id="my-jobs-nav-btn"
    >
      My Jobs
    </button>
  </>
)}
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
              className={`nav-tab ${currentView === 'jobs' || currentView.startsWith('jobs/') ? 'active' : ''}`}
              onClick={() => setCurrentView('jobs')}
              id="jobs-nav-btn-public"
            >
              Browse Jobs
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
