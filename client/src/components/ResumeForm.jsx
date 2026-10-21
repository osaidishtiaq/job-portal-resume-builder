// client/src/components/ResumeForm.jsx
import './ResumeForm.css';
import React, { useState } from 'react';

/**
 * Controlled form for editing personal details and skills.
 *
 * Props
 * -----
 * resumeData   – object containing `personalDetails` and `skills`.
 * onChange     – (field: string, value: any) => void. Called for any edit.
 * disabled     – boolean to disable all inputs while saving.
 * errors       – optional object mapping field names to error messages.
 */
export default function ResumeForm({ resumeData, onChange, disabled, errors = {} }) {
  const personal = resumeData?.personalDetails || {};
  const [skillInput, setSkillInput] = useState('');
  const [skillError, setSkillError] = useState('');
  // Handler for personal detail fields
  const handlePersonalChange = (field) => (e) => {
    onChange(field, e.target.value);
  };

  // Helper to update nested education entries
  const handleEducationChange = (idx, field) => (e) => {
    const newEducation = (resumeData?.education || []).map((ed, i) =>
      i === idx ? { ...ed, [field]: e.target.value } : ed
    );
    onChange('education', newEducation);
  };

  // Helper to add a new empty education entry with a temporary clientId
  const addEducation = () => {
    if ((resumeData?.education?.length || 0) >= 20) return;
    const newEntry = { clientId: Date.now() + Math.random(), institution: '', qualification: '', fieldOfStudy: '', startDate: '', endDate: '', description: '' };
    const newEducation = [...(resumeData?.education || []), newEntry];
    onChange('education', newEducation);
  };

  const removeEducation = (idx) => {
    const newEducation = (resumeData?.education || []).filter((_, i) => i !== idx);
    onChange('education', newEducation);
  };

  // Helpers for experience entries
  const handleExperienceChange = (idx, field) => (e) => {
    const newExp = (resumeData?.experience || []).map((ex, i) =>
      i === idx ? { ...ex, [field]: e.target.value } : ex
    );
    onChange('experience', newExp);
  };

  const addExperience = () => {
    if ((resumeData?.experience?.length || 0) >= 20) return;
    const newEntry = { clientId: Date.now() + Math.random(), company: '', jobTitle: '', location: '', startDate: '', endDate: '', description: '' };
    const newExperience = [...(resumeData?.experience || []), newEntry];
    onChange('experience', newExperience);
  };

  const removeExperience = (idx) => {
    const newExperience = (resumeData?.experience || []).filter((_, i) => i !== idx);
    onChange('experience', newExperience);
  };







  // ----- Skills editor -----
  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) {
      setSkillError('Skill cannot be empty');
      return;
    }
    if (trimmed.length > 50) {
      setSkillError('Skill must be ≤ 50 characters');
      return;
    }
    const existing = resumeData?.skills || [];
    if (existing.length >= 50) {
      setSkillError('Maximum of 50 skills allowed');
      return;
    }
    // case‑insensitive duplicate check
    const duplicate = existing.some((s) => s.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      setSkillError('Duplicate skill');
      return;
    }
    const newSkills = [...existing, trimmed];
    onChange('skills', newSkills);
    setSkillInput('');
    setSkillError('');
  };

  const handleSkillKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const removeSkill = (idx) => {
    const newSkills = (resumeData?.skills || []).filter((_, i) => i !== idx);
    onChange('skills', newSkills);
  };

  return (
    <form className="resume-form" onSubmit={(e) => e.preventDefault()}>
      {/* Personal Details */}
      <div className="mb-3">
        <label htmlFor="fullName" className="form-label">Full name</label>
        <input
          id="fullName"
          type="text"
          className={`form-control ${errors.fullName ? 'is-invalid' : ''}`}
          maxLength={80}
          value={personal.fullName || ''}
          onChange={handlePersonalChange('fullName')}
          disabled={disabled}
          required
        />
        {errors.fullName && <div className="invalid-feedback">{errors.fullName}</div>}
      </div>

      <div className="mb-3">
        <label htmlFor="email" className="form-label">Contact email</label>
        <input
          id="email"
          type="email"
          className={`form-control ${errors.email ? 'is-invalid' : ''}`}
          maxLength={100}
          value={personal.email || ''}
          onChange={handlePersonalChange('email')}
          disabled={disabled}
          required
        />
        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
      </div>

      <div className="mb-3">
        <label htmlFor="phone" className="form-label">Phone</label>
        <input
          id="phone"
          type="text"
          className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
          maxLength={30}
          value={personal.phone || ''}
          onChange={handlePersonalChange('phone')}
          disabled={disabled}
        />
        {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
      </div>

      <div className="mb-3">
        <label htmlFor="location" className="form-label">Location</label>
        <input
          id="location"
          type="text"
          className={`form-control ${errors.location ? 'is-invalid' : ''}`}
          maxLength={100}
          value={personal.location || ''}
          onChange={handlePersonalChange('location')}
          disabled={disabled}
        />
        {errors.location && <div className="invalid-feedback">{errors.location}</div>}
      </div>

      <div className="mb-3">
        <label htmlFor="headline" className="form-label">Headline</label>
        <input
          id="headline"
          type="text"
          className={`form-control ${errors.headline ? 'is-invalid' : ''}`}
          maxLength={120}
          value={personal.headline || ''}
          onChange={handlePersonalChange('headline')}
          disabled={disabled}
        />
        {errors.headline && <div className="invalid-feedback">{errors.headline}</div>}
      </div>

      <div className="mb-3">
        <label htmlFor="summary" className="form-label">Summary</label>
        <textarea
          id="summary"
          className={`form-control ${errors.summary ? 'is-invalid' : ''}`}
          maxLength={2000}
          rows={4}
          value={personal.summary || ''}
          onChange={handlePersonalChange('summary')}
          disabled={disabled}
        />
        {errors.summary && <div className="invalid-feedback">{errors.summary}</div>}
      </div>

      {/* Skills editor */}
      <div className="mb-3">
        <label htmlFor="skillInput" className="form-label">Skills</label>
        <div className="d-flex mb-2">
          <input
            id="skillInput"
            type="text"
            className={`form-control ${skillError ? 'is-invalid' : ''}`}
            maxLength={50}
            placeholder="Enter a skill"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleSkillKey}
            disabled={disabled}
          />
          <button
            type="button"
            className="btn btn-outline-primary ms-2"
            onClick={addSkill}
            disabled={disabled}
          >
            Add
          </button>
        </div>
        {skillError && <div className="invalid-feedback d-block">{skillError}</div>}
        <div className="skill-chips d-flex flex-wrap gap-2">
          {(resumeData?.skills || []).map((skill, idx) => (
            <span key={idx} className="badge bg-secondary d-inline-flex align-items-center">
              {skill}
              <button
                type="button"
                className="btn-close btn-close-white btn-sm ms-2"
                aria-label="Remove"
                onClick={() => removeSkill(idx)}
                disabled={disabled}
              />
            </span>
          ))}
        </div>
      </div>

      {/* Education editor */}
      <div className="mb-3">
        <h4 className="form-label">Education</h4>
        {(resumeData?.education || []).map((ed, idx) => (
          <div key={ed._id || ed.clientId || idx} className="education-entry mb-3 p-3 border rounded">
            <div className="mb-2">
              <label className="form-label">Institution *</label>
              <input
                type="text"
                className={`form-control ${errors.education?.[idx]?.institution ? 'is-invalid' : ''}`}
                maxLength={120}
                value={ed.institution || ''}
                onChange={handleEducationChange(idx, 'institution')}
                disabled={disabled}
                required
              />
              {errors.education?.[idx]?.institution && <div className="invalid-feedback">{errors.education[idx].institution}</div>}
            </div>
            <div className="mb-2">
              <label className="form-label">Qualification *</label>
              <input
                type="text"
                className={`form-control ${errors.education?.[idx]?.qualification ? 'is-invalid' : ''}`}
                maxLength={100}
                value={ed.qualification || ''}
                onChange={handleEducationChange(idx, 'qualification')}
                disabled={disabled}
                required
              />
              {errors.education?.[idx]?.qualification && <div className="invalid-feedback">{errors.education[idx].qualification}</div>}
            </div>
            <div className="mb-2">
              <label className="form-label">Field of Study</label>
              <input
                type="text"
                className={`form-control ${errors.education?.[idx]?.fieldOfStudy ? 'is-invalid' : ''}`}
                maxLength={100}
                value={ed.fieldOfStudy || ''}
                onChange={handleEducationChange(idx, 'fieldOfStudy')}
                disabled={disabled}
              />
            </div>
            <div className="mb-2">
              <label className="form-label">Start Date</label>
              <input
                type="text"
                className={`form-control ${errors.education?.[idx]?.startDate ? 'is-invalid' : ''}`}
                maxLength={30}
                value={ed.startDate || ''}
                onChange={handleEducationChange(idx, 'startDate')}
                disabled={disabled}
              />
            </div>
            <div className="mb-2">
              <label className="form-label">End Date</label>
              <input
                type="text"
                className={`form-control ${errors.education?.[idx]?.endDate ? 'is-invalid' : ''}`}
                maxLength={30}
                value={ed.endDate || ''}
                onChange={handleEducationChange(idx, 'endDate')}
                disabled={disabled}
              />
            </div>
            <div className="mb-2">
              <label className="form-label">Description</label>
              <textarea
                className={`form-control ${errors.education?.[idx]?.description ? 'is-invalid' : ''}`}
                maxLength={1000}
                rows={3}
                value={ed.description || ''}
                onChange={handleEducationChange(idx, 'description')}
                disabled={disabled}
              />
            </div>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => removeEducation(idx)} disabled={disabled}>Remove</button>
          </div>
        ))}
        {resumeData?.education?.length < 20 && (
          <button type="button" className="btn btn-primary btn-sm" onClick={addEducation} disabled={disabled}>Add Education</button>
        )}
      </div>

      {/* Experience editor */}
      <div className="mb-3">
        <h4 className="form-label">Work Experience</h4>
        {(resumeData?.experience || []).map((ex, idx) => (
          <div key={ex._id || ex.clientId || idx} className="experience-entry mb-3 p-3 border rounded">
            <div className="mb-2">
              <label className="form-label">Company *</label>
              <input
                type="text"
                className={`form-control ${errors.experience?.[idx]?.company ? 'is-invalid' : ''}`}
                maxLength={120}
                value={ex.company || ''}
                onChange={handleExperienceChange(idx, 'company')}
                disabled={disabled}
                required
              />
              {errors.experience?.[idx]?.company && <div className="invalid-feedback">{errors.experience[idx].company}</div>}
            </div>
            <div className="mb-2">
              <label className="form-label">Job Title *</label>
              <input
                type="text"
                className={`form-control ${errors.experience?.[idx]?.jobTitle ? 'is-invalid' : ''}`}
                maxLength={100}
                value={ex.jobTitle || ''}
                onChange={handleExperienceChange(idx, 'jobTitle')}
                disabled={disabled}
                required
              />
              {errors.experience?.[idx]?.jobTitle && <div className="invalid-feedback">{errors.experience[idx].jobTitle}</div>}
            </div>
            <div className="mb-2">
              <label className="form-label">Location</label>
              <input
                type="text"
                className={`form-control ${errors.experience?.[idx]?.location ? 'is-invalid' : ''}`}
                maxLength={100}
                value={ex.location || ''}
                onChange={handleExperienceChange(idx, 'location')}
                disabled={disabled}
              />
            </div>
            <div className="mb-2">
              <label className="form-label">Start Date</label>
              <input
                type="text"
                className={`form-control ${errors.experience?.[idx]?.startDate ? 'is-invalid' : ''}`}
                maxLength={30}
                value={ex.startDate || ''}
                onChange={handleExperienceChange(idx, 'startDate')}
                disabled={disabled}
              />
            </div>
            <div className="mb-2">
              <label className="form-label">End Date</label>
              <input
                type="text"
                className={`form-control ${errors.experience?.[idx]?.endDate ? 'is-invalid' : ''}`}
                maxLength={30}
                value={ex.endDate || ''}
                onChange={handleExperienceChange(idx, 'endDate')}
                disabled={disabled}
              />
            </div>
            <div className="mb-2">
              <label className="form-label">Description</label>
              <textarea
                className={`form-control ${errors.experience?.[idx]?.description ? 'is-invalid' : ''}`}
                maxLength={2000}
                rows={3}
                value={ex.description || ''}
                onChange={handleExperienceChange(idx, 'description')}
                disabled={disabled}
              />
            </div>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => removeExperience(idx)} disabled={disabled}>Remove</button>
          </div>
        ))}
        {resumeData?.experience?.length < 20 && (
          <button type="button" className="btn btn-primary btn-sm" onClick={addExperience} disabled={disabled}>Add Experience</button>
        )}
      </div>
    </form>
  );
}
