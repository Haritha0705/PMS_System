import { NavLink, useLocation } from 'react-router-dom';
import { FiBarChart2, FiUsers, FiDollarSign, FiFileText, FiPrinter, FiDownload, FiLogOut, FiChevronRight, FiChevronLeft, FiX } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { logout } = useAuth();
  const location = useLocation();

  const iconMap: Record<string, React.ReactNode> = {
    dashboard: <FiBarChart2 size={20} />,
    users: <FiUsers size={20} />,
    payroll: <FiDollarSign size={20} />,
    paysheets: <FiFileText size={20} />,
    printpayslips: <FiPrinter size={20} />,
    export: <FiDownload size={20} />,
    logout: <FiLogOut size={20} />,
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'dashboard' },
    { path: '/users', label: 'Users', icon: 'users' },
    { path: '/payroll', label: 'Payroll', icon: 'payroll' },
    { path: '/paysheets', label: 'Monthly Paysheets', icon: 'paysheets' },
    { path: '/print-payslips', label: 'Print Payslips', icon: 'printpayslips' },
    { path: '/export', label: 'Export & Backup', icon: 'export' },
  ];

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo" style={{ background: 'transparent', padding: 0 }}>
          <img src="/icon.png" alt="PMS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        {(!collapsed || mobileOpen) && (
          <div className="sidebar-brand">
            <h2>PMS</h2>
            <p>Application</p>
          </div>
        )}
        {/* Mobile close button */}
        <button className="btn btn-ghost btn-icon sidebar-close-btn" onClick={onMobileClose} aria-label="Close menu">
          <FiX size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-section-label">{(collapsed && !mobileOpen) ? '•' : 'Main Menu'}</span>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={`nav-item${location.pathname === item.path ? ' active' : ''}`}
          >
            <span className="nav-item-icon">{iconMap[item.icon]}</span>
            {(!collapsed || mobileOpen) && <span>{item.label}</span>}
          </NavLink>
        ))}

        <span className="nav-section-label" style={{ marginTop: 'auto' }}>
          {(collapsed && !mobileOpen) ? '•' : 'Account'}
        </span>
        <button className="nav-item" onClick={logout}>
          <span className="nav-item-icon">{iconMap.logout}</span>
          {(!collapsed || mobileOpen) && <span>Logout</span>}
        </button>
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-toggle" onClick={onToggle}>
          {collapsed ? <FiChevronRight size={20} /> : <FiChevronLeft size={20} />}
        </button>
      </div>
    </aside>
  );
}
