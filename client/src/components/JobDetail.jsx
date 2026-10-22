import React, { useEffect, useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/useAuth';

export default function JobDetail() {
  const { user, isAuthenticated } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extract job ID from hash: #jobs/:id
  const rawHash = window.location.hash.replace(/^#/, '');
  const jobId = rawHash.replace(/^jobs\//, '').replace(/\/apply$/, '');

  const navigateTo = (hash) => {
    const url = new URL(window.location.href);
    url.hash = hash;
    window.location.assign(url);
  };

  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;
    api.jobs
      .getById(jobId)
      .then((data) => {
        if (!cancelled) {
          setJob(data.data?.job || null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load job details');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // Derive missing-ID state during render, not inside effect
  if (!jobId) {
    return (
      <div className="card error-card">
        <p>No job ID provided</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigateTo('jobs')}>
          ← Back to Jobs
        </button>
      </div>
    );
  }

  const handleBack = () => {
    navigateTo('jobs');
  };

  if (loading) {
    return (
      <div className="card loading-card">
        <p>Loading job details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card error-card">
        <p>{error}</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleBack}>
          ← Back to Jobs
        </button>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="card">
        <p>Job not found.</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleBack}>
          ← Back to Jobs
        </button>
      </div>
    );
  }

  return (
    <div className="card job-detail-card">
      <div style={{ marginBottom: '16px' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleBack}>
          ← Back to Jobs
        </button>
      </div>
      <h2>{job.title}</h2>
      <p className="subtitle">{job.company} — {job.location}</p>

      <div className="job-meta" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', margin: '12px 0' }}>
        {job.jobType && <span className="badge">{job.jobType}</span>}
        {job.workplaceMode && <span className="badge">{job.workplaceMode}</span>}
        {(job.salaryMin || job.salaryMax) && (
          <span className="badge">
            {job.salaryMin && job.salaryMax
              ? `$${job.salaryMin.toLocaleString()} – $${job.salaryMax.toLocaleString()}`
              : job.salaryMin
                ? `From $${job.salaryMin.toLocaleString()}`
                : `Up to $${job.salaryMax.toLocaleString()}`}
          </span>
        )}
      </div>

      {job.description && (
        <div className="job-section">
          <h3>Description</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{job.description}</p>
        </div>
      )}

      {job.requirements && job.requirements.length > 0 && (
        <div className="job-section">
          <h3>Requirements</h3>
          <ul>
            {job.requirements.map((req, idx) => (
              <li key={idx}>{req}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Application Initiation Section */}
      <div className="job-apply-section" style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
        {!isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigateTo('login')}
              id="apply-job-btn"
            >
              Sign in to Apply
            </button>
            <span className="form-text" style={{ margin: 0 }}>
              You must be logged in as a candidate to apply for this job.
            </span>
          </div>
        ) : user?.role === 'employer' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled
              id="apply-job-btn"
              title="Employer accounts cannot apply to jobs"
            >
              Employers Cannot Apply
            </button>
            <span className="form-text" style={{ margin: 0 }}>
              You are signed in as an employer. Job applications are only available to candidate accounts.
            </span>
          </div>
        ) : (
          <div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigateTo(`jobs/${jobId}/apply`)}
              id="apply-job-btn"
            >
              Apply for this Job
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
