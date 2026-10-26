// src/components/Profile.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { api } from '../api/api';

export default function Profile() {
  const { user, refreshUser, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({});
  const [status, setStatus] = useState({ loading: false, error: null, success: null });



  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: null, success: null });
    try {
      await api.auth.updateMe(formData);
      await refreshUser();
      setStatus({ loading: false, error: null, success: 'Profile updated successfully.' });
    } catch (err) {
      setStatus({ loading: false, error: err.message || 'Update failed', success: null });
    }
  };

  if (authLoading) {
    return <div className="card"><p>Loading profile...</p></div>;
  }
  if (!user) {
    return <div className="card"><p>Please sign in to view your profile.</p></div>;
  }

  const isCandidate = user.role === 'candidate';
  const isEmployer = user.role === 'employer';

  return (
    <div className="card profile-card">
      <h2 className="card-title">Edit Profile ({user.role})</h2>
      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="account-info">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <p id="email" className="read-only">{user?.email ?? ''}</p>
          </div>
          <div className="form-group">
            <label htmlFor="role">Role</label>
            <p id="role" className="read-only">{user?.role ?? ''}</p>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input type="text" id="name" name="name" value={formData.name ?? user?.name ?? ''} onChange={handleChange} required maxLength={50} />
        </div>
        <div className="form-group">
          <label htmlFor="phone">Phone</label>
          <input type="text" id="phone" name="phone" value={formData.phone ?? user?.phone ?? ''} onChange={handleChange} maxLength={20} />
        </div>
        <div className="form-group">
          <label htmlFor="location">Location</label>
          <input type="text" id="location" name="location" value={formData.location ?? user?.location ?? ''} onChange={handleChange} maxLength={100} />
        </div>
        {isCandidate && (
          <div className="form-group">
            <label htmlFor="headline">Headline</label>
            <input type="text" id="headline" name="headline" value={formData.headline ?? user?.headline ?? ''} onChange={handleChange} maxLength={150} />
          </div>
        )}
        {isEmployer && (
          <>
            <div className="form-group">
              <label htmlFor="companyName">Company Name</label>
              <input type="text" id="companyName" name="companyName" value={formData.companyName || ''} onChange={handleChange} maxLength={100} />
            </div>
            <div className="form-group">
              <label htmlFor="companyWebsite">Company Website</label>
              <input type="url" id="companyWebsite" name="companyWebsite" value={formData.companyWebsite || ''} onChange={handleChange} maxLength={200} />
            </div>
            <div className="form-group">
              <label htmlFor="companyDescription">Company Description</label>
              <textarea id="companyDescription" name="companyDescription" value={formData.companyDescription || ''} onChange={handleChange} rows={4} maxLength={500} />
            </div>
          </>
        )}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={status.loading}>Save</button>
        </div>
        {status.error && <p className="error-msg">{status.error}</p>}
        {status.success && <p className="success-msg">{status.success}</p>}
      </form>
    </div>
  );
}
