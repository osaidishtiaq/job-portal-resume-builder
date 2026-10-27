// EmployerJobEdit.jsx – Edit an existing job for the employer
// Reuses validation logic from JobPublishForm
import React, { useState, useEffect } from 'react';
import { api } from '../api/api';
import './EmployerJobEdit.css';

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

export default function EmployerJobEdit({ jobId }) {
  const [formData, setFormData] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Load the job data (owner‑only) – we fetch all employer jobs then pick the one we need.
  useEffect(() => {
    const loadJob = async () => {
      try {
        const data = await api.jobs.getMyJobs();
        const job = data?.data?.jobs?.find(j => j._id === jobId);
        if (!job) throw new Error('Job not found or you are not authorized');
        setFormData({
          title: job.title || '',
          company: job.company || '',
          location: job.location || '',
          jobType: job.jobType || 'full-time',
          workplaceMode: job.workplaceMode || 'onsite',
          description: job.description || '',
          salaryMin: job.salaryMin ?? '',
          salaryMax: job.salaryMax ?? '',
          requirements: job.requirements?.length ? job.requirements : ['']
        });
      } catch (e) {
        setApiError(e.message);
      } finally {
        setLoading(false);
      }
    };
    loadJob();
  }, [jobId]);

  if (loading) {
    return (
      <div className="card loading-card">
        <div className="spinner large-spinner" />
        <h2>Loading Job…</h2>
        <p className="subtitle">Fetching job details.</p>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="card error-card">
        <h2>Unable to load job</h2>
        <p>{apiError}</p>
      </div>
    );
  }

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
    setFormData((prev) => ({ ...prev, requirements: [...prev.requirements, ''] }));
  };

  const handleRemoveRequirement = (index) => {
    setFormData((prev) => {
      const nextReqs = prev.requirements.filter((_, i) => i !== index);
      return { ...prev, requirements: nextReqs.length === 0 ? [''] : nextReqs };
    });
  };

  const validate = () => {
    const newErrors = {};
    const trimmedTitle = formData.title.trim();
    if (!trimmedTitle) newErrors.title = 'Job title is required';
    else if (trimmedTitle.length < 3 || trimmedTitle.length > 100) newErrors.title = 'Job title must be between 3 and 100 characters';
    const trimmedCompany = formData.company.trim();
    if (!trimmedCompany) newErrors.company = 'Company name is required';
    else if (trimmedCompany.length < 2 || trimmedCompany.length > 100) newErrors.company = 'Company name must be between 2 and 100 characters';
    const trimmedLocation = formData.location.trim();
    if (!trimmedLocation) newErrors.location = 'Location is required';
    else if (trimmedLocation.length < 2 || trimmedLocation.length > 100) newErrors.location = 'Location must be between 2 and 100 characters';
    if (!VALID_JOB_TYPES.some((jt) => jt.value === formData.jobType)) newErrors.jobType = 'Valid job type is required';
    if (!VALID_WORKPLACE_MODES.some((wm) => wm.value === formData.workplaceMode)) newErrors.workplaceMode = 'Valid workplace mode is required';
    const trimmedDescription = formData.description.trim();
    if (!trimmedDescription) newErrors.description = 'Job description is required';
    else if (trimmedDescription.length < 10 || trimmedDescription.length > 5000) newErrors.description = 'Job description must be between 10 and 5000 characters';
    if (formData.salaryMin !== '' && formData.salaryMin !== null && formData.salaryMin !== undefined) {
      const minNum = Number(formData.salaryMin);
      if (Number.isNaN(minNum) || minNum < 0) newErrors.salaryMin = 'Minimum salary must be a non‑negative number';
    }
    if (formData.salaryMax !== '' && formData.salaryMax !== null && formData.salaryMax !== undefined) {
      const maxNum = Number(formData.salaryMax);
      if (Number.isNaN(maxNum) || maxNum < 0) newErrors.salaryMax = 'Maximum salary must be a non‑negative number';
    }
    const minNum = Number(formData.salaryMin);
    const maxNum = Number(formData.salaryMax);
    if (!newErrors.salaryMin && !newErrors.salaryMax && formData.salaryMin !== '' && formData.salaryMax !== '' && minNum > maxNum) {
      newErrors.salaryRange = 'Minimum salary cannot exceed maximum salary';
    }
    const activeRequirements = formData.requirements.map((req, idx) => ({ text: req.trim(), originalIndex: idx })).filter((i) => i.text.length > 0);
    if (activeRequirements.length > 50) newErrors.requirements = 'Requirements cannot exceed 50 items';
    else {
      for (const item of activeRequirements) {
        if (item.text.length > 200) newErrors[`req_${item.originalIndex}`] = 'Each requirement item cannot exceed 200 characters';
      }
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    setSubmitting(true);
    setApiError('');
    const payload = {
      title: formData.title.trim(),
      company: formData.company.trim(),
      location: formData.location.trim(),
      jobType: formData.jobType,
      workplaceMode: formData.workplaceMode,
      description: formData.description.trim(),
      salaryMin: formData.salaryMin === '' ? undefined : Number(formData.salaryMin),
      salaryMax: formData.salaryMax === '' ? undefined : Number(formData.salaryMax),
      requirements: formData.requirements.filter((r) => r.trim().length > 0)
    };
    try {
      await api.jobs.update(jobId, payload);
      setSuccessMessage('Job updated successfully');
      // Return to My Jobs after a short delay
      setTimeout(() => {
        window.location.hash = 'employer/jobs';
      }, 1500);
    } catch (e) {
      setApiError(e.message || 'Failed to update job');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h2>Edit Job</h2>
      {apiError && <p className="error-message">{apiError}</p>}
      {successMessage && <p className="success-message">{successMessage}</p>}
      <form onSubmit={handleSubmit} className="job-form">
        {/* Title */}
        <div className="form-group">
          <label>Title</label>
          <input name="title" value={formData.title} onChange={handleChange} disabled={submitting} />
          {errors.title && <span className="error-text">{errors.title}</span>}
        </div>
        {/* Company */}
        <div className="form-group">
          <label>Company</label>
          <input name="company" value={formData.company} onChange={handleChange} disabled={submitting} />
          {errors.company && <span className="error-text">{errors.company}</span>}
        </div>
        {/* Location */}
        <div className="form-group">
          <label>Location</label>
          <input name="location" value={formData.location} onChange={handleChange} disabled={submitting} />
          {errors.location && <span className="error-text">{errors.location}</span>}
        </div>
        {/* Job Type */}
        <div className="form-group">
          <label>Job Type</label>
          <select name="jobType" value={formData.jobType} onChange={handleChange} disabled={submitting}>
            {VALID_JOB_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {errors.jobType && <span className="error-text">{errors.jobType}</span>}
        </div>
        {/* Workplace Mode */}
        <div className="form-group">
          <label>Workplace Mode</label>
          <select name="workplaceMode" value={formData.workplaceMode} onChange={handleChange} disabled={submitting}>
            {VALID_WORKPLACE_MODES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {errors.workplaceMode && <span className="error-text">{errors.workplaceMode}</span>}
        </div>
        {/* Description */}
        <div className="form-group">
          <label>Description</label>
          <textarea name="description" value={formData.description} onChange={handleChange} disabled={submitting} />
          {errors.description && <span className="error-text">{errors.description}</span>}
        </div>
        {/* Salary Min/Max */}
        <div className="form-group">
          <label>Salary Min</label>
          <input name="salaryMin" value={formData.salaryMin} onChange={handleChange} disabled={submitting} />
          {errors.salaryMin && <span className="error-text">{errors.salaryMin}</span>}
        </div>
        <div className="form-group">
          <label>Salary Max</label>
          <input name="salaryMax" value={formData.salaryMax} onChange={handleChange} disabled={submitting} />
          {errors.salaryMax && <span className="error-text">{errors.salaryMax}</span>}
          {errors.salaryRange && <span className="error-text">{errors.salaryRange}</span>}
        </div>
        {/* Requirements */}
        <div className="form-group">
          <label>Requirements</label>
          {formData.requirements.map((req, idx) => (
            <div key={idx} className="requirement-row">
              <input
                value={req}
                onChange={(e) => handleRequirementChange(idx, e.target.value)}
                disabled={submitting}
              />
              <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemoveRequirement(idx)} disabled={submitting}>Remove</button>
            </div>
          ))}
          {errors.requirements && <span className="error-text">{errors.requirements}</span>}
          <button type="button" className="btn btn-secondary btn-sm employer-add-req-btn" onClick={handleAddRequirement} disabled={submitting} style={{ marginBottom: '16px' }}>Add Requirement</button>
        </div>
        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: '16px' }}>Save Changes</button>
      </form>
    </div>
  );
}
