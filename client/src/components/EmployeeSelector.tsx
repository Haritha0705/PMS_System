import { useState, useCallback } from 'react';
import { FiSearch, FiChevronLeft, FiChevronRight, FiRefreshCw } from 'react-icons/fi';
import { useUsers } from '../hooks/useUsers';
import { BRANCHES } from '../constants/branches';
import { ROLES } from '../constants/roleSalaries';
import type { User } from '../types';

const PAGE_SIZE = 10;

interface EmployeeSelectorProps {
  /** Currently selected employee code numbers */
  selectedCodeNos: Set<string>;
  /** Called whenever selection changes */
  onSelectionChange: (selected: Set<string>) => void;
  /** Optional: show a month picker inside the card header */
  payMonth?: string;
  onPayMonthChange?: (month: string) => void;
  /** Button rendered in the card footer (e.g. "Load Pay Sheets") */
  actionButton?: React.ReactNode;
  /** Title shown in the card header */
  title?: string;
}

export default function EmployeeSelector({
  selectedCodeNos,
  onSelectionChange,
  payMonth,
  onPayMonthChange,
  actionButton,
  title = 'Select Employees',
}: EmployeeSelectorProps) {
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const { users, loading, response, refreshUsers } = useUsers({
    search,
    branch: branch || undefined,
    role: role || undefined,
    status: 'active',
    page,
    limit: PAGE_SIZE,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUsers();
    } finally {
      setRefreshing(false);
    }
  };

  const totalPages = response?.totalPages ?? 1;
  const total = response?.total ?? 0;

  // ── Selection helpers ──────────────────────────────────────

  const toggle = useCallback(
    (codeNo: string) => {
      const next = new Set(selectedCodeNos);
      if (next.has(codeNo)) next.delete(codeNo);
      else next.add(codeNo);
      onSelectionChange(next);
    },
    [selectedCodeNos, onSelectionChange]
  );

  const allOnPageSelected =
    users.length > 0 && users.every((u) => selectedCodeNos.has(u.codeNo));

  const togglePage = useCallback(() => {
    const next = new Set(selectedCodeNos);
    if (allOnPageSelected) {
      users.forEach((u) => next.delete(u.codeNo));
    } else {
      users.forEach((u) => next.add(u.codeNo));
    }
    onSelectionChange(next);
  }, [allOnPageSelected, users, selectedCodeNos, onSelectionChange]);

  const clearAll = () => onSelectionChange(new Set());

  // ── Filter reset on filter change ─────────────────────────

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleBranch = (v: string) => { setBranch(v); setPage(1); };
  const handleRole = (v: string) => { setRole(v); setPage(1); };

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      {/* Header */}
      <div className="card-header">
        <h2>
          {title}
          {selectedCodeNos.size > 0 && (
            <span
              style={{
                marginLeft: 10,
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--gold-400)',
                background: 'rgba(200,164,21,0.12)',
                padding: '2px 10px',
                borderRadius: 12,
              }}
            >
              {selectedCodeNos.size} selected
            </span>
          )}
        </h2>

        {payMonth !== undefined && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--text-muted, #888)' }}>Pay Month</span>
            <input
              type="month"
              className="filter-select"
              value={payMonth}
              onChange={(e) => onPayMonthChange?.(e.target.value)}
            />
          </label>
        )}
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="search-input">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search code, name, role, branch..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <select className="filter-select" value={branch} onChange={(e) => handleBranch(e.target.value)}>
          <option value="">All Branches</option>
          {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>

        <select className="filter-select" value={role} onChange={(e) => handleRole(e.target.value)}>
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleRefresh}
          disabled={loading || refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <FiRefreshCw size={14} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>

        {selectedCodeNos.size > 0 && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={clearAll}
            style={{ color: 'var(--ruby-500)', fontSize: 13, whiteSpace: 'nowrap' }}
          >
            Clear All
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={togglePage}
                    title="Select / deselect this page"
                    disabled={users.length === 0}
                  />
                </th>
                <th>Employee</th>
                <th>Code No</th>
                <th>Role</th>
                <th>Branch</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    No employees found
                  </td>
                </tr>
              ) : (
                users.map((u: User) => {
                  const selected = selectedCodeNos.has(u.codeNo);
                  return (
                    <tr
                      key={u.codeNo}
                      onClick={() => toggle(u.codeNo)}
                      style={{
                        cursor: 'pointer',
                        background: selected ? 'rgba(200, 164, 21, 0.08)' : undefined,
                      }}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggle(u.codeNo)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">{u.firstName.charAt(0)}</div>
                          <div>
                            <div className="user-name">{u.firstName} {u.lastName}</div>
                            <div className="user-email" style={{ fontSize: 11 }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 13 }}>{u.codeNo}</td>
                      <td>{u.role || u.designation}</td>
                      <td>{u.branch}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-ghost"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <FiChevronLeft size={16} /> Previous
          </button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Page {page} of {totalPages} &nbsp;·&nbsp; {total} employee(s)
          </span>
          <button
            className="btn btn-ghost"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next <FiChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid var(--neutral-700)',
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {total} employee(s) match{total !== 1 ? '' : 'es'} filter
          {selectedCodeNos.size === 0 && ' — leave none selected to load all paysheets'}
        </span>
        {actionButton}
      </div>
    </div>
  );
}
