import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';

const initialFormData = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function ChangePassword() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      showToast('Please enter the same new password in both fields', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      showToast('Password changed successfully', 'success');
      await logout();
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card animate-in">
      <div className="card-header">
        <h2>Change Password</h2>
        <button className="btn btn-ghost" onClick={() => navigate('/')} aria-label="Close">
          <FiX size={20} />
        </button>
      </div>

      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password *</label>
              <input
                required
                id="currentPassword"
                type="password"
                className="form-input"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                autoComplete="current-password"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="newPassword">New Password *</label>
              <input
                required
                minLength={8}
                maxLength={72}
                id="newPassword"
                type="password"
                className="form-input"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password *</label>
              <input
                required
                id="confirmPassword"
                type="password"
                className="form-input"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
