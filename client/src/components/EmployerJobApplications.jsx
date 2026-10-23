import React, { useState, useEffect } from 'react';
import { api } from '../api/api';

/**
 * Employer view of applications for a specific job.
 * Route: #employer/jobs/:jobId/applications
 */
export default function EmployerJobApplications() {
  // Derive jobId from URL hash
  const hash = window.location.hash.replace(/^#/, '');
  const parts = hash.split('/');
  const jobId = (parts.length >= 4 && parts[0] === 'employer' && parts[1] === 'jobs') ? parts[2] : null;

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [statusMap, setStatusMap] = useState({}); // appId -> selected status
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const [successIds, setSuccessIds] = useState(new Set());

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

  // Initial load and when jobId changes
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
  };

  const handleUpdate = async (app) => {
    const newStatus = statusMap[app._id];
    if (!newStatus || newStatus === app.status) return;
    setUpdatingIds(prev => new Set(prev).add(app._id));
    try {
      const resp = await api.applications.updateApplicationStatus(app._id, newStatus);
      setApplications(prev => prev.map(a => a._id === app._id ? resp.data.application : a));
      setStatusMap(prev => ({ ...prev, [app._id]: resp.data.application.status }));
      setSuccessIds(prev => new Set(prev).add(app._id));
      setTimeout(() => {
        setSuccessIds(prev => {
          const copy = new Set(prev);
          copy.delete(app._id);
          return copy;
        });
      }, 2000);
    } catch (err) {
      setStatusMap(prev => ({ ...prev, [app._id]: app.status }));
      alert(`Failed to update status: ${err.message}`);
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
      <div className="card placeholder-card">
        <h2>Job Applications</h2>
        <p>Unable to determine the Job ID from the URL.</p>
        <button type="button" className="btn btn-secondary" onClick={goBack}>← Back to My Jobs</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card loading-card">
        <div className="spinner large-spinner" />
        <h2>Loading Applications…</h2>
        <p className="subtitle">Fetching applications for this job.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card error-card">
        <h2>Unable to load applications</h2>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => fetchApplications(pagination.page)}>Retry</button>
        <button className="btn btn-secondary" onClick={goBack}>← Back to My Jobs</button>
      </div>
    );
  }

  if (!applications.length) {
    return (
      <div className="card empty-card">
        <h2>No Applications</h2>
        <p>No candidates have applied to this job yet.</p>
        <button className="btn btn-secondary" onClick={goBack}>← Back to My Jobs</button>
      </div>
    );
  }

  const { page, totalPages, total } = pagination;

  return (
    <div className="employer-applications-container">
      <h1 className="page-title">Job Applications</h1>
      <p className="job-id">Job ID: {jobId}</p>
      <div className="applications-grid">
        {applications.map(app => (
          <div key={app._id} className="application-card">
            <h3>{app.candidate?.name || 'Unnamed Candidate'}</h3>
            <p><strong>Email:</strong> {app.candidate?.email || 'N/A'}</p>
            <p><strong>Applied:</strong> {new Date(app.createdAt).toLocaleDateString()}</p>
            <p><strong>Cover Letter:</strong> {app.coverLetter ? app.coverLetter : <em>None</em>}</p>
            <p><strong>Status:</strong> <span className={`status-badge status-${app.status}`}>{
              {
                pending: 'Pending',
                reviewing: 'Under Review',
                accepted: 'Accepted',
                rejected: 'Rejected'
              }[app.status]
            }</span></p>
            <label htmlFor={`status-select-${app._id}`}>Change status:</label>
            <select
              id={`status-select-${app._id}`}
              value={statusMap[app._id] || ''}
              onChange={e => handleStatusChange(app._id, e.target.value)}
            >
              <option value="" disabled>Select new status</option>
              <option value="reviewing">Under Review</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              className="btn btn-primary btn-sm"
              disabled={updatingIds.has(app._id) || statusMap[app._id] === app.status || statusMap[app._id] === ''}
              onClick={() => handleUpdate(app)}
            >
              {updatingIds.has(app._id) ? 'Saving…' : 'Save'}
            </button>
            {successIds.has(app._id) && <span className="success-msg">Updated</span>}
          </div>
        ))}
      </div>
      <div className="pagination-controls">
        <button
          className="btn btn-secondary"
          disabled={page <= 1}
          onClick={() => fetchApplications(page - 1)}
        >Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button
          className="btn btn-secondary"
          disabled={page >= totalPages || totalPages === 0}
          onClick={() => fetchApplications(page + 1)}
        >Next</button>
        <span>Total: {total}</span>
      </div>
      <button type="button" className="btn btn-secondary" onClick={goBack}>← Back to My Jobs</button>
    </div>
  );
}
