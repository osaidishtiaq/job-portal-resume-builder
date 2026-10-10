import React, { useState, useEffect } from 'react';

function App() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);

    // Endpoints to try: relative URL (via Vite proxy), then direct IPv4, then direct localhost
    const endpoints = [
      '/api/health',
      'http://127.0.0.1:5000/api/health',
      'http://localhost:5000/api/health'
    ];

    let lastErr = null;
    for (const url of endpoints) {
      try {
        const response = await fetch(url, { credentials: 'omit' });
        if (response.ok) {
          const data = await response.json();
          setHealthData(data);
          setError(null);
          setLoading(false);
          return;
        }
      } catch (err) {
        lastErr = err;
      }
    }

    setError(lastErr ? lastErr.message : 'Unable to connect to backend server');
    setHealthData(null);
    setLoading(false);
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <span className="title-badge">DAY 1 - FOUNDATION SETUP</span>
          <h1>Job Portal with Resume Builder</h1>
          <p className="subtitle">MERN Stack Internship Project Base Architecture</p>
        </div>

        <div className="grid">
          <div className="info-box">
            <div className="info-title">React Frontend</div>
            <div className="info-value">
              <span className="status-dot online"></span> Running (Vite)
            </div>
          </div>

          <div className="info-box">
            <div className="info-title">Express API Server</div>
            <div className="info-value">
              {loading ? (
                <>
                  <span className="status-dot loading"></span> Checking...
                </>
              ) : error ? (
                <>
                  <span className="status-dot offline"></span> Offline
                </>
              ) : (
                <>
                  <span className="status-dot online"></span> {healthData?.status || 'Online'}
                </>
              )}
            </div>
          </div>

          <div className="info-box">
            <div className="info-title">MongoDB Connection</div>
            <div className="info-value">
              {loading ? (
                <>
                  <span className="status-dot loading"></span> Checking...
                </>
              ) : error ? (
                <>
                  <span className="status-dot offline"></span> Disconnected
                </>
              ) : (
                <>
                  <span className={`status-dot ${healthData?.database?.status === 'connected' ? 'online' : 'offline'}`}></span>
                  {healthData?.database?.status || 'unknown'}
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3>Backend Health Check (/api/health)</h3>
          <button className="btn" onClick={checkHealth} disabled={loading}>
            {loading ? 'Testing...' : 'Re-check Connection'}
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '16px' }}>
            ⚠️ <strong>Backend Connection Failed:</strong> {error}. Make sure server is running on <code>http://localhost:5000</code>.
          </div>
        )}

        {healthData && (
          <div>
            <div className="info-title">Response Payload</div>
            <pre className="json-preview">
              {JSON.stringify(healthData, null, 2)}
            </pre>
          </div>
        )}

        <div className="footer-note">
          Day 1 Architecture Verified: Monorepo Clean Layout | React + Express + Mongoose | CORS Enabled
        </div>
      </div>
    </div>
  );
}

export default App;
