import { useState, useEffect, useCallback } from 'react';
import {
  Search, UserPlus, Edit2, Trash2, X, IndianRupee, Calendar, Printer,
  User, BedDouble, Phone, Mail, Shield, ChevronDown, ChevronUp, Clock, Send, MessageSquare, PhoneCall,
  Upload, FileText, Camera, CheckCircle, Eye, ExternalLink
} from 'lucide-react';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';
import { PrintReceiptModal } from './Fees';

import { useSettings } from '../components/SettingsContext';

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return { value: `${y}-${m}`, label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
});

const COURSES: Record<string, string[]> = {
  'B.Tech': ['CSE', 'ECE', 'EEE', 'Mechanical', 'Civil', 'AI & DS', 'AI & ML', 'IT', 'Chemical', 'Other'],
  'B.E.': ['CSE', 'ECE', 'Mechanical', 'Civil', 'EEE', 'IT', 'Other'],
  'M.Tech': ['CSE', 'ECE', 'Mechanical', 'Civil', 'VLSI', 'Data Science', 'AI', 'Other'],
  'M.E.': ['CSE', 'Structural', 'Power Systems', 'Other'],
  'MBA': ['Finance', 'Marketing', 'HR', 'Operations', 'Business Analytics', 'General', 'Other'],
  'MCA': ['General', 'AI & ML', 'Cyber Security', 'Other'],
  'BCA': ['General', 'AI', 'Data Science', 'Other'],
  'B.Sc': ['CS', 'Mathematics', 'Physics', 'Chemistry', 'Statistics', 'Botany', 'Zoology', 'Other'],
  'M.Sc': ['CS', 'Mathematics', 'Physics', 'Chemistry', 'Statistics', 'Other'],
  'B.Com': ['General', 'Computers', 'Accounting & Finance', 'Other'],
  'M.Com': ['General', 'Finance', 'Other'],
  'Diploma': ['ECE', 'CSE', 'Mechanical', 'Civil', 'EEE', 'Other'],
};

const EMPTY_FORM = {
  name: '', gender: '', dob: '', email: '', photoUrl: '',
  course: 'B.Tech', branch: 'CSE', year: '1st', rollNumber: '',
  dateOfJoining: '', aadhar: '', aadharCardUrl: '', phone: '',
  parentName: '', parentPhone: '', parentRelationship: 'Father', parentAltPhone: '', parentAddress: '',
  emergencyName: '', emergencyPhone: '', emergencyRelationship: 'Parent',
  state: 'Andhra Pradesh', address: '', pincode: '',
  securityDeposit: '', feeStatus: 'Pending', status: 'Active',
  isOnNotice: false, noticeVacateDate: '', noticeReason: ''
};


function PaymentModal({ student, selectedMonth, onClose, onSuccess }: { student: any; selectedMonth: string; onClose: () => void; onSuccess: () => void }) {
  const { showToast } = useToast();
  const { settings } = useSettings();
  const monthlyFee = settings?.monthlyFee || 5500;
  const [form, setForm] = useState({ amount: monthlyFee, method: 'Cash', upiProvider: 'PhonePe', transactionRef: '', date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || selectedMonth;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch('/api/fees/pay', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student.dbId, month: selectedMonth, amount: form.amount, method: form.method, upiProvider: form.method === 'UPI' ? form.upiProvider : null, transactionRef: form.method === 'UPI' ? form.transactionRef : null, date: form.date })
      });
      if (res.status === 409) { const e = await res.json(); showToast(e.error, 'error'); }
      else if (res.ok) { showToast(`Payment recorded for ${monthLabel}!`, 'success'); onSuccess(); onClose(); }
      else { showToast('Payment failed', 'error'); }
    } finally { setSaving(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title="Record Fee Payment">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ fontWeight: 700 }}>{student.name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{student.room} · Month: <strong style={{ color: 'var(--primary)' }}>{monthLabel}</strong></div>
        </div>
        <div className="form-group"><label>Amount (₹)</label>
          <input type="number" required className="custom-input" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} /></div>
        <div className="form-group"><label>Payment Method</label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {['Cash', 'UPI'].map(m => (
              <button key={m} type="button" onClick={() => setForm({ ...form, method: m })}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '2px solid', borderColor: form.method === m ? 'var(--primary)' : 'var(--border-dim)', background: form.method === m ? 'rgba(249,115,22,0.1)' : 'transparent', color: form.method === m ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                {m === 'Cash' ? '💵 Cash' : '📱 UPI'}
              </button>
            ))}
          </div>
        </div>
        {form.method === 'UPI' && (<>
          <div className="form-group"><label>UPI Provider</label>
            <select className="custom-input" value={form.upiProvider} onChange={e => setForm({ ...form, upiProvider: e.target.value })}>
              <option>PhonePe</option><option>Google Pay</option><option>Paytm</option><option>Other UPI</option>
            </select></div>
          <div className="form-group"><label>Transaction / Reference ID</label>
            <input className="custom-input" value={form.transactionRef} onChange={e => setForm({ ...form, transactionRef: e.target.value })} placeholder="e.g. 4231896XXXX" /></div>
        </>)}
        <div className="form-group"><label>Payment Date</label>
          <input type="date" required className="custom-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" className="custom-select" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-btn" style={{ flex: 1, justifyContent: 'center' }} disabled={saving}>{saving ? 'Saving…' : '✓ Confirm'}</button>
        </div>
      </form>
    </Modal>
  );
}

function StudentDetailCard({ student, selectedMonth, onClose, onRefresh, isMobile, onSendReminder, onPreviewDoc }: { student: any; selectedMonth: string; onClose: () => void; onRefresh: () => void; isMobile: boolean; onSendReminder?: (student: any) => void; onPreviewDoc: (url: string) => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'docs' | 'notice' | 'history'>('overview');
  const { showToast } = useToast();
  const { settings } = useSettings();
  const monthlyFee = settings?.monthlyFee || 5500;
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const [noticeForm, setNoticeForm] = useState({
    isOnNotice: student.isOnNotice || false,
    noticeVacateDate: student.noticeVacateDate || '',
    noticeReason: student.noticeReason || ''
  });
  const [updatingNotice, setUpdatingNotice] = useState(false);

  const handleUpdateNoticeStatus = async () => {
    setUpdatingNotice(true);
    try {
      const res = await fetch(`/api/students/${student.dbId}/notice`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noticeForm)
      });
      if (res.ok) {
        showToast('Notice period status updated successfully!', 'success');
        onRefresh();
      } else {
        showToast('Failed to update notice status', 'error');
      }
    } catch (e: any) {
      showToast('Update error: ' + e.message, 'error');
    } finally {
      setUpdatingNotice(false);
    }
  };

  const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || selectedMonth;
  const feeRecord = student.fees?.find((f: any) => f.month === selectedMonth);
  const isPaidThisMonth = !!feeRecord;

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 2000 }}
        onClick={onClose}>
        <div className={isMobile ? 'bottom-sheet' : 'glass-heavy'} style={isMobile ? { maxHeight: '92vh', overflowY: 'auto' } : { width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto', padding: '1.75rem', position: 'relative', borderRadius: 24, margin: '1rem', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}
          onClick={e => e.stopPropagation()}>
          {isMobile && <div className="bottom-sheet-handle" />}
          
          {/* Close Button */}
          <button className="icon-btn-small" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }}><X size={18} /></button>

          {/* Profile Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.25rem', paddingRight: '2rem' }}>
            <div style={{ position: 'relative' }}>
              {student.photoUrl ? (
                <img 
                  src={student.photoUrl} 
                  alt={student.name} 
                  onClick={() => onPreviewDoc(student.photoUrl)}
                  title="Click to inspect photo"
                  style={{ width: 76, height: 76, borderRadius: 22, objectFit: 'cover', border: '2px solid var(--primary)', boxShadow: '0 8px 24px rgba(249,115,22,0.35)', flexShrink: 0, cursor: 'pointer' }} 
                />
              ) : (
                <div style={{ width: 76, height: 76, borderRadius: 22, background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', fontWeight: 800, color: '#fff', boxShadow: '0 8px 24px rgba(249,115,22,0.35)', flexShrink: 0 }}>
                  {student.name.charAt(0).toUpperCase()}
                </div>
              )}
              {student.isOnNotice && (
                <span title="Student on Notice Period" style={{ position: 'absolute', bottom: -4, right: -4, background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: 8, border: '2px solid #000' }}>
                  NOTICE
                </span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>{student.name}</h2>
                <span className="status-badge badge-available" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>{student.status}</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 3 }}>
                {student.course}{student.branch ? ` · ${student.branch}` : ''} ({student.year || '1st'} Year)
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: 8, alignItems: 'center' }}>
                {student.room !== 'Unallocated' ? (
                  <span className="room-badge" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)', padding: '3px 10px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700 }}>
                    🏠 Room {student.room}
                  </span>
                ) : (
                  <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '3px 10px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600 }}>
                    Unallocated
                  </span>
                )}
                {student.phone && (
                  <a href={`tel:${student.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', padding: '3px 10px', borderRadius: 8, fontSize: '0.78rem', textDecoration: 'none', fontWeight: 500 }}>
                    <Phone size={12} /> Call
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Monthly Fee Banner Widget */}
          <div style={{ 
            borderRadius: 16, 
            padding: '1.1rem 1.25rem', 
            background: isPaidThisMonth 
              ? 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(16,185,129,0.05) 100%)' 
              : 'linear-gradient(135deg, rgba(249,115,22,0.18) 0%, rgba(234,179,8,0.08) 100%)', 
            border: `1px solid ${isPaidThisMonth ? 'rgba(34,197,94,0.35)' : 'rgba(249,115,22,0.4)'}`, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginBottom: '1.25rem',
            boxShadow: isPaidThisMonth ? '0 4px 20px rgba(34,197,94,0.1)' : '0 4px 20px rgba(249,115,22,0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: 44, 
                height: 44, 
                borderRadius: 12, 
                background: isPaidThisMonth ? 'rgba(34,197,94,0.2)' : 'rgba(249,115,22,0.2)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: isPaidThisMonth ? '#4ade80' : '#fb923c' 
              }}>
                <IndianRupee size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isPaidThisMonth ? '#4ade80' : '#fb923c', letterSpacing: '0.01em' }}>
                  {isPaidThisMonth ? '✓ Fee Paid' : '⚡ Fee Pending'}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>For {monthLabel}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ textAlign: 'right', marginRight: 4 }}>
                <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#fff' }}>₹{monthlyFee.toLocaleString()}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Due 10th</div>
              </div>

              {isPaidThisMonth ? (
                <button className="primary-btn" title="Print Receipt" onClick={() => setShowReceipt(true)} style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.4)', padding: '7px 12px', fontSize: '0.82rem', gap: '6px' }}>
                  <Printer size={15} /> Receipt
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '6px' }}>
                  {onSendReminder && (
                    <button className="icon-btn-small" title="Send Fee Reminder (Voice & Text)" onClick={() => onSendReminder(student)} style={{ background: 'rgba(249,115,22,0.2)', color: 'var(--primary)', border: '1px solid rgba(249,115,22,0.4)', width: 36, height: 36 }}>
                      <Send size={15} />
                    </button>
                  )}
                  <button className="primary-btn" style={{ padding: '7px 16px', fontSize: '0.82rem', gap: '6px' }} onClick={() => setShowPayment(true)}>
                    <IndianRupee size={14} /> Pay Now
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: 12, border: '1px solid var(--border-dim)', marginBottom: '1.25rem', gap: '4px' }}>
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'docs', label: 'Documents & Family', icon: Shield },
              { id: 'notice', label: 'Notice Period', icon: Clock, badge: student.isOnNotice ? 'Active' : undefined },
              { id: 'history', label: 'Payments', icon: Calendar, count: student.fees?.length || 0 },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 10px',
                    borderRadius: 9,
                    border: 'none',
                    background: isActive ? 'var(--primary)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--text-muted)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.62rem', fontWeight: 800, padding: '1px 5px', borderRadius: 6 }}>
                      {tab.badge}
                    </span>
                  )}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span style={{ background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.65rem', padding: '1px 6px', borderRadius: 10 }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TAB CONTENT 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="responsive-grid-2" style={{ gap: '0.75rem' }}>
                {[
                  { icon: Phone, label: 'Mobile Number', value: student.phone || '—', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
                  { icon: Mail, label: 'Email Address', value: student.email || '—', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
                  { icon: BedDouble, label: 'Room Allotted', value: student.room, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
                  { icon: Calendar, label: 'Date of Joining', value: student.dateOfJoining ? new Date(student.dateOfJoining).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
                  { icon: Clock, label: 'Monthly Due Day', value: student.dueDayLabel ? `${student.dueDayLabel} of month` : '10th of month', color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
                  { icon: Shield, label: 'Aadhaar ID', value: student.aadhar ? `•••• •••• ${student.aadhar.slice(-4)}` : '—', color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
                ].map(({ icon: Icon, label, value, color, bg }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 500, marginBottom: 2 }}>{label}</div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB CONTENT 2: DOCUMENTS & FAMILY */}
          {activeTab === 'docs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Aadhaar Card Document */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={18} color="var(--primary)" />
                    <span>Aadhaar Card Attachment</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {student.aadhar ? `Aadhaar: ${student.aadhar}` : 'No Aadhaar ID'}
                  </span>
                </div>

                {student.aadharCardUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 12, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(249,115,22,0.2)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>Verified Identity Document</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click to view or inspect image/PDF</div>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => onPreviewDoc(student.aadharCardUrl)} 
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(249,115,22,0.3)' }}
                    >
                      <Eye size={15} /> Preview
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 10 }}>
                    No Aadhaar document uploaded for this student yet.
                  </div>
                )}
              </div>

              {/* Family & Emergency Contact */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} color="#3b82f6" />
                  <span>Parent & Guardian Information</span>
                </div>
                <div className="responsive-grid-2" style={{ gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: 10 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Parent / Guardian Name</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff', marginTop: 2 }}>{student.parentName || '—'}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: 10 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Parent Phone</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff', marginTop: 2, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {student.parentPhone ? (
                        <a href={`tel:${student.parentPhone}`} style={{ color: '#60a5fa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={13} /> {student.parentPhone}
                        </a>
                      ) : '—'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: 10 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>State</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff', marginTop: 2 }}>{student.state || '—'}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: 10 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pincode</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff', marginTop: 2 }}>{student.pincode || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT 3: NOTICE PERIOD */}
          {activeTab === 'notice' && (
            <div style={{ background: noticeForm.isOnNotice ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '16px', border: `1px solid ${noticeForm.isOnNotice ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.08)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: noticeForm.isOnNotice ? '#ef4444' : '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} color={noticeForm.isOnNotice ? '#ef4444' : 'var(--primary)'} />
                  <span>Notice Period & Departure Status</span>
                </div>
                {noticeForm.isOnNotice ? (
                  <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 800, background: 'rgba(239,68,68,0.18)', padding: '3px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)' }}>
                    ⚠️ Vacating Hostel
                  </span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600, background: 'rgba(34,197,94,0.12)', padding: '3px 10px', borderRadius: 8 }}>
                    Active Resident
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: 12 }}>
                  <input 
                    type="checkbox" 
                    checked={noticeForm.isOnNotice} 
                    onChange={e => setNoticeForm({ ...noticeForm, isOnNotice: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span>Student has submitted Notice / Plans to Vacate Hostel</span>
                </label>

                {noticeForm.isOnNotice && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 4 }}>
                    <div className="responsive-grid-2" style={{ gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 500 }}>Expected Vacating Date</label>
                        <input 
                          type="date" 
                          className="custom-input" 
                          style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                          value={noticeForm.noticeVacateDate} 
                          onChange={e => setNoticeForm({ ...noticeForm, noticeVacateDate: e.target.value })} 
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 500 }}>Quick Shortcut Preset</label>
                        <button 
                          type="button" 
                          className="custom-select"
                          style={{ width: '100%', padding: '8px', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          onClick={() => {
                            const nextM = new Date();
                            nextM.setMonth(nextM.getMonth() + 1);
                            const lastDay = new Date(nextM.getFullYear(), nextM.getMonth() + 1, 0).getDate();
                            nextM.setDate(lastDay);
                            setNoticeForm({ ...noticeForm, noticeVacateDate: nextM.toISOString().split('T')[0] });
                          }}
                        >
                          🗓️ End of Next Month
                        </button>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 500 }}>Vacating Reason / Notes</label>
                      <input 
                        className="custom-input" 
                        style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                        value={noticeForm.noticeReason} 
                        onChange={e => setNoticeForm({ ...noticeForm, noticeReason: e.target.value })} 
                        placeholder="e.g. Course completed / Relocating next month" 
                      />
                    </div>
                  </div>
                )}

                <div style={{ textAlign: 'right', marginTop: 6 }}>
                  <button 
                    type="button" 
                    className="primary-btn" 
                    disabled={updatingNotice}
                    onClick={handleUpdateNoticeStatus}
                    style={{ padding: '8px 20px', fontSize: '0.85rem' }}
                  >
                    {updatingNotice ? 'Saving Changes…' : '✓ Save Notice Status'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT 4: PAYMENT HISTORY */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(student.fees || []).length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '2rem', background: 'rgba(0,0,0,0.2)', borderRadius: 14 }}>
                  No payment records found for this student yet.
                </div>
              ) : (
                (student.fees || []).map((f: any) => (
                  <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(34,197,94,0.2)' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{f.monthLabel}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginTop: 2 }}>{f.date} · {f.method}{f.upiProvider ? ` (${f.upiProvider})` : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#4ade80' }}>₹{Number(f.amount).toLocaleString()}</div>
                        <span style={{ fontSize: '0.68rem', color: '#4ade80', fontWeight: 600 }}>✓ Paid</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {showPayment && <PaymentModal student={student} selectedMonth={selectedMonth} onClose={() => setShowPayment(false)} onSuccess={() => { setShowPayment(false); onRefresh(); }} />}
      {showReceipt && feeRecord && <PrintReceiptModal record={{ ...feeRecord, name: student.name, room: student.room, phone: student.phone, parentPhone: student.parentPhone, address: student.address, paymentDate: feeRecord.date }} onClose={() => setShowReceipt(false)} />}
    </>
  );
}

// ─── Admission Form ───────────────────────────────────────────────────────────
const F = ({ label, col, hint, error, children }: { label: string; col?: boolean; hint?: string; error?: string; children: React.ReactNode }) => (
  <div className="form-group" style={col ? { gridColumn: '1/-1' } : {}}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
      <label style={{ fontSize: '0.8rem', margin: 0, color: error ? '#ef4444' : 'var(--text-muted)', fontWeight: error ? 600 : 500 }}>{label}</label>
      {hint && !error && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{hint}</span>}
    </div>
    {children}
    {error && (
      <div style={{ color: '#ef4444', fontSize: '0.73rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: '4px', animation: 'fadeIn 0.2s ease-out' }}>
        <span style={{ fontSize: '0.8rem' }}>⚠️</span> <span>{error}</span>
      </div>
    )}
  </div>
);

function AdmissionForm({ student, onClose, onSave, isMobile, onPreviewDoc }: { student: any; onClose: () => void; onSave: () => void; isMobile: boolean; onPreviewDoc: (url: string) => void }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(student ? { ...EMPTY_FORM, ...student, dob: student.dob ? student.dob.split('T')[0] : '', dateOfJoining: student.dateOfJoining ? student.dateOfJoining.split('T')[0] : '' } : { ...EMPTY_FORM, dateOfJoining: new Date().toISOString().split('T')[0] });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingAadhar, setUploadingAadhar] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('Personal Details');

  const branches = COURSES[form.course] || ['Other'];

  const validateSingleField = (key: string, val: any): string => {
    const v = (val || '').toString().trim();
    switch (key) {
      case 'name':
        if (!v) return 'Full name is required';
        if (v.length < 2) return 'Full name must be at least 2 characters';
        return '';
      case 'gender':
        if (!v) return 'Please select student gender';
        return '';
      case 'phone':
        if (!v) return 'Phone number is required';
        if (!/^[6-9]\d{9}$/.test(v)) return 'Must be a valid 10-digit mobile number starting with 6-9';
        return '';
      case 'email':
        if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Must be a valid email address (e.g. name@domain.com)';
        return '';
      case 'parentPhone':
        if (v && !/^[6-9]\d{9}$/.test(v)) return 'Must be a valid 10-digit mobile number starting with 6-9';
        return '';
      case 'parentAltPhone':
        if (v && !/^[6-9]\d{9}$/.test(v)) return 'Must be a valid 10-digit mobile number starting with 6-9';
        return '';
      case 'emergencyPhone':
        if (v && !/^[6-9]\d{9}$/.test(v)) return 'Must be a valid 10-digit mobile number starting with 6-9';
        return '';
      case 'aadhar':
        if (v && !/^\d{12}$/.test(v)) return 'Must be an exact 12-digit Aadhaar number';
        return '';
      case 'pincode':
        if (v && !/^\d{6}$/.test(v)) return 'Must be a 6-digit pincode';
        return '';
      case 'dateOfJoining':
        if (!v) return 'Date of joining is required';
        return '';
      default:
        return '';
    }
  };

  const getFieldError = (key: string): string => {
    if (!touched[key]) return '';
    return validateSingleField(key, form[key]);
  };

  const handleFieldBlur = (key: string) => {
    setTouched(prev => ({ ...prev, [key]: true }));
  };

  const f = (key: string, val: any) => {
    setForm((prev: any) => ({
      ...prev,
      [key]: val,
      ...(key === 'course' ? { branch: (COURSES[val] || ['Other'])[0] } : {})
    }));
    setTouched(prev => ({ ...prev, [key]: true }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'photoUrl' | 'aadharCardUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      showToast('File size must be under 12MB', 'error');
      return;
    }

    const isPhoto = field === 'photoUrl';
    if (isPhoto) setUploadingPhoto(true);
    else setUploadingAadhar(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        // Instant local preview in form state
        f(field, base64Data);

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, fileData: base64Data })
        });
        if (res.ok) {
          const data = await res.json();
          f(field, data.url);
          showToast(isPhoto ? 'Student photo uploaded successfully!' : 'Aadhaar document attached successfully!', 'success');
        } else {
          showToast('Failed to upload file to server', 'error');
        }
        if (isPhoto) setUploadingPhoto(false);
        else setUploadingAadhar(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      showToast('Upload error: ' + err.message, 'error');
      if (isPhoto) setUploadingPhoto(false);
      else setUploadingAadhar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const allKeys = ['name', 'gender', 'phone', 'email', 'parentPhone', 'parentAltPhone', 'emergencyPhone', 'aadhar', 'pincode', 'dateOfJoining'];
    const newTouched: Record<string, boolean> = {};
    let firstErrorSection: string | null = null;
    let hasError = false;

    allKeys.forEach(k => {
      newTouched[k] = true;
      const err = validateSingleField(k, form[k]);
      if (err && !hasError) {
        hasError = true;
        if (['name', 'gender', 'phone', 'email'].includes(k)) firstErrorSection = 'Personal Details';
        else if (['parentPhone', 'parentAltPhone'].includes(k)) firstErrorSection = 'Parent / Guardian Information';
        else if (['emergencyPhone'].includes(k)) firstErrorSection = 'Emergency Contact';
        else if (['aadhar', 'pincode'].includes(k)) firstErrorSection = 'Address & Identification';
        else if (['dateOfJoining'].includes(k)) firstErrorSection = 'Admission Details';
      }
    });

    setTouched(newTouched);

    if (hasError) {
      if (firstErrorSection && isMobile) setExpandedSection(firstErrorSection);
      showToast('Please resolve the highlighted field errors below', 'error');
      return;
    }

    setSaving(true);
    try {
      const url = student ? `/api/students/${student.dbId}` : '/api/students';
      const res = await fetch(url, { method: student ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) { showToast(student ? 'Student updated!' : 'Student added!', 'success'); onSave(); onClose(); }
      else { const e = await res.json(); showToast(e.error || 'Failed to save student details', 'error'); }
    } finally { setSaving(false); }
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <div style={{ marginBottom: '1.5rem' }}>
      <div 
        onClick={() => isMobile && setExpandedSection(expandedSection === title ? null : title)}
        style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: isMobile ? 'pointer' : 'default' }}>
        <div style={{ height: 1, flex: 1, background: 'var(--border-dim)' }} />
        {title}
        {isMobile && (expandedSection === title ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
        <div style={{ height: 1, flex: 1, background: 'var(--border-dim)' }} />
      </div>
      {(!isMobile || expandedSection === title) && (
        <div className="responsive-grid-2" style={{ gap: '0.85rem' }}>{children}</div>
      )}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 2000 }}
      onClick={onClose}>
      <div className={isMobile ? 'bottom-sheet' : 'glass-heavy'} style={isMobile ? { height: '90vh' } : { width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative', borderRadius: 20, margin: '1rem' }}
        onClick={e => e.stopPropagation()}>
        {isMobile && <div className="bottom-sheet-handle" />}
        <button className="icon-btn-small" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16 }}><X size={18} /></button>
        <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem' }}>{student ? 'Edit Student' : 'Add New Student'}</h2>
        <form onSubmit={handleSubmit} noValidate>
          {renderSection('Personal Details', (
            <>
              {/* Student Photo Upload Box */}
              <F label="Student Passport Photo" col>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: 12, border: '1px dashed var(--border-dim)' }}>
                  {form.photoUrl ? (
                    <div style={{ position: 'relative' }}>
                      <img src={form.photoUrl} alt="Preview" onClick={() => onPreviewDoc(form.photoUrl)} title="Click to inspect photo" style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover', border: '2px solid var(--primary)', cursor: 'pointer' }} />
                      <button type="button" onClick={() => f('photoUrl', '')} style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ width: 64, height: 64, borderRadius: 14, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      <Camera size={26} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 2 }}>{form.photoUrl ? 'Photo Uploaded' : 'Upload Student Passport Photo'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>JPG, PNG or WebP formats accepted</div>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.4)', borderRadius: 8, color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                      <Upload size={14} />
                      <span>{uploadingPhoto ? 'Uploading photo…' : form.photoUrl ? 'Change Photo' : 'Select Photo File'}</span>
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'photoUrl')} style={{ display: 'none' }} disabled={uploadingPhoto} />
                    </label>
                  </div>
                </div>
              </F>

              <F label="Full Name *" error={getFieldError('name')}>
                <input 
                  required 
                  className={`custom-input ${getFieldError('name') ? 'input-error' : ''}`} 
                  value={form.name} 
                  onChange={e => f('name', e.target.value)} 
                  onBlur={() => handleFieldBlur('name')} 
                  placeholder="Student's full name" 
                />
              </F>
              <F label="Gender *" error={getFieldError('gender')}>
                <select 
                  required 
                  className={`custom-input ${getFieldError('gender') ? 'input-error' : ''}`} 
                  value={form.gender} 
                  onChange={e => f('gender', e.target.value)} 
                  onBlur={() => handleFieldBlur('gender')}
                >
                  <option value="">Select Gender</option><option>Male</option><option>Female</option><option>Other</option>
                </select>
              </F>
              <F label="Date of Birth"><input type="date" className="custom-input" value={form.dob} onChange={e => f('dob', e.target.value)} /></F>
              <F label="Phone Number *" error={getFieldError('phone')} hint="10-digit mobile">
                <input 
                  required 
                  className={`custom-input ${getFieldError('phone') ? 'input-error' : ''}`} 
                  value={form.phone} 
                  onChange={e => f('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} 
                  onBlur={() => handleFieldBlur('phone')} 
                  placeholder="10-digit mobile number" 
                  maxLength={10} 
                />
              </F>
              <F label="Email Address" error={getFieldError('email')}>
                <input 
                  type="email" 
                  className={`custom-input ${getFieldError('email') ? 'input-error' : ''}`} 
                  value={form.email} 
                  onChange={e => f('email', e.target.value)} 
                  onBlur={() => handleFieldBlur('email')} 
                  placeholder="Student email address" 
                />
              </F>
            </>
          ))}
          {renderSection('Academic Details', (
            <>
              <F label="Course">
                <select className="custom-input" value={form.course} onChange={e => f('course', e.target.value)}>
                  {Object.keys(COURSES).map(c => <option key={c}>{c}</option>)}
                </select>
              </F>
              <F label="Branch / Specialization">
                <select className="custom-input" value={form.branch} onChange={e => f('branch', e.target.value)}>
                  {branches.map(b => <option key={b}>{b}</option>)}
                </select>
              </F>
              <F label="Year of Study">
                <select className="custom-input" value={form.year} onChange={e => f('year', e.target.value)}>
                  <option>1st</option><option>2nd</option><option>3rd</option><option>4th</option><option>5th</option><option>Other</option>
                </select>
              </F>
              <F label="Roll / ID Number"><input className="custom-input" value={form.rollNumber} onChange={e => f('rollNumber', e.target.value)} placeholder="College ID / Roll No." /></F>
            </>
          ))}
          {renderSection('Admission Details', (
            <>
              <F label="Date of Joining *" error={getFieldError('dateOfJoining')}>
                <input 
                  type="date" 
                  required 
                  className={`custom-input ${getFieldError('dateOfJoining') ? 'input-error' : ''}`} 
                  value={form.dateOfJoining} 
                  onChange={e => f('dateOfJoining', e.target.value)} 
                  onBlur={() => handleFieldBlur('dateOfJoining')} 
                />
              </F>
              <F label="Security Deposit (₹)"><input type="number" min="0" step="100" className="custom-input" value={form.securityDeposit} onChange={e => f('securityDeposit', e.target.value)} placeholder="e.g. 5000" /></F>
              
              <F label="Notice Period / Vacating Hostel" col>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--border-dim)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                    <input 
                      type="checkbox" 
                      checked={form.isOnNotice} 
                      onChange={e => f('isOnNotice', e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <span>Student is on Notice Period / Plans to Vacate Hostel</span>
                  </label>
                  {form.isOnNotice && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: 10, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Expected Vacating Date</label>
                        <input type="date" className="custom-input" value={form.noticeVacateDate} onChange={e => f('noticeVacateDate', e.target.value)} />
                      </div>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Reason for Leaving</label>
                        <input className="custom-input" value={form.noticeReason} onChange={e => f('noticeReason', e.target.value)} placeholder="e.g. Course completed / Relocating" />
                      </div>
                    </div>
                  )}
                </div>
              </F>
            </>
          ))}
          {renderSection('Parent / Guardian Information', (
            <>
              <F label="Parent / Guardian Name"><input className="custom-input" value={form.parentName} onChange={e => f('parentName', e.target.value)} placeholder="Full name" /></F>
              <F label="Relationship">
                <select className="custom-input" value={form.parentRelationship} onChange={e => f('parentRelationship', e.target.value)}>
                  <option>Father</option><option>Mother</option><option>Guardian</option><option>Other</option>
                </select>
              </F>
              <F label="Contact Number" error={getFieldError('parentPhone')} hint="10-digit mobile">
                <input 
                  className={`custom-input ${getFieldError('parentPhone') ? 'input-error' : ''}`} 
                  value={form.parentPhone} 
                  onChange={e => f('parentPhone', e.target.value.replace(/\D/g, '').slice(0, 10))} 
                  onBlur={() => handleFieldBlur('parentPhone')} 
                  placeholder="10-digit mobile number" 
                  maxLength={10} 
                />
              </F>
              <F label="Alternate Number" error={getFieldError('parentAltPhone')} hint="10-digit mobile">
                <input 
                  className={`custom-input ${getFieldError('parentAltPhone') ? 'input-error' : ''}`} 
                  value={form.parentAltPhone} 
                  onChange={e => f('parentAltPhone', e.target.value.replace(/\D/g, '').slice(0, 10))} 
                  onBlur={() => handleFieldBlur('parentAltPhone')} 
                  placeholder="10-digit alternate mobile" 
                  maxLength={10} 
                />
              </F>
              <F label="Parent Address" col><input className="custom-input" value={form.parentAddress} onChange={e => f('parentAddress', e.target.value)} placeholder="Full address" /></F>
            </>
          ))}
          {renderSection('Emergency Contact', (
            <>
              <F label="Contact Name"><input className="custom-input" value={form.emergencyName} onChange={e => f('emergencyName', e.target.value)} placeholder="Emergency contact name" /></F>
              <F label="Relationship"><input className="custom-input" value={form.emergencyRelationship} onChange={e => f('emergencyRelationship', e.target.value)} placeholder="e.g. Uncle" /></F>
              <F label="Phone Number" col error={getFieldError('emergencyPhone')} hint="10-digit mobile">
                <input 
                  className={`custom-input ${getFieldError('emergencyPhone') ? 'input-error' : ''}`} 
                  value={form.emergencyPhone} 
                  onChange={e => f('emergencyPhone', e.target.value.replace(/\D/g, '').slice(0, 10))} 
                  onBlur={() => handleFieldBlur('emergencyPhone')} 
                  placeholder="10-digit emergency mobile" 
                  maxLength={10} 
                />
              </F>
            </>
          ))}
          {renderSection('Address & Identification', (
            <>
              <F label="Aadhaar Number" error={getFieldError('aadhar')} hint="12-digit UID">
                <input 
                  className={`custom-input ${getFieldError('aadhar') ? 'input-error' : ''}`} 
                  value={form.aadhar} 
                  onChange={e => f('aadhar', e.target.value.replace(/\D/g, '').slice(0, 12))} 
                  onBlur={() => handleFieldBlur('aadhar')} 
                  placeholder="12-digit Aadhaar number" 
                  maxLength={12} 
                />
              </F>
              
              {/* Aadhaar Card Document Attachment Box */}
              <F label="Aadhaar Card Document Attachment" col>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: 12, border: '1px dashed var(--border-dim)' }}>
                  {form.aadharCardUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <FileText size={24} color="var(--primary)" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={14} /> Document Attached
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {form.aadharCardUrl}
                        </div>
                      </div>
                      <button type="button" onClick={() => onPreviewDoc(form.aadharCardUrl)} style={{ color: 'var(--primary)', background: 'none', border: 'none', padding: 0, fontSize: '0.78rem', fontWeight: 600, textDecoration: 'underline', marginRight: 8, cursor: 'pointer' }}>View</button>
                      <button type="button" onClick={() => f('aadharCardUrl', '')} style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Remove</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <FileText size={20} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 2 }}>Upload Aadhaar Card / ID Proof</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6 }}>Upload image (JPG/PNG) or PDF copy of Aadhaar Card</div>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border-dim)', borderRadius: 8, color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                          <Upload size={13} />
                          <span>{uploadingAadhar ? 'Uploading document…' : 'Attach Aadhaar File'}</span>
                          <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, 'aadharCardUrl')} style={{ display: 'none' }} disabled={uploadingAadhar} />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </F>

              <F label="State">
                <select className="custom-input" value={form.state} onChange={e => f('state', e.target.value)}>
                  <option value="">Select State</option>
                  <option>Andhra Pradesh</option><option>Telangana</option><option>Tamil Nadu</option>
                  <option>Karnataka</option><option>Kerala</option><option>Maharashtra</option>
                  <option>Gujarat</option><option>Rajasthan</option><option>Delhi</option><option>Other</option>
                </select>
              </F>
              <F label="Address" col><input className="custom-input" value={form.address} onChange={e => f('address', e.target.value)} placeholder="Full address" /></F>
              <F label="Pincode" error={getFieldError('pincode')} hint="6-digit pincode">
                <input 
                  className={`custom-input ${getFieldError('pincode') ? 'input-error' : ''}`} 
                  value={form.pincode} 
                  onChange={e => f('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} 
                  onBlur={() => handleFieldBlur('pincode')} 
                  placeholder="6-digit pincode" 
                  maxLength={6} 
                />
              </F>
            </>
          ))}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="custom-select" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" style={{ flex: 1, justifyContent: 'center' }} disabled={saving || uploadingPhoto || uploadingAadhar}>
              {saving ? 'Saving…' : student ? 'Update Student' : '+ Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Students Component ──────────────────────────────────────────────────
export default function Students() {
  const { showToast } = useToast();
  const { settings } = useSettings();
  const monthlyFee = settings?.monthlyFee || 5500;
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0].value);

  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [feeFilter, setFeeFilter] = useState<'all' | 'Paid' | 'Pending'>('all');

  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [viewingStudent, setViewingStudent] = useState<any>(null);
  const [payingStudent, setPayingStudent] = useState<any>(null);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [reminderResultModal, setReminderResultModal] = useState<any | null>(null);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students?month=${selectedMonth}`);
      if (res.ok) setStudents(await res.json());
    } catch (e) { showToast('Failed to fetch students', 'error'); }
    finally { setLoading(false); }
  }, [selectedMonth]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleSendIndividualReminder = async (student: any) => {
    const studentId = student.dbId || student.id;
    if (!studentId) return;
    setSendingReminderId(studentId);
    try {
      const res = await fetch(`/api/reminders/student/${studentId}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`🎙️ Voice & Text reminder sent to ${student.name}!`, 'success');
        setReminderResultModal(data.result);
      } else {
        showToast(data.message || data.error || 'Failed to send reminder', 'error');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setSendingReminderId(null);
    }
  };

  const handleDelete = async (dbId: string) => {
    if (!confirm('Delete this student permanently?')) return;
    try {
      await fetch(`/api/students/${dbId}`, { method: 'DELETE' });
      showToast('Student deleted', 'success'); fetchStudents();
    } catch (e) { showToast('Delete failed', 'error'); }
  };

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.room || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCourse = courseFilter === 'all' || s.course.toLowerCase().includes(courseFilter.toLowerCase());
    const matchFee = feeFilter === 'all' || s.feeStatus === feeFilter;
    return matchSearch && matchCourse && matchFee;
  }).sort((a, b) => {
    if (a.feeStatus !== b.feeStatus) {
      return a.feeStatus === 'Pending' ? -1 : 1;
    }
    const countA = a.pendingMonthsCount || 0;
    const countB = b.pendingMonthsCount || 0;
    if (countB !== countA) {
      return countB - countA;
    }
    return a.name.localeCompare(b.name);
  });

  const paidCount = students.filter(s => s.feeStatus === 'Paid').length;
  const pendingCount = students.filter(s => s.feeStatus === 'Pending').length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: '0 0 4px 0' }}>Student Management</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>{students.length} students · Monthly fee ₹{monthlyFee.toLocaleString()}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Month selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-dim)', borderRadius: 10, padding: '8px 12px' }}>
            <Calendar size={14} color="var(--primary)" />
            <select className="custom-select" style={{ background: 'transparent', border: 'none', padding: 0, color: 'var(--text-main)', fontSize: '0.85rem' }}
              value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <button className="primary-btn" onClick={() => { setEditingStudent(null); setShowForm(true); }}>
            <UserPlus size={16} /> Add Student
          </button>
        </div>
      </div>

      {/* Stats chips */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Students', value: students.length, color: 'var(--primary)' },
          { label: 'Paid', value: paidCount, color: 'var(--success)' },
          { label: 'Pending', value: pendingCount, color: 'var(--warning)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-dim)', borderRadius: 12, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color, fontWeight: 700, fontSize: '1.1rem' }}>{value}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
            <Search size={16} color="var(--text-muted)" />
            <input placeholder="Search by name or room…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <select className="custom-select" value={courseFilter} onChange={e => setCourseFilter(e.target.value)}>
            <option value="all">All Courses</option>
            {Object.keys(COURSES).map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['all', 'Paid', 'Pending'] as const).map(f => (
              <button key={f} onClick={() => setFeeFilter(f)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s', borderColor: feeFilter === f ? 'var(--primary)' : 'var(--border-dim)', background: feeFilter === f ? 'rgba(249,115,22,0.1)' : 'transparent', color: feeFilter === f ? 'var(--primary)' : 'var(--text-muted)' }}>
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
        </div>

        <div className="table-container hide-on-mobile">
        <div className="table-responsive">
          <table className="custom-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Course · Branch</th>
                <th>Room / Bed</th>
                <th>Fee Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No students found</td></tr>
              ) : filtered.map(student => (
                <tr key={student.dbId} style={{ animation: 'slideInUp 0.3s ease-out' }}>
                  <td data-label="Student">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {student.photoUrl ? (
                        <img src={student.photoUrl} alt={student.name} className="avatar-small" style={{ objectFit: 'cover' }} />
                      ) : (
                        <div className="avatar-small">{student.name.charAt(0)}</div>
                      )}
                      <button className="student-name-btn" onClick={() => setViewingStudent(student)}>{student.name}</button>
                      
                      {/* Individual Reminder Trigger Button - ONLY FOR PENDING / DUE STUDENTS */}
                      {student.feeStatus === 'Pending' && (
                        <button
                          type="button"
                          className="reminder-tag-btn"
                          title={`Send Personal Voice & Text Fee Reminder to ${student.name}`}
                          disabled={sendingReminderId === student.dbId}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendIndividualReminder(student);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: sendingReminderId === student.dbId ? 'rgba(249,115,22,0.25)' : 'rgba(249,115,22,0.1)',
                            border: '1px solid rgba(249,115,22,0.3)',
                            color: 'var(--primary)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: sendingReminderId === student.dbId ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            marginLeft: 2,
                            flexShrink: 0
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(249,115,22,0.22)'}
                          onMouseOut={(e) => e.currentTarget.style.background = sendingReminderId === student.dbId ? 'rgba(249,115,22,0.25)' : 'rgba(249,115,22,0.1)'}
                        >
                          {sendingReminderId === student.dbId ? (
                            <Clock size={12} className="animate-spin" />
                          ) : (
                            <Send size={11} />
                          )}
                          <span>{sendingReminderId === student.dbId ? 'Sending…' : 'Remind'}</span>
                        </button>
                      )}

                      {/* Notice Period Badge */}
                      {student.isOnNotice && (
                        <span 
                          title={`Vacating Hostel on ${student.noticeVacateDate ? new Date(student.noticeVacateDate).toLocaleDateString('en-IN') : 'Next Month'}${student.noticeReason ? `: ${student.noticeReason}` : ''}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '0.72rem', fontWeight: 600 }}
                        >
                          <Clock size={11} /> Notice ({student.noticeVacateDate ? new Date(student.noticeVacateDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Next Month'})
                        </span>
                      )}
                    </div>
                  </td>
                  <td data-label="Course · Branch">
                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{student.course}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{student.branch || '—'} · {student.year} Year</div>
                  </td>
                  <td data-label="Room / Bed">
                    <div style={{ fontWeight: 500 }}>{student.room}</div>
                  </td>
                  <td data-label="Fee Status">
                    <span className={student.feeStatus === 'Paid' ? 'status-badge badge-paid' : student.feeStatus === 'Pending' ? 'status-badge badge-pending' : 'status-badge'}>
                      {student.feeStatus}
                    </span>
                  </td>
                  <td data-label="Actions">
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {/* View Details Eye Icon Button */}
                      <button 
                        className="icon-btn-small" 
                        title={`View Full Details for ${student.name} (Room: ${student.room}, Join Date, Info)`}
                        onClick={() => setViewingStudent(student)}
                        style={{ color: 'var(--primary)' }}
                      >
                        <Eye size={16} />
                      </button>

                      {/* Reminder Send Button - Only for Pending Fee Students */}
                      {student.feeStatus === 'Pending' && (
                        <button 
                          className="icon-btn-small" 
                          title={`Send Voice & Text Reminder to ${student.name}`}
                          disabled={sendingReminderId === student.dbId}
                          onClick={() => handleSendIndividualReminder(student)}
                          style={{ color: 'var(--primary)' }}
                        >
                          {sendingReminderId === student.dbId ? <Clock size={15} className="animate-spin" /> : <Send size={15} />}
                        </button>
                      )}

                      <button className="icon-btn-small" title="Edit" onClick={() => { setEditingStudent(student); setShowForm(true); }}><Edit2 size={16} /></button>
                      <button className="icon-btn-small delete" title="Delete" onClick={() => handleDelete(student.dbId)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>

        {/* Mobile List View */}
        {isMobile && (
          <div className="mobile-card-list">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No students found</div>
            ) : filtered.map(student => (
              <div key={student.dbId} className="glass" style={{ padding: '1rem', borderRadius: 12, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', animation: 'slideInUp 0.3s ease-out', cursor: 'pointer' }} onClick={() => setViewingStudent(student)}>
                {student.photoUrl ? (
                  <img src={student.photoUrl} alt={student.name} className="avatar-small" style={{ width: 40, height: 40, objectFit: 'cover' }} />
                ) : (
                  <div className="avatar-small" style={{ width: 40, height: 40, fontSize: '1.1rem' }}>{student.name.charAt(0)}</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 600 }}>{student.name}</div>
                    {student.feeStatus === 'Pending' && (
                      <button
                        type="button"
                        disabled={sendingReminderId === student.dbId}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendIndividualReminder(student);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: 'rgba(249,115,22,0.15)',
                          border: '1px solid rgba(249,115,22,0.3)',
                          color: 'var(--primary)',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {sendingReminderId === student.dbId ? <Clock size={10} className="animate-spin" /> : <Send size={10} />} Remind
                      </button>
                    )}
                    {student.isOnNotice && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#ef4444', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, padding: '2px 6px' }}>
                        ⚠️ Notice ({student.noticeVacateDate ? new Date(student.noticeVacateDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Next Month'})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{student.course} · Room {student.room}</div>
                </div>
                <span className={student.feeStatus === 'Paid' ? 'status-badge badge-paid' : student.feeStatus === 'Pending' ? 'status-badge badge-pending' : 'status-badge'}>
                  {student.feeStatus}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      {isMobile && !showForm && !viewingStudent && !payingStudent && (
        <button className="floating-mobile-btn" onClick={() => setShowForm(true)}>
          <UserPlus size={18} /> Add Student
        </button>
      )}

      {/* Individual Reminder Dispatch Report Modal */}
      {reminderResultModal && (
        <Modal isOpen onClose={() => setReminderResultModal(null)} title="Personal Fee Reminder Dispatch Report">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary)' }}>👤 {reminderResultModal.studentName}</div>
                <div style={{ fontWeight: 800, color: 'var(--warning)', fontSize: '1.1rem' }}>₹{Number(reminderResultModal.totalAmount || 5500).toLocaleString('en-IN')}</div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span>🏡 {reminderResultModal.roomName}</span>
                <span>•</span>
                <span>📞 {reminderResultModal.phone}</span>
                <span>•</span>
                <span>🗓️ Due Day: {reminderResultModal.dueDayLabel || '10th'}</span>
                <span>•</span>
                <span>Overdue: <strong>{reminderResultModal.pendingMonthsCount || 1} Month(s)</strong> {reminderResultModal.pendingMonthsList ? `(${reminderResultModal.pendingMonthsList.join(', ')})` : ''}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#38bdf8' }}>
                <Send size={15} /> <strong>Telegram Text:</strong> {reminderResultModal.telegramStatus}
              </div>
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#fbbf24' }}>
                <PhoneCall size={15} /> <strong>Voice Note Audio:</strong> {reminderResultModal.telegramVoiceStatus}
              </div>
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#4ade80' }}>
                <MessageSquare size={15} /> <strong>WhatsApp:</strong> {reminderResultModal.whatsappStatus}
              </div>
            </div>

            <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
              <button className="primary-btn" onClick={() => setReminderResultModal(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modals */}
      {viewingStudent && (
        <StudentDetailCard 
          student={viewingStudent} 
          selectedMonth={selectedMonth} 
          isMobile={isMobile}
          onClose={() => setViewingStudent(null)} 
          onRefresh={() => { fetchStudents(); setViewingStudent(null); }} 
          onSendReminder={handleSendIndividualReminder}
          onPreviewDoc={(url) => setPreviewDocUrl(url)}
        />
      )}
      {showForm && (
        <AdmissionForm 
          student={editingStudent} 
          isMobile={isMobile}
          onClose={() => { setShowForm(false); setEditingStudent(null); }} 
          onSave={fetchStudents} 
          onPreviewDoc={(url) => setPreviewDocUrl(url)}
        />
      )}
      {payingStudent && (
        <PaymentModal student={payingStudent} selectedMonth={selectedMonth}
          onClose={() => setPayingStudent(null)}
          onSuccess={() => { fetchStudents(); setPayingStudent(null); }} />
      )}

      {/* In-App Document Inspection Modal */}
      {previewDocUrl && (
        <Modal isOpen onClose={() => setPreviewDocUrl(null)} title="Document Inspector">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ width: '100%', minHeight: 280, maxHeight: '70vh', overflowY: 'auto', background: 'rgba(0,0,0,0.4)', borderRadius: 14, padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid var(--border-dim)' }}>
              {previewDocUrl.toLowerCase().endsWith('.pdf') || previewDocUrl.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewDocUrl}
                  title="Document Preview"
                  style={{ width: '100%', height: '65vh', border: 'none', borderRadius: 8, background: '#fff' }}
                />
              ) : (
                <img
                  src={previewDocUrl}
                  alt="Document Attachment Preview"
                  style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                />
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a
                href={previewDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
              >
                <ExternalLink size={14} /> Open in new tab
              </a>
              <button className="primary-btn" onClick={() => setPreviewDocUrl(null)} style={{ padding: '6px 20px', fontSize: '0.85rem' }}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
