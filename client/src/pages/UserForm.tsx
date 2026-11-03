import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiX } from 'react-icons/fi';
import { userService } from '../services/userService';
import { BRANCHES } from '../constants/branches';
import { ROLES, ROLE_SALARIES, ROLE_ALLOWANCES } from '../constants/roleSalaries';
import type { User } from '../types';
import { showToast } from '../components/Toast';

const initialFormData = {
  codeNo: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  branch: '',
  role: '',
  joinDate: '',
  bankAccount: '',
  bankName: '',
  basicSalary: 0,
  allowances: 0,
  deductions: 0,
  status: 'active' as const,
};

export default function UserForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!(id && id !== 'new');
  const navigate = useNavigate();

  const [formData, setFormData] = useState<{
    codeNo: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    branch: string;
    role: string;
    joinDate: string;
    bankAccount: string;
    bankName: string;
    basicSalary: number;
    allowances: number;
    deductions: number;
    status: 'active' | 'delete';
  }>(initialFormData);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      const fetchUser = async () => {
        try {
          const user = await userService.getUser(id);
          setFormData({
            codeNo: user.codeNo,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            branch: user.branch,
            role: user.role,
            joinDate: user.joinDate.split('T')[0],
            bankAccount: user.bankAccount || '',
            bankName: user.bankName || '',
            basicSalary: user.basicSalary,
            allowances: user.allowances,
            deductions: user.deductions,
            status: user.status,
          });
        } catch (err: unknown) {
          showToast(err instanceof Error ? err.message : 'Failed to fetch user details', 'error');
          navigate('/users');
        } finally {
          setLoading(false);
        }
      };
      fetchUser();
    }
  }, [id, navigate, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'number' ? Number(value) : value;
    
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: newValue,
      };
      // Auto-populate basicSalary when role is selected
      if (name === 'role' && newValue in ROLE_SALARIES) {
        updated.basicSalary = ROLE_SALARIES[newValue as keyof typeof ROLE_SALARIES];
      }
      // Auto-populate fixed allowances for non-target (Category B) roles
      if (name === 'role' && typeof newValue === 'string' && newValue in ROLE_ALLOWANCES) {
        updated.allowances = ROLE_ALLOWANCES[newValue];
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Send both role and designation with the same value for consistency
      const submitData = {
        ...formData,
        designation: formData.role,
      };
      if (isEdit) {
        await userService.updateUser(formData.codeNo, submitData);
        showToast('Employee updated successfully', 'success');
      } else {
        await userService.createUser(submitData as unknown as Omit<User, 'createdAt' | 'updatedAt'>);
        showToast('Employee created successfully', 'success');
      }
      navigate('/users');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to save employee', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );

  return (
    <div className="card animate-in">
      <div className="card-header">
        <h2>{isEdit ? 'Edit Employee Data' : 'Add New Employee'}</h2>
        <button className="btn btn-ghost" onClick={() => navigate('/users')}>
          <FiX size={20} />
        </button>
      </div>

      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <h3 style={{ marginBottom: 16, fontSize: 14, color: 'var(--accent)' }}>
            Personal Information
          </h3>
          <div className="form-row">
            <div className="form-group">
              <label>Employee Code (CodeNo) *</label>
              <input
                required
                type="text"
                className="form-input"
                name="codeNo"
                value={formData.codeNo}
                onChange={handleChange}
                disabled={isEdit}
                style={isEdit ? { backgroundColor: 'var(--surface-secondary)', cursor: 'not-allowed' } : {}}
                placeholder="e.g., E001, EMP-001"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>First Name *</label>
              <input
                required
                type="text"
                className="form-input"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input
                required
                type="text"
                className="form-input"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email Address *</label>
              <input
                required
                type="email"
                className="form-input"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="text"
                className="form-input"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <h3 style={{ margin: '24px 0 16px', fontSize: 14, color: 'var(--accent)' }}>
            Employment Details
          </h3>
          <div className="form-row">
            <div className="form-group">
              <label>Branch *</label>
              <select
                required
                className="form-select"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
              >
                <option value="">Select Branch</option>
                {BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Role</label>
              <select
                className="form-select"
                name="role"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="">Select Role</option>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Join Date</label>
              <input
                type="date"
                className="form-input"
                name="joinDate"
                value={formData.joinDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <h3 style={{ margin: '24px 0 16px', fontSize: 14, color: 'var(--accent)' }}>
            Bank Details
          </h3>
          <div className="form-row">
            <div className="form-group">
              <label>Bank Name</label>
              <input
                type="text"
                className="form-input"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                placeholder="e.g., HNB, BOC, Commercial Bank"
              />
            </div>
            <div className="form-group">
              <label>Bank Account Number</label>
              <input
                type="text"
                className="form-input"
                name="bankAccount"
                value={formData.bankAccount}
                onChange={handleChange}
                placeholder="e.g., 1234567890"
              />
            </div>
          </div>

          <h3 style={{ margin: '24px 0 16px', fontSize: 14, color: 'var(--accent)' }}>
            Payroll Setup
          </h3>
          <div className="form-row">
            <div className="form-group">
              <label>Basic Offer (Monthly) *</label>
              <input
                required
                type="number"
                inputMode='numeric'
                className="form-input"
                name="basicSalary"
                value={formData.basicSalary}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Total Offers (Monthly)</label>
              <input
                type="number"
                inputMode='numeric'
                className="form-input"
                name="allowances"
                value={formData.allowances}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Fixed Deductions (Monthly)</label>
              <input
                type="number"
                inputMode='numeric'
                className="form-input"
                name="deductions"
                value={formData.deductions}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/users')}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
