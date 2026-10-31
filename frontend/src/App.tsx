import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, AlertCircle, FileText, Building2,
  BedDouble, LogOut, Bell, Download, ChevronRight, Sun, Moon, Settings, Menu, Wallet
} from 'lucide-react';
import { ToastProvider } from './components/ToastContext';
import { SettingsProvider, useSettings } from './components/SettingsContext';
import { BuildingProvider } from './components/BuildingContext';
import WorkspaceSelector from './components/WorkspaceSelector';
import NotificationBell from './components/NotificationBell';
import AdminLockScreen from './components/AdminLockScreen';
import AdminSecurityModal from './components/AdminSecurityModal';

// Code-split pages for fast initial load
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Students = lazy(() => import('./pages/Students'));
const Rooms = lazy(() => import('./pages/Rooms'));
const Fees = lazy(() => import('./pages/Fees'));
const Finance = lazy(() => import('./pages/Finance'));
const Complaints = lazy(() => import('./pages/Complaints'));
const Reports = lazy(() => import('./pages/Reports'));
const SettingsPage = lazy(() => import('./pages/Settings'));

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/students', icon: Users, label: 'Students' },
  { to: '/rooms', icon: BedDouble, label: 'Rooms & Beds' },
  { to: '/fees', icon: FileText, label: 'Fees' },
  { to: '/finance', icon: Wallet, label: 'Finance & MIS' },
  { to: '/complaints', icon: AlertCircle, label: 'Complaints' },
  { to: '/reports', icon: Download, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function SettingsTitle() {
  const { settings } = useSettings();
  return <>{settings?.hostelName || 'Majin Hostel'}</>;
}

function PageLoadingFallback() {
  return (
    <div className="page-loading-skeleton" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '260px',
      gap: '14px',
      color: 'var(--text-muted)'
    }}>
      <div style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        border: '3px solid rgba(249, 115, 22, 0.2)',
        borderTopColor: 'var(--primary)',
        animation: 'spin 0.8s linear infinite'
      }} />
      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Loading workspace…</span>
    </div>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('majin_admin_auth') === 'true';
  });

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [isLightMode]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // If not authenticated, require Admin Password to enter the portal
  if (!isAuthenticated) {
    return (
      <SettingsProvider>
        <AdminLockScreen onUnlock={() => setIsAuthenticated(true)} />
      </SettingsProvider>
    );
  }

  return (
    <Router>
      <ToastProvider>
        <SettingsProvider>
          <BuildingProvider>
            <div className="app-wrapper">
              {/* Mobile Overlay */}
              {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}
              
              {/* Animated Sidebar */}
              <aside
                className={`sidebar-pill glass-heavy ${sidebarOpen ? 'sidebar-expanded' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}
                onMouseEnter={() => setSidebarOpen(true)}
                onMouseLeave={() => setSidebarOpen(false)}
              >
                {/* Logo */}
                <div className="sidebar-logo-section">
                  <div className="sidebar-logo-icon">
                    <div className="icon-container"><Building2 size={22} color="#fff" /></div>
                  </div>
                  <span className="sidebar-brand-name">Majin Hostel</span>
                </div>

                {/* Nav Links */}
                <nav className="nav-links">
                  {navItems.map(({ to, icon: Icon, label, end }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      className={({ isActive }) => `nav-item-icon ${isActive ? 'active' : ''}`}
                      title={label}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div className="nav-icon-wrap"><Icon size={20} /></div>
                      <span className="nav-label">{label}</span>
                      {sidebarOpen && <ChevronRight size={14} className="nav-arrow" />}
                    </NavLink>
                  ))}
                </nav>

                {/* Bottom */}
                <div className="sidebar-bottom">
                  <button
                    className="nav-item-icon logout-btn"
                    title="Lock Portal / Logout"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      sessionStorage.removeItem('majin_admin_auth');
                      setIsAuthenticated(false);
                    }}
                  >
                    <div className="nav-icon-wrap"><LogOut size={20} /></div>
                    <span className="nav-label">Logout</span>
                  </button>
                </div>
              </aside>

              {/* Main Panel */}
              <div className="main-panel glass-heavy">
                <header className="top-header">
                  <div className="header-left">
                    <button className="icon-btn mobile-menu-btn" aria-label="Open menu" onClick={() => setMobileMenuOpen(true)}>
                      <Menu size={20} />
                    </button>
                    <div className="header-dot-group">
                      <div className="hdot red" />
                      <div className="hdot yellow" />
                      <div className="hdot green" />
                    </div>
                    <h2 className="header-title">
                      <SettingsTitle />
                    </h2>
                    <div className="header-workspace-wrap">
                      <WorkspaceSelector />
                    </div>
                  </div>
                  <div className="header-actions">
                    <button className="icon-btn" aria-label="Toggle theme" onClick={() => setIsLightMode(!isLightMode)}>
                      {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
                    </button>
                    <NotificationBell />
                    <div
                      className="user-profile"
                      onClick={() => setSecurityModalOpen(true)}
                      title="Admin Profile & Security Settings (Click to Change Password / Settings)"
                      role="button"
                      tabIndex={0}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="avatar">A</div>
                      <div className="user-profile-details">
                        <span className="user-name">Admin</span>
                        <span className="user-role">Super Admin</span>
                      </div>
                    </div>
                  </div>
                </header>

                <main className="page-content">
                  <Suspense fallback={<PageLoadingFallback />}>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/students" element={<Students />} />
                      <Route path="/rooms" element={<Rooms />} />
                      <Route path="/fees" element={<Fees />} />
                      <Route path="/finance" element={<Finance />} />
                      <Route path="/complaints" element={<Complaints />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                  </Suspense>
                </main>
              </div>

              {/* Admin Security Modal */}
              <AdminSecurityModal
                isOpen={securityModalOpen}
                onClose={() => setSecurityModalOpen(false)}
                onLock={() => {
                  sessionStorage.removeItem('majin_admin_auth');
                  setIsAuthenticated(false);
                }}
              />
            </div>
          </BuildingProvider>
        </SettingsProvider>
      </ToastProvider>
    </Router>
  );
}

export default App;
