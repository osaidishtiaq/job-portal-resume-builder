// Dashboard.jsx – Role‑based professional dashboard
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { api } from '../api/api';

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '';
  }
};

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});

  useEffect(() => {
    async function load() {
      try {
        if (user?.role === 'employer') {
          const resp = await api.jobs.getMyJobs();
          const jobs = (resp && (resp.data?.jobs || resp.jobs)) ? (resp.data?.jobs || resp.jobs) : [];
          if (!Array.isArray(jobs)) {
            setError('Invalid jobs data received from server');
            setLoading(false);
            return;
          }
          const totalJobs = jobs.length;
          const activeJobs = jobs.filter(j => j.status === 'active').length;
          const closedJobs = jobs.filter(j => j.status === 'closed').length;
          const recentJobs = [...jobs]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);
          // Compute total applications reliably across all employer jobs (active and closed)
          let totalApplications = 0;
          let allFetched = true;
          for (const j of jobs) {
            const jobId = j._id ?? j.id;
            if (!jobId) {
              console.error('Missing job identifier for job', j);
              allFetched = false;
              continue;
            }
            try {
              const resp = await api.applications.getJobApplications(jobId);
              const paginationTotal = resp?.pagination?.total;
              const isPaginationTotalValid =
                typeof paginationTotal === 'number' &&
                Number.isInteger(paginationTotal) &&
                paginationTotal >= 0;

              if (isPaginationTotalValid) {
                totalApplications += paginationTotal;
              } else if (
                resp &&
                Array.isArray(resp.data) &&
                (resp.pagination === undefined || resp.pagination === null)
              ) {
                totalApplications += resp.data.length;
              } else {
                console.error('Invalid application response structure for job', jobId, resp);
                allFetched = false;
              }
            } catch (e) {
              console.error('Failed to fetch applications for job', jobId, e);
              allFetched = false;
            }
          }
          setStats({
            totalJobs,
            activeJobs,
            closedJobs,
            totalApplications: allFetched ? totalApplications : undefined,
            recentJobs,
            applicationsError: !allFetched
          });
        } else {
          // Fetch candidate applications
          const firstResp = await api.applications.getMyApplications({ page: 1, limit: 50 });
          const rawApps = Array.isArray(firstResp?.data)
            ? firstResp.data
            : Array.isArray(firstResp)
            ? firstResp
            : null;

          if (!rawApps) {
            setError('Invalid applications data received from server');
            setLoading(false);
            return;
          }

          let allApps = [...rawApps];
          const paginationTotal = firstResp?.pagination?.total;
          const totalPages = firstResp?.pagination?.totalPages;
          const hasValidPaginationTotal =
            typeof paginationTotal === 'number' &&
            Number.isInteger(paginationTotal) &&
            paginationTotal >= 0;

          // If paginated and more pages exist, retrieve remaining pages for complete status breakdown
          if (typeof totalPages === 'number' && totalPages > 1) {
            const pagePromises = [];
            for (let p = 2; p <= totalPages; p++) {
              pagePromises.push(api.applications.getMyApplications({ page: p, limit: 50 }));
            }
            const subsequentResponses = await Promise.all(pagePromises);
            for (const r of subsequentResponses) {
              if (r && Array.isArray(r.data)) {
                allApps = allApps.concat(r.data);
              } else {
                setError('Invalid applications data received from server');
                setLoading(false);
                return;
              }
            }
          }

          const totalApplications = hasValidPaginationTotal ? paginationTotal : allApps.length;
          const statusCounts = allApps.reduce((acc, a) => {
            const s = a.status || 'unknown';
            acc[s] = (acc[s] || 0) + 1;
            return acc;
          }, {});

          const recentApps = [...allApps]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

          let resumeStatus = 'unknown';
          try {
            const resume = await api.resumes.getMyResume();
            resumeStatus = resume ? 'available' : 'none';
          } catch (e) {
            if (e.status === 404) {
              resumeStatus = 'none';
            } else {
              console.error('Error fetching resume:', e);
              resumeStatus = 'error';
            }
          }
          setStats({ totalApplications, statusCounts, recentApps, resumeStatus });
        }
      } catch (e) {
        setError(e.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.role]);

  // formattedDate removed as it was unused

  return (
    <div className="card dashboard-card">
      <div className="dashboard-header">
        <div>
          <h2>Welcome, {user?.name}!</h2>
          <p className="subtitle">Role: {user?.role?.toUpperCase()}</p>
        </div>
      </div>

      {loading && <p>Loading dashboard...</p>}
      {error && (
        <div className="alert alert-error" role="alert">
          <span className="alert-icon">⚠️</span> {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Statistics */}
          <div className="grid stats-grid" style={{ gap: '12px', marginTop: '16px' }}>
            {user?.role === 'employer' ? (
              <>
                <div className="info-box"><div className="info-title">Total Jobs</div><div className="info-value">{stats.totalJobs}</div></div>
                <div className="info-box"><div className="info-title">Active Jobs</div><div className="info-value">{stats.activeJobs}</div></div>
                <div className="info-box"><div className="info-title">Closed Jobs</div><div className="info-value">{stats.closedJobs}</div></div>
                <div className="info-box"><div className="info-title">Total Applications</div><div className="info-value">{stats.totalApplications !== undefined ? stats.totalApplications : '—'}</div></div>
                {stats.applicationsError && (
                  <div className="info-note" style={{ color: '#ff6b6b', marginTop: '4px' }}>
                    Some application data unavailable.{' '}
                    <button type="button" className="btn btn-link btn-sm" onClick={() => window.location.reload()}>Retry</button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="info-box"><div className="info-title">Total Applications</div><div className="info-value">{stats.totalApplications}</div></div>
                {Object.entries(stats.statusCounts || {}).map(([status, count]) => (
                  <div className="info-box" key={status}>
                    <div className="info-title">{status.charAt(0).toUpperCase() + status.slice(1)} Applications</div>
                    <div className="info-value">{count}</div>
                  </div>
                ))}
                <div className="info-box"><div className="info-title">Resume</div><div className="info-value">{(() => {
                    switch (stats.resumeStatus) {
                      case 'available': return 'Available';
                      case 'none': return 'No Resume Yet';
                      case 'error': return 'Unable to Load';
                      default: return 'N/A';
                    }
                  })()}</div></div>
              </>
            )}
          </div>

          {/* Recent activity */}
          <h3 style={{ marginTop: '20px' }}>{user?.role === 'employer' ? 'Recent Jobs' : 'Recent Applications'}</h3>
          <ul className="recent-list" style={{ listStyle: 'none', paddingLeft: 0 }}>
            {(user?.role === 'employer' ? stats.recentJobs || [] : stats.recentApps || []).map(item => {
              if (user?.role === 'employer') {
                return (
                  <li key={item._id ?? item.id} style={{ padding: '4px 0' }}>
                    {item.title}
                  </li>
                );
              }
              const jobTitle =
                (typeof item.job === 'object' && item.job?.title) ||
                item.jobTitle ||
                (item.job ? 'Job' : 'Job no longer available');
              const dateStr = formatDate(item.createdAt);
              return (
                <li key={item._id ?? item.id} style={{ padding: '4px 0' }}>
                  {jobTitle} – {item.status}{dateStr ? ` (${dateStr})` : ''}
                </li>
              );
            })}
            {(user?.role === 'employer' ? stats.recentJobs || [] : stats.recentApps || []).length === 0 && (
              <li>No recent activity.</li>
            )}
          </ul>

          {/* Quick actions */}
          <div className="quick-actions" style={{ marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {user?.role === 'employer' && (
              <>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => { window.location.hash = 'employer/jobs/new'; }}>Post a Job</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { window.location.hash = 'employer/jobs'; }}>My Jobs</button>
              </>
            )}
            {user?.role === 'candidate' && (
              <>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => { window.location.hash = 'jobs'; }}>Browse Jobs</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { window.location.hash = 'applications/my'; }}>My Applications</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { window.location.hash = 'resume'; }}>Resume Builder</button>
              </>
            )}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { window.location.hash = 'profile'; }}>Profile</button>
          </div>
        </>
      )}


    </div>
  );
}
