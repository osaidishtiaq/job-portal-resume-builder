import React, { useState } from 'react';
import { api } from '../api/api';

const VALID_JOB_TYPES = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' }
];

const VALID_WORKPLACE_MODES = [
  { value: 'onsite', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' }
];

const initialFormData = {
  title: '',
  company: '',
  location: '',
  jobType: 'full-time',
  workplaceMode: 'onsite',
  description: '',
  salaryMin: '',
  salaryMax: '',
  requirements: ['']
};

export default function JobPublishForm() {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successJob, setSuccessJob] = useState(null);

  const navigateTo = (hash) => {
    const url = new URL(window.location.href);
    url.hash = hash;
    window.location.assign(url);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if ((name === 'salaryMin' || name === 'salaryMax') && errors.salaryRange) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.salaryRange;
        return next;
      });
    }
  };

  const handleRequirementChange = (index, value) => {
    setFormData((prev) => {
      const nextReqs = [...prev.requirements];
      nextReqs[index] = value;
      return { ...prev, requirements: nextReqs };
    });
    const key = `req_${index}`;
    if (errors[key] || errors.requirements) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        delete next.requirements;
        return next;
      });
    }
  };

  const handleAddRequirement = () => {
    if (formData.requirements.length >= 50) return;
    setFormData((prev) => ({
      ...prev,
      requirements: [...prev.requirements, '']
    }));
  };

  const handleRemoveRequirement = (index) => {
    setFormData((prev) => {
      const nextReqs = prev.requirements.filter((_, i) => i !== index);
      return {
        ...prev,
        requirements: nextReqs.length === 0 ? [''] : nextReqs
      };
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`req_${index}`];
      return next;
    });
  };

  const validate = () => {
    const newErrors = {};

    const trimmedTitle = formData.title.trim();
    if (!trimmedTitle) {
      newErrors.title = 'Job title is required';
    } else if (trimmedTitle.length < 3 || trimmedTitle.length > 100) {
      newErrors.title = 'Job title must be between 3 and 100 characters';
    }

    const trimmedCompany = formData.company.trim();
    if (!trimmedCompany) {
      newErrors.company = 'Company name is required';
    } else if (trimmedCompany.length < 2 || trimmedCompany.length > 100) {
      newErrors.company = 'Company name must be between 2 and 100 characters';
    }

    const trimmedLocation = formData.location.trim();
    if (!trimmedLocation) {
      newErrors.location = 'Location is required';
    } else if (trimmedLocation.length < 2 || trimmedLocation.length > 100) {
      newErrors.location = 'Location must be between 2 and 100 characters';
    }

    if (!formData.jobType || !VALID_JOB_TYPES.some((jt) => jt.value === formData.jobType)) {
      newErrors.jobType = 'Valid job type is required';
    }

    if (!formData.workplaceMode || !VALID_WORKPLACE_MODES.some((wm) => wm.value === formData.workplaceMode)) {
      newErrors.workplaceMode = 'Valid workplace mode is required';
    }

    const trimmedDescription = formData.description.trim();
    if (!trimmedDescription) {
      newErrors.description = 'Job description is required';
    } else if (trimmedDescription.length < 10 || trimmedDescription.length > 5000) {
      newErrors.description = 'Job description must be between 10 and 5000 characters';
    }

    let minNum;
    if (formData.salaryMin !== '' && formData.salaryMin !== null && formData.salaryMin !== undefined) {
      minNum = Number(formData.salaryMin);
      if (Number.isNaN(minNum) || minNum < 0) {
        newErrors.salaryMin = 'Minimum salary must be a non-negative number';
      }
    }

    let maxNum;
    if (formData.salaryMax !== '' && formData.salaryMax !== null && formData.salaryMax !== undefined) {
      maxNum = Number(formData.salaryMax);
      if (Number.isNaN(maxNum) || maxNum < 0) {
        newErrors.salaryMax = 'Maximum salary must be a non-negative number';
      }
    }

    if (minNum !== undefined && maxNum !== undefined && !newErrors.salaryMin && !newErrors.salaryMax) {
      if (minNum > maxNum) {
        newErrors.salaryRange = 'Minimum salary cannot exceed maximum salary';
      }
    }

    const activeRequirements = formData.requirements
      .map((req, idx) => ({ text: req.trim(), originalIndex: idx }))
      .filter((item) => item.text.length > 0);

    if (activeRequirements.length > 50) {
      newErrors.requirements = 'Requirements cannot exceed 50 items';
    } else {
      for (const item of activeRequirements) {
        if (item.text.length > 200) {
          newErrors[`req_${item.originalIndex}`] = 'Each requirement item cannot exceed 200 characters';
        }
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setApiError('');
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    const payload = {
      title: formData.title.trim(),
      company: formData.company.trim(),
      location: formData.location.trim(),
      jobType: formData.jobType,
      workplaceMode: formData.workplaceMode,
      description: formData.description.trim()
    };

    if (formData.salaryMin !== '' && formData.salaryMin !== null && formData.salaryMin !== undefined) {
      payload.salaryMin = Number(formData.salaryMin);
    }

    if (formData.salaryMax !== '' && formData.salaryMax !== null && formData.salaryMax !== undefined) {
      payload.salaryMax = Number(formData.salaryMax);
    }

    const cleanedRequirements = formData.requirements
      .map((req) => req.trim())
      .filter((req) => req.length > 0);

    if (cleanedRequirements.length > 0) {
      payload.requirements = cleanedRequirements;
    }

    try {
      const response = await api.jobs.create(payload);
      const created = response?.data?.job || response?.job || response?.data || response;
      setSuccessJob(created);
    } catch (err) {
      setApiError(err.message || 'Failed to publish job. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForNewJob = () => {
    setSuccessJob(null);
    setFormData(initialFormData);
    setErrors({});
    setApiError('');
  };

  if (successJob) {
    return (
      <div className="card job-publish-card">
        <div className="alert alert-success" role="alert" style={{ marginBottom: '20px' }}>
          <span className="alert-icon">✓</span>
          <div>
            <strong>Job Published Successfully!</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              &ldquo;{successJob.title}&rdquo; is now active and immediately visible to candidates in public job listings.
            </p>
          </div>
        </div>

        <div className="info-box" style={{ marginBottom: '24px' }}>
          <div className="info-title">Published Job Summary</div>
          <h3 style={{ margin: '6px 0 6px 0' }}>{successJob.title}</h3>
          <p className="subtitle" style={{ margin: '0 0 12px 0' }}>
            {successJob.company} — {successJob.location}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {successJob.jobType && <span className="badge">{successJob.jobType}</span>}
            {successJob.workplaceMode && <span className="badge">{successJob.workplaceMode}</span>}
            {(successJob.salaryMin || successJob.salaryMax) && (
              <span className="badge">
                {successJob.salaryMin && successJob.salaryMax
                  ? `$${successJob.salaryMin.toLocaleString()} – $${successJob.salaryMax.toLocaleString()}`
                  : successJob.salaryMin
                    ? `From $${successJob.salaryMin.toLocaleString()}`
                    : `Up to $${successJob.salaryMax.toLocaleString()}`}
              </span>
            )}
          </div>
        </div>

        <div className="publish-success-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigateTo(`jobs/${successJob._id}`)}
            id="view-published-job-btn"
          >
            View Published Job →
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigateTo('dashboard')}
            id="back-to-dashboard-btn"
          >
            Back to Dashboard
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleResetForNewJob}
            id="post-another-job-btn"
          >
            Post Another Job
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card job-publish-card">
      <div className="dashboard-header" style={{ marginBottom: '20px' }}>
        <div>
          <span className="title-badge">EMPLOYER PORTAL</span>
          <h2>Post a New Job</h2>
          <p className="subtitle">Publish active job listings to the candidate marketplace</p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => navigateTo('dashboard')}
        >
          ← Dashboard
        </button>
      </div>

      {apiError && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: '20px' }}>
          <span className="alert-icon">⚠️</span>
          <span>{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Job Title */}
        <div className="form-group">
          <label htmlFor="job-title">
            Job Title <span style={{ color: '#f87171' }}>*</span>
          </label>
          <input
            type="text"
            id="job-title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Senior Frontend Engineer"
            maxLength={100}
            className={errors.title ? 'is-invalid' : ''}
            disabled={submitting}
          />
          {errors.title ? (
            <span className="invalid-feedback">{errors.title}</span>
          ) : (
            <span className="form-text">Between 3 and 100 characters ({formData.title.length}/100)</span>
          )}
        </div>

        {/* Company & Location in responsive grid */}
        <div className="form-row-2col">
          <div className="form-group">
            <label htmlFor="job-company">
              Company Name <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              type="text"
              id="job-company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="e.g. Acme Innovations"
              maxLength={100}
              className={errors.company ? 'is-invalid' : ''}
              disabled={submitting}
            />
            {errors.company ? (
              <span className="invalid-feedback">{errors.company}</span>
            ) : (
              <span className="form-text">Between 2 and 100 characters</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="job-location">
              Location <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              type="text"
              id="job-location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. San Francisco, CA or Remote"
              maxLength={100}
              className={errors.location ? 'is-invalid' : ''}
              disabled={submitting}
            />
            {errors.location ? (
              <span className="invalid-feedback">{errors.location}</span>
            ) : (
              <span className="form-text">Between 2 and 100 characters</span>
            )}
          </div>
        </div>

        {/* Job Type & Workplace Mode */}
        <div className="form-row-2col">
          <div className="form-group">
            <label htmlFor="job-type">
              Job Type <span style={{ color: '#f87171' }}>*</span>
            </label>
            <select
              id="job-type"
              name="jobType"
              value={formData.jobType}
              onChange={handleChange}
              className={errors.jobType ? 'is-invalid' : ''}
              disabled={submitting}
            >
              {VALID_JOB_TYPES.map((jt) => (
                <option key={jt.value} value={jt.value}>
                  {jt.label}
                </option>
              ))}
            </select>
            {errors.jobType && <span className="invalid-feedback">{errors.jobType}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="job-workplace-mode">
              Workplace Mode <span style={{ color: '#f87171' }}>*</span>
            </label>
            <select
              id="job-workplace-mode"
              name="workplaceMode"
              value={formData.workplaceMode}
              onChange={handleChange}
              className={errors.workplaceMode ? 'is-invalid' : ''}
              disabled={submitting}
            >
              {VALID_WORKPLACE_MODES.map((wm) => (
                <option key={wm.value} value={wm.value}>
                  {wm.label}
                </option>
              ))}
            </select>
            {errors.workplaceMode && <span className="invalid-feedback">{errors.workplaceMode}</span>}
          </div>
        </div>

        {/* Salary Range (Optional) */}
        <div className="form-row-2col">
          <div className="form-group">
            <label htmlFor="job-salary-min">Minimum Salary (Optional)</label>
            <input
              type="number"
              id="job-salary-min"
              name="salaryMin"
              value={formData.salaryMin}
              onChange={handleChange}
              placeholder="e.g. 70000"
              min="0"
              step="1000"
              className={errors.salaryMin || errors.salaryRange ? 'is-invalid' : ''}
              disabled={submitting}
            />
            {errors.salaryMin && <span className="invalid-feedback">{errors.salaryMin}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="job-salary-max">Maximum Salary (Optional)</label>
            <input
              type="number"
              id="job-salary-max"
              name="salaryMax"
              value={formData.salaryMax}
              onChange={handleChange}
              placeholder="e.g. 120000"
              min="0"
              step="1000"
              className={errors.salaryMax || errors.salaryRange ? 'is-invalid' : ''}
              disabled={submitting}
            />
            {errors.salaryMax && <span className="invalid-feedback">{errors.salaryMax}</span>}
          </div>
        </div>
        {errors.salaryRange && (
          <div style={{ marginTop: '-10px', marginBottom: '16px' }}>
            <span className="invalid-feedback">{errors.salaryRange}</span>
          </div>
        )}

        {/* Description */}
        <div className="form-group">
          <label htmlFor="job-description">
            Job Description <span style={{ color: '#f87171' }}>*</span>
          </label>
          <textarea
            id="job-description"
            name="description"
            rows="6"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the role, responsibilities, culture, and key objectives..."
            maxLength={5000}
            className={errors.description ? 'is-invalid' : ''}
            disabled={submitting}
          />
          {errors.description ? (
            <span className="invalid-feedback">{errors.description}</span>
          ) : (
            <span className="form-text">
              Between 10 and 5000 characters ({formData.description.trim().length}/5000)
            </span>
          )}
        </div>

        {/* Requirements (Add/Remove) */}
        <div className="form-group" style={{ marginBottom: '24px' }}>
          <div className="requirements-header">
            <label style={{ margin: 0 }}>
              Key Requirements (Optional, max 50)
            </label>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAddRequirement}
              disabled={submitting || formData.requirements.length >= 50}
              id="add-requirement-btn"
            >
              + Add Requirement
            </button>
          </div>
          {errors.requirements && (
            <span className="invalid-feedback" style={{ marginBottom: '8px' }}>{errors.requirements}</span>
          )}

          {formData.requirements.map((req, index) => (
            <div key={index} className="requirement-row">
              <div className="requirement-input-wrapper">
                <input
                  type="text"
                  value={req}
                  onChange={(e) => handleRequirementChange(index, e.target.value)}
                  placeholder={`Requirement #${index + 1} (e.g. 3+ years experience with React)`}
                  maxLength={200}
                  className={errors[`req_${index}`] ? 'is-invalid' : ''}
                  disabled={submitting}
                />
                {errors[`req_${index}`] && (
                  <span className="invalid-feedback">{errors[`req_${index}`]}</span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleRemoveRequirement(index)}
                disabled={submitting}
                title="Remove requirement"
                style={{ padding: '10px 14px', minWidth: '40px', flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          ))}
          <span className="form-text">
            Empty requirement rows will be ignored automatically upon submission.
          </span>
        </div>

        {/* Submit Actions */}
        <div className="form-actions-row">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            id="submit-job-btn"
          >
            {submitting ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="spinner"></span>
                <span>Publishing Job...</span>
              </span>
            ) : (
              'Publish Job'
            )}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigateTo('dashboard')}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
