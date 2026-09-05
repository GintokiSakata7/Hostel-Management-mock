import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, AlertCircle, FileText, Building2,
  BedDouble, LogOut, Bell, Download, ChevronRight, Sun, Moon, Settings
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Rooms from './pages/Rooms';
import Fees from './pages/Fees';
import Complaints from './pages/Complaints';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';
import { ToastProvider } from './components/ToastContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/students', icon: Users, label: 'Students' },
  { to: '/rooms', icon: BedDouble, label: 'Rooms & Beds' },
  { to: '/fees', icon: FileText, label: 'Fees' },
  { to: '/complaints', icon: AlertCircle, label: 'Complaints' },
  { to: '/reports', icon: Download, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [isLightMode]);

  return (
    <Router>
      <div className="app-wrapper">
        {/* Animated Sidebar */}
        <aside
          className={`sidebar-pill glass-heavy ${sidebarOpen ? 'sidebar-expanded' : ''}`}
          onMouseEnter={() => setSidebarOpen(true)}
          onMouseLeave={() => setSidebarOpen(false)}
        >
          {/* Logo */}
          <div className="sidebar-logo-section">
            <div className="sidebar-logo-icon">
              <div className="icon-container"><Building2 size={22} color="#fff" /></div>
            </div>
            <span className="sidebar-brand-name">VMR Hostel</span>
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
              >
                <div className="nav-icon-wrap"><Icon size={20} /></div>
                <span className="nav-label">{label}</span>
                {sidebarOpen && <ChevronRight size={14} className="nav-arrow" />}
              </NavLink>
            ))}
          </nav>

          {/* Bottom */}
          <div className="sidebar-bottom">
            <button className="nav-item-icon logout-btn" title="Logout">
              <div className="nav-icon-wrap"><LogOut size={20} /></div>
              <span className="nav-label">Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Panel */}
        <div className="main-panel glass-heavy">
          <header className="top-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="header-dot-group">
                <div className="hdot red" />
                <div className="hdot yellow" />
                <div className="hdot green" />
              </div>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                VMR Hostel Admin
              </h2>
            </div>
            <div className="header-actions">
              <button className="icon-btn" onClick={() => setIsLightMode(!isLightMode)}>
                {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <button className="icon-btn"><Bell size={18} /></button>
              <div className="user-profile">
                <div className="avatar">A</div>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Admin</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Super Admin</span>
                </div>
              </div>
            </div>
          </header>

          <main className="page-content">
            <ToastProvider>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/students" element={<Students />} />
                <Route path="/rooms" element={<Rooms />} />
                <Route path="/fees" element={<Fees />} />
                <Route path="/complaints" element={<Complaints />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </ToastProvider>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
