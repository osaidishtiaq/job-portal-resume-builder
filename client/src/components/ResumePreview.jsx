// client/src/components/ResumePreview.jsx
import React from 'react';
import './ResumePreview.css';

/**
 * Read‑only preview of the resume. Updates instantly when the parent state changes.
 * Props:
 *   resumeData – object containing personalDetails, skills, education, experience.
 */
export default function ResumePreview({ resumeData }) {
  if (!resumeData) return null;
  const { personalDetails, skills = [], education = [], experience = [] } = resumeData;
  const { fullName, email, phone, location, headline, summary } = personalDetails || {};

  return (
    <div className="resume-preview">
      <section className="section personal">
        <h1 className="name">{fullName}</h1>
        {headline && <p className="headline">{headline}</p>}
        <div className="contact">
          {email && <span>{email}</span>}
          {phone && <span>{phone}</span>}
          {location && <span>{location}</span>}
        </div>
        {summary && <p className="summary">{summary}</p>}
      </section>

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

      {education.length > 0 && (
        <section className="section education">
          <h2>Education</h2>
          {education.map((ed, i) => (
            <div key={i} className="edu-item">
              <div className="edu-header">
                <strong>{ed.institution}</strong>{' '}–{' '}{ed.qualification}
                {ed.fieldOfStudy && <span className="field-of-study">, {ed.fieldOfStudy}</span>}
              </div>
              <div className="ed-dates">{ed.startDate} – {ed.endDate}</div>
              {ed.description && <p className="ed-description">{ed.description}</p>}
            </div>
          ))}
        </section>
      )}

      {experience.length > 0 && (
        <section className="section experience">
          <h2>Experience</h2>
          {experience.map((ex, i) => (
            <div key={i} className="exp-item">
              <div className="exp-header">
                <strong>{ex.company}</strong>{' '}–{' '}{ex.jobTitle}
              </div>
              <div className="exp-location">{ex.location}</div>
              <div className="exp-dates">{ex.startDate} – {ex.endDate}</div>
              {ex.description && <p className="exp-description">{ex.description}</p>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
