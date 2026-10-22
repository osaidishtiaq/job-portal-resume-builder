import React, { useEffect, useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/useAuth';

export default function JobDetail() {
  const { user, isAuthenticated } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applyStatus, setApplyStatus] = useState('not-applied'); // 'loading' | 'applied' | 'not-applied' | 'error'
  const [retryTrigger, setRetryTrigger] = useState(0);

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

    // Check if the authenticated candidate has already applied to this job
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'candidate' || !jobId) {
      // No need to set applyStatus here; default state handles non-candidate view.
      return;
    }

    let cancelled = false;
    const checkApplications = async () => {
      setApplyStatus('loading');
      let page = 1;
      try {
        while (true) {
          const resp = await api.applications.getMyApplications({ page, limit: 50 });
          if (cancelled) return;
          const applications = resp?.data?.data ?? resp?.data ?? [];
          const found = applications.some((app) => {
            const jobObj = app?.job;
            if (!jobObj) return false;
            const jid = jobObj._id || jobObj.id || jobObj;
            return String(jid) === String(jobId);
          });
          if (found) {
            setApplyStatus('applied');
            return;
          }
          const totalPages = resp?.pagination?.totalPages ?? 1;
          if (page >= totalPages) break;
          page += 1;
        }
        setApplyStatus('not-applied');
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to check application status:', err);
        setApplyStatus('error');
      }
    };
    checkApplications();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.role, jobId, retryTrigger]);

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
                        {applyStatus === 'loading' && (
              <button type="button" className="btn btn-primary" disabled id="apply-job-btn">
                Checking application...
              </button>
            )}
            {applyStatus === 'applied' && (
              <button type="button" className="btn btn-secondary" disabled id="apply-job-btn" title="You have already applied to this job">
                Already Applied
              </button>
            )}
            {applyStatus === 'not-applied' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigateTo(`jobs/${jobId}/apply`)}
                id="apply-job-btn"
              >
                Apply for this Job
              </button>
            )}
            {applyStatus === 'error' && (
              <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                <button type="button" className="btn btn-primary" disabled id="apply-job-btn" title="Error checking application status">
                  Error
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setRetryTrigger(t => t + 1)} id="retry-apply-btn">
                  Retry
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
