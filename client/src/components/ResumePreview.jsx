// client/src/components/ResumePreview.jsx
import React from 'react';
import './ResumePreview.css';

/**
 * Read-only preview of the resume with template support. Updates instantly when parent state changes.
 * Props:
 *   resumeData – object containing personalDetails, skills, education, experience.
 *   template – template identifier ('professional', 'minimal', 'modern'). Defaults to 'professional'.
 */
export default function ResumePreview({ resumeData, template = 'professional' }) {
  if (!resumeData) return null;
  const { personalDetails, skills = [], education = [], experience = [] } = resumeData;
  const { fullName, email, phone, location, headline, summary } = personalDetails || {};

  return (
    <div className={`resume-preview template-${template}`} data-template={template}>
      <header className="section personal">
        <h1 className="name">{fullName || 'Your Name'}</h1>
        {headline && <p className="headline">{headline}</p>}
        <div className="contact">
          {email && <span className="contact-item contact-email">{email}</span>}
          {phone && <span className="contact-item contact-phone">{phone}</span>}
          {location && <span className="contact-item contact-location">{location}</span>}
        </div>
        {summary && <p className="summary">{summary}</p>}
      </header>

      {skills.length > 0 && (
        <section className="section skills">
          <h2>Skills</h2>
          <ul className="skill-list">
            {skills.map((s, i) => (
              <li key={i} className="skill-item">{s}</li>
            ))}
          </ul>
        </section>
      )}

      {experience.length > 0 && (
        <section className="section experience">
          <h2>Experience</h2>
          <div className="experience-list">
            {experience.map((ex, i) => (
              <div key={i} className="exp-item">
                <div className="exp-header">
                  <strong>{ex.company}</strong>{ex.jobTitle ? ` – ${ex.jobTitle}` : ''}
                </div>
                <div className="exp-meta">
                  {ex.location && <span className="exp-location">{ex.location}</span>}
                  {(ex.startDate || ex.endDate) && (
                    <span className="exp-dates">
                      {ex.location ? ' • ' : ''}
                      {ex.startDate || ''}{ex.startDate && ex.endDate ? ' – ' : ''}{ex.endDate || ''}
                    </span>
                  )}
                </div>
                {ex.description && <p className="exp-description">{ex.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {education.length > 0 && (
        <section className="section education">
          <h2>Education</h2>
          <div className="education-list">
            {education.map((ed, i) => (
              <div key={i} className="edu-item">
                <div className="edu-header">
                  <strong>{ed.institution}</strong>{ed.qualification ? ` – ${ed.qualification}` : ''}
                  {ed.fieldOfStudy && <span className="field-of-study">, {ed.fieldOfStudy}</span>}
                </div>
                <div className="edu-meta">
                  {(ed.startDate || ed.endDate) && (
                    <span className="ed-dates">
                      {ed.startDate || ''}{ed.startDate && ed.endDate ? ' – ' : ''}{ed.endDate || ''}
                    </span>
                  )}
                </div>
                {ed.description && <p className="ed-description">{ed.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
