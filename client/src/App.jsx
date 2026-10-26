import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import Profile from './components/Profile';

import Navbar from './components/Navbar';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Dashboard from './components/Dashboard';
import HealthCard from './components/HealthCard';
import ResumeBuilder from './components/ResumeBuilder';
import JobList from './components/JobList';
import JobDetail from './components/JobDetail';
import JobPublishForm from './components/JobPublishForm';
import JobApplicationForm from './components/JobApplicationForm';
import MyApplications from './components/MyApplications';
import EmployerMyJobs from './components/EmployerMyJobs';
import EmployerJobApplications from './components/EmployerJobApplications';

const knownRoutes = [
  'login',
  'register',
  'dashboard',
  'profile',
  'resume',
  'jobs',
  'employer/jobs',
  'employer/jobs/new',
  'applications/my',
];

function isEmployerApplicationsRoute(view) {
  return /^employer\/jobs\/[^/]+\/applications$/.test(view);
}

function isValidRoute(view) {
  return (
    knownRoutes.includes(view) ||
    /^jobs\/[^/]+(?:\/apply)?$/.test(view) ||
    isEmployerApplicationsRoute(view)
  );
}

function MainApp() {
  const { user, isAuthenticated, loading } = useAuth();

  const [currentView, setCurrentView] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return isValidRoute(hash) ? hash : 'login';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (isValidRoute(hash)) {
        setCurrentView(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const changeView = (view) => {
    setCurrentView(view);
    window.location.hash = view;
  };

  let activeView = currentView;

  const isEmployerRoute =
    currentView === 'employer/jobs' ||
    currentView === 'employer/jobs/new' ||
    isEmployerApplicationsRoute(currentView);

  const isCandidateRoute =
    currentView === 'resume' ||
    currentView === 'applications/my' ||
    /^jobs\/[^/]+\/apply$/.test(currentView);

  if (!loading) {
    if (isAuthenticated && (currentView === 'login' || currentView === 'register')) {
      activeView = 'dashboard';
    } else if (
      !isAuthenticated &&
      (currentView === 'dashboard' || isEmployerRoute || isCandidateRoute)
    ) {
      activeView = 'login';
    } else if (isAuthenticated && isEmployerRoute && user?.role !== 'employer') {
      activeView = 'dashboard';
    } else if (isAuthenticated && isCandidateRoute && user?.role !== 'candidate') {
      if (currentView.endsWith('/apply')) {
        activeView = currentView.replace(/\/apply$/, '');
      } else {
        activeView = 'dashboard';
      }
    }
  }

  useEffect(() => {
    if (loading) return;
    const targetHash = `#${activeView}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = activeView;
    }
  }, [loading, activeView]);

  if (loading) {
    return (
      <div className="container app-container">
        <div className="card loading-card">
          <div className="spinner large-spinner"></div>
          <h2>Restoring Session...</h2>
          <p className="subtitle">Verifying authentication token with backend</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container app-container">
      <Navbar currentView={activeView} setCurrentView={changeView} />
      <main className="main-content">
        {isAuthenticated ? (
          activeView === 'resume' ? (
            <ResumeBuilder />
          ) : activeView === 'employer/jobs/new' ? (
            <JobPublishForm />
          ) : activeView === 'employer/jobs' ? (
            <EmployerMyJobs />
          ) : isEmployerApplicationsRoute(activeView) ? (
            <EmployerJobApplications />
          ) : activeView === 'applications/my' ? (
            <MyApplications />
          ) : activeView === 'health' ? (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => changeView('dashboard')}
                >
                  ← Back to Dashboard
                </button>
              </div>
              <HealthCard />
            </div>
          ) : activeView === 'jobs' ? (
            <JobList />
          ) : /^jobs\/[^/]+\/apply$/.test(activeView) ? (
            <JobApplicationForm />
          ) : activeView.startsWith('jobs/') ? (
            <JobDetail />
          ) : activeView === 'profile' ? (
            <Profile />
          ) : (
            <Dashboard />
          )
        ) : (
          <>
            {activeView === 'register' && (
              <RegisterForm onSwitchToLogin={() => changeView('login')} />
            )}
            {activeView === 'login' && (
              <LoginForm onSwitchToRegister={() => changeView('register')} />
            )}
            {activeView === 'health' && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => changeView('login')}
                  >
                    ← Back to Sign In
                  </button>
                </div>
                <HealthCard />
              </div>
            )}
            {activeView === 'jobs' && <JobList />}
            {/^jobs\/[^/]+$/.test(activeView) && <JobDetail />}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
