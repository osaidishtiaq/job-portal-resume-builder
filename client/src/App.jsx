import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import Navbar from './components/Navbar';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Dashboard from './components/Dashboard';
import HealthCard from './components/HealthCard';

function MainApp() {
  const { isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState(() => {
    // Support URL hash routing (#login, #register, #dashboard, #health)
    const hash = window.location.hash.replace('#', '');
    return ['login', 'register', 'dashboard', 'health'].includes(hash) ? hash : 'login';
  });

  // Keep URL hash in sync with view
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['login', 'register', 'dashboard', 'health'].includes(hash)) {
        setCurrentView(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const changeView = (view) => {
    setCurrentView(view);
    window.location.hash = view;
  };

  // Derive effective view based on authentication state
  let activeView = currentView;
  if (!loading) {
    if (isAuthenticated && (currentView === 'login' || currentView === 'register')) {
      activeView = 'dashboard';
    } else if (!isAuthenticated && currentView === 'dashboard') {
      activeView = 'login';
    }
  }

  // Synchronize browser URL hash with derived active view
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
          <>
            {activeView === 'health' ? (
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
            ) : (
              <Dashboard />
            )}
          </>
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
