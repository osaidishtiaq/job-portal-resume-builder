import React, { useEffect, useState } from 'react';
import { api } from '../api/api';

export default function JobList() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.jobs
      .list()
      .then((data) => {
        if (!cancelled) {
          const jobsArray = Array.isArray(data.data) ? data.data : data;
          setJobs(jobsArray);
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
  }, []);

  const handleSelect = (id) => {
    const url = new URL(window.location.href);
    url.hash = `jobs/${id}`;
    window.location.assign(url);
  };

  if (loading) return <div className="card loading-card"><p>Loading jobs...</p></div>;
  if (error) return <div className="card error-card"><p>{error}</p></div>;

  return (
    <div className="card job-list-card">
      <h2>Job Listings</h2>
      {jobs.length === 0 ? (
        <p>No jobs available.</p>
      ) : (
        <ul className="job-list">
          {jobs.map((job) => (
            <li
              key={job._id}
              className="job-item"
              style={{ cursor: 'pointer', marginBottom: '8px' }}
              onClick={() => handleSelect(job._id)}
            >
              <h3>{job.title}</h3>
              <p>{job.company} — {job.location}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
