import { useState, useEffect, useCallback } from 'react';
import {
  Search, UserPlus, Edit2, Trash2, X, IndianRupee, Calendar, Printer,
  User, BookOpen, BedDouble, Phone, Mail, MapPin, Shield, ChevronDown, ChevronUp
} from 'lucide-react';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';

const MONTHLY_FEE = 5500;

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
  dateOfJoining: '', aadhar: '', phone: '',
  parentName: '', parentPhone: '', parentRelationship: 'Father', parentAltPhone: '', parentAddress: '',
  emergencyName: '', emergencyPhone: '', emergencyRelationship: 'Parent',
  state: 'Andhra Pradesh', address: '', pincode: '',
  securityDeposit: '', feeStatus: 'Pending', status: 'Active'
};

function PrintReceiptModal({ student, feeRecord, onClose }: { student: any; feeRecord: any; onClose: () => void }) {
  const handlePrint = () => {
    const win = window.open('', '', 'width=700,height=900');
    if (!win) return;
    win.document.write(`
      <html><head><title>Fee Receipt — ${student.name}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #fff; padding: 2cm; color: #1a1a1a; }
        .header { text-align: center; border-bottom: 3px solid #f97316; padding-bottom: 1.2rem; margin-bottom: 1.5rem; }
        .header h1 { font-size: 1.6rem; font-weight: 800; color: #f97316; display: flex; align-items: center; justify-content: center; }
        .header p { color: #666; font-size: 0.8rem; margin-top: 4px; }
        .receipt-id { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 6px 14px; display: inline-block; font-size: 0.78rem; color: #ea580c; font-weight: 700; margin-top: 8px; }
        .section { margin: 1.2rem 0 0.5rem 0; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #999; }
        .row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #f5f5f5; font-size: 0.88rem; }
        .label { color: #666; }
        .val { font-weight: 600; }
        .total { background: #fff7ed; border: 2px solid #f97316; border-radius: 12px; padding: 1rem; display: flex; justify-content: space-between; margin-top: 1.2rem; align-items: center; }
        .paid-stamp { text-align: center; margin: 1.5rem 0; }
        .paid-stamp span { border: 3px solid #16a34a; color: #16a34a; padding: 6px 24px; border-radius: 8px; font-weight: 800; font-size: 1.1rem; letter-spacing: 3px; transform: rotate(-2deg); display: inline-flex; align-items: center; }
        .sig { display: flex; justify-content: space-between; margin-top: 2rem; font-size: 0.75rem; color: #999; }
        .sig-box { text-align: center; border-top: 1px solid #ccc; padding-top: 8px; width: 180px; }
        .footer { text-align: center; margin-top: 1.5rem; font-size: 0.7rem; color: #aaa; border-top: 1px dashed #ddd; padding-top: 1rem; }
      </style></head><body>
      <div class="header">
        <h1>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          VMR Hostel
        </h1>
        <p>Official Fee Receipt — ${feeRecord.monthLabel}</p>
        <div class="receipt-id">Receipt #VMR-${Date.now().toString().slice(-6)}</div>
      </div>
      <div class="section">Student Details</div>
      <div class="row"><span class="label">Student Name</span><span class="val">${student.name}</span></div>
      <div class="row"><span class="label">Course / Branch</span><span class="val">${student.course}${student.branch ? ' — ' + student.branch : ''}</span></div>
      <div class="row"><span class="label">Room</span><span class="val">${student.room}</span></div>
      <div class="row"><span class="label">Bed</span><span class="val">${student.bedNumber || '—'}</span></div>
      <div class="section">Fee Details</div>
      <div class="row"><span class="label">Fee Month</span><span class="val">${feeRecord.monthLabel}</span></div>
      <div class="row"><span class="label">Payment Date</span><span class="val">${feeRecord.date}</span></div>
      <div class="row"><span class="label">Payment Mode</span><span class="val">${feeRecord.method}${feeRecord.upiProvider ? ' (' + feeRecord.upiProvider + ')' : ''}</span></div>
      ${feeRecord.transactionRef ? `<div class="row"><span class="label">Transaction Ref</span><span class="val">${feeRecord.transactionRef}</span></div>` : ''}
      <div class="total"><span style="font-weight:700;color:#ea580c;">Total Amount Paid</span><span style="font-size:1.5rem;font-weight:800;color:#f97316;">₹${Number(feeRecord.amount).toLocaleString('en-IN')}</span></div>
      <div class="paid-stamp">
        <span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          PAID
        </span>
      </div>
      <div class="sig"><div class="sig-box">Admin / Authorized Signatory</div><div class="sig-box">Student Signature</div></div>
      <div class="footer">VMR Hostel Management System · Computer-generated receipt.</div>
      </body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}
      onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 480, padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: '#fff', color: '#1a1a1a', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
          <div style={{ background: '#fff7ed', borderBottom: '3px solid #f97316', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: '#f97316' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              VMR Hostel
            </div>
            <div style={{ color: '#9a3412', fontSize: '0.8rem', marginTop: 4 }}>Fee Receipt — {feeRecord.monthLabel}</div>
          </div>
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { l: 'Student', v: student.name },
              { l: 'Room / Bed', v: `${student.room} / Bed ${student.bedNumber || '—'}` },
              { l: 'Month', v: feeRecord.monthLabel },
              { l: 'Payment Date', v: feeRecord.date },
              { l: 'Mode', v: `${feeRecord.method}${feeRecord.upiProvider ? ' (' + feeRecord.upiProvider + ')' : ''}` },
              ...(feeRecord.transactionRef ? [{ l: 'Ref ID', v: feeRecord.transactionRef }] : []),
            ].map(({ l, v }) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f5f5f5', fontSize: '0.85rem' }}>
                <span style={{ color: '#666' }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <div style={{ background: '#fff7ed', border: '2px solid #f97316', borderRadius: 10, padding: '0.85rem', display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontWeight: 700, color: '#ea580c' }}>Total Paid</span>
              <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#f97316' }}>₹{Number(feeRecord.amount).toLocaleString('en-IN')}</span>
            </div>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <span style={{ border: '2px dashed #16a34a', color: '#16a34a', padding: '6px 20px', borderRadius: 8, fontWeight: 800, fontSize: '0.9rem', letterSpacing: 2, display: 'inline-flex', alignItems: 'center', transform: 'rotate(-2deg)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                PAID
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button className="custom-select" style={{ flex: 1 }} onClick={onClose}>Close</button>
          <button className="primary-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={handlePrint}>
            <Printer size={15} /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ student, selectedMonth, onClose, onSuccess }: { student: any; selectedMonth: string; onClose: () => void; onSuccess: () => void }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ amount: MONTHLY_FEE, method: 'Cash', upiProvider: 'PhonePe', transactionRef: '', date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || selectedMonth;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch('http://localhost:3001/api/fees/pay', {
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

function StudentDetailCard({ student, selectedMonth, onClose, onRefresh }: { student: any; selectedMonth: string; onClose: () => void; onRefresh: () => void }) {
  const { showToast } = useToast();
  const [showHistory, setShowHistory] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || selectedMonth;
  const feeRecord = student.fees?.find((f: any) => f.month === selectedMonth);
  const isPaidThisMonth = !!feeRecord;

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
        onClick={onClose}>
        <div className="glass-heavy" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative', borderRadius: 20, margin: '1rem' }}
          onClick={e => e.stopPropagation()}>
          {/* Close */}
          <button className="icon-btn-small" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16 }}><X size={18} /></button>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, color: '#fff', boxShadow: '0 8px 24px rgba(249,115,22,0.4)', flexShrink: 0 }}>
              {student.name.charAt(0)}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{student.name}</h2>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{student.course}{student.branch ? ` · ${student.branch}` : ''} · {student.year} Year</div>
              <div style={{ display: 'flex', gap: '6px', marginTop: 6 }}>
                <span className="status-badge badge-available">{student.status}</span>
                {student.room !== 'Unallocated' && <span className="room-badge">{student.room}</span>}
              </div>
            </div>
          </div>

          {/* Fee status for selected month */}
          <div style={{ borderRadius: 14, padding: '1rem', background: isPaidThisMonth ? 'rgba(34,197,94,0.08)' : 'rgba(234,179,8,0.08)', border: `1px solid ${isPaidThisMonth ? 'rgba(34,197,94,0.25)' : 'rgba(234,179,8,0.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <IndianRupee size={20} color={isPaidThisMonth ? 'var(--success)' : 'var(--warning)'} />
              <div>
                <div style={{ fontWeight: 700, color: isPaidThisMonth ? 'var(--success)' : 'var(--warning)' }}>{isPaidThisMonth ? 'Fee Paid' : 'Fee Pending'}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{monthLabel}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>₹{MONTHLY_FEE.toLocaleString()}</div>
              {isPaidThisMonth ? (
                <button className="icon-btn-small" title="Print Receipt" onClick={() => setShowReceipt(true)}><Printer size={16} /></button>
              ) : (
                <button className="primary-btn" style={{ padding: '5px 14px', fontSize: '0.8rem' }} onClick={() => setShowPayment(true)}>
                  <IndianRupee size={13} /> Pay Now
                </button>
              )}
            </div>
          </div>

          {/* Detail grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.25rem' }}>
            {[
              { icon: Phone, label: 'Mobile', value: student.phone || '—' },
              { icon: Mail, label: 'Email', value: student.email || '—' },
              { icon: BedDouble, label: 'Room', value: student.room },
              { icon: Calendar, label: 'Joined', value: student.dateOfJoining ? new Date(student.dateOfJoining).toLocaleDateString('en-IN') : '—' },
              { icon: User, label: 'Parent', value: student.parentName || '—' },
              { icon: Phone, label: 'Parent Ph.', value: student.parentPhone || '—' },
              { icon: MapPin, label: 'State', value: student.state || '—' },
              { icon: Shield, label: 'Aadhar', value: student.aadhar ? `••••${student.aadhar.slice(-4)}` : '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px', border: '1px solid var(--border-dim)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: 5 }}>
                  <Icon size={12} />{label}
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Payment history toggle */}
          <button onClick={() => setShowHistory(!showHistory)} style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-dim)', borderRadius: 10, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem' }}>
            {showHistory ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            Payment History ({student.fees?.length || 0} records)
          </button>
          {showHistory && (
            <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(student.fees || []).length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem' }}>No payment records.</div>
              ) : (student.fees || []).map((f: any) => (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: 10, border: '1px solid rgba(34,197,94,0.15)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{f.monthLabel}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{f.date} · {f.method}{f.upiProvider ? ` (${f.upiProvider})` : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--success)' }}>₹{Number(f.amount).toLocaleString()}</div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--success)' }}>✓ Paid</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showPayment && <PaymentModal student={student} selectedMonth={selectedMonth} onClose={() => setShowPayment(false)} onSuccess={() => { setShowPayment(false); onRefresh(); }} />}
      {showReceipt && feeRecord && <PrintReceiptModal student={student} feeRecord={feeRecord} onClose={() => setShowReceipt(false)} />}
    </>
  );
}

// ─── Admission Form ───────────────────────────────────────────────────────────
function AdmissionForm({ student, onClose, onSave }: { student: any; onClose: () => void; onSave: () => void }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(student ? { ...EMPTY_FORM, ...student, dob: student.dob ? student.dob.split('T')[0] : '', dateOfJoining: student.dateOfJoining ? student.dateOfJoining.split('T')[0] : '' } : { ...EMPTY_FORM, dateOfJoining: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);

  const branches = COURSES[form.course] || ['Other'];

  const f = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val, ...(key === 'course' ? { branch: (COURSES[val] || ['Other'])[0] } : {}) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const url = student ? `http://localhost:3001/api/students/${student.dbId}` : 'http://localhost:3001/api/students';
      const res = await fetch(url, { method: student ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) { showToast(student ? 'Student updated!' : 'Student added!', 'success'); onSave(); onClose(); }
      else { const e = await res.json(); showToast(e.error || 'Failed', 'error'); }
    } finally { setSaving(false); }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ height: 1, flex: 1, background: 'var(--border-dim)' }} />
        {title}
        <div style={{ height: 1, flex: 1, background: 'var(--border-dim)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>{children}</div>
    </div>
  );

  const F = ({ label, col, children }: { label: string; col?: boolean; children: React.ReactNode }) => (
    <div className="form-group" style={col ? { gridColumn: '1/-1' } : {}}>
      <label style={{ fontSize: '0.8rem', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2500 }}
      onClick={onClose}>
      <div className="glass-heavy" style={{ width: '100%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto', padding: '2rem', borderRadius: 20, position: 'relative' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>{student ? 'Edit Student' : 'New Student Admission'}</h2>
          <button className="icon-btn-small" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <Section title="Personal Information">
            <F label="Full Name *"><input required className="custom-input" value={form.name} onChange={e => f('name', e.target.value)} placeholder="Full name" /></F>
            <F label="Gender">
              <select className="custom-input" value={form.gender} onChange={e => f('gender', e.target.value)}>
                <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
              </select>
            </F>
            <F label="Date of Birth"><input type="date" className="custom-input" value={form.dob} onChange={e => f('dob', e.target.value)} /></F>
            <F label="Mobile Number"><input className="custom-input" value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="10-digit mobile" /></F>
            <F label="Email" col><input type="email" className="custom-input" value={form.email} onChange={e => f('email', e.target.value)} placeholder="student@email.com" /></F>
          </Section>

          <Section title="Academic Information">
            <F label="Course *">
              <select required className="custom-input" value={form.course} onChange={e => f('course', e.target.value)}>
                {Object.keys(COURSES).map(c => <option key={c}>{c}</option>)}
              </select>
            </F>
            <F label="Branch / Department">
              <select className="custom-input" value={form.branch} onChange={e => f('branch', e.target.value)}>
                {branches.map(b => <option key={b}>{b}</option>)}
              </select>
            </F>
            <F label="Year">
              <select className="custom-input" value={form.year} onChange={e => f('year', e.target.value)}>
                <option>1st</option><option>2nd</option><option>3rd</option><option>4th</option>
              </select>
            </F>
            <F label="Roll Number"><input className="custom-input" value={form.rollNumber} onChange={e => f('rollNumber', e.target.value)} placeholder="e.g. 21B01A0501" /></F>
          </Section>

          <Section title="Hostel Information">
            <F label="Admission Date *"><input required type="date" className="custom-input" value={form.dateOfJoining} onChange={e => f('dateOfJoining', e.target.value)} /></F>
            <F label="Status">
              <select className="custom-input" value={form.status} onChange={e => f('status', e.target.value)}>
                <option value="Active">Active</option><option value="On Leave">On Leave</option>
              </select>
            </F>
            <F label="Security Deposit (₹)"><input type="number" className="custom-input" value={form.securityDeposit} onChange={e => f('securityDeposit', e.target.value)} placeholder="e.g. 5000" /></F>
          </Section>

          <Section title="Parent / Guardian Information">
            <F label="Parent / Guardian Name"><input className="custom-input" value={form.parentName} onChange={e => f('parentName', e.target.value)} placeholder="Full name" /></F>
            <F label="Relationship">
              <select className="custom-input" value={form.parentRelationship} onChange={e => f('parentRelationship', e.target.value)}>
                <option>Father</option><option>Mother</option><option>Guardian</option><option>Other</option>
              </select>
            </F>
            <F label="Contact Number"><input className="custom-input" value={form.parentPhone} onChange={e => f('parentPhone', e.target.value)} placeholder="Mobile" /></F>
            <F label="Alternate Number"><input className="custom-input" value={form.parentAltPhone} onChange={e => f('parentAltPhone', e.target.value)} placeholder="Alt. mobile" /></F>
            <F label="Parent Address" col><input className="custom-input" value={form.parentAddress} onChange={e => f('parentAddress', e.target.value)} placeholder="Full address" /></F>
          </Section>

          <Section title="Emergency Contact">
            <F label="Contact Name"><input className="custom-input" value={form.emergencyName} onChange={e => f('emergencyName', e.target.value)} placeholder="Emergency contact name" /></F>
            <F label="Relationship"><input className="custom-input" value={form.emergencyRelationship} onChange={e => f('emergencyRelationship', e.target.value)} placeholder="e.g. Uncle" /></F>
            <F label="Phone Number" col><input className="custom-input" value={form.emergencyPhone} onChange={e => f('emergencyPhone', e.target.value)} placeholder="Emergency phone" /></F>
          </Section>

          <Section title="Address & Identification">
            <F label="Aadhaar Number"><input className="custom-input" value={form.aadhar} onChange={e => f('aadhar', e.target.value)} placeholder="12-digit Aadhaar" /></F>
            <F label="State">
              <select className="custom-input" value={form.state} onChange={e => f('state', e.target.value)}>
                <option value="">Select State</option>
                <option>Andhra Pradesh</option><option>Telangana</option><option>Tamil Nadu</option>
                <option>Karnataka</option><option>Kerala</option><option>Maharashtra</option>
                <option>Gujarat</option><option>Rajasthan</option><option>Delhi</option><option>Other</option>
              </select>
            </F>
            <F label="Address" col><input className="custom-input" value={form.address} onChange={e => f('address', e.target.value)} placeholder="Full address" /></F>
            <F label="Pincode"><input className="custom-input" value={form.pincode} onChange={e => f('pincode', e.target.value)} placeholder="6-digit pincode" /></F>
          </Section>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="custom-select" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" style={{ flex: 1, justifyContent: 'center' }} disabled={saving}>
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

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/students?month=${selectedMonth}`);
      if (res.ok) setStudents(await res.json());
    } catch (e) { showToast('Failed to fetch students', 'error'); }
    finally { setLoading(false); }
  }, [selectedMonth]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleDelete = async (dbId: string) => {
    if (!confirm('Delete this student permanently?')) return;
    try {
      await fetch(`http://localhost:3001/api/students/${dbId}`, { method: 'DELETE' });
      showToast('Student deleted', 'success'); fetchStudents();
    } catch (e) { showToast('Delete failed', 'error'); }
  };

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.room || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCourse = courseFilter === 'all' || s.course.toLowerCase().includes(courseFilter.toLowerCase());
    const matchFee = feeFilter === 'all' || s.feeStatus === feeFilter;
    return matchSearch && matchCourse && matchFee;
  });

  const paidCount = students.filter(s => s.feeStatus === 'Paid').length;
  const pendingCount = students.filter(s => s.feeStatus === 'Pending').length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: '0 0 4px 0' }}>Student Management</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>{students.length} students · Monthly fee ₹{MONTHLY_FEE.toLocaleString()}</p>
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

        <div className="table-container">
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
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="avatar-small">{student.name.charAt(0)}</div>
                      <button className="student-name-btn" onClick={() => setViewingStudent(student)}>{student.name}</button>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{student.course}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{student.branch || '—'} · {student.year} Year</div>
                  </td>
                  <td>
                    <span className="room-badge">{student.room}</span>
                    {student.bedNumber && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: 6 }}>Bed {student.bedNumber}</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`fee-status-chip ${student.feeStatus === 'Paid' ? 'fee-paid' : 'fee-pending'}`}>
                        <IndianRupee size={10} />{student.feeStatus}
                      </span>
                      {student.feeStatus !== 'Paid' && (
                        <button className="primary-btn" style={{ padding: '3px 10px', fontSize: '0.7rem', minHeight: 26 }} onClick={() => setPayingStudent(student)}>
                          Pay
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="icon-btn-small" onClick={() => { setEditingStudent(student); setShowForm(true); }} title="Edit"><Edit2 size={14} /></button>
                      <button className="icon-btn-small delete" onClick={() => handleDelete(student.dbId)} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {viewingStudent && (
        <StudentDetailCard student={viewingStudent} selectedMonth={selectedMonth}
          onClose={() => setViewingStudent(null)}
          onRefresh={() => { fetchStudents(); setViewingStudent(null); }} />
      )}
      {showForm && (
        <AdmissionForm student={editingStudent} onClose={() => setShowForm(false)} onSave={fetchStudents} />
      )}
      {payingStudent && (
        <PaymentModal student={payingStudent} selectedMonth={selectedMonth}
          onClose={() => setPayingStudent(null)}
          onSuccess={() => { fetchStudents(); setPayingStudent(null); }} />
      )}
    </div>
  );
}
