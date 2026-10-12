import React, { useState } from 'react';
import {
  AlertCircle, CheckCircle2, Clock, Plus, Filter,
  MessageSquare, Wrench, Shield, Check, X, Building2
} from 'lucide-react';
import { useDemoData } from '../context/DemoDataContext';
import { useToast } from '../context/ToastContext';
import { Complaint } from '../types';

export const Complaints: React.FC = () => {
  const {
    complaints,
    students,
    rooms,
    selectedBuildingId,
    activeBuildingName,
    settings,
    addComplaint,
    updateComplaintStatus,
  } = useDemoData();

  const { success, whatsapp } = useToast();

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'resolved'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Complaint Form
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    category: 'Wi-Fi / Internet' as Complaint['category'],
    priority: 'medium' as Complaint['priority'],
    studentId: students[0]?.id || '',
    roomId: '',
    buildingId: selectedBuildingId !== 'all' ? selectedBuildingId : 'bld-1',
  });

  // Filter complaints
  const filteredComplaints = complaints.filter(c => {
    if (selectedBuildingId !== 'all' && c.buildingId !== selectedBuildingId) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;
    return true;
  });

  const pendingCount = complaints.filter(c => c.status === 'pending').length;
  const inProgressCount = complaints.filter(c => c.status === 'in-progress').length;
  const resolvedCount = complaints.filter(c => c.status === 'resolved').length;

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.title.trim()) return;

    const student = students.find(s => s.id === newTicket.studentId);

    addComplaint({
      title: newTicket.title.trim(),
      description: newTicket.description.trim(),
      category: newTicket.category,
      priority: newTicket.priority,
      status: 'pending',
      studentId: newTicket.studentId,
      buildingId: student?.buildingId || newTicket.buildingId,
      roomId: student?.roomId || undefined,
    });

    success('Maintenance ticket created successfully!');
    setShowAddModal(false);
    setNewTicket({
      title: '',
      description: '',
      category: 'Wi-Fi / Internet',
      priority: 'medium',
      studentId: students[0]?.id || '',
      roomId: '',
      buildingId: 'bld-1',
    });
  };

  const handleSendWhatsAppUpdate = (ticket: Complaint) => {
    const student = students.find(s => s.id === ticket.studentId);
    const room = rooms.find(r => r.id === ticket.roomId);

    const msg = 
`🛠 *MAINTENANCE STATUS UPDATE - ${settings.hostelName.toUpperCase()}* 🛠
━━━━━━━━━━━━━━━━━━━━
Dear *${student?.name || 'Resident'}*,
Status update for your maintenance ticket:

🎫 *Ticket:* ${ticket.title}
📂 *Category:* ${ticket.category}
🏠 *Room:* Room ${room?.roomNumber || 'Assigned'}
⚡ *Current Status:* ${ticket.status.toUpperCase()}
${ticket.status === 'resolved' ? '✅ *Resolution:* Issue inspected and resolved by technician.' : '⏳ *Progress:* Assigned to technician.'}

Management Helpline: +91 ${settings.whatsappDemoNumber}
━━━━━━━━━━━━━━━━━━━━`;

    // Direct WhatsApp redirect to 9491554114
    const url = `https://wa.me/919491554114?text=${encodeURIComponent(msg)}`;
    whatsapp('Opening WhatsApp ticket update', `Sending status alert to +91 9491554114`);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="animate-fade-in complaints-page">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Maintenance & Complaints Helpdesk</h1>
          <p className="page-subtitle">
            Facility: <strong>{activeBuildingName}</strong> · Service Level Agreement & Grievance Resolution.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} />
          <span>+ Log Maintenance Ticket</span>
        </button>
      </div>

      {/* Top Stat Cards */}
      <div className="responsive-grid-4 mb-6">
        <div className="glass-card stat-card">
          <div className="stat-card-title">TOTAL TICKETS LOGGED</div>
          <div className="stat-card-value text-indigo">{complaints.length} Tickets</div>
          <div className="stat-card-footer text-muted">All categories</div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-card-title">PENDING TRIAGE</div>
          <div className="stat-card-value text-danger">{pendingCount} Unassigned</div>
          <div className="stat-card-footer">
            <span className="badge badge-danger">Needs Attention</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-card-title">IN PROGRESS</div>
          <div className="stat-card-value text-amber">{inProgressCount} Under Repair</div>
          <div className="stat-card-footer text-muted">Technician working on-site</div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-card-title">RESOLVED ISSUES</div>
          <div className="stat-card-value text-emerald">{resolvedCount} Solved</div>
          <div className="stat-card-footer">
            <span className="badge badge-success">
              {complaints.length > 0 ? `${Math.round((resolvedCount / complaints.length) * 100)}% SLA Rate` : '100%'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="tabs-header-row mb-4">
        <div className="tabs-pill-nav">
          <button
            className={`tab-pill-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Tickets ({complaints.length})
          </button>
          <button
            className={`tab-pill-btn ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            Pending ({pendingCount})
          </button>
          <button
            className={`tab-pill-btn ${statusFilter === 'in-progress' ? 'active' : ''}`}
            onClick={() => setStatusFilter('in-progress')}
          >
            In Progress ({inProgressCount})
          </button>
          <button
            className={`tab-pill-btn ${statusFilter === 'resolved' ? 'active' : ''}`}
            onClick={() => setStatusFilter('resolved')}
          >
            Resolved ({resolvedCount})
          </button>
        </div>

        <div className="filter-pill-select">
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority Only</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Complaints List Cards */}
      <div className="complaints-list-grid">
        {filteredComplaints.length === 0 ? (
          <div className="glass-card p-12 text-center text-muted">
            <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 12px auto' }} />
            <div>No complaints under this filter! All resident issues resolved.</div>
          </div>
        ) : (
          filteredComplaints.map(ticket => {
            const student = students.find(s => s.id === ticket.studentId);
            const room = rooms.find(r => r.id === ticket.roomId);

            return (
              <div key={ticket.id} className="glass-card complaint-card animate-scale-up">
                <div className="complaint-card-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge badge-priority-${ticket.priority}`}>
                      {ticket.priority.toUpperCase()}
                    </span>
                    <span className="badge badge-outline">{ticket.category}</span>
                  </div>

                  <span className={`badge ${
                    ticket.status === 'resolved' ? 'badge-success' :
                    ticket.status === 'in-progress' ? 'badge-warning' : 'badge-danger'
                  }`}>
                    {ticket.status}
                  </span>
                </div>

                <h3 className="complaint-title">{ticket.title}</h3>
                <p className="complaint-desc">{ticket.description}</p>

                <div className="complaint-meta-bar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img
                      src={student?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60'}
                      alt=""
                      className="avatar-xs"
                    />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{student?.name || 'Resident'}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      • Room {room?.roomNumber || 'General'}
                    </span>
                  </div>

                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Logged: {new Date(ticket.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                </div>

                {/* Status Transitions & Actions */}
                <div className="complaint-actions-row">
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {ticket.status !== 'in-progress' && ticket.status !== 'resolved' && (
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          updateComplaintStatus(ticket.id, 'in-progress');
                          success(`Ticket "${ticket.title}" moved to In Progress`);
                        }}
                      >
                        <Clock size={13} />
                        <span>In Progress</span>
                      </button>
                    )}

                    {ticket.status !== 'resolved' && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          updateComplaintStatus(ticket.id, 'resolved');
                          success(`Ticket "${ticket.title}" resolved!`);
                        }}
                      >
                        <Check size={13} />
                        <span>Resolve</span>
                      </button>
                    )}

                    {ticket.status === 'resolved' && (
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          updateComplaintStatus(ticket.id, 'pending');
                          success('Ticket re-opened');
                        }}
                      >
                        Re-open Ticket
                      </button>
                    )}
                  </div>

                  {/* Send WhatsApp status update */}
                  <button
                    className="btn btn-whatsapp btn-sm"
                    onClick={() => handleSendWhatsAppUpdate(ticket)}
                    title="Send status update to 9491554114"
                  >
                    <MessageSquare size={13} />
                    <span>Send Update</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ===================== LOG TICKET MODAL ===================== */}
      {showAddModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowAddModal(false)}>
          <div className="modal-card modal-md animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Log Maintenance Ticket</h3>
              <button className="btn-close" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateTicket}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label">TICKET TITLE / ISSUE *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Geyser not heating properly in 2nd floor bathroom"
                    value={newTicket.title}
                    onChange={e => setNewTicket({ ...newTicket, title: e.target.value })}
                  />
                </div>

                <div className="form-grid-2">
                  <div>
                    <label className="form-label">CATEGORY</label>
                    <select
                      className="form-input"
                      value={newTicket.category}
                      onChange={e => setNewTicket({ ...newTicket, category: e.target.value as any })}
                    >
                      <option value="Wi-Fi / Internet">Wi-Fi / Internet</option>
                      <option value="Plumbing & Water">Plumbing & Water</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Food & Mess">Food & Mess</option>
                      <option value="Cleaning & Hygiene">Cleaning & Hygiene</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">PRIORITY</label>
                    <select
                      className="form-input"
                      value={newTicket.priority}
                      onChange={e => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                    >
                      <option value="low">Low (General)</option>
                      <option value="medium">Medium</option>
                      <option value="high">High (Urgent)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">RESIDENT REPORTING</label>
                  <select
                    className="form-input"
                    value={newTicket.studentId}
                    onChange={e => setNewTicket({ ...newTicket, studentId: e.target.value })}
                  >
                    {students.filter(s => s.status === 'Active').map(st => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.course} • +91 {st.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">DETAILED DESCRIPTION</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Explain the technical problem..."
                    value={newTicket.description}
                    onChange={e => setNewTicket({ ...newTicket, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Complaints;
