import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Overview of your payroll system' },
  '/users': { title: 'User Management', subtitle: 'Manage employees and their data' },
  '/users/new': { title: 'Add New User', subtitle: 'Create a new employee record' },
  '/payroll': { title: 'Payroll', subtitle: 'Generate, preview, print, and export PDF payslips' },
  '/paysheets': { title: 'Monthly Paysheets', subtitle: 'Create and manage monthly paysheets' },
  '/print-payslips': { title: 'Print Payslips', subtitle: 'Preview and print payslips as PDF' },
  '/export': { title: 'Export & Backup', subtitle: 'Download data and manage backups' },
};

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentPage = pageTitles[location.pathname] || { title: 'PMS', subtitle: '' };

  return (
    <div className="app-layout">
      {/* Mobile backdrop overlay */}
      {mobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className={`main-wrapper${collapsed ? ' collapsed' : ''}`}>
        <Header
          collapsed={collapsed}
          title={currentPage.title}
          subtitle={currentPage.subtitle}
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
        />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
