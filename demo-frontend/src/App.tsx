import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { DemoDataProvider } from './context/DemoDataContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DemoBanner } from './components/DemoBanner';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Rooms from './pages/Rooms';
import Fees from './pages/Fees';
import Finance from './pages/Finance';
import Complaints from './pages/Complaints';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

export const App: React.FC = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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
      <ToastProvider>
        <DemoDataProvider>
          <div className="app-shell">
            {/* Top Interactive Client Demo Banner */}
            <DemoBanner />

            <div className="app-wrapper">
              {/* Mobile Backdrop */}
              {mobileOpen && (
                <div
                  className="mobile-overlay animate-fade-in"
                  onClick={() => setMobileOpen(false)}
                />
              )}

              {/* Animated Floating Pill Sidebar */}
              <Sidebar
                expanded={sidebarExpanded}
                setExpanded={setSidebarExpanded}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
              />

              {/* Main App Layout */}
              <div className="main-panel glass-heavy">
                <Header
                  onToggleMobileMenu={() => setMobileOpen(!mobileOpen)}
                  isLightMode={isLightMode}
                  onToggleTheme={() => setIsLightMode(!isLightMode)}
                />

                <main className="page-content">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/students" element={<Students />} />
                    <Route path="/rooms" element={<Rooms />} />
                    <Route path="/fees" element={<Fees />} />
                    <Route path="/finance" element={<Finance />} />
                    <Route path="/complaints" element={<Complaints />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </main>
              </div>
            </div>
          </div>
        </DemoDataProvider>
      </ToastProvider>
    </Router>
  );
};

export default App;
