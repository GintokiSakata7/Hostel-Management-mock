import { useState, useEffect, useCallback } from 'react';
import {
  Search, UserPlus, Edit2, Trash2, X, IndianRupee, Calendar, Printer,
  User, Users, BedDouble, Phone, Mail, Shield, ChevronDown, ChevronUp, Clock, Send, MessageSquare, PhoneCall,
  Upload, FileText, Camera, CheckCircle, Eye, ExternalLink, UserMinus, RotateCcw, UserCheck, Archive
} from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/ToastContext';
import { PrintReceiptModal } from './Fees';

import { useSettings } from '../components/SettingsContext';
import { useBuilding } from '../components/BuildingContext';

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return { value: `${y}-${m}`, label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
});

const COURSES = ['B.Tech', 'Diploma', 'BOT', 'Masters', 'Hyderabad'];

const EMPTY_FORM = {
  name: '',
  phone: '',
  parentPhone: '',
  email: '',
  course: 'B.Tech',
  aadharCardUrl: '',
  photoUrl: '',
  branch: 'General',
  year: '1st Year',
  state: 'Hyderabad',
  dateOfJoining: '',
  feeStatus: 'Pending',
  status: 'Active'
};


function PaymentModal({ student, selectedMonth, onClose, onSuccess }: { student: any; selectedMonth: string; onClose: () => void; onSuccess: () => void }) {
  const { showToast } = useToast();
  const { settings } = useSettings();
  const monthlyFee = settings?.monthlyFee || 5500;

  // Build pending months list: existing arrears first (FIFO), then selected month
  const pendingMonths: { value: string; label: string; cycleLabel?: string; amount?: number }[] = [];

  // Add oldest arrears first (if student has them)
  if (student.pendingMonths && student.pendingMonths.length > 0) {
    student.pendingMonths.forEach((p: any) => {
      if (!pendingMonths.some(m => m.value === p.month)) {
        pendingMonths.push({
          value: p.month,
          label: p.monthLabel || p.month,
          cycleLabel: p.cycleLabel,
          amount: p.amount !== undefined ? Number(p.amount) : undefined
        });
      }
    });
  }
  // Also add selectedMonth if not already in list
  if (!pendingMonths.some(m => m.value === selectedMonth)) {
    const ml = MONTHS.find(m => m.value === selectedMonth)?.label || selectedMonth;
    pendingMonths.push({
      value: selectedMonth,
      label: ml,
      amount: student.amount !== undefined ? Number(student.amount) : monthlyFee
    });
  }

  // Default to oldest unpaid cycle (FIFO)
  const defaultMonth = pendingMonths[0]?.value || selectedMonth;
  const [payMonth, setPayMonth] = useState(defaultMonth);
  const selectedEntry = pendingMonths.find(m => m.value === payMonth) || pendingMonths[0];
  const monthLabel = selectedEntry?.label || payMonth;
  const cycleAmount = selectedEntry?.amount !== undefined ? selectedEntry.amount : monthlyFee;

  const totalPending = student.totalPendingAmount !== undefined
    ? Number(student.totalPendingAmount)
    : (student.pendingMonthsCount ? Number(student.pendingMonthsCount) * monthlyFee : monthlyFee);
  const initialAmount = totalPending > 0 ? totalPending : (Number(student.amount) || monthlyFee);

  const [form, setForm] = useState({ amount: initialAmount, method: 'Cash', upiProvider: 'PhonePe', transactionRef: '', date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const freshPending = student.totalPendingAmount !== undefined
      ? Number(student.totalPendingAmount)
      : (student.pendingMonthsCount ? Number(student.pendingMonthsCount) * monthlyFee : monthlyFee);
    setForm(p => ({ ...p, amount: freshPending > 0 ? freshPending : (Number(student.amount) || monthlyFee) }));
  }, [student, monthlyFee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch('/api/fees/pay', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student.dbId, month: payMonth, amount: form.amount, method: form.method, upiProvider: form.method === 'UPI' ? form.upiProvider : null, transactionRef: form.method === 'UPI' ? form.transactionRef : null, date: form.date })
      });
      if (res.status === 409) { const err = await res.json(); showToast(err.error, 'error'); }
      else if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const remaining = data.totalRemainingDue !== undefined ? data.totalRemainingDue : null;
        const balNote = remaining !== null && remaining > 0
          ? ` Remaining outstanding balance: ₹${remaining.toLocaleString('en-IN')}.`
          : ' All outstanding dues are settled!';
        if (data.emailStatus === 'FAILED') {
          showToast(`Payment of ₹${Number(form.amount).toLocaleString('en-IN')} recorded for ${monthLabel}!${balNote} (Notice: Email delivery failed: ${data.emailError || 'Service timeout'})`, 'warning');
        } else {
          showToast(`Payment of ₹${Number(form.amount).toLocaleString('en-IN')} recorded for ${monthLabel}!${balNote} Invoice & receipt emailed.`, 'success');
        }
        onSuccess();
        onClose();
      }
      else { showToast('Payment failed', 'error'); }
    } finally { setSaving(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title="Record Fee Payment">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ fontWeight: 700 }}>{student.name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{student.room}</div>
        </div>

        {/* Total Outstanding Balance strip */}
        <div style={{
          background: totalPending > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
          border: `1px solid ${totalPending > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`,
          borderRadius: 10,
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Total Outstanding Dues</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: totalPending > 0 ? '#f87171' : 'var(--success)' }}>
              ₹{totalPending.toLocaleString('en-IN')}
            </div>
          </div>
          {totalPending > 0 && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, amount: totalPending }))}
                style={{ fontSize: '0.72rem', padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(249,115,22,0.4)', background: 'rgba(249,115,22,0.15)', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700 }}>
                Pay Full (₹{totalPending.toLocaleString('en-IN')})
              </button>
              {totalPending !== cycleAmount && (
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, amount: cycleAmount }))}
                  style={{ fontSize: '0.72rem', padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}>
                  Pay Cycle (₹{cycleAmount.toLocaleString('en-IN')})
                </button>
              )}
            </div>
          )}
        </div>

        {/* FIFO Cycle selector — shows arrears first */}
        <div className="form-group">
          <label>Billing Cycle to Settle</label>
          {pendingMonths.length > 1 && (
            <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '7px 10px', fontSize: '0.76rem', color: '#f87171', marginBottom: 6 }}>
              ⚠️ Resident has {pendingMonths.length} cycle(s) pending. Oldest is auto-selected.
            </div>
          )}
          <select
            className="custom-input"
            value={payMonth}
            onChange={e => {
              const newMonth = e.target.value;
              setPayMonth(newMonth);
              const newEntry = pendingMonths.find(m => m.value === newMonth);
              const newCycleAmt = newEntry?.amount !== undefined ? newEntry.amount : monthlyFee;
              if (form.amount === cycleAmount) {
                setForm(f => ({ ...f, amount: newCycleAmt }));
              }
            }}
          >
            {pendingMonths.map((m, i) => {
              const amt = m.amount !== undefined ? m.amount : monthlyFee;
              return (
                <option key={m.value} value={m.value}>
                  {i === 0 && pendingMonths.length > 1 ? '⚡ ' : ''}{m.label}{m.cycleLabel ? ` (${m.cycleLabel})` : ''} · ₹{amt.toLocaleString('en-IN')}
                </option>
              );
            })}
          </select>
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

        <div style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: '0.8rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Mail size={16} style={{ flexShrink: 0 }} />
          <span>A detailed tax invoice breakdown & PDF receipt will be automatically sent to the email address on file.</span>
        </div>

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
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 2000, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: isMobile ? 0 : '1rem' }}
        onClick={onClose}>
        <div className={isMobile ? 'bottom-sheet' : 'glass-heavy'} style={isMobile ? { maxHeight: '88dvh', overflowY: 'auto', overscrollBehavior: 'contain', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch', padding: '18px 16px 24px' } : { width: '100%', maxWidth: 620, maxHeight: 'calc(100dvh - 3rem)', overflowY: 'auto', overscrollBehavior: 'contain', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch', padding: '1.75rem', position: 'relative', borderRadius: 24, margin: '1rem', border: '1px solid var(--border-light)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}
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
                <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>{student.name}</h2>
                <span className="status-badge badge-available" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>{student.status}</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 3 }}>
                {student.course}
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
          {(() => {
            const isNotEnrolled = student.feeStatus === 'Not Enrolled' || student.isBeforeJoining;
            const isUpcoming = student.feeStatus === 'Upcoming';

            if (isNotEnrolled) {
              return (
                <div style={{
                  borderRadius: 16,
                  padding: '1.1rem 1.25rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)'
                    }}>
                      <Calendar size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', letterSpacing: '0.01em' }}>
                        Not Enrolled in {monthLabel}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        Admitted on {student.dateOfJoiningFormatted || student.joiningMonthLabel || 'a later date'}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 8 }}>
                      No dues for this month
                    </span>
                  </div>
                </div>
              );
            }

            if (isUpcoming) {
              return (
                <div style={{
                  borderRadius: 16,
                  padding: '1.1rem 1.25rem',
                  background: 'linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(59,130,246,0.05) 100%)',
                  border: '1px solid rgba(56,189,248,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem',
                  boxShadow: '0 4px 20px rgba(56,189,248,0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: 'rgba(56,189,248,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#38bdf8'
                    }}>
                      <Clock size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#38bdf8', letterSpacing: '0.01em' }}>
                        🗓️ Current Cycle (Upcoming)
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        Due on {student.nextDueDate || `${student.dueDayLabel || '10th'} of month`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right', marginRight: 4 }}>
                      <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-main)' }}>₹{monthlyFee.toLocaleString()}</div>
                      <div style={{ fontSize: '0.7rem', color: '#38bdf8' }}>Due {student.dueDayLabel || '10th'}</div>
                    </div>
                    <button className="primary-btn" style={{ padding: '7px 16px', fontSize: '0.82rem', gap: '6px' }} onClick={() => setShowPayment(true)}>
                      <IndianRupee size={14} /> Pay Early
                    </button>
                  </div>
                </div>
              );
            }

            return (
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
                    <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-main)' }}>₹{(student.totalPendingAmount || monthlyFee).toLocaleString()}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Due {student.dueDayLabel || '10th'}</div>
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
            );
          })()}

          {/* Navigation Tabs Bar */}
          <div className="app-nav-tabs" style={{ marginBottom: '1.25rem' }}>
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'docs', label: isMobile ? 'Docs' : 'Documents & Family', icon: Shield },
              { id: 'notice', label: isMobile ? 'Notice' : 'Notice Period', icon: Clock, badge: student.isOnNotice ? 'Active' : undefined },
              { id: 'history', label: 'Payments', icon: Calendar, count: student.fees?.length || 0 },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`app-tab-btn ${isActive ? 'active' : ''}`}
                  style={{ flex: isMobile ? '0 0 auto' : 1 }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.62rem', fontWeight: 800, padding: '1px 5px', borderRadius: 6 }}>
                      {tab.badge}
                    </span>
                  )}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span style={{ background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(128,128,128,0.18)', color: isActive ? '#fff' : 'var(--text-muted)', fontSize: '0.65rem', padding: '1px 6px', borderRadius: 10 }}>
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
                  { icon: Phone, label: 'Student Mobile (No)', value: student.phone || '—', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
                  { icon: Phone, label: 'Parent Mobile (Parent No)', value: student.parentPhone || '—', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
                  { icon: Mail, label: 'Email Address', value: student.email || '—', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
                  { icon: BedDouble, label: 'Room Allotted', value: student.room, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
                  { icon: Calendar, label: 'Academic / Course', value: student.course || 'B.Tech', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
                  { icon: Clock, label: 'Monthly Due Day', value: student.dueDayLabel ? `${student.dueDayLabel} of month` : '10th of month', color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
                ].map(({ icon: Icon, label, value, color, bg }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 500, marginBottom: 2 }}>{label}</div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
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
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={18} color="var(--primary)" />
                    <span>Aadhaar Card Attachment</span>
                  </div>
                </div>

                {student.aadharCardUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 12, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(249,115,22,0.2)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>Attached Aadhaar Document</div>
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
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0', textAlign: 'center', background: 'rgba(128,128,128,0.06)', borderRadius: 10 }}>
                    No Aadhaar document uploaded for this student yet.
                  </div>
                )}
              </div>

              {/* Family Contact */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} color="#3b82f6" />
                  <span>Parent Contact Information</span>
                </div>
                <div className="responsive-grid-2" style={{ gap: '0.75rem' }}>
                  <div className="student-detail-box" style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Parent Phone (Parent No)</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', marginTop: 2, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {student.parentPhone ? (
                        <a href={`tel:${student.parentPhone}`} style={{ color: '#60a5fa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={13} /> {student.parentPhone}
                        </a>
                      ) : '—'}
                    </div>
                  </div>
                  <div className="student-detail-box" style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Student Phone (No)</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', marginTop: 2 }}>
                      {student.phone ? (
                        <a href={`tel:${student.phone}`} style={{ color: '#4ade80', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={13} /> {student.phone}
                        </a>
                      ) : '—'}
                    </div>
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
                <label className="student-detail-box" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, padding: '12px' }}>
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
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '2rem', background: 'rgba(128,128,128,0.06)', borderRadius: 14 }}>
                  No payment records found for this student yet.
                </div>
              ) : (
                (student.fees || []).map((f: any) => (
                  <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(34,197,94,0.2)' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{f.monthLabel}</div>
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
  const [form, setForm] = useState(
    student
      ? {
          ...EMPTY_FORM,
          ...student,
          dateOfJoining: student.dateOfJoining ? student.dateOfJoining.split('T')[0] : new Date().toISOString().split('T')[0]
        }
      : { ...EMPTY_FORM, dateOfJoining: new Date().toISOString().split('T')[0] }
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingAadhar, setUploadingAadhar] = useState(false);

  const validateSingleField = (key: string, val: any): string => {
    const v = (val || '').toString().trim();
    switch (key) {
      case 'name':
        if (!v) return 'Full name is required';
        if (v.length < 2) return 'Full name must be at least 2 characters';
        return '';
      case 'phone':
        if (!v) return 'Phone number is required';
        if (!/^[6-9]\d{9}$/.test(v)) return 'Must be a valid 10-digit mobile number';
        return '';
      case 'parentPhone':
        if (!v) return 'Parent phone number is required';
        if (!/^[6-9]\d{9}$/.test(v)) return 'Must be a valid 10-digit mobile number';
        return '';
      case 'email':
        if (!v) return 'Email address is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Must be a valid email address';
        return '';
      case 'course':
        if (!v) return 'Academic course is required';
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
      [key]: val
    }));
    setTouched(prev => ({ ...prev, [key]: true }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      showToast('File size must be under 12MB', 'error');
      return;
    }

    setUploadingAadhar(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        f('aadharCardUrl', base64Data);

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, fileData: base64Data })
        });
        if (res.ok) {
          const data = await res.json();
          f('aadharCardUrl', data.url);
          showToast('Aadhaar photo attached successfully!', 'success');
        } else {
          showToast('Failed to upload file to server', 'error');
        }
        setUploadingAadhar(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      showToast('Upload error: ' + err.message, 'error');
      setUploadingAadhar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requiredKeys = ['name', 'phone', 'parentPhone', 'email', 'course', 'dateOfJoining'];
    const newTouched: Record<string, boolean> = {};
    let hasError = false;

    requiredKeys.forEach(k => {
      newTouched[k] = true;
      const err = validateSingleField(k, form[k]);
      if (err) hasError = true;
    });

    setTouched(newTouched);

    if (hasError) {
      showToast('Please fill all required fields correctly', 'error');
      return;
    }

    setSaving(true);
    try {
      const url = student ? `/api/students/${student.dbId || student.id}` : '/api/students';
      const payload = {
        ...form,
        branch: 'General',
        year: '1st Year',
        state: 'Hyderabad',
        dateOfJoining: form.dateOfJoining || new Date().toISOString().split('T')[0]
      };
      const res = await fetch(url, {
        method: student ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(student ? 'Student updated successfully!' : 'Student added successfully!', 'success');
        onSave();
        onClose();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save student', 'error');
      }
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        zIndex: 2500,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: isMobile ? 0 : '1rem',
        animation: 'fadeIn 0.2s ease'
      }}
      onClick={onClose}
    >
      <div
        className={isMobile ? 'bottom-sheet' : 'glass-panel'}
        style={
          isMobile
            ? {
                padding: '18px 16px 24px',
                width: '100%',
                maxHeight: '88dvh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                overscrollBehavior: 'contain',
                touchAction: 'pan-y'
              }
            : {
                width: '100%',
                maxWidth: '560px',
                maxHeight: 'calc(100dvh - 3rem)',
                padding: '1.75rem',
                position: 'relative',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                background: 'rgba(22, 26, 38, 0.96)',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                overscrollBehavior: 'contain',
                touchAction: 'pan-y'
              }
        }
        onClick={e => e.stopPropagation()}
      >
        {isMobile && <div className="bottom-sheet-handle" />}

        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: isMobile ? '1.15rem' : '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {student ? 'Edit Student' : 'Add New Student'}
          </h2>
          <button className="icon-btn-small" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          noValidate
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            overscrollBehavior: 'contain',
            flex: 1,
            minHeight: 0,
            paddingRight: '4px'
          }}
        >
          {/* Full Name */}
          <F label="Full Name *" error={getFieldError('name')}>
            <input
              required
              className={`custom-input ${getFieldError('name') ? 'input-error' : ''}`}
              value={form.name}
              onChange={e => f('name', e.target.value)}
              onBlur={() => handleFieldBlur('name')}
              placeholder="Student's full name"
              autoFocus={!isMobile}
            />
          </F>

          {/* Student Phone & Parent Phone */}
          <div className="responsive-grid-2" style={{ gap: '0.85rem' }}>
            <F label="Phone Number (No) *" error={getFieldError('phone')} hint="10-digit mobile">
              <input
                required
                type="tel"
                className={`custom-input ${getFieldError('phone') ? 'input-error' : ''}`}
                value={form.phone}
                onChange={e => f('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                onBlur={() => handleFieldBlur('phone')}
                placeholder="Student 10-digit mobile"
                maxLength={10}
              />
            </F>

            <F label="Parent Phone (Parent No) *" error={getFieldError('parentPhone')} hint="10-digit mobile">
              <input
                required
                type="tel"
                className={`custom-input ${getFieldError('parentPhone') ? 'input-error' : ''}`}
                value={form.parentPhone}
                onChange={e => f('parentPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                onBlur={() => handleFieldBlur('parentPhone')}
                placeholder="Parent 10-digit mobile"
                maxLength={10}
              />
            </F>
          </div>

          {/* Email Address & Academic / Course */}
          <div className="responsive-grid-2" style={{ gap: '0.85rem' }}>
            <F label="Email Address *" error={getFieldError('email')}>
              <input
                required
                type="email"
                className={`custom-input ${getFieldError('email') ? 'input-error' : ''}`}
                value={form.email}
                onChange={e => f('email', e.target.value)}
                onBlur={() => handleFieldBlur('email')}
                placeholder="student@domain.com"
              />
            </F>

            <F label="Academic / Course *" error={getFieldError('course')}>
              <select
                required
                className="custom-input"
                value={form.course}
                onChange={e => f('course', e.target.value)}
              >
                {COURSES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </F>

            <F label="Date of Joining *" error={getFieldError('dateOfJoining')} hint="Anchors billing (e.g. 10th-10th)">
              <input
                required
                type="date"
                className={`custom-input ${getFieldError('dateOfJoining') ? 'input-error' : ''}`}
                value={form.dateOfJoining}
                onChange={e => f('dateOfJoining', e.target.value)}
                onBlur={() => handleFieldBlur('dateOfJoining')}
              />
            </F>
          </div>

          {/* Aadhaar Card Photo Upload */}
          <F label="Aadhaar Card Photo" col>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed var(--border-light)',
              borderRadius: 14,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              {form.aadharCardUrl ? (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={form.aadharCardUrl}
                    alt="Aadhaar Document Preview"
                    onClick={() => onPreviewDoc(form.aadharCardUrl)}
                    title="Click to inspect photo"
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 12,
                      objectFit: 'cover',
                      border: '2px solid var(--primary)',
                      cursor: 'pointer'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => f('aadharCardUrl', '')}
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: 20,
                      height: 20,
                      cursor: 'pointer',
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Remove Aadhaar Photo"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: 12,
                  background: 'rgba(249,115,22,0.12)',
                  border: '1px solid rgba(249,115,22,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  flexShrink: 0
                }}>
                  <Camera size={24} />
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-main)', marginBottom: 2 }}>
                  {form.aadharCardUrl ? 'Aadhaar Photo Attached' : 'Upload Aadhaar Card Photo'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                  JPG, PNG or WebP formats accepted (under 12MB)
                </div>
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  background: 'rgba(249,115,22,0.15)',
                  border: '1px solid rgba(249,115,22,0.4)',
                  borderRadius: 8,
                  color: 'var(--primary)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}>
                  <Upload size={13} />
                  <span>{uploadingAadhar ? 'Uploading photo…' : form.aadharCardUrl ? 'Change Photo' : 'Select Photo File'}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    disabled={uploadingAadhar}
                  />
                </label>
              </div>
            </div>
          </F>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexShrink: 0 }}>
            <button
              type="button"
              className="ghost-btn"
              style={{ flex: 1, minHeight: 42, justifyContent: 'center' }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn"
              style={{ flex: 1.5, minHeight: 42, justifyContent: 'center' }}
              disabled={saving || uploadingAadhar}
            >
              {saving ? 'Saving…' : student ? '✓ Update Student' : '+ Add Student'}
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
  const { selectedBuildingId } = useBuilding();
  const monthlyFee = settings?.monthlyFee || 5500;
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0].value);

  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [feeFilter, setFeeFilter] = useState<'all' | 'Paid' | 'Pending' | 'Enrolled'>('all');

  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [viewingStudent, setViewingStudent] = useState<any>(null);
  const [payingStudent, setPayingStudent] = useState<any>(null);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [reminderResultModal, setReminderResultModal] = useState<any | null>(null);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);

  const [residentTab, setResidentTab] = useState<'active' | 'vacated'>('active');

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students?month=${selectedMonth}&buildingId=${selectedBuildingId}`);
      if (res.ok) setStudents(await res.json());
    } catch (e) { showToast('Failed to fetch students', 'error'); }
    finally { setLoading(false); }
  }, [selectedMonth, selectedBuildingId]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleSendIndividualReminder = async (student: any) => {
    const studentId = student.dbId || student.id;
    if (!studentId) return;
    setSendingReminderId(studentId);
    try {
      const res = await fetch(`/api/reminders/student/${studentId}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`✉️ Fee reminder invoice emailed to ${student.name}!`, 'success');
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

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  } | null>(null);

  const handleVacateStudent = (student: any) => {
    setConfirmState({
      isOpen: true,
      title: 'Remove Student from Hostel',
      message: `Remove ${student.name} from hostel? They will be unallocated from room ${student.room} and moved to the Vacated Residents tab.`,
      confirmText: 'Remove & Vacate',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const res = await fetch(`/api/students/${student.dbId}/vacate`, { method: 'PUT' });
          if (res.ok) {
            showToast(`${student.name} removed from hostel and room unallocated`, 'success');
            fetchStudents();
          } else {
            showToast('Failed to remove student', 'error');
          }
        } catch (e: any) {
          showToast('Vacate error: ' + e.message, 'error');
        }
      }
    });
  };

  const handleReadmitStudent = (student: any) => {
    setConfirmState({
      isOpen: true,
      title: 'Re-admit Resident',
      message: `Re-admit ${student.name} back to Active Residents list?`,
      confirmText: 'Re-admit Student',
      variant: 'info',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const res = await fetch(`/api/students/${student.dbId}/readmit`, { method: 'PUT' });
          if (res.ok) {
            showToast(`${student.name} restored to Active Residents`, 'success');
            fetchStudents();
          } else {
            showToast('Failed to re-admit student', 'error');
          }
        } catch (e: any) {
          showToast('Re-admit error: ' + e.message, 'error');
        }
      }
    });
  };

  const handlePermanentDelete = (student: any) => {
    setConfirmState({
      isOpen: true,
      title: 'Permanent Database Purge',
      message: `⚠️ PERMANENT DELETE: Delete ${student.name} and ALL associated fee records, complaints, photo, and Aadhaar documents permanently from the database? This action CANNOT be undone.`,
      confirmText: 'Permanently Delete',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const res = await fetch(`/api/students/${student.dbId}`, { method: 'DELETE' });
          if (res.ok) {
            showToast('Student profile & documents permanently deleted from DB', 'success');
            fetchStudents();
          } else {
            showToast('Delete failed', 'error');
          }
        } catch (e: any) {
          showToast('Delete error: ' + e.message, 'error');
        }
      }
    });
  };

  const activeStudents = students.filter(s => s.status !== 'Vacated');
  const activeCount = activeStudents.length;
  const vacatedCount = students.filter(s => s.status === 'Vacated').length;

  const enrolledInMonthStudents = activeStudents.filter(s => s.feeStatus !== 'Not Enrolled');
  const enrolledCount = enrolledInMonthStudents.length;
  const notEnrolledCount = activeStudents.filter(s => s.feeStatus === 'Not Enrolled').length;

  const paidCount = enrolledInMonthStudents.filter(s => (s.totalPendingAmount || 0) === 0 && s.feeStatus !== 'Upcoming').length;
  const pendingCount = enrolledInMonthStudents.filter(s => s.feeStatus === 'Pending' || (s.totalPendingAmount || 0) > 0).length;

  const selectedMonthObj = MONTHS.find(m => m.value === selectedMonth);
  const selectedMonthLabel = selectedMonthObj?.label || selectedMonth;

  const filtered = students.filter(s => {
    const isVacated = s.status === 'Vacated';
    if (residentTab === 'active' && isVacated) return false;
    if (residentTab === 'vacated' && !isVacated) return false;

    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.room || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCourse = courseFilter === 'all' || s.course.toLowerCase().includes(courseFilter.toLowerCase());
    const matchFee = feeFilter === 'all'
      ? true
      : feeFilter === 'Enrolled'
        ? s.feeStatus !== 'Not Enrolled'
        : s.feeStatus === feeFilter;
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

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: '0 0 4px 0', fontSize: isMobile ? '1.35rem' : '1.6rem' }}>Resident Management</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            {activeCount} Active Residents · {enrolledCount} Enrolled in {selectedMonthLabel}{notEnrolledCount > 0 ? ` (${notEnrolledCount} joined later)` : ''} · {vacatedCount} Vacated · Monthly fee ₹{monthlyFee.toLocaleString('en-IN')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end', flexWrap: 'wrap' }}>
          {/* Month selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-dim)', borderRadius: 10, padding: '8px 12px', flex: isMobile ? 1 : 'none' }}>
            <Calendar size={14} color="var(--primary)" />
            <select className="custom-select" style={{ background: 'transparent', border: 'none', padding: 0, color: 'var(--text-main)', fontSize: '0.82rem', width: '100%', cursor: 'pointer' }}
              value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <button className="primary-btn" style={{ minHeight: 38, padding: '8px 16px' }} onClick={() => { setEditingStudent(null); setShowForm(true); }}>
            <UserPlus size={15} /> Add Student
          </button>
        </div>
      </div>

      {/* Stats Cards: 2x2 Interactive KPI Grid on Mobile, Flex Chips on Desktop */}
      {isMobile ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'Active Residents', value: activeCount, color: 'var(--primary)', tab: 'active', filter: 'all', icon: Users, sub: `${enrolledCount} enrolled in ${selectedMonthLabel}` },
            { label: 'Pending Dues', value: pendingCount, color: 'var(--warning)', tab: 'active', filter: 'Pending', icon: Clock, sub: 'Needs follow-up' },
            { label: 'Fee Paid', value: paidCount, color: 'var(--success)', tab: 'active', filter: 'Paid', icon: CheckCircle, sub: `Cleared for ${selectedMonthLabel}` },
            { label: 'Former / Vacated', value: vacatedCount, color: '#ef4444', tab: 'vacated', filter: 'all', icon: Archive, sub: 'Left hostel' },
          ].map(({ label, value, color, tab, filter, icon: Icon, sub }) => (
            <div
              key={label}
              onClick={() => {
                setResidentTab(tab as any);
                setFeeFilter(filter as any);
              }}
              style={{
                background: (residentTab === tab && (feeFilter === filter || (filter === 'all' && feeFilter === 'all')))
                  ? 'rgba(249,115,22,0.1)'
                  : 'rgba(255,255,255,0.03)',
                border: (residentTab === tab && (feeFilter === filter || (filter === 'all' && feeFilter === 'all')))
                  ? '1px solid var(--primary)'
                  : '1px solid var(--border-dim)',
                borderRadius: 14,
                padding: '10px 12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600 }}>{label}</span>
                <Icon size={13} color={color} />
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Active Residents', value: activeCount, color: 'var(--primary)' },
            { label: `Enrolled (${selectedMonthLabel})`, value: enrolledCount, color: '#38bdf8' },
            { label: 'Fee Paid', value: paidCount, color: 'var(--success)' },
            { label: 'Fee Pending', value: pendingCount, color: 'var(--warning)' },
            ...(notEnrolledCount > 0 ? [{ label: 'Joined Later', value: notEnrolledCount, color: 'var(--text-muted)' }] : []),
            { label: 'Vacated / Left', value: vacatedCount, color: '#ef4444' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-dim)', borderRadius: 12, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color, fontWeight: 700, fontSize: '1.1rem' }}>{value}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Panel */}
      <div className="glass-panel" style={{ padding: isMobile ? '1rem 0.85rem' : '1.5rem' }}>

        {/* Tab Switcher: Active Residents vs Vacated Residents */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 12,
          padding: 3,
          border: '1px solid var(--border-dim)',
          marginBottom: '1rem',
          width: isMobile ? '100%' : 'fit-content'
        }}>
          <button 
            type="button"
            onClick={() => setResidentTab('active')}
            style={{
              flex: isMobile ? 1 : 'none',
              padding: '7px 16px',
              borderRadius: 9,
              border: 'none',
              background: residentTab === 'active' ? 'var(--primary)' : 'transparent',
              color: residentTab === 'active' ? '#fff' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <UserCheck size={14} /> Active Residents ({activeCount})
          </button>
          <button 
            type="button"
            onClick={() => setResidentTab('vacated')}
            style={{
              flex: isMobile ? 1 : 'none',
              padding: '7px 16px',
              borderRadius: 9,
              border: 'none',
              background: residentTab === 'vacated' ? '#ef4444' : 'transparent',
              color: residentTab === 'vacated' ? '#fff' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Archive size={14} /> Vacated ({vacatedCount})
          </button>
        </div>

        {/* Search & Quick Filters */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '0.75rem', marginBottom: '1.25rem', alignItems: isMobile ? 'stretch' : 'center' }}>
          <div className="search-bar" style={{ width: isMobile ? '100%' : 260 }}>
            <Search size={15} color="var(--text-muted)" />
            <input placeholder="Search resident or room…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{
            display: 'flex',
            gap: '6px',
            alignItems: 'center',
            overflowX: 'auto',
            paddingBottom: isMobile ? 2 : 0,
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none'
          }}>
            <select className="custom-select" style={{ minWidth: 125, fontSize: '0.78rem', padding: '6px 10px' }} value={courseFilter} onChange={e => setCourseFilter(e.target.value)}>
              <option value="all">All Courses</option>
              {COURSES.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
            </select>

            {(['all', 'Enrolled', 'Paid', 'Pending'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFeeFilter(f)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                  borderColor: feeFilter === f ? 'var(--primary)' : 'var(--border-dim)',
                  background: feeFilter === f ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.03)',
                  color: feeFilter === f ? 'var(--primary)' : 'var(--text-muted)'
                }}
              >
                {f === 'all' ? 'All Residents' : f === 'Enrolled' ? '✓ Enrolled Only' : f === 'Paid' ? '✓ Paid Only' : '⚡ Due Only'}
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
                <th>Room / Status</th>
                <th>Fee Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No {residentTab === 'vacated' ? 'vacated' : 'active'} students found</td></tr>
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
                      
                      {/* Individual Reminder Trigger Button - FOR OVERDUE / ARREARS RESIDENTS */}
                      {residentTab === 'active' && Boolean(student.feeStatus === 'Pending' || ((student.pendingMonthsCount ?? 0) > 0)) && (
                        <button
                          type="button"
                          className="reminder-tag-btn"
                          title={`Send Personal Fee Reminder to ${student.name}`}
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
                  <td data-label="Room / Status">
                    {student.room !== 'Unallocated' ? (
                      <div style={{ fontWeight: 500 }}>{student.room}</div>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        fontSize: '0.74rem',
                        fontWeight: 700
                      }}>
                        Unallocated
                      </span>
                    )}
                    {student.status === 'Vacated' && (
                      <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600, display: 'block', marginTop: '2px' }}>Vacated / Left</span>
                    )}
                  </td>
                  <td data-label="Fee Status">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {(student.totalPendingAmount || 0) > 0 ? (
                        <>
                          <span className="status-badge badge-pending">
                            ₹{student.totalPendingAmount.toLocaleString('en-IN')} Due
                          </span>
                          {(student.pendingMonthsCount || 0) > 1 && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#f87171', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', padding: '2px 6px', borderRadius: 4, width: 'fit-content' }}>
                              ⚡ {student.pendingMonthsCount} Mos Overdue
                            </span>
                          )}
                        </>
                      ) : student.feeStatus === 'Not Enrolled' ? (
                        <span className="status-badge">
                          Joined {student.joiningMonthLabel || 'Later'}
                        </span>
                      ) : student.feeStatus === 'Upcoming' ? (
                        <span className="status-badge" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' }}>
                          Due {student.dueDayLabel || '10th'}
                        </span>
                      ) : (
                        <span className="status-badge badge-paid">
                          Paid
                        </span>
                      )}
                    </div>
                  </td>
                  <td data-label="Actions">
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {/* View Details Eye Icon Button */}
                      <button 
                        className="icon-btn-small" 
                        title={`View Full Details for ${student.name}`}
                        onClick={() => setViewingStudent(student)}
                        style={{ color: 'var(--primary)' }}
                      >
                        <Eye size={16} />
                      </button>

                      {/* ACTIONS FOR ACTIVE RESIDENTS */}
                      {residentTab === 'active' && (
                        <>
                          {Boolean(student.feeStatus === 'Pending' || ((student.pendingMonthsCount ?? 0) > 0)) && (
                            <button 
                              className="icon-btn-small" 
                              title={`Send Email Fee Reminder to ${student.name}`}
                              disabled={sendingReminderId === student.dbId}
                              onClick={() => handleSendIndividualReminder(student)}
                              style={{ color: 'var(--primary)' }}
                            >
                              {sendingReminderId === student.dbId ? <Clock size={15} className="animate-spin" /> : <Send size={15} />}
                            </button>
                          )}
                          <button className="icon-btn-small" title="Edit" onClick={() => { setEditingStudent(student); setShowForm(true); }}><Edit2 size={16} /></button>
                          <button 
                            className="icon-btn-small delete" 
                            title={`Remove / Vacate ${student.name} from Hostel`} 
                            onClick={() => handleVacateStudent(student)}
                            style={{ color: '#ef4444' }}
                          >
                            <UserMinus size={16} />
                          </button>
                        </>
                      )}

                      {/* ACTIONS FOR VACATED RESIDENTS */}
                      {residentTab === 'vacated' && (
                        <>
                          <button 
                            className="icon-btn-small" 
                            title={`Re-admit ${student.name} to Active Residents`} 
                            onClick={() => handleReadmitStudent(student)}
                            style={{ color: '#4ade80' }}
                          >
                            <RotateCcw size={16} />
                          </button>
                          <button 
                            className="icon-btn-small delete" 
                            title={`Permanently delete ${student.name} and purge documents from DB`} 
                            onClick={() => handlePermanentDelete(student)}
                            style={{ color: '#ef4444' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>

        {/* Dedicated Mobile Resident Card Architecture */}
        {isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <div style={{ width: 36, height: 36, border: '3px solid rgba(249,115,22,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                Loading residents list…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid var(--border-dim)' }}>
                <User size={36} style={{ opacity: 0.2, margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>No {residentTab === 'vacated' ? 'vacated' : 'active'} residents found</div>
                <div style={{ fontSize: '0.75rem', marginTop: 4 }}>Try adjusting your search or fee filters</div>
              </div>
            ) : filtered.map(student => (
              <div
                key={student.dbId}
                className="glass-panel"
                style={{
                  padding: '14px',
                  borderRadius: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  border: (student.feeStatus === 'Pending' && residentTab === 'active')
                    ? '1px solid rgba(249,115,22,0.35)'
                    : '1px solid var(--border-dim)',
                  background: (student.feeStatus === 'Pending' && residentTab === 'active')
                    ? 'linear-gradient(180deg, rgba(249,115,22,0.05) 0%, rgba(255,255,255,0.01) 100%)'
                    : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Top Row: Avatar + Name + Fee Badge */}
                <div
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}
                  onClick={() => setViewingStudent(student)}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {student.photoUrl ? (
                      <img
                        src={student.photoUrl}
                        alt={student.name}
                        style={{ width: 48, height: 48, borderRadius: 14, objectFit: 'cover', border: '1.5px solid var(--border-dim)' }}
                      />
                    ) : (
                      <div style={{
                        width: 48, height: 48, borderRadius: 14,
                        background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(99,102,241,0.2))',
                        border: '1.5px solid rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '1.2rem', color: '#fff'
                      }}>
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {student.room !== 'Unallocated' && (
                      <span style={{
                        position: 'absolute', bottom: -3, right: -3,
                        width: 12, height: 12, borderRadius: '50%',
                        background: student.feeStatus === 'Paid' ? 'var(--success)' : 'var(--warning)',
                        border: '2px solid #090b10',
                        boxShadow: `0 0 6px ${student.feeStatus === 'Paid' ? 'var(--success)' : 'var(--warning)'}`
                      }} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-main)', letterSpacing: -0.2 }}>
                        {student.name}
                      </div>
                      {residentTab === 'active' ? (
                        (student.totalPendingAmount || 0) > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                            <span className="status-badge badge-pending" style={{ fontSize: '0.68rem', padding: '3px 8px', flexShrink: 0 }}>
                              ₹{student.totalPendingAmount.toLocaleString('en-IN')} Due
                            </span>
                            {(student.pendingMonthsCount || 0) > 1 && (
                              <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', color: '#f87171', fontWeight: 700 }}>
                                ⚡ {student.pendingMonthsCount} Mos Overdue
                              </span>
                            )}
                          </div>
                        ) : student.feeStatus === 'Not Enrolled' ? (
                          <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, flexShrink: 0 }}>
                            Joined {student.joiningMonthLabel || 'Later'}
                          </span>
                        ) : student.feeStatus === 'Upcoming' ? (
                          <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: 8, background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)', fontWeight: 700, flexShrink: 0 }}>
                            🗓️ Due {student.dueDayLabel || '10th'}
                          </span>
                        ) : (
                          <span className="status-badge badge-paid" style={{ fontSize: '0.68rem', padding: '3px 8px', flexShrink: 0 }}>
                            ✓ Paid
                          </span>
                        )
                      ) : (
                        <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 700, flexShrink: 0 }}>
                          Vacated
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: student.room !== 'Unallocated' ? 'var(--primary)' : 'var(--danger)',
                        background: student.room !== 'Unallocated' ? 'rgba(249,115,22,0.12)' : 'rgba(239,68,68,0.12)',
                        padding: '2px 8px',
                        borderRadius: 6
                      }}>
                        🏠 {student.room !== 'Unallocated' ? `Room ${student.room}` : 'Unallocated'}
                      </span>

                      <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                        {student.course}{student.branch ? ` · ${student.branch}` : ''}
                      </span>

                      {student.isOnNotice && (
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: '#ef4444',
                          background: 'rgba(239,68,68,0.15)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: 6,
                          padding: '2px 6px'
                        }}>
                          ⚠️ Notice
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Due Banner with 1-Tap Remind (Shown whenever fees are overdue or have arrears) */}
                {residentTab === 'active' && Boolean(student.feeStatus === 'Pending' || ((student.pendingMonthsCount ?? 0) > 0)) && (
                  <div style={{
                    background: 'rgba(249,115,22,0.1)',
                    border: '1px solid rgba(249,115,22,0.25)',
                    borderRadius: 10,
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--primary)' }}>
                      <IndianRupee size={14} />
                      <span>Due: <strong>₹{(student.totalPendingAmount || monthlyFee).toLocaleString('en-IN')}</strong></span>
                      {student.pendingMonthsCount > 1 && (
                        <span style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 700 }}>
                          ({student.pendingMonthsCount} mos)
                        </span>
                      )}
                    </div>
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
                        gap: 4,
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: 'var(--primary)',
                        border: 'none',
                        color: '#fff',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: sendingReminderId === student.dbId ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {sendingReminderId === student.dbId ? <Clock size={11} className="animate-spin" /> : <Send size={11} />}
                      <span>{sendingReminderId === student.dbId ? 'Sending…' : 'Remind'}</span>
                    </button>
                  </div>
                )}

                {/* Info strip when student was not enrolled in selected month */}
                {residentTab === 'active' && student.feeStatus === 'Not Enrolled' && (
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 10,
                    padding: '6px 10px',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <span>ℹ️ Not enrolled in {MONTHS.find(m => m.value === selectedMonth)?.label || selectedMonth} · Joined {student.dateOfJoiningFormatted || student.joiningMonthLabel}</span>
                  </div>
                )}

                {/* Info strip when student's fee cycle is current / upcoming */}
                {residentTab === 'active' && student.feeStatus === 'Upcoming' && (
                  <div style={{
                    background: 'rgba(56,189,248,0.06)',
                    border: '1px solid rgba(56,189,248,0.2)',
                    borderRadius: 10,
                    padding: '6px 10px',
                    fontSize: '0.72rem',
                    color: '#38bdf8',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>🗓️ Next Cycle Due: <strong>{student.nextDueDate || student.dueDayLabel}</strong></span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Cycle {student.dueDayLabel || '10th'} to {student.dueDayLabel || '10th'}</span>
                  </div>
                )}

                {/* Action Footer */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  paddingTop: '6px',
                  borderTop: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <button
                    onClick={() => setViewingStudent(student)}
                    style={{
                      flex: 1,
                      minHeight: 36,
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border-dim)',
                      color: 'var(--text-main)',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      cursor: 'pointer'
                    }}
                  >
                    <Eye size={13} color="var(--primary)" /> Profile
                  </button>

                  {student.phone && (
                    <a
                      href={`tel:${student.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        minHeight: 36,
                        padding: '0 12px',
                        borderRadius: 8,
                        background: 'rgba(34,197,94,0.1)',
                        border: '1px solid rgba(34,197,94,0.3)',
                        color: '#4ade80',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        textDecoration: 'none'
                      }}
                    >
                      <Phone size={13} /> Call
                    </a>
                  )}

                  {residentTab === 'active' ? (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingStudent(student); setShowForm(true); }}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid var(--border-dim)',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        title="Edit Resident"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleVacateStudent(student); }}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          color: 'var(--danger)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        title="Vacate Resident"
                      >
                        <UserMinus size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReadmitStudent(student); }}
                        style={{
                          flex: 1,
                          minHeight: 36,
                          borderRadius: 8,
                          background: 'rgba(34,197,94,0.12)',
                          border: '1px solid rgba(34,197,94,0.3)',
                          color: '#4ade80',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          cursor: 'pointer'
                        }}
                      >
                        <RotateCcw size={13} /> Re-admit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePermanentDelete(student); }}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          color: 'var(--danger)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        title="Permanently Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
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
                <div style={{ fontWeight: 800, color: 'var(--warning)', fontSize: '1.1rem' }}>₹{Number(reminderResultModal.totalAmount || monthlyFee).toLocaleString('en-IN')}</div>
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
                <Mail size={15} /> <strong>Fee Invoice & Reminder Emailed:</strong>{' '}
                <span style={{ color: reminderResultModal.emailStatus === 'FAILED' ? '#ef4444' : '#4ade80', fontWeight: 700 }}>
                  {reminderResultModal.emailStatus || 'SENT'}
                </span>
                {reminderResultModal.emailRecipient && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>({reminderResultModal.emailRecipient})</span>
                )}
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

      {/* Glassmorphism Confirmation Alert Modal */}
      {confirmState && (
        <ConfirmModal
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.confirmText}
          variant={confirmState.variant}
          onClose={() => setConfirmState(null)}
          onConfirm={confirmState.onConfirm}
        />
      )}
    </div>
  );
}
