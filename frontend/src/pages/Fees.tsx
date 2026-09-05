import { useState, useEffect, useCallback } from 'react';
import { CreditCard, DollarSign, TrendingUp, Clock, CheckCircle2, XCircle, IndianRupee, Calendar, Search, Printer, Banknote, Smartphone } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

function PaymentModal({ student, selectedMonth, onClose, onSuccess }: {
  student: any; selectedMonth: string; onClose: () => void; onSuccess: () => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    amount: MONTHLY_FEE,
    method: 'Cash',
    upiProvider: 'PhonePe',
    transactionRef: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [saving, setSaving] = useState(false);

  const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || selectedMonth;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('http://localhost:3001/api/fees/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.studentId || student.dbId,
          month: selectedMonth,
          amount: form.amount,
          method: form.method,
          upiProvider: form.method === 'UPI' ? form.upiProvider : null,
          transactionRef: form.method === 'UPI' ? form.transactionRef : null,
          date: form.date
        })
      });
      if (res.status === 409) {
        const err = await res.json();
        showToast(err.error, 'error');
      } else if (res.ok) {
        showToast(`Payment recorded for ${monthLabel}!`, 'success');
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        showToast(err.error || 'Payment failed', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Record Fee Payment">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Student info strip */}
        <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{student.name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{student.course}{student.branch ? ` · ${student.branch}` : ''} · {student.room}</div>
          <div style={{ color: 'var(--primary)', fontSize: '0.8rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={13} /> Month: <strong>{monthLabel}</strong></div>
        </div>

        <div className="form-group">
          <label>Amount (₹)</label>
          <input type="number" required className="custom-input" value={form.amount}
            onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
        </div>

        <div className="form-group">
          <label>Payment Method</label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {['Cash', 'UPI'].map(m => (
              <button key={m} type="button"
                onClick={() => setForm({ ...form, method: m })}
                style={{
                  flex: 1, padding: '10px', borderRadius: 10, border: '2px solid',
                  borderColor: form.method === m ? 'var(--primary)' : 'var(--border-dim)',
                  background: form.method === m ? 'rgba(249,115,22,0.1)' : 'transparent',
                  color: form.method === m ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}>
                {m === 'Cash' ? <><Banknote size={16} /> Cash</> : <><Smartphone size={16} /> UPI</>}
              </button>
            ))}
          </div>
        </div>

        {form.method === 'UPI' && (
          <>
            <div className="form-group">
              <label>UPI Provider</label>
              <select className="custom-input" value={form.upiProvider}
                onChange={e => setForm({ ...form, upiProvider: e.target.value })}>
                <option>PhonePe</option>
                <option>Google Pay</option>
                <option>Paytm</option>
                <option>Other UPI</option>
              </select>
            </div>
            <div className="form-group">
              <label>UPI Transaction / Reference ID</label>
              <input className="custom-input" value={form.transactionRef}
                onChange={e => setForm({ ...form, transactionRef: e.target.value })}
                placeholder="e.g. 4231896XXXX" />
            </div>
          </>
        )}

        <div className="form-group">
          <label>Payment Date</label>
          <input type="date" required className="custom-input" value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })} />
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <button type="button" className="custom-select" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-btn" style={{ flex: 1, justifyContent: 'center', gap: '6px' }} disabled={saving}>
            {saving ? 'Saving…' : <><CheckCircle2 size={16} /> Confirm Payment</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PrintReceiptModal({ record, onClose }: { record: any; onClose: () => void }) {
  const handlePrint = () => {
    const win = window.open('', '', 'width=700,height=900');
    if (!win) return;
    win.document.write(`
      <html><head><title>Fee Receipt</title>
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
        <p>Official Fee Receipt — ${record.monthLabel}</p>
        <div class="receipt-id">Receipt #VMR-${Date.now().toString().slice(-6)}</div>
      </div>
      <div class="section">Student Details</div>
      <div class="row"><span class="label">Student Name</span><span class="val">${record.name}</span></div>
      <div class="row"><span class="label">Course / Branch</span><span class="val">${record.course}${record.branch ? ' — ' + record.branch : ''}</span></div>
      <div class="row"><span class="label">Room Number</span><span class="val">${record.room}</span></div>
      <div class="row"><span class="label">Bed Number</span><span class="val">${record.bedNumber || '—'}</span></div>
      <div class="section">Fee Details</div>
      <div class="row"><span class="label">Fee Month</span><span class="val">${record.monthLabel}</span></div>
      <div class="row"><span class="label">Payment Date</span><span class="val">${record.paymentDate || '—'}</span></div>
      <div class="row"><span class="label">Payment Mode</span><span class="val">${record.method}${record.upiProvider ? ' (' + record.upiProvider + ')' : ''}</span></div>
      ${record.transactionRef ? `<div class="row"><span class="label">Transaction Ref</span><span class="val">${record.transactionRef}</span></div>` : ''}
      <div class="total">
        <span style="font-weight:700;color:#ea580c;">Total Amount Paid</span>
        <span style="font-size:1.5rem;font-weight:800;color:#f97316;">₹${Number(record.amount).toLocaleString('en-IN')}</span>
      </div>
      <div class="paid-stamp">
        <span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          PAID
        </span>
      </div>
      <div class="sig">
        <div class="sig-box">Admin / Authorized Signatory</div>
        <div class="sig-box">Student Signature</div>
      </div>
      <div class="footer">VMR Hostel Management System · Computer-generated receipt. No signature required.</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}
      onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 540, padding: '1.5rem', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: '#fff', color: '#1a1a1a', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
          <div style={{ background: '#fff7ed', borderBottom: '3px solid #f97316', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: '#f97316' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              VMR Hostel
            </div>
            <div style={{ color: '#9a3412', fontSize: '0.8rem' }}>Official Fee Receipt — {record.monthLabel}</div>
            <div style={{ display: 'inline-block', background: '#fff', border: '1px solid #fed7aa', borderRadius: 8, padding: '4px 12px', fontSize: '0.72rem', color: '#ea580c', fontWeight: 600, marginTop: 8 }}>
              Receipt #VMR-{Date.now().toString().slice(-6)}
            </div>
          </div>

          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'Student', value: record.name },
              { label: 'Course', value: `${record.course}${record.branch ? ' — ' + record.branch : ''}` },
              { label: 'Room', value: record.room }, { label: 'Bed', value: record.bedNumber || '—' },
              { label: 'Fee Month', value: record.monthLabel },
              { label: 'Payment Date', value: record.paymentDate },
              { label: 'Payment Mode', value: `${record.method}${record.upiProvider ? ' (' + record.upiProvider + ')' : ''}` },
              ...(record.transactionRef ? [{ label: 'Transaction Ref', value: record.transactionRef }] : []),
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: '0.85rem' }}>
                <span style={{ color: '#666' }}>{label}</span>
                <span style={{ fontWeight: 600 }}>{value}</span>
              </div>
            ))}
            <div style={{ background: '#fff7ed', border: '2px solid #f97316', borderRadius: 12, padding: '1rem', display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <span style={{ fontWeight: 700, color: '#ea580c' }}>Total Paid</span>
              <span style={{ fontWeight: 800, fontSize: '1.3rem', color: '#f97316' }}>₹{Number(record.amount).toLocaleString('en-IN')}</span>
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
            <Printer size={16} /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Fees() {
  const { showToast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0].value);
  const [monthlyStatus, setMonthlyStatus] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [feeFilter, setFeeFilter] = useState<'all' | 'Paid' | 'Pending'>('all');
  const [payingStudent, setPayingStudent] = useState<any>(null);
  const [viewingReceipt, setViewingReceipt] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, txRes] = await Promise.all([
        fetch(`http://localhost:3001/api/fees/monthly-status?month=${selectedMonth}`),
        fetch(`http://localhost:3001/api/fees/transactions`)
      ]);
      if (statusRes.ok) setMonthlyStatus(await statusRes.json());
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData);
        // Build chart: last 6 months
        const last6 = MONTHS.slice(0, 6).reverse();
        setChartData(last6.map(m => {
          const total = txData.filter((t: any) => t.month === m.value).reduce((s: number, t: any) => s + t.amount, 0);
          return { name: m.label.split(' ')[0], amount: total };
        }));
      }
    } catch (e) {
      showToast('Failed to load fee data', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = monthlyStatus.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.room.toLowerCase().includes(search.toLowerCase());
    const matchFee = feeFilter === 'all' || s.feeStatus === feeFilter;
    return matchSearch && matchFee;
  });

  const paidCount = monthlyStatus.filter(s => s.feeStatus === 'Paid').length;
  const pendingCount = monthlyStatus.filter(s => s.feeStatus === 'Pending').length;
  const totalCollected = monthlyStatus.filter(s => s.feeStatus === 'Paid').reduce((sum, s) => sum + s.amount, 0);

  const monthTx = transactions.slice(0, 50); // Show recent 50 transactions across all months

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: '0 0 4px 0' }}>Fees Management</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Monthly fee tracking · ₹{MONTHLY_FEE.toLocaleString()}/student</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-dim)', borderRadius: 10, padding: '8px 12px' }}>
            <Calendar size={16} color="var(--primary)" />
            <select className="custom-select" style={{ background: 'transparent', border: 'none', padding: 0, color: 'var(--text-main)' }}
              value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {[
          { icon: CheckCircle2, label: 'Paid', value: paidCount, sub: `₹${totalCollected.toLocaleString()}`, color: 'var(--success)', bg: 'rgba(34,197,94,0.1)' },
          { icon: XCircle, label: 'Pending', value: pendingCount, sub: `₹${(pendingCount * MONTHLY_FEE).toLocaleString()} due`, color: 'var(--warning)', bg: 'rgba(234,179,8,0.1)' },
          { icon: TrendingUp, label: 'Collection Rate', value: monthlyStatus.length > 0 ? `${Math.round(paidCount / monthlyStatus.length * 100)}%` : '0%', sub: `${MONTHS.find(m => m.value === selectedMonth)?.label}`, color: 'var(--primary)', bg: 'rgba(249,115,22,0.1)' },
        ].map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: bg, padding: '14px', borderRadius: 14, color, flexShrink: 0 }}>
              <Icon size={28} />
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginTop: 2 }}>{label}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem' }}>
        {/* Left: Student fee status table */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0 }}>Student Fee Status — {MONTHS.find(m => m.value === selectedMonth)?.label}</h3>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <div className="search-bar" style={{ flex: 1 }}>
              <Search size={14} color="var(--text-muted)" />
              <input placeholder="Search student or room…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {(['all', 'Paid', 'Pending'] as const).map(f => (
              <button key={f} onClick={() => setFeeFilter(f)}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s',
                  borderColor: feeFilter === f ? 'var(--primary)' : 'var(--border-dim)',
                  background: feeFilter === f ? 'rgba(249,115,22,0.1)' : 'transparent',
                  color: feeFilter === f ? 'var(--primary)' : 'var(--text-muted)' }}>
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '520px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No students found.</div>
            ) : filtered.map(s => (
              <div key={s.studentId} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                background: 'rgba(0,0,0,0.15)', borderRadius: 12,
                border: `1px solid ${s.feeStatus === 'Paid' ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.15)'}`,
                transition: 'all 0.2s', animation: 'slideInUp 0.3s ease-out'
              }}>
                {/* Avatar */}
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {s.name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{s.course}{s.branch ? ` · ${s.branch}` : ''} · {s.room}</div>
                </div>
                {/* Fee status badge */}
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                  background: s.feeStatus === 'Paid' ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                  color: s.feeStatus === 'Paid' ? 'var(--success)' : 'var(--warning)',
                  border: `1px solid ${s.feeStatus === 'Paid' ? 'rgba(34,197,94,0.3)' : 'rgba(234,179,8,0.3)'}`,
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                  {s.feeStatus === 'Paid' ? <><CheckCircle2 size={12} /> PAID</> : <><Clock size={12} /> PENDING</>}
                </span>
                {/* Actions */}
                {s.feeStatus === 'Paid' ? (
                  <button className="icon-btn-small" title="Print Receipt"
                    onClick={() => setViewingReceipt(s)}>
                    <Printer size={14} />
                  </button>
                ) : (
                  <button className="primary-btn" style={{ padding: '5px 12px', fontSize: '0.75rem', minHeight: 32, flexShrink: 0 }}
                    onClick={() => setPayingStudent(s)}>
                    <IndianRupee size={12} /> Pay
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Chart + Monthly transactions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Collection Trend</h3>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'rgba(15,17,26,0.95)', border: '1px solid var(--border)', borderRadius: 8 }}
                    itemStyle={{ color: 'var(--text-main)' }} />
                  <Area type="monotone" dataKey="amount" stroke="var(--success)" strokeWidth={2.5} fillOpacity={1} fill="url(#areaGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* This month's transaction list */}
          <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, overflow: 'hidden' }}>
            <h3 style={{ marginBottom: '1rem' }}>Recent Transactions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 300, overflowY: 'auto' }}>
              {monthTx.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No transactions this month.</div>
              ) : monthTx.map(tx => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{tx.student}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{tx.monthLabel} · {tx.date} · {tx.method}{tx.upiProvider ? ` (${tx.upiProvider})` : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--success)' }}>₹{Number(tx.amount).toLocaleString()}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{tx.transactionRef || ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {payingStudent && (
        <PaymentModal student={payingStudent} selectedMonth={selectedMonth}
          onClose={() => setPayingStudent(null)} onSuccess={fetchData} />
      )}
      {viewingReceipt && <PrintReceiptModal record={viewingReceipt} onClose={() => setViewingReceipt(null)} />}
    </div>
  );
}
