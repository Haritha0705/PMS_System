import { useState, useEffect } from 'react';
import { FiUsers, FiCheckCircle, FiBriefcase, FiDollarSign, FiFileText } from 'react-icons/fi';
import { userService } from '../services/userService';
import { paysheetService } from '../services/paysheetService';
import { formatCurrency } from '../utils/format';
import type { StatsResponse } from '../types';
import { showToast } from '../components/Toast';

interface DashboardStats {
  userStats: StatsResponse | null;
  paysheetCount: number;
  paysheetMonth: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    userStats: null,
    paysheetCount: 0,
    paysheetMonth: new Date().toISOString().slice(0, 7),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const userStats = await userService.getStats();
        const currentMonth = new Date().toISOString().slice(0, 7);
        const paysheetRes = await paysheetService.getMonthPaysheets(currentMonth);
        
        setStats({
          userStats,
          paysheetCount: paysheetRes.paysheets.length,
          paysheetMonth: currentMonth,
        });
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Failed to load dashboard stats', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-in">
      {/* Key Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card stagger-1">
          <div className="stat-icon blue">
            <FiUsers size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.userStats?.totalUsers || 0}</h3>
            <p>Total Employees</p>
          </div>
        </div>

        <div className="stat-card stagger-2">
          <div className="stat-icon green">
            <FiCheckCircle size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.userStats?.activeUsers || 0}</h3>
            <p>Active Employees</p>
          </div>
        </div>

        <div className="stat-card stagger-3">
          <div className="stat-icon purple">
            <FiBriefcase size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.userStats?.totalBranches || 0}</h3>
            <p>Total Branches</p>
          </div>
        </div>

        <div className="stat-card stagger-5">
          <div className="stat-icon orange">
            <FiFileText size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.paysheetCount}</h3>
            <p>Paysheets (This Month)</p>
          </div>
        </div>
      </div>

      <div className="stat-card stagger-4">
        <div className="stat-icon yellow">
          <FiDollarSign size={24} />
        </div>
        <div className="stat-info">
          <h3>{formatCurrency(stats.userStats?.totalMonthlySalary || 0)}</h3>
          <p>Total Monthly Payroll</p>
        </div>
      </div>
      {/* Employee Status Chart */}
      <div className="card animate-in stagger-2" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h2>Employee Status Overview</h2>
        </div>
        <div className="card-body">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: '16px'
          }}>
            <div style={{ padding: '16px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', borderLeft: '4px solid #22c55e' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>
                {stats.userStats?.activeUsers || 0}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Active</div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                {stats.userStats?.totalUsers && stats.userStats.totalUsers > 0
                  ? ((((stats.userStats?.activeUsers || 0) / stats.userStats.totalUsers) * 100).toFixed(1))
                  : 0}%
              </div>
            </div>

            <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
                {stats.userStats?.deletedUsers || 0}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Deleted</div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                {stats.userStats?.totalUsers && stats.userStats.totalUsers > 0
                  ? ((((stats.userStats?.deletedUsers || 0) / stats.userStats.totalUsers) * 100).toFixed(1))
                  : 0}%
              </div>
            </div>

            <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                {stats.userStats?.totalUsers || 0}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Total Users</div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>All time</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
