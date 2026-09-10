import { useState, useEffect } from 'react';
import { AlertCircle, Clock, CheckCircle2, MoreHorizontal, Plus, X, Home, User } from 'lucide-react';
import { useToast } from '../components/ToastContext';

export default function Complaints() {
  const { showToast } = useToast();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', student: '', priority: 'medium' });
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobileTab, setMobileTab] = useState<'pending' | 'in-progress' | 'resolved'>('pending');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchComplaints = async () => {
    try {
      const res = await fetch('/api/complaints');
      if (res.ok) setComplaints(await res.json());
    } catch (e) {
      showToast('Failed to fetch complaints', 'error');
    }
  };

  useEffect(() => { fetchComplaints(); }, []);

  const pending    = complaints.filter(c => c.status === 'pending');
  const inProgress = complaints.filter(c => c.status === 'in-progress');
  const resolved   = complaints.filter(c => c.status === 'resolved');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        showToast('Complaint registered successfully', 'success');
        setIsModalOpen(false);
        setFormData({ title: '', description: '', student: '', priority: 'medium' });
        fetchComplaints();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save complaint', 'error');
      }
    } catch (e) {
      showToast('Failed to save complaint', 'error');
    }
  };

  const changeStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/complaints/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showToast(`Moved to ${newStatus.replace('-', ' ')}`, 'info');
        setActiveDropdown(null);
        fetchComplaints();
      }
    } catch (e) {
      showToast('Failed to update status', 'error');
    }
  };

  const priorityColors: Record<string, { bg: string; color: string; border: string }> = {
    high:   { bg: 'rgba(239,68,68,0.08)',   color: 'var(--danger)',  border: 'rgba(239,68,68,0.2)'  },
    medium: { bg: 'rgba(234,179,8,0.08)',   color: 'var(--warning)', border: 'rgba(234,179,8,0.2)'  },
    low:    { bg: 'rgba(34,197,94,0.08)',   color: 'var(--success)', border: 'rgba(34,197,94,0.2)'  },
  };

  const ComplaintCard = ({ complaint }: { complaint: any }) => {
    const pc = priorityColors[complaint.priority] ?? priorityColors.medium;
    return (
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '0.75rem', position: 'relative', border: `1px solid ${pc.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{complaint.title}</h4>
          <div style={{ position: 'relative' }}>
            <button className="icon-btn-small" style={{ padding: '2px' }}
              onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === complaint.id ? null : complaint.id); }}>
              <MoreHorizontal size={16} />
            </button>
            {activeDropdown === complaint.id && (
              <div className="glass" style={{ position: 'absolute', right: 0, top: '28px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 20, minWidth: '150px', borderRadius: 12 }}>
                {['pending', 'in-progress', 'resolved'].map(s => (
                  <button key={s} className="custom-select" style={{ border: 'none', textAlign: 'left', fontSize: '0.8rem', padding: '6px 10px' }}
                    onClick={() => changeStatus(complaint.id, s)}>
                    Move to {s.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {complaint.description && (
          <p style={{ margin: '0 0 8px 0', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{complaint.description}</p>
        )}

        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <span className="room-badge" style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Home size={12} /> {complaint.room}</span>
          <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '2px 8px', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <User size={12} /> {complaint.student}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-dim)', paddingTop: '10px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600,
            background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`
          }}>
            {complaint.priority === 'high' ? <AlertCircle size={11} /> : complaint.priority === 'medium' ? <Clock size={11} /> : <CheckCircle2 size={11} />}
            {complaint.priority.toUpperCase()}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{complaint.date}</span>
        </div>
      </div>
    );
  };

  const Column = ({ title, dot, items }: { title: string; dot: string; items: any[] }) => (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
        <span className={`status-dot dot-${dot}`} />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{title}</h3>
        <span style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 }}>{items.length}</span>
      </div>
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.15)', borderRadius: 16, padding: '0.875rem', border: '1px dashed var(--border-dim)', overflowY: 'auto' }}>
        {items.length === 0
          ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '2rem 0' }}>No complaints</div>
          : items.map(c => <ComplaintCard key={c.id} complaint={c} />)}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      onClick={() => activeDropdown && setActiveDropdown(null)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Complaints & Maintenance</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>{complaints.length} total · {pending.length} pending</p>
        </div>
        <button className="primary-btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> New Complaint
        </button>
      </div>

      {/* Stats */}
      <div className="responsive-grid-3" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Pending', count: pending.length, color: 'var(--danger)' },
          { label: 'In Progress', count: inProgress.length, color: 'var(--warning)' },
          { label: 'Resolved', count: resolved.length, color: 'var(--success)' },
        ].map(({ label, count, color }) => (
          <div key={label} className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color }}>{count}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Mobile Tabs */}
      {isMobile && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: 12 }}>
          <button onClick={() => setMobileTab('pending')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: mobileTab === 'pending' ? 'var(--danger)' : 'transparent', color: mobileTab === 'pending' ? '#fff' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Pending</button>
          <button onClick={() => setMobileTab('in-progress')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: mobileTab === 'in-progress' ? 'var(--warning)' : 'transparent', color: mobileTab === 'in-progress' ? '#fff' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>In Progress</button>
          <button onClick={() => setMobileTab('resolved')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: mobileTab === 'resolved' ? 'var(--success)' : 'transparent', color: mobileTab === 'resolved' ? '#fff' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Resolved</button>
        </div>
      )}

      {/* Kanban Columns */}
      <div className={isMobile ? "" : "responsive-grid-3"} style={{ flex: 1, minHeight: 0 }}>
        {(!isMobile || mobileTab === 'pending') && <Column title="Pending" dot="danger" items={pending} />}
        {(!isMobile || mobileTab === 'in-progress') && <Column title="In Progress" dot="warning" items={inProgress} />}
        {(!isMobile || mobileTab === 'resolved') && <Column title="Resolved" dot="success" items={resolved} />}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={() => setIsModalOpen(false)}>
          <div className={isMobile ? "bottom-sheet" : "glass-heavy"} style={isMobile ? {} : { width: '100%', maxWidth: 480, padding: '2rem', borderRadius: 20, position: 'relative' }} onClick={e => e.stopPropagation()}>
            {isMobile && <div className="bottom-sheet-handle" />}
            <button className="icon-btn-small" onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: 16, right: 16 }}><X size={16} /></button>
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem' }}>Register New Complaint</h2>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Complaint Title</label>
                <input required className="custom-input" value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Broken fan" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="custom-input" rows={3} value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the issue in detail…"
                  style={{ resize: 'vertical', fontFamily: 'inherit', minHeight: 72 }} />
              </div>
              <div className="responsive-grid-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label>Student Name</label>
                  <input required className="custom-input" value={formData.student}
                    onChange={e => setFormData({ ...formData, student: e.target.value })} placeholder="e.g. Arjun Sharma" />
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select className="custom-input" value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="custom-select" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn" style={{ flex: 1, justifyContent: 'center' }}>Submit Complaint</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
