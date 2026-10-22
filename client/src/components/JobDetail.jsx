import React, { useEffect, useState } from 'react';
import { api } from '../api/api';

export default function JobDetail() {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extract job ID from hash: #jobs/:id
  const jobId = window.location.hash.replace('#', '').replace('jobs/', '');

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
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { window.location.hash = 'jobs'; }}>
          ← Back to Jobs
        </button>
      </div>
    );
  }

  const handleBack = () => {
    window.location.hash = 'jobs';
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
    </div>
  );
}
