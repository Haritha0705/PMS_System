import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiEdit2, FiTrash2, FiCheckCircle, FiXCircle, FiRefreshCw } from 'react-icons/fi';
import { useUsers } from '../hooks/useUsers';
import { userService } from '../services/userService';
import { BRANCHES } from '../constants/branches';
import { ROLES } from '../constants/roleSalaries';
import { formatCurrency } from '../utils/format';
import { showToast } from '../components/Toast';
import type { User } from '../types';

export default function Users() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const { users, loading, error, response, refreshUsers } = useUsers({
    search,
    branch: branch || undefined,
    role: role || undefined,
    status: (status as 'active' | 'delete' | 'all') || 'all',
    page,
    limit: 10,
  });

  const handleSoftDelete = useCallback(
    async (codeNo: string, name: string) => {
      if (!window.confirm(`Are you sure you want to deactivate ${name}?`)) return;
      try {
        await userService.updateUser(codeNo, { status: 'delete' });
        showToast(`${name} has been deactivated`, 'success');
        refreshUsers();
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Failed to deactivate user', 'error');
      }
    },
    [refreshUsers]
  );

  const handleActivate = useCallback(
    async (codeNo: string, name: string) => {
      if (!window.confirm(`Are you sure you want to activate ${name}?`)) return;
      try {
        await userService.updateUser(codeNo, { status: 'active' });
        showToast(`${name} has been activated`, 'success');
        refreshUsers();
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Failed to activate user', 'error');
      }
    },
    [refreshUsers]
  );

  const handlePermanentDelete = useCallback(
    async (codeNo: string, name: string) => {
      if (
        !window.confirm(
          `⚠️ PERMANENT DELETE\n\nAre you sure you want to permanently delete ${name}?\n\nThis action cannot be undone. All data for this employee will be removed.`
        )
      )
        return;
      try {
        await userService.deleteUser(codeNo);
        showToast(`${name} has been permanently deleted`, 'success');
        refreshUsers();
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Failed to permanently delete user', 'error');
      }
    },
    [refreshUsers]
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleBranchChange = (value: string) => {
    setBranch(value);
    setPage(1);
  };

  const handleRoleChange = (value: string) => {
    setRole(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  return (
    <div className="animate-in">
      <div className="card">
        <div className="card-header">
          <h2>Employees Management</h2>
        </div>

        <div className="filter-bar">
          <div className="search-input">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by code no, name, email, role..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={branch}
            onChange={(e) => handleBranchChange(e.target.value)}
          >
            <option value="">All Branches</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={role}
            onChange={(e) => handleRoleChange(e.target.value)}
          >
            <option value="">All Roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="delete">Deactivated</option>
          </select>

          <button
            className="btn btn-primary"
            onClick={() => navigate('/users/new')}
          >
            + Add User
          </button>

          <button
            className="btn btn-secondary"
            onClick={refreshUsers}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <FiRefreshCw size={16} />
            Refresh
          </button>

          <button
            className="btn btn-ghost"
            onClick={() => {
              handleSearchChange('');
              handleBranchChange('');
              handleRoleChange('');
              handleStatusChange('all');
            }}
            title="Clear all filters"
          >
            Clear Filters
          </button>
        </div>

        <div className="table-wrapper">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>⚠️ {error}</p>
              <button className="btn btn-primary" onClick={refreshUsers}>
                Retry
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <h3>No employees found</h3>
              <p>Adjust your filters or add a new employee.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Contact</th>
                  <th>Branch</th>
                  <th>Role</th>
                  <th>Offer</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: User) => (
                  <tr key={user.codeNo}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">{user.firstName.charAt(0)}</div>
                        <div>
                          <div className="user-name">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="user-email" style={{ fontSize: 11 }}>
                            Code: {user.codeNo}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="user-email">{user.email}</div>
                      <div className="user-email">{user.phone}</div>
                    </td>
                    <td>
                      <div>{user.branch}</div>
                    </td>
                    <td>
                      <div>{user.role || user.designation}</div>
                    </td>
                    <td>
                      <div>{formatCurrency(user.basicSalary)}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${user.status}`}>{user.status}</span>
                    </td>
                    <td>
                      <div className="actions">
                        {user.status === 'active' && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => navigate(`/users/${user.codeNo}`)}
                            title="Edit"
                          >
                            <FiEdit2 size={16} />
                          </button>
                        )}
                        {user.status === 'active' ? (
                          <button
                            className="btn btn-ghost btn-danger btn-sm"
                            onClick={() => handleSoftDelete(user.codeNo, `${user.firstName} ${user.lastName}`)}
                            title="Deactivate"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        ) : (
                          <>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleActivate(user.codeNo, `${user.firstName} ${user.lastName}`)}
                              title="Activate"
                              style={{ color: 'var(--success)' }}
                            >
                              <FiCheckCircle size={16} />
                            </button>
                            <button
                              className="btn btn-ghost btn-danger btn-sm"
                              onClick={() => handlePermanentDelete(user.codeNo, `${user.firstName} ${user.lastName}`)}
                              title="Permanent Delete"
                            >
                              <FiXCircle size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {response && response.totalPages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-ghost"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              ← Previous
            </button>
            <span>
              Page {response.page} of {response.totalPages}
            </span>
            <button
              className="btn btn-ghost"
              onClick={() => setPage(Math.min(response.totalPages, page + 1))}
              disabled={page === response.totalPages}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
