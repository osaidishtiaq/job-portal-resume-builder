import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/api';

export default function EmployerMyJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [jobToClose, setJobToClose] = useState(null);
  const [closing, setClosing] = useState(false);
  const [modalError, setModalError] = useState(null);
  const cancelBtnRef = useRef(null);
  const modalRef = useRef(null);

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

  // Keyboard accessibility and focus trap for confirmation modal
  useEffect(() => {
    if (!jobToClose) return;

    const previouslyFocused = document.activeElement;
    cancelBtnRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !closing) {
        e.preventDefault();
        setJobToClose(null);
        setModalError(null);
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [jobToClose, closing]);

  const handleConfirmClose = async () => {
    if (!jobToClose || closing) return;
    setClosing(true);
    setModalError(null);
    try {
      await api.jobs.close(jobToClose._id);
      await fetchJobs();
      setJobToClose(null);
    } catch (err) {
      setModalError(err.message || 'Failed to close job. Please try again.');
    } finally {
      setClosing(false);
    }
  };

  const handleCancelClose = () => {
    if (closing) return;
    setJobToClose(null);
    setModalError(null);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !closing) {
      handleCancelClose();
    }
  };

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
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => {
                  setModalError(null);
                  setJobToClose(job);
                }}
                id={`close-job-${job._id}`}
                style={{ marginLeft: '8px' }}
                disabled={actionLoadingId === job._id || (closing && jobToClose?._id === job._id)}
              >
                Close
              </button>
            ) : (
              <button
                type="button"
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

      {/* Confirmation Modal */}
      {jobToClose && (
        <div
          className="modal-backdrop"
          onClick={handleBackdropClick}
          role="presentation"
        >
          <div
            className="modal-dialog"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-close-title"
            aria-describedby="modal-close-desc"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-icon-badge warning" aria-hidden="true">
                ⚠️
              </div>
              <div className="modal-title-group">
                <h2 className="modal-title" id="modal-close-title">
                  Close this job?
                </h2>
                <div className="modal-job-highlight">
                  {jobToClose.title}
                </div>
              </div>
            </div>

            <p className="modal-body" id="modal-close-desc">
              Closing this job will hide it from the public job board and stop accepting new candidate applications.
              Existing applications will remain accessible for your review.
            </p>

            {modalError && (
              <div className="alert alert-error" role="alert" style={{ margin: '0' }}>
                <span className="alert-icon">⚠️</span> {modalError}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelClose}
                disabled={closing}
                ref={cancelBtnRef}
                id="modal-cancel-close-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmClose}
                disabled={closing}
                id="modal-confirm-close-btn"
              >
                {closing ? (
                  <>
                    <span className="spinner" style={{ width: '14px', height: '14px' }} />
                    <span>Closing…</span>
                  </>
                ) : (
                  'Close Job'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
