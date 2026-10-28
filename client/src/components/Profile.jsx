// src/components/Profile.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { api } from '../api/api';

export default function Profile() {
  const { user, refreshUser, logout, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({});
  const [status, setStatus] = useState({ loading: false, error: null, success: null });

  // Change Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [pwdStatus, setPwdStatus] = useState({ loading: false, error: null, success: null });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    if (pwdStatus.error || pwdStatus.success) {
      setPwdStatus({ loading: false, error: null, success: null });
    }
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

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdStatus({ loading: true, error: null, success: null });

    if (!passwordData.currentPassword) {
      setPwdStatus({ loading: false, error: 'Current password is required.', success: null });
      return;
    }
    if (!passwordData.newPassword) {
      setPwdStatus({ loading: false, error: 'New password is required.', success: null });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPwdStatus({ loading: false, error: 'New password must be at least 6 characters long.', success: null });
      return;
    }
    if (passwordData.newPassword === passwordData.currentPassword) {
      setPwdStatus({ loading: false, error: 'New password cannot be the same as the current password.', success: null });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPwdStatus({ loading: false, error: 'New passwords do not match.', success: null });
      return;
    }

    try {
      await api.auth.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPwdStatus({
        loading: false,
        error: null,
        success: 'Password changed successfully. Your session will now end. Redirecting to Sign In...'
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });

      // Invalidate client session and redirect to Sign In
      setTimeout(() => {
        logout();
        window.location.hash = 'login';
      }, 1500);
    } catch (err) {
      setPwdStatus({
        loading: false,
        error: err.message || 'Failed to change password. Please check your credentials.',
        success: null
      });
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
    <>
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

      {/* Change Password Card */}
      <div className="card profile-card" style={{ marginTop: '24px' }}>
        <h2 className="card-title">Change Password</h2>
        <p className="subtitle" style={{ marginBottom: '20px' }}>
          Update your account password. For your security, you will be signed out and redirected to Sign In after changing your password.
        </p>
        <form className="profile-form" onSubmit={handlePasswordSubmit}>
          <div className="form-group">
            <label htmlFor="currentPassword">Current Password</label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              required
              autoComplete="current-password"
              disabled={pwdStatus.loading}
              placeholder="Enter current password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              required
              minLength={6}
              autoComplete="new-password"
              disabled={pwdStatus.loading}
              placeholder="At least 6 characters"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              required
              minLength={6}
              autoComplete="new-password"
              disabled={pwdStatus.loading}
              placeholder="Re-enter new password"
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={pwdStatus.loading}>
              {pwdStatus.loading ? 'Updating Password...' : 'Change Password'}
            </button>
          </div>
          {pwdStatus.error && <p className="error-msg">{pwdStatus.error}</p>}
          {pwdStatus.success && <p className="success-msg">{pwdStatus.success}</p>}
        </form>
      </div>
    </>
  );
}
