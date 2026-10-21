// client/src/components/ResumeBuilder.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { api } from '../api/api';
import ResumeForm from './ResumeForm';
import ResumePreview from './ResumePreview';
import { useAuth } from '../context/useAuth';

/**
 * ResumeBuilder – Phase 2 container.
 * Loads the candidate's resume, provides minimal editing for fullName and email,
 * and saves back to the backend while preserving all other fields.
 */
export default function ResumeBuilder() {
  const { user } = useAuth();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dirty, setDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPreview, setShowPreview] = useState(true); // mobile toggle

  const loadResume = useCallback(() => {

    api.resumes
      .getMyResume()
      .then((resp) => {
        const fetched = resp?.data?.resume || null;
        if (fetched) {
          setResume({
            personalDetails: {
              fullName: fetched.personalDetails?.fullName ?? '',
              email: fetched.personalDetails?.email ?? '',
              phone: fetched.personalDetails?.phone ?? '',
              location: fetched.personalDetails?.location ?? '',
              headline: fetched.personalDetails?.headline ?? '',
              summary: fetched.personalDetails?.summary ?? ''
            },
            skills: fetched.skills ?? [],
            education: fetched.education ?? [],
            experience: fetched.experience ?? []
          });
        } else {
          setResume({
            personalDetails: {
              fullName: user?.name ?? '',
              email: user?.email ?? '',
              phone: '',
              location: '',
              headline: '',
              summary: ''
            },
            skills: [],
            education: [],
            experience: []
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load resume');
        setLoading(false);
      });
  }, [user]);

  const isMounted = useRef(true);

  // Update isMounted on mount/unmount
  useEffect(() => {
    isMounted.current = true;
    const timer = setTimeout(() => {
      loadResume();
    }, 0);
    return () => {
      clearTimeout(timer);
      isMounted.current = false;
    };
  }, [loadResume]);

  const handleFieldChange = (field, value) => {
    setResume((prev) => {
      if (!prev) return prev;
      // top‑level arrays
      if (field === 'skills') {
        return { ...prev, skills: value };
      }
      if (field === 'education') {
        return { ...prev, education: value };
      }
      if (field === 'experience') {
        return { ...prev, experience: value };
      }
      // personal details fields
      return {
        ...prev,
        personalDetails: { ...prev.personalDetails, [field]: value }
      };
    });
    setDirty(true);
  };

  const isValidFullName = (name) => {
    const trimmed = name.trim();
    return trimmed.length > 0 && trimmed.length <= 80;
  };
  const isValidEmail = (email) => {
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^\S+@\S+\.\S+$/;
    return trimmed.length > 0 && trimmed.length <= 100 && emailRegex.test(trimmed);
  };

  const handleSave = () => {
    if (!resume) return;
    const { fullName, email, phone, location, headline, summary } = resume.personalDetails;
    const errorsTmp = {};
    if (!isValidFullName(fullName)) errorsTmp.fullName = 'Required, ≤ 80 chars';
    if (!isValidEmail(email)) errorsTmp.email = 'Valid email ≤ 100 chars required';
    if (phone && phone.length > 30) errorsTmp.phone = '≤ 30 chars';
    if (location && location.length > 100) errorsTmp.location = '≤ 100 chars';
    if (headline && headline.length > 120) errorsTmp.headline = '≤ 120 chars';
    if (summary && summary.length > 2000) errorsTmp.summary = '≤ 2000 chars';
    // skills validation already done in ResumeForm, but guard here as well
    if (resume.skills && resume.skills.length > 50) errorsTmp.skills = 'Maximum 50 skills';
    // education validation
    // education entry count limit
    if (resume.education && resume.education.length > 20) {
      errorsTmp.education = errorsTmp.education || {};
      errorsTmp.education._count = 'Maximum 20 education entries';
    }
    // detailed education validation
    (resume.education || []).forEach((ed, idx) => {
      const edErr = {};
      if (!ed.institution || ed.institution.trim() === '') {
        edErr.institution = 'Institution required (≤ 120)';
      } else if (ed.institution.trim().length > 120) {
        edErr.institution = '≤ 120 characters';
      }
      if (!ed.qualification || ed.qualification.trim() === '') {
        edErr.qualification = 'Qualification required (≤ 100)';
      } else if (ed.qualification.trim().length > 100) {
        edErr.qualification = '≤ 100 characters';
      }
      if (ed.fieldOfStudy && ed.fieldOfStudy.trim().length > 100) {
        edErr.fieldOfStudy = '≤ 100 characters';
      }
      if (ed.startDate && ed.startDate.trim().length > 30) {
        edErr.startDate = '≤ 30 characters';
      }
      if (ed.endDate && ed.endDate.trim().length > 30) {
        edErr.endDate = '≤ 30 characters';
      }
      if (ed.description && ed.description.trim().length > 1000) {
        edErr.description = '≤ 1000 characters';
      }
      if (Object.keys(edErr).length) {
        errorsTmp.education = errorsTmp.education || {};
        errorsTmp.education[idx] = edErr;
      }
    });
    // experience validation
    // experience entry count limit
    if (resume.experience && resume.experience.length > 20) {
      errorsTmp.experience = errorsTmp.experience || {};
      errorsTmp.experience._count = 'Maximum 20 experience entries';
    }
    // detailed experience validation
    (resume.experience || []).forEach((ex, idx) => {
      const exErr = {};
      if (!ex.company || ex.company.trim() === '') {
        exErr.company = 'Company required (≤ 120)';
      } else if (ex.company.trim().length > 120) {
        exErr.company = '≤ 120 characters';
      }
      if (!ex.jobTitle || ex.jobTitle.trim() === '') {
        exErr.jobTitle = 'Job title required (≤ 100)';
      } else if (ex.jobTitle.trim().length > 100) {
        exErr.jobTitle = '≤ 100 characters';
      }
      if (ex.location && ex.location.trim().length > 100) {
        exErr.location = '≤ 100 characters';
      }
      if (ex.startDate && ex.startDate.trim().length > 30) {
        exErr.startDate = '≤ 30 characters';
      }
      if (ex.endDate && ex.endDate.trim().length > 30) {
        exErr.endDate = '≤ 30 characters';
      }
      if (ex.description && ex.description.trim().length > 2000) {
        exErr.description = '≤ 2000 characters';
      }
      if (Object.keys(exErr).length) {
        errorsTmp.experience = errorsTmp.experience || {};
        errorsTmp.experience[idx] = exErr;
      }
    });
    // Note: detailed count errors are handled earlier in the validation block.
    // No duplicate simple count errors needed here.
    if (Object.keys(errorsTmp).length) {
      setFieldErrors(errorsTmp);
      setError('Please fix highlighted fields');
      return;
    }
    setFieldErrors({});
    setSaving(true);
    setError('');
    setSuccess('');
    const payload = {
      personalDetails: {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ?? '',
        location: location ?? '',
        headline: headline ?? '',
        summary: summary ?? ''
      },
      skills: resume.skills ?? [],
      // Strip MongoDB internal fields from nested documents
      // Remove internal fields from education and experience entries
      education: (resume.education ?? []).map((e) => {
        const { _id, ...rest } = e;
        // Remove clientId if present
        delete rest.clientId;
        return rest;
      }),
      experience: (resume.experience ?? []).map((e) => {
        const { _id, ...rest } = e;
        delete rest.clientId;
        return rest;
      })
    };
    const snapshot = JSON.stringify(resume);
    api.resumes
      .saveMyResume(payload)
      .then(() => {
        if (isMounted.current) {
          // If no newer edits occurred while the request was in flight, clear dirty flag
          if (snapshot === JSON.stringify(resume)) {
            setDirty(false);
          }
          setSuccess('Resume saved successfully');
          setSaving(false);
        }
      })
      .catch((err) => {
        if (isMounted.current) {
          setError(err?.message || 'Failed to save resume');
          setSaving(false);
        }
      });
  };

  // Generate and download PDF of current resume state
  const handleDownloadPDF = () => {
    if (!resume) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    let y = margin;
    const lineHeight = 14;
    const pageHeight = doc.internal.pageSize.getHeight();

    const addText = (text) => {
      const lines = doc.splitTextToSize(text, doc.internal.pageSize.getWidth() - margin * 2);
      lines.forEach((ln) => {
        if (y + lineHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(ln, margin, y);
        y += lineHeight;
      });
    };

    const { personalDetails, skills = [], education = [], experience = [] } = resume;
    // Personal Details
    if (personalDetails.fullName) {
      doc.setFontSize(20);
      doc.text(personalDetails.fullName, margin, y);
      y += lineHeight * 2;
    }
    doc.setFontSize(12);
    if (personalDetails.headline) {
      addText(personalDetails.headline);
    }
    if (personalDetails.email) addText(`Email: ${personalDetails.email}`);
    if (personalDetails.phone) addText(`Phone: ${personalDetails.phone}`);
    if (personalDetails.location) addText(`Location: ${personalDetails.location}`);
    if (personalDetails.summary) {
      y += lineHeight;
      addText(personalDetails.summary);
    }

    // Skills
    if (skills.length) {
      y += lineHeight;
      addText('Skills:');
      addText(skills.join(', '));
    }

    // Education
    if (education.length) {
      y += lineHeight;
      addText('Education:');
      education.forEach((ed) => {
        y += lineHeight;
        addText(`${ed.institution} – ${ed.qualification}${ed.fieldOfStudy ? ', ' + ed.fieldOfStudy : ''}`);
        if (ed.startDate || ed.endDate) {
          addText(`${ed.startDate || ''} – ${ed.endDate || ''}`);
        }
        if (ed.description) addText(ed.description);
      });
    }

    // Experience
    if (experience.length) {
      y += lineHeight;
      addText('Experience:');
      experience.forEach((ex) => {
        y += lineHeight;
        addText(`${ex.company} – ${ex.jobTitle}`);
        if (ex.location) addText(`Location: ${ex.location}`);
        if (ex.startDate || ex.endDate) {
          addText(`${ex.startDate || ''} – ${ex.endDate || ''}`);
        }
        if (ex.description) addText(ex.description);
      });
    }

    // Sanitized filename
    const safeName = (personalDetails.fullName || 'resume')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    doc.save(`${safeName}.pdf`);
  };


  if (loading) {
    return (
      <div className="card loading-card">
        <div className="spinner large-spinner" />
        <h2>Loading resume…</h2>
      </div>
    );
  }

  if (error && !resume) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
        <br />
        <button type="button" className="btn btn-secondary btn-sm" onClick={loadResume} style={{ marginTop: '8px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Mobile toggle button */}
      <button
        type="button"
        className="btn btn-secondary mb-3"
        onClick={() => setShowPreview((prev) => !prev)}
      >
        {showPreview ? 'Edit Resume' : 'Preview Resume'}
      </button>

      <div className="resume-builder-container">
        <div className={`builder-form ${showPreview ? 'mobile-hidden' : ''}`}>
          <h2>Resume Builder</h2>
          <ResumeForm
            resumeData={resume}
            onChange={handleFieldChange}
            disabled={saving}
            errors={fieldErrors}
          />
          {error && <div className="alert alert-danger" role="alert">{error}</div>}
          {success && <div className="alert alert-success" role="alert">{success}</div>}
          <div className="d-flex align-items-center mt-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !dirty}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="btn btn-secondary ms-2"
              onClick={handleDownloadPDF}
            >
              Download PDF
            </button>
          </div>
        </div>
        <div className={`builder-preview ${!showPreview ? 'mobile-hidden' : ''}`}>
          <ResumePreview resumeData={resume} />
        </div>
      </div>
    </>
  );
}
