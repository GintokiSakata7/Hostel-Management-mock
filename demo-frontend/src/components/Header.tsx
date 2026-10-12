import React from 'react';
import { Menu, Sun, Moon, Bell, Calendar } from 'lucide-react';
import { useDemoData } from '../context/DemoDataContext';
import { WorkspaceSelector } from './WorkspaceSelector';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  isLightMode: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  isLightMode,
  onToggleTheme,
}) => {
  const { settings, selectedMonth, setSelectedMonth } = useDemoData();

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="icon-btn mobile-menu-btn" onClick={onToggleMobileMenu}>
          <Menu size={20} />
        </button>

        <div className="header-dot-group">
          <div className="hdot red" />
          <div className="hdot yellow" />
          <div className="hdot green" />
        </div>

        <div className="header-title-wrapper">
          <h2 className="header-title">{settings.hostelName}</h2>
          <span className="badge badge-accent header-demo-badge">Client Demo</span>
        </div>

        {/* Multi-building workspace dropdown */}
        <WorkspaceSelector />
      </div>

      <div className="header-actions">
        {/* Month Selector for Demo */}
        <div className="header-month-selector">
          <Calendar size={14} className="text-muted" />
          <select
            className="month-dropdown"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            title="Switch Active Billing Month"
          >
            <option value="2026-10">October 2026 (Current)</option>
            <option value="2026-09">September 2026</option>
            <option value="2026-08">August 2026</option>
          </select>
        </div>

        {/* Theme Toggle */}
        <button
          className="icon-btn theme-toggle-btn"
          onClick={onToggleTheme}
          title={isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Notifications */}
        <button className="icon-btn notification-btn" title="Live System Alerts">
          <Bell size={18} />
          <span className="notification-dot" />
        </button>

        {/* User profile */}
        <div className="user-profile">
          <div className="avatar">A</div>
          <div className="profile-info">
            <span className="profile-name">{settings.ownerName}</span>
            <span className="profile-role">Super Administrator</span>
          </div>
        </div>
      </div>
    </header>
  );
};
