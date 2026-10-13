import React, { useState, useEffect } from 'react';
import { api } from '../api/api';

export default function HealthCard() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.health.check();
      setHealthData(data);
    } catch (err) {
      setError(err.message || 'Failed to reach API server');
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    api.health.check()
      .then((data) => {
        if (isMounted) {
          setHealthData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to reach API server');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="card">
      <div className="header">
        <span className="title-badge">SYSTEM STATUS</span>
        <h2>API & Database Health</h2>
        <p className="subtitle">Real-time connectivity monitoring</p>
      </div>

      <div className="grid">
        <div className="info-box">
          <div className="info-title">React Client</div>
          <div className="info-value">
            <span className="status-dot online"></span> Vite Active
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
          <div className="info-title">MongoDB Atlas</div>
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
                <span
                  className={`status-dot ${
                    healthData?.database?.status === 'connected' ? 'online' : 'offline'
                  }`}
                ></span>
                {healthData?.database?.status || 'unknown'}
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3>Backend Health Check (/api/health)</h3>
        <button className="btn btn-secondary btn-sm" onClick={checkHealth} disabled={loading}>
          {loading ? 'Testing...' : 'Refresh Status'}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          ⚠️ <strong>Backend Error:</strong> {error}
        </div>
      )}

      {healthData && (
        <div>
          <div className="info-title">Health Response</div>
          <pre className="json-preview">
            {JSON.stringify(healthData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
