import React, { useState, useEffect } from 'react';
import { api } from '../api/api';

export default function EmployerMyJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.jobs.getMyJobs();
      // API returns { status, results, data: { jobs } }
      setJobs(data?.data?.jobs || []);
    } catch (err) {
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.jobs.getMyJobs();
        if (active) {
          setJobs(data?.data?.jobs || []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to load jobs');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="card loading-card">
        <div className="spinner large-spinner" />
        <h2>Loading My Jobs…</h2>
        <p className="subtitle">Fetching your posted jobs from the server.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card error-card">
        <h2>Unable to load jobs</h2>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={fetchJobs} id="retry-jobs-btn">
          Retry
        </button>
      </div>
    );
  }

  if (!jobs.length) {
    return (
      <div className="card empty-card">
        <h2>No Jobs Posted</h2>
        <p>You haven't posted any jobs yet. Use the "Post a Job" button in the navigation bar to create one.</p>
      </div>
    );
  }

  return (
    <div className="employer-jobs-container">
      <h1 className="page-title">My Jobs</h1>
      <div className="jobs-grid">
        {jobs.map((job) => (
          <div key={job._id} className="job-card">
            <h3>{job.title}</h3>
            <p><strong>Company:</strong> {job.company}</p>
            <p><strong>Location:</strong> {job.location}</p>
            <p><strong>Type:</strong> {job.jobType}</p>
            <p><strong>Workplace:</strong> {job.workplaceMode}</p>
            <p><strong>Status:</strong> {job.status}</p>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => (window.location.hash = `employer/jobs/${job._id}/applications`)}
              id={`review-applications-${job._id}`}
            >
              Review Applications
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => (window.location.hash = `employer/jobs/${job._id}/edit`)}
              id={`edit-job-${job._id}`}
              style={{ marginLeft: '8px' }}
            >
              Edit
            </button>
            {job.status === 'active' ? (
              <button
                className="btn btn-danger btn-sm"
                onClick={async () => {
                  if (!window.confirm('Are you sure you want to close this job?')) return;
                  setActionLoadingId(job._id);
                  try {
                    await api.jobs.close(job._id);
                    await fetchJobs();
                  } catch (e) {
                    alert('Failed to close job: ' + e.message);
                  } finally {
                    setActionLoadingId(null);
                  }
                }}
                id={`close-job-${job._id}`}
                style={{ marginLeft: '8px' }}
                disabled={actionLoadingId === job._id}
              >
                {actionLoadingId === job._id ? 'Closing…' : 'Close'}
              </button>
            ) : (
              <button
                className="btn btn-success btn-sm"
                onClick={async () => {
                  setActionLoadingId(job._id);
                  try {
                    await api.jobs.update(job._id, { status: 'active' });
                    await fetchJobs();
                  } catch (e) {
                    alert('Failed to reopen job: ' + e.message);
                  } finally {
                    setActionLoadingId(null);
                  }
                }}
                id={`reopen-job-${job._id}`}
                style={{ marginLeft: '8px' }}
                disabled={actionLoadingId === job._id}
              >
                {actionLoadingId === job._id ? 'Reopening…' : 'Reopen'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
