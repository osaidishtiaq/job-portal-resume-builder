import React, { useEffect, useState } from 'react';
import { api } from '../api/api';

const JOB_TYPE_OPTIONS = [
  { value: '', label: 'All Job Types' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' }
];

export default function JobList() {
  // Input fields state (uncommitted until Search is clicked or Enter is pressed)
  const [formState, setFormState] = useState({
    search: '',
    location: '',
    jobType: '',
    salaryMin: '',
    salaryMax: ''
  });

  // Active filters applied to the server query
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    location: '',
    jobType: '',
    salaryMin: '',
    salaryMax: ''
  });

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clientError, setClientError] = useState(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Fetch jobs when appliedFilters, page, or retryTrigger changes
  useEffect(() => {
    let cancelled = false;

    const queryParams = {
      page,
      limit: 10
    };

    if (appliedFilters.search.trim()) {
      queryParams.search = appliedFilters.search.trim();
    }
    if (appliedFilters.location.trim()) {
      queryParams.location = appliedFilters.location.trim();
    }
    if (appliedFilters.jobType) {
      queryParams.jobType = appliedFilters.jobType;
    }
    if (appliedFilters.salaryMin.trim() !== '') {
      queryParams.salaryMin = appliedFilters.salaryMin.trim();
    }
    if (appliedFilters.salaryMax.trim() !== '') {
      queryParams.salaryMax = appliedFilters.salaryMax.trim();
    }

    api.jobs
      .list(queryParams)
      .then((data) => {
        if (!cancelled) {
          const jobsArray = Array.isArray(data.data) ? data.data : (data.data?.jobs || []);
          setJobs(jobsArray);
          if (data.pagination) {
            setPagination(data.pagination);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load jobs');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [appliedFilters, page, retryTrigger]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    if (clientError) {
      setClientError(null);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();

    // Client-side validation for salary inputs
    const minStr = formState.salaryMin.trim();
    const maxStr = formState.salaryMax.trim();

    if (minStr !== '') {
      if (!/^\d+(\.\d+)?$/.test(minStr) || Number(minStr) < 0) {
        setClientError('Minimum salary must be a non-negative number');
        return;
      }
    }

    if (maxStr !== '') {
      if (!/^\d+(\.\d+)?$/.test(maxStr) || Number(maxStr) < 0) {
        setClientError('Maximum salary must be a non-negative number');
        return;
      }
    }

    if (minStr !== '' && maxStr !== '') {
      if (Number(minStr) > Number(maxStr)) {
        setClientError('Minimum salary cannot exceed maximum salary');
        return;
      }
    }

    setClientError(null);
    setLoading(true);
    setError(null);
    setPage(1);
    setAppliedFilters({ ...formState });
  };

  const handleClearFilters = () => {
    const cleared = {
      search: '',
      location: '',
      jobType: '',
      salaryMin: '',
      salaryMax: ''
    };
    setFormState(cleared);
    setClientError(null);
    setLoading(true);
    setError(null);
    setPage(1);
    setAppliedFilters(cleared);
  };

  const handlePrevPage = () => {
    setLoading(true);
    setError(null);
    setPage((p) => Math.max(p - 1, 1));
  };

  const handleNextPage = () => {
    setLoading(true);
    setError(null);
    setPage((p) => Math.min(p + 1, pagination.totalPages));
  };

  const handleSelectJob = (id) => {
    const url = new URL(window.location.href);
    url.hash = `jobs/${id}`;
    window.location.assign(url);
  };

  const hasActiveFilters = Boolean(
    appliedFilters.search.trim() ||
    appliedFilters.location.trim() ||
    appliedFilters.jobType ||
    appliedFilters.salaryMin.trim() !== '' ||
    appliedFilters.salaryMax.trim() !== ''
  );

  return (
    <div className="jobs-browse-wrapper">
      {/* Search and Filters Card */}
      <div className="card job-filters-card">
        <div className="job-filters-header">
          <h2>Browse Jobs</h2>
          <p className="subtitle">Discover new opportunities and apply with your profile</p>
        </div>

        <form onSubmit={handleSearchSubmit} className="job-filters-form" noValidate>
          {clientError && (
            <div className="alert alert-error" role="alert" style={{ marginBottom: '16px' }}>
              <span className="alert-icon">⚠️</span>
              <span>{clientError}</span>
            </div>
          )}

          {/* Top Row: Keyword Search and Location */}
          <div className="form-row-2col">
            <div className="form-group">
              <label htmlFor="search-keyword-input">Keyword Search</label>
              <input
                type="text"
                id="search-keyword-input"
                name="search"
                value={formState.search}
                onChange={handleInputChange}
                placeholder="Job title, company, or skills..."
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label htmlFor="search-location-input">Location</label>
              <input
                type="text"
                id="search-location-input"
                name="location"
                value={formState.location}
                onChange={handleInputChange}
                placeholder="City, country, or Remote..."
                autoComplete="off"
              />
            </div>
          </div>

          {/* Second Row: Job Type, Min Salary, Max Salary */}
          <div className="job-filters-grid-row">
            <div className="form-group">
              <label htmlFor="search-jobtype-select">Job Type</label>
              <select
                id="search-jobtype-select"
                name="jobType"
                value={formState.jobType}
                onChange={handleInputChange}
              >
                {JOB_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="search-salary-min-input">Minimum Salary</label>
              <input
                type="number"
                id="search-salary-min-input"
                name="salaryMin"
                value={formState.salaryMin}
                onChange={handleInputChange}
                placeholder="e.g. 50000"
                min="0"
                step="any"
              />
            </div>

            <div className="form-group">
              <label htmlFor="search-salary-max-input">Maximum Salary</label>
              <input
                type="number"
                id="search-salary-max-input"
                name="salaryMax"
                value={formState.salaryMax}
                onChange={handleInputChange}
                placeholder="e.g. 100000"
                min="0"
                step="any"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="job-filters-actions">
            <button
              type="submit"
              className="btn btn-primary"
              id="search-jobs-btn"
              disabled={loading}
            >
              Search Jobs
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClearFilters}
              id="clear-filters-btn"
              disabled={loading}
            >
              Clear Filters
            </button>
          </div>
        </form>
      </div>

      {/* Results and Status Bar */}
      <div className="job-results-meta-bar">
        <span className="results-count-text">
          {loading
            ? 'Loading job listings...'
            : `${pagination.total} job${pagination.total === 1 ? '' : 's'} found`}
        </span>
        {hasActiveFilters && !loading && (
          <span className="active-filters-indicator">
            (Filters applied)
          </span>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card loading-card">
          <div className="spinner large-spinner" />
          <h3>Searching Jobs...</h3>
          <p className="subtitle">Finding the best matches for your criteria</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="card error-card">
          <h3>Unable to load jobs</h3>
          <p style={{ margin: '8px 0 16px', color: 'var(--text-secondary)' }}>{error}</p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setLoading(true);
              setError(null);
              setRetryTrigger((r) => r + 1);
            }}
            id="retry-jobs-btn"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && jobs.length === 0 && (
        <div className="card empty-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔍</div>
          <h3>No Jobs Found</h3>
          <p style={{ color: 'var(--text-secondary)', margin: '12px auto 24px', maxWidth: '420px' }}>
            {hasActiveFilters
              ? 'No active job postings matched your filter criteria. Try broadening your search or resetting filters.'
              : 'There are currently no active job postings available.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleClearFilters}
              id="empty-clear-filters-btn"
            >
              Reset All Filters
            </button>
          )}
        </div>
      )}

      {/* Job Listings Cards */}
      {!loading && !error && jobs.length > 0 && (
        <div className="job-listings-stack">
          {jobs.map((job) => (
            <div
              key={job._id}
              className="job-item-card"
              onClick={() => handleSelectJob(job._id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectJob(job._id);
                }
              }}
              id={`job-card-${job._id}`}
            >
              <div className="job-item-main">
                <div className="job-item-header">
                  <h3 className="job-item-title">{job.title}</h3>
                  <p className="job-item-company">
                    <strong>{job.company}</strong> — {job.location}
                  </p>
                </div>
                <div className="job-item-badges">
                  {job.jobType && (
                    <span className="badge-meta">{job.jobType}</span>
                  )}
                  {job.workplaceMode && (
                    <span className="badge-meta">{job.workplaceMode}</span>
                  )}
                  <span className="badge-meta badge-salary">
                    {job.salaryMin !== undefined && job.salaryMin !== null && job.salaryMax !== undefined && job.salaryMax !== null
                      ? `Salary: ${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()}`
                      : job.salaryMin !== undefined && job.salaryMin !== null
                        ? `Salary: From ${job.salaryMin.toLocaleString()}`
                        : job.salaryMax !== undefined && job.salaryMax !== null
                          ? `Salary: Up to ${job.salaryMax.toLocaleString()}`
                          : 'Salary: Not specified'}
                  </span>
                </div>
                {job.description && (
                  <p className="job-item-description">
                    {job.description.length > 180
                      ? `${job.description.slice(0, 180).trim()}...`
                      : job.description}
                  </p>
                )}
              </div>
              <div className="job-item-action">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectJob(job._id);
                  }}
                  id={`view-details-${job._id}`}
                >
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && !error && pagination.totalPages > 1 && (
        <div className="pagination-bar">
          <div className="pagination-info">
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} job{pagination.total === 1 ? '' : 's'})
            </span>
          </div>
          <div className="pagination-buttons">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handlePrevPage}
              disabled={page <= 1 || loading}
              id="jobs-prev-page-btn"
            >
              ← Previous
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleNextPage}
              disabled={page >= pagination.totalPages || loading}
              id="jobs-next-page-btn"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
