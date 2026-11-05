import { useState, useEffect } from 'react';
import { FiSearch, FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { paysheetService } from '../services/paysheetService';
import { formatCurrency, currentMonth } from '../utils/format';
import type { MonthlyPaysheet } from '../types';
import { showToast } from './Toast';
import { BRANCHES } from '../constants/branches';
import { ROLE_CODE_TO_NAME } from '../constants/roleSalaries';
import { SALES_CONFIG, NON_TARGET_CONFIG } from '../constants/salaryConfig';

const ALL_ROLE_CODES = [...Object.keys(SALES_CONFIG), ...Object.keys(NON_TARGET_CONFIG)];

interface PaysheetListProps {
  onEdit?: (paysheet: MonthlyPaysheet) => void;
  onView?: (paysheet: MonthlyPaysheet) => void;
  onDelete?: (paysheet: MonthlyPaysheet) => void;
  refreshTrigger?: number;
}

export function PaysheetList({ onEdit, onView, refreshTrigger }: PaysheetListProps) {
  const [paysheets, setPaysheets] = useState<MonthlyPaysheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>(currentMonth());
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [filterBranch, setFilterBranch] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [localRefresh, setLocalRefresh] = useState(0);
  const limit = 10;

  useEffect(() => {
    let isMounted = true;
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await paysheetService.getMonthPaysheets(filterMonth, {
          search: searchText || undefined,
          status: filterStatus || 'all',
          branch: filterBranch || undefined,
          role: filterRole || undefined,
          page,
          limit,
        });
        if (isMounted) {
          setPaysheets(res.paysheets);
          setTotalPages(res.totalPages);
          setTotal(res.total);
        }
      } catch (err: unknown) {
        if (isMounted) {
          showToast(err instanceof Error ? err.message : 'Failed to load paysheets', 'error');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetch();
    return () => { isMounted = false; };
  }, [filterMonth, filterStatus, filterBranch, filterRole, searchText, page, refreshTrigger, localRefresh]);

  const handleSearchChange = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleMonthChange = (value: string) => {
    setFilterMonth(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setFilterStatus(value);
    setPage(1);
  };

  const handleBranchChange = (value: string) => {
    setFilterBranch(value);
    setPage(1);
  };

  const handleRoleChange = (value: string) => {
    setFilterRole(value);
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this paysheet?')) return;
    try {
      await paysheetService.deletePaysheet(id);
      showToast('Paysheet deleted from database', 'success');
      setPage(1);
      setLocalRefresh((r) => r + 1); // Page 1 stays page 1, so ask for a reload too
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to delete paysheet', 'error');
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Filter Controls */}
      <div className="filter-bar">
        <div className="search-input">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by code or role..."
            value={searchText}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <input
          type="month"
          className="form-input"
          value={filterMonth}
          onChange={(e) => handleMonthChange(e.target.value)}
          style={{ width: 'auto' }}
        />
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => handleStatusChange(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="delete">Deleted</option>
        </select>
        <select
          className="filter-select"
          value={filterBranch}
          onChange={(e) => handleBranchChange(e.target.value)}
        >
          <option value="">All Branches</option>
          {BRANCHES.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={filterRole}
          onChange={(e) => handleRoleChange(e.target.value)}
        >
          <option value="">All Roles</option>
          {ALL_ROLE_CODES.map((code) => (
            <option key={code} value={code}>{ROLE_CODE_TO_NAME[code] || code}</option>
          ))}
        </select>
        <button
          onClick={() => setLocalRefresh(r => r + 1)}
          className="btn btn-secondary"
          disabled={loading}
        >
          Refresh
        </button>

        <button
          onClick={() => {
            setSearchText('');
            setFilterMonth(currentMonth());
            setFilterStatus('active');
            setFilterBranch('');
            setFilterRole('');
            setPage(1);
          }}
          className="btn btn-ghost"
          title="Clear all filters"
        >
          Clear Filters
        </button>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : paysheets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>No paysheets found for {filterMonth}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Role</th>
                <th>Months</th>
                <th>Achievement %</th>
                <th>Gross Offer</th>
                <th>Net Offer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paysheets.map((paysheet) => {
                return (
                  <tr key={paysheet.id}>
                    <td style={{ fontWeight: 500 }}>{paysheet.codeNo}</td>
                    <td>{paysheet.role}</td>
                    <td style={{ textAlign: 'center' }}>{paysheet.monthsOfService}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="badge badge-info">
                        {((paysheet.achievementPct || 0) * 100).toFixed(2)}%
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                      {formatCurrency(paysheet.grossSalary || 0)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--gold-400)' }}>
                      {formatCurrency(paysheet.netSalary || 0)}
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => onView?.(paysheet)}
                          title="View Paysheet"
                        >
                          <FiEye size={16} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => onEdit?.(paysheet)}
                          title="Edit"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          className="btn btn-ghost btn-danger btn-sm"
                          onClick={() => handleDelete(paysheet.id!)}
                          title="Delete"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-ghost"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            ← Previous
          </button>
          <span>
            Page {page} of {totalPages} ({total} total)
          </span>
          <button
            className="btn btn-ghost"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            Next →
          </button>
        </div>
      )}

      {/* Stats */}
      {paysheets.length > 0 && (
        <div className="stats-grid" style={{ marginTop: 20 }}>
          <div className="stat-card">
            <div className="stat-info">
              <h3>{total}</h3>
              <p>Total Paysheets</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>{formatCurrency(paysheets.reduce((sum, p) => sum + (p.grossSalary || 0), 0))}</h3>
              <p>Page Gross</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3 style={{ color: 'var(--gold-400)' }}>
                {formatCurrency(paysheets.reduce((sum, p) => sum + (p.netSalary || 0), 0))}
              </h3>
              <p>Page Net</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>
                {formatCurrency(paysheets.reduce((sum, p) => sum + (p.netSalary || 0), 0) / paysheets.length)}
              </h3>
              <p>Avg Net</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
