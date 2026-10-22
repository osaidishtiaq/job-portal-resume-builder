import React, { useEffect, useState } from 'react';
import { api } from '../api/api';

export default function JobApplicationForm({ jobId: propJobId }) {
  // Extract job ID from hash: #jobs/:id/apply or #jobs/:id
  const rawHash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
  const hashJobId = rawHash.replace(/^jobs\//, '').replace(/\/apply$/, '');
  const jobId = propJobId || hashJobId;

  const [job, setJob] = useState(null);
  const [jobLoading, setJobLoading] = useState(true);
  const [jobError, setJobError] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [clientError, setClientError] = useState('');
  const [apiError, setApiError] = useState('');
  const [apiErrorCode, setApiErrorCode] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedJob, setSubmittedJob] = useState(null);

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
      .then((res) => {
        if (!cancelled) {
          const loadedJob = res?.data?.job || null;
          if (!loadedJob) {
            setJobError('Job not found or is no longer accepting applications');
          } else {
            setJob(loadedJob);
          }
          setJobLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setJobError(
            err.status === 404
              ? 'Job not found or is no longer accepting applications'
              : err.message || 'Failed to load job details'
          );
          setJobLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const handleCoverLetterChange = (e) => {
    const value = e.target.value;
    setCoverLetter(value);
    if (clientError) setClientError('');
    if (apiError) setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setClientError('');
    setApiError('');
    setApiErrorCode(null);

    const trimmed = coverLetter.trim();
    if (trimmed.length > 2000) {
      setClientError('Cover letter cannot exceed 2,000 characters');
      return;
    }

    // Backend contract: send {} if cover letter omitted or empty, otherwise { coverLetter: trimmed }
    const payload = trimmed.length > 0 ? { coverLetter: trimmed } : {};

    setSubmitting(true);
    try {
      await api.applications.apply(jobId, payload);
      setSubmittedJob(job);
      setSuccess(true);
    } catch (err) {
      const status = err.status;
      setApiErrorCode(status);

      if (status === 400) {
        setApiError(err.message || 'Invalid application input');
      } else if (status === 401) {
        setApiError('Your session has expired. Please sign in again as a candidate to apply.');
      } else if (status === 403) {
        setApiError('Only candidate accounts can submit job applications. Employer accounts cannot apply.');
      } else if (status === 404) {
        setApiError('This job is no longer accepting applications or does not exist.');
      } else if (status === 409) {
        setApiError('You have already applied for this job');
      } else if (status === 0 || err.message?.includes('Network error')) {
        setApiError('Network error: Unable to connect to backend server. Please check your connection and try again.');
      } else {
        setApiError(err.message || 'Failed to submit application. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!jobId) {
    return (
      <div className="card error-card">
        <p>No job ID provided</p>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => navigateTo('jobs')}
        >
          ← Back to Jobs
        </button>
      </div>
    );
  }

  if (jobLoading) {
    return (
      <div className="card loading-card">
        <div className="spinner large-spinner"></div>
        <h2>Loading Job Details...</h2>
        <p className="subtitle">Preparing the application form</p>
      </div>
    );
  }

  if (jobError) {
    return (
      <div className="card error-card">
        <h2>Job Unavailable</h2>
        <p style={{ margin: '12px 0 20px 0', color: 'var(--text-secondary)' }}>
          {jobError}
        </p>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => navigateTo('jobs')}
        >
          ← Back to Jobs
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="card job-application-card" style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(74, 222, 128, 0.15)',
              color: 'var(--accent-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              margin: '0 auto 16px auto',
              border: '1px solid rgba(74, 222, 128, 0.3)'
            }}
          >
            ✓
          </div>
          <span
            className="title-badge"
            style={{
              borderColor: 'rgba(74, 222, 128, 0.3)',
              color: 'var(--accent-green)',
              background: 'rgba(74, 222, 128, 0.1)'
            }}
          >
            SUBMISSION COMPLETE
          </span>
          <h2 style={{ margin: '8px 0' }}>Application Submitted Successfully</h2>
          {submittedJob && (
            <div
              style={{
                margin: '18px 0',
                padding: '16px 20px',
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                textAlign: 'left'
              }}
            >
              <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)' }}>{submittedJob.title}</h3>
              <p className="subtitle" style={{ margin: 0, fontSize: '0.95rem' }}>
                {submittedJob.company} {submittedJob.location ? `— ${submittedJob.location}` : ''}
              </p>
            </div>
          )}
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            The hiring team has received your application and will review your profile.
          </p>
        </div>

        <div className="form-actions-row" style={{ justifyContent: 'center', marginTop: 0 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigateTo(`jobs/${jobId}`)}
            id="back-to-job-details-btn"
          >
            Back to Job Details
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigateTo('jobs')}
            id="browse-more-jobs-btn"
          >
            Browse More Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card job-application-card" style={{ maxWidth: '750px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => navigateTo(`jobs/${jobId}`)}
          style={{ marginBottom: '16px' }}
          id="cancel-top-btn"
        >
          ← Back to Job Details
        </button>
        <div>
          <span className="title-badge">CANDIDATE APPLICATION</span>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Apply for Job</h1>
          {job && (
            <div
              style={{
                marginTop: '12px',
                padding: '14px 18px',
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: '10px',
                border: '1px solid var(--border-color)'
              }}
            >
              <h2 style={{ fontSize: '1.25rem', margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                {job.title}
              </h2>
              <p className="subtitle" style={{ margin: 0, fontSize: '0.95rem' }}>
                {job.company} {job.location ? `— ${job.location}` : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          marginBottom: '20px',
          padding: '12px 16px',
          background: 'rgba(56, 189, 248, 0.08)',
          borderRadius: '8px',
          border: '1px solid rgba(56, 189, 248, 0.2)'
        }}
      >
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          ℹ️ Your application will be associated with your candidate account. Adding a cover letter is optional.
        </p>
      </div>

      {apiError && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: '20px' }}>
          <span className="alert-icon">⚠️</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0 }}>{apiError}</p>
            {apiErrorCode === 401 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '10px' }}
                onClick={() => navigateTo('login')}
              >
                Sign In as Candidate
              </button>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
              flexWrap: 'wrap',
              gap: '6px'
            }}
          >
            <label htmlFor="cover-letter" style={{ margin: 0 }}>
              Cover Letter{' '}
              <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '0.85rem' }}>
                (Optional)
              </span>
            </label>
            <span
              id="cover-letter-counter"
              style={{
                fontSize: '0.85rem',
                color: coverLetter.length > 2000 ? '#f87171' : 'var(--text-secondary)',
                fontWeight: coverLetter.length > 2000 ? '600' : 'normal'
              }}
            >
              {coverLetter.length} / 2000
            </span>
          </div>

          <textarea
            id="cover-letter"
            name="coverLetter"
            rows="8"
            value={coverLetter}
            onChange={handleCoverLetterChange}
            placeholder="Introduce yourself, highlight relevant experience, and share why you are interested in this position..."
            className={clientError || coverLetter.length > 2000 ? 'is-invalid' : ''}
            disabled={submitting}
          />

          {clientError ? (
            <span className="invalid-feedback">{clientError}</span>
          ) : (
            <span className="form-text">
              Optional. Maximum 2,000 characters.
            </span>
          )}
        </div>

        <div className="form-actions-row">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || coverLetter.length > 2000}
            id="submit-application-btn"
          >
            {submitting ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="spinner"></span>
                <span>Submitting Application...</span>
              </span>
            ) : (
              'Submit Application'
            )}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigateTo(`jobs/${jobId}`)}
            disabled={submitting}
            id="cancel-application-btn"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
