import { useState, useEffect } from 'react';
import { BRANCHES } from '../constants/branches';
import { userService } from '../services/userService';
import { payrollService } from '../services/payrollService';
import type { User } from '../types';
import { showToast } from './Toast';

interface PaysheetGenerationProps {
  onSuccess?: () => void;
}

export function PaysheetGeneration({ onSuccess }: PaysheetGenerationProps) {
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedCodeNos, setSelectedCodeNos] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [selectedBranch, selectedRole]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await userService.listUsers({
        status: 'active',
        branch: selectedBranch || undefined,
        limit: 1000,
      });
      
      let filteredUsers = res.users;
      if (selectedRole) {
        filteredUsers = filteredUsers.filter((u) => u.role === selectedRole);
      }
      
      setUsers(filteredUsers);
      const uniqueRoles = [...new Set(res.users.map((u) => u.role).filter(Boolean))];
      setRoles(uniqueRoles as string[]);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (codeNo: string) => {
    setSelectedCodeNos((prev) =>
      prev.includes(codeNo) ? prev.filter((code) => code !== codeNo) : [...prev, codeNo]
    );
  };

  const handleSelectAll = () => {
    if (selectedCodeNos.length === users.length) {
      setSelectedCodeNos([]);
    } else {
      setSelectedCodeNos(users.map((u) => u.codeNo));
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!period) return showToast('Please select a period', 'error');
    if (selectedCodeNos.length === 0) return showToast('Please select at least one employee', 'error');

    setGenerating(true);
    try {
      const res = await payrollService.generatePayroll({
        codeNos: selectedCodeNos,
        period,
      });
      showToast(res.message, 'success');
      setSelectedCodeNos([]);
      onSuccess?.();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to generate paysheets', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="card animate-in">
      <div className="card-header">
        <h2>Generate Paysheets by Branch & Role</h2>
      </div>

      <div className="card-body">
        <form onSubmit={handleGenerate}>
          <div className="form-row">
            <div className="form-group">
              <label>Select Branch</label>
              <select
                className="form-select"
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  setSelectedRole('');
                  setSelectedCodeNos([]);
                }}
              >
                <option value="">All Branches</option>
                {BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Select Role</label>
              <select
                className="form-select"
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value);
                  setSelectedCodeNos([]);
                }}
                disabled={roles.length === 0}
              >
                <option value="">All Roles</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Period (YYYY-MM) *</label>
              <input
                required
                type="month"
                className="form-input"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-spinner" style={{ marginTop: 20 }}>
              <div className="spinner"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 20 }}>
              <p>No employees found matching the selected criteria</p>
            </div>
          ) : (
            <>
              <div style={{ marginTop: 24, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, margin: 0 }}>
                    Employees ({selectedCodeNos.length} selected)
                  </h3>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleSelectAll}
                  >
                    {selectedCodeNos.length === users.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div
                  style={{
                    maxHeight: 300,
                    overflowY: 'auto',
                    border: '1px solid var(--border-color)',
                    borderRadius: 4,
                    padding: 12,
                  }}
                >
                  {users.map((user) => (
                    <label
                      key={user.codeNo}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: 8,
                        cursor: 'pointer',
                        borderRadius: 4,
                        marginBottom: 4,
                        backgroundColor: selectedCodeNos.includes(user.codeNo)
                          ? 'var(--primary-light)'
                          : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCodeNos.includes(user.codeNo)}
                        onChange={() => handleUserToggle(user.codeNo)}
                        style={{ marginRight: 12, cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontWeight: 500 }}>
                          {user.firstName} {user.lastName}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {user.role} • {user.branch}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={generating || selectedCodeNos.length === 0}
                >
                  {generating ? 'Generating...' : `Generate Paysheets (${selectedCodeNos.length})`}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
