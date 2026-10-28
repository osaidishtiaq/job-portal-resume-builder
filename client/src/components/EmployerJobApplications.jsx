import React, { useState, useEffect } from 'react';
import { api } from '../api/api';

const STATUS_LABELS = {
  pending: 'Pending',
  reviewing: 'Under Review',
  accepted: 'Accepted',
  rejected: 'Rejected'
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

/**
 * Employer view of applications for a specific job.
 * Route: #employer/jobs/:jobId/applications
 */
export default function EmployerJobApplications() {
  // Derive jobId from URL hash
  const hash = window.location.hash.replace(/^#/, '');
  const parts = hash.split('/');
  const jobId = (parts.length >= 4 && parts[0] === 'employer' && parts[1] === 'jobs') ? parts[2] : null;

  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [statusMap, setStatusMap] = useState({}); // appId -> selected status
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const [successIds, setSuccessIds] = useState(new Set());
  const [errorMap, setErrorMap] = useState({}); // appId -> error message

  const fetchApplications = async (page = pagination.page) => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await api.applications.getJobApplications(jobId, { page, limit: 10 });
      setApplications(resp.data || []);
      setPagination(resp.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
      const initMap = {};
      (resp.data || []).forEach(app => { initMap[app._id] = app.status; });
      setStatusMap(initMap);
    } catch (err) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  // Fetch job metadata for title display in header
  useEffect(() => {
    let active = true;
    const loadJobDetails = async () => {
      if (!jobId) return;
      try {
        const data = await api.jobs.getMyJobs();
        const foundJob = data?.data?.jobs?.find(j => (j._id ?? j.id) === jobId);
        if (active && foundJob) {
          setJob(foundJob);
        }
      } catch (err) {
        console.warn('Could not fetch job metadata for applications view:', err);
      }
    };
    loadJobDetails();
    return () => { active = false; };
  }, [jobId]);

  // Initial applications load and when jobId changes
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!jobId) return;
      setLoading(true);
      setError(null);
      try {
        const resp = await api.applications.getJobApplications(jobId, { page: 1, limit: 10 });
        if (!active) return;
        setApplications(resp.data || []);
        setPagination(resp.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
        const initMap = {};
        (resp.data || []).forEach(app => { initMap[app._id] = app.status; });
        setStatusMap(initMap);
      } catch (err) {
        if (active) setError(err.message || 'Failed to load applications');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [jobId]);

  const handleStatusChange = (appId, newStatus) => {
    setStatusMap(prev => ({ ...prev, [appId]: newStatus }));
    // Clear any previous error when user picks a new option
    setErrorMap(prev => {
      const copy = { ...prev };
      delete copy[appId];
      return copy;
    });
  };

  const handleUpdate = async (app) => {
    const newStatus = statusMap[app._id];
    if (!newStatus || newStatus === app.status) return;
    setUpdatingIds(prev => new Set(prev).add(app._id));
    setErrorMap(prev => {
      const copy = { ...prev };
      delete copy[app._id];
      return copy;
    });

    try {
      const resp = await api.applications.updateApplicationStatus(app._id, newStatus);
      const updatedApp = resp.data?.application || { ...app, status: newStatus };
      setApplications(prev => prev.map(a => a._id === app._id ? updatedApp : a));
      setStatusMap(prev => ({ ...prev, [app._id]: updatedApp.status }));
      setSuccessIds(prev => new Set(prev).add(app._id));
      setTimeout(() => {
        setSuccessIds(prev => {
          const copy = new Set(prev);
          copy.delete(app._id);
          return copy;
        });
      }, 3000);
    } catch (err) {
      setStatusMap(prev => ({ ...prev, [app._id]: app.status }));
      setErrorMap(prev => ({ ...prev, [app._id]: err.message || 'Failed to update application status' }));
    } finally {
      setUpdatingIds(prev => {
        const copy = new Set(prev);
        copy.delete(app._id);
        return copy;
      });
    }
  };

  const goBack = () => {
    window.location.hash = 'employer/jobs';
  };

  if (!jobId) {
    return (
      <div className="card placeholder-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h2>Review Applications</h2>
        <p className="subtitle" style={{ margin: '12px 0 20px 0' }}>
          Unable to determine the Job ID from the URL.
        </p>
        <button type="button" className="btn btn-secondary" onClick={goBack}>
          ← Back to My Jobs
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card loading-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="spinner large-spinner" />
        <h2>Loading Applications…</h2>
        <p className="subtitle">Fetching candidate submissions for this job.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card error-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h2>Unable to Load Applications</h2>
        <div className="alert alert-error" role="alert" style={{ margin: '16px 0' }}>
          <span className="alert-icon">⚠️</span> {error}
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={() => fetchApplications(pagination.page)}>
            Retry
          </button>
          <button type="button" className="btn btn-secondary" onClick={goBack}>
            ← Back to My Jobs
          </button>
        </div>
      </div>
    );
  }

  if (!applications.length) {
    return (
      <div className="card empty-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="employer-applications-header" style={{ marginBottom: '20px' }}>
          <div className="header-top-row">
            <button type="button" className="btn btn-secondary btn-sm" onClick={goBack} id="back-to-my-jobs-btn">
              ← Back to My Jobs
            </button>
            <span className="title-badge" id="total-applications-badge">0 Applications</span>
          </div>
          <div className="header-title-section">
            <h1 className="applications-page-title">Review Applications</h1>
            {job?.title && (
              <p className="applications-subtitle">
                Position: <strong className="job-title-highlight">{job.title}</strong>
                {job.company ? ` • ${job.company}` : ''}
              </p>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📬</div>
          <h2 style={{ fontSize: '1.35rem', marginBottom: '8px' }}>No Applications Yet</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 20px auto', fontSize: '0.95rem' }}>
            No candidates have submitted an application for this job posting yet.
          </p>
          <button type="button" className="btn btn-secondary" onClick={goBack}>
            ← Back to My Jobs
          </button>
        </div>
      </div>
    );
  }

  const { page, totalPages, total } = pagination;

  return (
    <div className="card employer-applications-card">
      {/* Page Header */}
      <div className="employer-applications-header">
        <div className="header-top-row">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={goBack}
            id="back-to-my-jobs-btn"
          >
            ← Back to My Jobs
          </button>
          <span className="title-badge" id="total-applications-badge">
            {total} Application{total === 1 ? '' : 's'}
          </span>
        </div>

        <div className="header-title-section">
          <h1 className="applications-page-title">Review Applications</h1>
          {job?.title ? (
            <p className="applications-subtitle">
              Position: <strong className="job-title-highlight">{job.title}</strong>
              {job.company ? ` • ${job.company}` : ''}
              {job.location ? ` (${job.location})` : ''}
            </p>
          ) : (
            <p className="applications-subtitle">
              Review candidate submissions and update hiring status.
            </p>
          )}
        </div>
      </div>

      {/* Applicant Cards List */}
      <div className="applications-list-wrapper">
        {applications.map(app => {
          const isUpdating = updatingIds.has(app._id);
          const isSuccess = successIds.has(app._id);
          const cardError = errorMap[app._id];
          const selectedStatus = statusMap[app._id] || app.status;
          const isChanged = selectedStatus !== app.status && selectedStatus !== 'pending' && selectedStatus !== '';

          return (
            <div key={app._id} className="applicant-review-card" id={`applicant-card-${app._id}`}>
              {/* Applicant Header */}
              <div className="applicant-card-header">
                <div className="applicant-info-block">
                  <h3 className="applicant-name">{app.candidate?.name || 'Unnamed Candidate'}</h3>
                  <div className="applicant-meta-row">
                    <span className="applicant-email">
                      ✉ {app.candidate?.email || 'N/A'}
                    </span>
                    <span className="applicant-date">
                      📅 Applied {formatDate(app.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="applicant-current-status">
                  <span className={`status-badge status-${app.status}`}>
                    {STATUS_LABELS[app.status] || app.status}
                  </span>
                </div>
              </div>

              {/* Cover Letter Box */}
              <div className="applicant-cover-letter-box">
                <div className="cover-letter-title">Cover Letter</div>
                {app.coverLetter && app.coverLetter.trim() ? (
                  <p className="cover-letter-text">{app.coverLetter}</p>
                ) : (
                  <p className="cover-letter-empty">No cover letter was submitted with this application.</p>
                )}
              </div>

              {/* Status Controls Bar */}
              <div className="applicant-status-control-bar">
                <div className="status-control-group">
                  <label htmlFor={`status-select-${app._id}`} className="status-control-label">
                    Update Status:
                  </label>
                  <div className="status-select-wrap">
                    <select
                      id={`status-select-${app._id}`}
                      className="status-dropdown"
                      value={selectedStatus}
                      onChange={e => handleStatusChange(app._id, e.target.value)}
                      disabled={isUpdating}
                    >
                      {app.status === 'pending' && (
                        <option value="pending" disabled>
                          Pending (Initial)
                        </option>
                      )}
                      <option value="reviewing">Under Review</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm save-status-btn"
                      id={`save-status-${app._id}`}
                      disabled={isUpdating || !isChanged}
                      onClick={() => handleUpdate(app)}
                    >
                      {isUpdating ? (
                        <>
                          <span className="spinner" style={{ width: '12px', height: '12px' }} />
                          <span>Saving…</span>
                        </>
                      ) : (
                        'Save'
                      )}
                    </button>
                  </div>
                </div>

                {/* Status Feedback */}
                {isSuccess && (
                  <div className="status-feedback-badge success">
                    ✓ Status updated to {STATUS_LABELS[app.status] || app.status}
                  </div>
                )}
                {cardError && (
                  <div className="status-feedback-badge error">
                    ⚠️ {cardError}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Bar */}
      <div className="pagination-bar">
        <div className="pagination-info">
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Page <strong>{page}</strong> of <strong>{Math.max(totalPages, 1)}</strong>
            <span> ({total} total application{total === 1 ? '' : 's'})</span>
          </span>
        </div>
        <div className="pagination-buttons">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page <= 1 || loading}
            onClick={() => fetchApplications(page - 1)}
            id="prev-page-btn"
          >
            ← Previous
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page >= totalPages || totalPages === 0 || loading}
            onClick={() => fetchApplications(page + 1)}
            id="next-page-btn"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
