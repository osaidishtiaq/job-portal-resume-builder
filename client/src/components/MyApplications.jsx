import React, { useEffect, useState } from 'react';
import { api } from '../api/api';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    className: 'status-badge status-pending'
  },
  reviewing: {
    label: 'Under Review',
    className: 'status-badge status-reviewing'
  },
  accepted: {
    label: 'Accepted',
    className: 'status-badge status-accepted'
  },
  rejected: {
    label: 'Rejected',
    className: 'status-badge status-rejected'
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'Date unknown';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Date unknown';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Date unknown';
  }
};

const getStatusInfo = (status) => {
  if (status && STATUS_CONFIG[status]) {
    return STATUS_CONFIG[status];
  }
  return {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown',
    className: 'status-badge'
  };
};

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const navigateTo = (hash) => {
    const url = new URL(window.location.href);
    url.hash = hash;
    window.location.assign(url);
  };

  useEffect(() => {
    let cancelled = false;

    api.applications
      .getMyApplications({ page, limit: 10 })
      .then((res) => {
        if (!cancelled) {
          const apps = Array.isArray(res?.data) ? res.data : [];
          setApplications(apps);
          if (res?.pagination) {
            setPagination({
              page: Number(res.pagination.page) || page,
              limit: Number(res.pagination.limit) || 10,
              total: Number(res.pagination.total) || 0,
              totalPages: Number(res.pagination.totalPages) || 0
            });
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const status = err.status || 0;
          setErrorCode(status);
          if (status === 401) {
            setError('Your session has expired. Please sign in again to view your applications.');
          } else if (status === 403) {
            setError('Access forbidden: Only candidate accounts can view submitted applications.');
          } else if (status === 0 || err.message?.includes('Network error')) {
            setError('Network error: Unable to connect to backend server. Please check your connection and try again.');
          } else {
            setError(err.message || 'Failed to load applications.');
          }
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [page, retryTrigger]);

  const handlePrev = () => {
    if (page > 1 && !loading) {
      setLoading(true);
      setError(null);
      setErrorCode(null);
      setPage((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (page < pagination.totalPages && !loading) {
      setLoading(true);
      setError(null);
      setErrorCode(null);
      setPage((prev) => prev + 1);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setRetryTrigger((prev) => prev + 1);
  };

  if (loading && applications.length === 0) {
    return (
      <div className="card loading-card">
        <div className="spinner large-spinner"></div>
        <h2>Loading Applications...</h2>
        <p className="subtitle">Retrieving your job application history</p>
      </div>
    );
  }

  if (error && applications.length === 0) {
    return (
      <div className="card error-card" style={{ maxWidth: '650px', margin: '0 auto', textAlign: 'center' }}>
        <h2>Unable to Load Applications</h2>
        <p style={{ margin: '12px 0 24px 0', color: 'var(--text-secondary)' }}>
          {error}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {errorCode === 401 ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => navigateTo('login')}
              id="sign-in-btn"
            >
              Sign In as Candidate
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleRetry}
              id="retry-btn"
            >
              Retry
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigateTo('dashboard')}
            id="back-to-dashboard-btn"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="card empty-applications-card" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', padding: '48px 24px' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            color: 'var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            margin: '0 auto 16px auto',
            border: '1px solid rgba(56, 189, 248, 0.3)'
          }}
        >
          📄
        </div>
        <h2 style={{ marginBottom: '8px' }}>No Applications Yet</h2>
        <p className="subtitle" style={{ maxWidth: '460px', margin: '0 auto 24px auto' }}>
          You have not applied for any jobs yet. Explore active job openings and submit your first application.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigateTo('jobs')}
            id="browse-jobs-empty-btn"
          >
            Browse Jobs
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigateTo('dashboard')}
            id="back-to-dashboard-empty-btn"
          >
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card candidate-applications-card" style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div className="dashboard-header" style={{ marginBottom: '20px' }}>
        <div>
          <span className="title-badge">CANDIDATE PORTAL</span>
          <h2>My Applications</h2>
          <p className="subtitle">Track the status of your submitted job applications</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigateTo('jobs')}
            id="browse-more-jobs-top-btn"
          >
            Browse Jobs
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigateTo('dashboard')}
            id="back-to-dashboard-top-btn"
          >
            Dashboard
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: '16px' }}>
          <span className="alert-icon">⚠️</span>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span>{error}</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleRetry}
              style={{ padding: '4px 10px', fontSize: '0.8rem' }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></span>
          <span>Updating application list...</span>
        </div>
      )}

      <div className="applications-list">
        {applications.map((application) => {
          const job = application.job;
          const isDeletedJob = !job;
          const isClosedJob = job && job.status === 'closed';
          const statusInfo = getStatusInfo(application.status);

          return (
            <div key={application._id} className="application-item-card">
              <div className="application-item-header">
                <div>
                  {isDeletedJob ? (
                    <div>
                      <h3 className="application-job-title" style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        Job no longer available
                      </h3>
                      <p className="subtitle" style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#f87171' }}>
                        This job was removed by the employer
                      </p>
                    </div>
                  ) : (
                    <div>
                      <h3 className="application-job-title">
                        {job.title}
                      </h3>
                      <p className="subtitle" style={{ margin: '4px 0 0 0', fontSize: '0.95rem' }}>
                        {job.company} {job.location ? `— ${job.location}` : ''}
                      </p>
                    </div>
                  )}
                </div>

                <div className="application-status-wrap">
                  <span className={statusInfo.className} id={`status-${application._id}`}>
                    {statusInfo.label}
                  </span>
                  {isClosedJob && (
                    <span className="badge-closed" title="This job listing is closed for new applicants">
                      Listing Closed
                    </span>
                  )}
                </div>
              </div>

              <div className="application-meta-row">
                {!isDeletedJob && (
                  <div className="application-badges">
                    {job.jobType && <span className="badge-meta">{job.jobType}</span>}
                    {job.workplaceMode && <span className="badge-meta">{job.workplaceMode}</span>}
                  </div>
                )}
                <div className="application-date-wrap">
                  <span className="application-date">
                    Applied on {formatDate(application.createdAt)}
                  </span>
                </div>
              </div>

              {!isDeletedJob && (
                <div className="application-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigateTo(`jobs/${job._id}`)}
                    id={`view-job-${application._id}`}
                  >
                    View Job Details →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pagination.total > 0 && (
        <div className="pagination-bar">
          <div className="pagination-info">
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Page <strong>{pagination.page}</strong> of <strong>{Math.max(pagination.totalPages, 1)}</strong> ({pagination.total} application{pagination.total === 1 ? '' : 's'})
            </span>
          </div>
          <div className="pagination-buttons">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handlePrev}
              disabled={page <= 1 || loading}
              id="prev-page-btn"
            >
              ← Previous
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleNext}
              disabled={page >= pagination.totalPages || pagination.totalPages === 0 || loading}
              id="next-page-btn"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
