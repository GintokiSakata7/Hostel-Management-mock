import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, BedDouble, FileText,
  Wallet, AlertCircle, Download, Settings, ChevronRight,
  Building2, MessageSquare
} from 'lucide-react';
import { useDemoData } from '../context/DemoDataContext';

interface SidebarProps {
  expanded: boolean;
  setExpanded: (exp: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/students', icon: Users, label: 'Students' },
  { to: '/rooms', icon: BedDouble, label: 'Rooms & Beds' },
  { to: '/fees', icon: FileText, label: 'Fees & Receipts' },
  { to: '/finance', icon: Wallet, label: 'Finance & MIS' },
  { to: '/complaints', icon: AlertCircle, label: 'Complaints' },
  { to: '/reports', icon: Download, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  expanded,
  setExpanded,
  mobileOpen,
  setMobileOpen,
}) => {
  const { settings, sendBulkWhatsAppReminders } = useDemoData();

  return (
    <aside
      className={`sidebar-pill glass-heavy ${expanded ? 'sidebar-expanded' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Brand Logo */}
      <div className="sidebar-logo-section">
        <div className="sidebar-logo-icon">
          <Building2 size={24} color="#fff" />
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">{settings.hostelName}</span>
          <span className="sidebar-brand-sub">Cloud OS • Demo</span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="nav-links">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-item-icon ${isActive ? 'active' : ''}`}
            title={label}
            onClick={() => setMobileOpen(false)}
          >
            <div className="nav-icon-wrap">
              <Icon size={20} />
            </div>
            <span className="nav-label">{label}</span>
            {expanded && <ChevronRight size={14} className="nav-arrow" />}
          </NavLink>
        ))}
      </nav>

      {/* Quick Demo Broadcast Button at bottom of sidebar */}
      <div className="sidebar-bottom">
        <button
          className="sidebar-quick-wa-btn"
          title="Dispatch Bulk WhatsApp Reminder to 9491554114"
          onClick={() => sendBulkWhatsAppReminders()}
        >
          <div className="nav-icon-wrap">
            <MessageSquare size={18} color="#25D366" />
          </div>
          {expanded && (
            <div className="sidebar-quick-wa-label">
              <span>Quick WhatsApp</span>
              <small>Send to 9491554114</small>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
