import { useAuth } from '../../context/AuthContext';
import { FiMenu } from 'react-icons/fi';

interface HeaderProps {
  collapsed: boolean;
  title: string;
  subtitle?: string;
  onMobileMenuOpen?: () => void;
}

export default function Header({ collapsed, title, subtitle, onMobileMenuOpen }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className={`header${collapsed ? ' collapsed' : ''}`}>
      <div className="header-left">
        {/* Hamburger — visible only on mobile/tablet */}
        <button
          className="btn btn-ghost btn-icon mobile-menu-btn"
          onClick={onMobileMenuOpen}
          aria-label="Open navigation menu"
        >
          <FiMenu size={22} />
        </button>
        <div className="header-title">
          <h1>{title}</h1>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </div>
      </div>

      <div className="header-right">
        <div className="header-user">
          <div className="header-avatar">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="header-user-info">
            <div className="header-user-name">{user?.name || 'Admin'}</div>
            <div className="header-user-role">{user?.role || 'Super Admin'}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
