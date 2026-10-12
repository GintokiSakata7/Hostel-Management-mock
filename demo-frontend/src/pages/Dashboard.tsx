import React, { useState } from 'react';
import {
  Users, BedDouble, AlertCircle, IndianRupee, Activity,
  CheckCircle2, TrendingUp, Sparkles, MessageSquare,
  Plus, ArrowUpRight, ArrowDownRight, ShieldCheck, Wallet
} from 'lucide-react';
import { useDemoData } from '../context/DemoDataContext';
import { useToast } from '../context/ToastContext';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { Student } from '../types';

export const Dashboard: React.FC = () => {
  const {
    settings,
    buildings,
    rooms,
    students,
    feeRecords,
    expenses,
    complaints,
    activities,
    selectedBuildingId,
    activeBuildingName,
    selectedMonth,
    sendBulkWhatsAppReminders,
  } = useDemoData();

  const { success, whatsapp } = useToast();
  const [selectedStudentForWA, setSelectedStudentForWA] = useState<Student | null>(null);

  // Filter entities according to building
  const filteredRooms = selectedBuildingId === 'all'
    ? rooms
    : rooms.filter(r => r.buildingId === selectedBuildingId);

  const filteredStudents = selectedBuildingId === 'all'
    ? students.filter(s => s.status === 'Active')
    : students.filter(s => s.status === 'Active' && s.buildingId === selectedBuildingId);

  const activeComplaints = selectedBuildingId === 'all'
    ? complaints.filter(c => c.status !== 'resolved')
    : complaints.filter(c => c.status !== 'resolved' && c.buildingId === selectedBuildingId);

  // Bed stats
  const totalBeds = filteredRooms.reduce((acc, r) => acc + r.beds.length, 0);
  const occupiedBeds = filteredRooms.reduce((acc, r) => acc + r.beds.filter(b => b.status === 'occupied').length, 0);
  const availableBeds = totalBeds - occupiedBeds;
  const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  // Financial stats for selected month
  const monthlyFees = feeRecords.filter(f => f.month === selectedMonth);
  const monthlyCollection = monthlyFees.reduce((acc, f) => acc + f.amount, 0);
  const totalExpectedRevenue = filteredStudents.reduce((acc, s) => acc + s.monthlyFee, 0);
  const pendingDues = Math.max(0, totalExpectedRevenue - monthlyCollection);

  const monthlyExpenses = expenses.filter(e => e.date.startsWith(selectedMonth));
  const totalExpenseAmount = monthlyExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = monthlyCollection - totalExpenseAmount;

  // Pending students
  const pendingStudentsList = filteredStudents.filter(s => s.feeStatus !== 'Paid');

  // Gauge circle parameters
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (occupancyPct / 100) * circumference;

  return (
    <div className="animate-fade-in dashboard-page">
      {/* Page Title & Breadcrumb */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="page-subtitle">
            Live Facility Operations · <strong>{activeBuildingName}</strong> · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Quick Bulk Reminder Trigger */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-whatsapp"
            onClick={() => sendBulkWhatsAppReminders()}
            title="Dispatch Batch WhatsApp reminders to 9491554114"
          >
            <MessageSquare size={16} />
            <span>Send Batch Reminders (+91 {settings.whatsappDemoNumber})</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="responsive-grid-4 mb-6">
        {/* Card 1: Students */}
        <div className="glass-card stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">ACTIVE RESIDENTS</span>
            <div className="stat-card-icon icon-indigo">
              <Users size={18} />
            </div>
          </div>
          <div className="stat-card-value text-indigo">{filteredStudents.length}</div>
          <div className="stat-card-footer">
            <span className="trend-badge trend-up">
              <ArrowUpRight size={13} /> 100% capacity
            </span>
            <span className="text-muted">Enrolled & Active</span>
          </div>
        </div>

        {/* Card 2: Occupancy */}
        <div className="glass-card stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">OCCUPIED BEDS</span>
            <div className="stat-card-icon icon-emerald">
              <BedDouble size={18} />
            </div>
          </div>
          <div className="stat-card-value text-emerald">
            {occupiedBeds} <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>/ {totalBeds}</span>
          </div>
          <div className="stat-card-footer">
            <span className="text-muted">{availableBeds} beds available</span>
            <span className="badge badge-success">{occupancyPct}% Occupancy</span>
          </div>
        </div>

        {/* Card 3: Monthly Collection */}
        <div className="glass-card stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">FEE COLLECTION ({selectedMonth})</span>
            <div className="stat-card-icon icon-amber">
              <IndianRupee size={18} />
            </div>
          </div>
          <div className="stat-card-value text-amber">₹{monthlyCollection.toLocaleString('en-IN')}</div>
          <div className="stat-card-footer">
            <span className="text-muted">₹{pendingDues.toLocaleString('en-IN')} outstanding</span>
            <span className="badge badge-warning">{pendingStudentsList.length} Pending</span>
          </div>
        </div>

        {/* Card 4: Net P&L */}
        <div className="glass-card stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">NET OPERATING PROFIT</span>
            <div className="stat-card-icon icon-cyan">
              <Wallet size={18} />
            </div>
          </div>
          <div className={`stat-card-value ${netProfit >= 0 ? 'text-cyan' : 'text-danger'}`}>
            ₹{netProfit.toLocaleString('en-IN')}
          </div>
          <div className="stat-card-footer">
            <span className="text-muted">Expenses: ₹{totalExpenseAmount.toLocaleString('en-IN')}</span>
            <span className="badge badge-accent">
              {monthlyCollection > 0 ? `${Math.round((netProfit / monthlyCollection) * 100)}% Margin` : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Occupancy Gauge + WhatsApp Callout + Live Feed */}
      <div className="dashboard-main-grid mb-6">
        {/* Left Column: Visual Occupancy Gauge */}
        <div className="glass-card p-6 gauge-widget">
          <div className="widget-header">
            <h3 className="widget-title">Facility Occupancy Status</h3>
            <span className="badge badge-outline">{filteredRooms.length} Total Rooms</span>
          </div>

          <div className="gauge-content">
            <div className="gauge-svg-wrapper">
              <svg width="110" height="110" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div className="gauge-label-inner">
                <span className="gauge-pct">{occupancyPct}%</span>
                <span className="gauge-sub">Full</span>
              </div>
            </div>

            <div className="gauge-stats-list">
              <div className="gauge-stat-item">
                <span className="text-muted">Total Beds in Wing:</span>
                <strong>{totalBeds}</strong>
              </div>
              <div className="gauge-stat-item">
                <span className="text-muted">Currently Occupied:</span>
                <strong style={{ color: '#10b981' }}>{occupiedBeds} Beds</strong>
              </div>
              <div className="gauge-stat-item">
                <span className="text-muted">Available for Admission:</span>
                <strong style={{ color: '#f59e0b' }}>{availableBeds} Beds</strong>
              </div>
              <div className="gauge-stat-item">
                <span className="text-muted">Active Maintenance Tickets:</span>
                <strong style={{ color: activeComplaints.length > 0 ? '#ef4444' : '#10b981' }}>
                  {activeComplaints.length} Tickets
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Center / Right Column: Interactive WhatsApp Showcase Banner */}
        <div className="glass-card p-6 wa-showcase-widget">
          <div className="wa-showcase-badge">
            <MessageSquare size={16} color="#25D366" />
            <span>Interactive WhatsApp Automation</span>
          </div>

          <h3 className="wa-showcase-title">
            Direct Client WhatsApp Redirect Demonstration
          </h3>
          <p className="wa-showcase-desc">
            All reminder dispatches, payment receipts, and automated notifications generate live 
            preformatted WhatsApp messages. Configured for demonstration to phone:
          </p>

          <div className="wa-demo-number-box">
            <span className="wa-flag">🇮🇳</span>
            <span className="wa-number">+91 {settings.whatsappDemoNumber}</span>
            <span className="badge badge-success" style={{ marginLeft: 'auto' }}>Direct Hook Active</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              className="btn btn-whatsapp"
              style={{ flex: 1 }}
              onClick={() => {
                if (pendingStudentsList.length > 0) {
                  setSelectedStudentForWA(pendingStudentsList[0]);
                } else {
                  sendBulkWhatsAppReminders();
                }
              }}
            >
              <MessageSquare size={16} />
              <span>Test Single Student Reminder</span>
            </button>
            <button
              className="btn btn-outline"
              onClick={() => sendBulkWhatsAppReminders()}
              title="Test batch notification to 9491554114"
            >
              <span>Test Batch Broadcast</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Defaulters / Reminders List + Real-time Activities */}
      <div className="dashboard-bottom-grid">
        {/* Pending Fee Reminders Quick Table */}
        <div className="glass-card p-6">
          <div className="widget-header">
            <div>
              <h3 className="widget-title">Pending Fee Dues ({selectedMonth})</h3>
              <p className="widget-subtitle">Click "Send WhatsApp" on any resident to trigger live redirection.</p>
            </div>
            <span className="badge badge-warning">{pendingStudentsList.length} Residents</span>
          </div>

          {pendingStudentsList.length === 0 ? (
            <div className="empty-state-mini">
              <CheckCircle2 size={32} color="#10b981" />
              <div>All residents have cleared dues for {selectedMonth}!</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Resident</th>
                    <th>Room</th>
                    <th>Amount Due</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>WhatsApp Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingStudentsList.slice(0, 5).map(s => {
                    const r = rooms.find(rm => rm.id === s.roomId);
                    return (
                      <tr key={s.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img
                              src={s.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt=""
                              className="avatar-sm"
                            />
                            <div>
                              <div style={{ fontWeight: 600 }}>{s.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-outline">Room {r?.roomNumber || 'N/A'}</span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#f59e0b' }}>
                          ₹{s.monthlyFee.toLocaleString('en-IN')}
                        </td>
                        <td>
                          <span className={`badge ${s.feeStatus === 'Overdue' ? 'badge-danger' : 'badge-warning'}`}>
                            {s.feeStatus}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-whatsapp btn-sm"
                            onClick={() => setSelectedStudentForWA(s)}
                            title="Open WhatsApp modal or redirect to 9491554114"
                          >
                            <MessageSquare size={13} />
                            <span>Send WA</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Live Operational Audit Feed */}
        <div className="glass-card p-6">
          <div className="widget-header">
            <h3 className="widget-title">Live System Activities</h3>
            <span className="badge badge-outline">Audit Log</span>
          </div>

          <div className="activity-feed-list">
            {activities.slice(0, 5).map(act => (
              <div key={act.id} className="activity-item">
                <div className={`activity-icon-badge act-${act.type}`}>
                  <Activity size={14} />
                </div>
                <div className="activity-content">
                  <div className="activity-top">
                    <span className="activity-title">{act.title}</span>
                    <span className="activity-time">{act.timestamp}</span>
                  </div>
                  <div className="activity-desc">{act.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WhatsApp Modal */}
      {selectedStudentForWA && (
        <WhatsAppModal
          student={selectedStudentForWA}
          onClose={() => setSelectedStudentForWA(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
