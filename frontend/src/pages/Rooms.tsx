import { useState, useEffect, useCallback } from 'react';
import { Building2, Users, Calendar, IndianRupee, BedDouble, Layers3, Search, Plus, Printer, Banknote, Smartphone, CheckCircle2, Info, Phone, GraduationCap, User, XCircle, Home } from 'lucide-react';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';

const MONTHLY_FEE = 5500;

const MONTHS = Array.from({ length: 6 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return { value: `${y}-${m}`, label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
});

function BedCard({ bed, onAllocate, onPay, onPrint, onStudentClick, onUnpay }: { bed: any; onAllocate: () => void; onPay: () => void; onPrint: () => void; onStudentClick?: () => void; onUnpay: () => void }) {
  const isOccupied = bed.status === 'occupied';
  const isPaid = bed.feeStatus === 'Paid' || bed.feeStatus === 'Completed';

  let borderColor = 'rgba(255,255,255,0.08)';
  let bgGrad = 'rgba(255,255,255,0.02)';
  let statusColor = 'var(--text-muted)';
  let statusBg = 'rgba(255,255,255,0.06)';
  let statusLabel = 'AVAILABLE';

  if (isOccupied) {
    if (isPaid) {
      borderColor = 'rgba(34,197,94,0.25)';
      bgGrad = 'rgba(34,197,94,0.04)';
      statusColor = 'var(--success)';
      statusBg = 'rgba(34,197,94,0.12)';
      statusLabel = 'PAID';
    } else {
      borderColor = 'rgba(234,179,8,0.25)';
      bgGrad = 'rgba(234,179,8,0.04)';
      statusColor = 'var(--warning)';
      statusBg = 'rgba(234,179,8,0.12)';
      statusLabel = 'PENDING';
    }
  }

  return (
    <div style={{
      border: `1px solid ${borderColor}`, borderRadius: 14,
      background: bgGrad, padding: '14px',
      transition: 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
      position: 'relative', overflow: 'hidden'
    }}
      className="bed-card-hover">
      {/* Glow pulse for pending */}
      {isOccupied && !isPaid && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: 14, pointerEvents: 'none', animation: 'pendingPulse 2s ease-in-out infinite', background: 'rgba(234,179,8,0.04)' }} />
      )}

      {/* Bed header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <BedDouble size={15} color={isOccupied ? statusColor : 'var(--text-muted)'} />
          <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Bed {bed.bedIndex}</span>
        </div>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: statusBg, color: statusColor, letterSpacing: 0.5 }}>
          {statusLabel}
        </span>
      </div>

      {/* Student name or empty */}
      <div style={{ minHeight: 36 }}>
        {isOccupied ? (
          <div onClick={e => { e.stopPropagation(); if (onStudentClick) onStudentClick(); }} style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.3, cursor: 'pointer' }} className="student-name-hover">{bed.student}</div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Empty</div>
        )}
      </div>

      {/* Action */}
      <div style={{ marginTop: 10 }}>
        {isOccupied ? (
          !isPaid ? (
            <button className="primary-btn" style={{ width: '100%', justifyContent: 'center', padding: '5px 8px', fontSize: '0.72rem', minHeight: 28, borderRadius: 8 }}
              onClick={e => { e.stopPropagation(); onPay(); }}>
              <IndianRupee size={11} /> Record Payment
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button style={{ flex: 1, justifyContent: 'center', padding: '5px 8px', fontSize: '0.72rem', minHeight: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', color: 'var(--text-main)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={e => { e.stopPropagation(); onPrint(); }}>
                <Printer size={12} /> Receipt
              </button>
              <button style={{ flex: 1, justifyContent: 'center', padding: '5px 8px', fontSize: '0.72rem', minHeight: 28, borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={e => { e.stopPropagation(); onUnpay(); }}>
                <XCircle size={12} /> Unpay
              </button>
            </div>
          )
        ) : (
          <button onClick={e => { e.stopPropagation(); onAllocate(); }}
            style={{ width: '100%', padding: '5px 8px', borderRadius: 8, border: '1px dashed rgba(249,115,22,0.4)', background: 'transparent', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'all 0.2s' }}>
            <Plus size={11} /> Allocate
          </button>
        )}
      </div>
    </div>
  );
}

function PremiumRoomCard({ room, selectedMonth, onRoomClick, onAllocate, onPay, onPrint, onStudentClick, onUnpay }: {
  room: any; selectedMonth: string; onRoomClick: () => void; onAllocate: (bed: any) => void; onPay: (bed: any) => void; onPrint: (bed: any) => void; onStudentClick: (bed: any) => void; onUnpay: (bed: any) => void;
}) {
  const paidCount = room.beds.filter((b: any) => b.status === 'occupied' && (b.feeStatus === 'Paid' || b.feeStatus === 'Completed')).length;
  const pendingCount = room.beds.filter((b: any) => b.status === 'occupied' && b.feeStatus === 'Pending').length;
  const occupancyPct = room.capacity > 0 ? Math.round((room.occupied / room.capacity) * 100) : 0;

  const statusColor = room.status === 'available' ? 'var(--success)' : room.status === 'full' ? 'var(--danger)' : 'var(--warning)';
  const statusLabel = room.status === 'available' ? 'Available' : room.status === 'full' ? 'Full' : 'Partial';

  return (
    <div className="glass-panel premium-room-card" style={{ padding: 0, overflow: 'hidden', transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)' }}>
      {/* Room header */}
      <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-dim)', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
        onClick={onRoomClick}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-dim)' }}>
              <Home size={20} color="var(--primary)" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-main)', letterSpacing: -0.5 }}>{room.id}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 3 }}>Floor {room.floor} · {room.capacity} Bed Room</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `rgba(${room.status === 'available' ? '34,197,94' : room.status === 'full' ? '239,68,68' : '234,179,8'},0.12)`, color: statusColor, border: `1px solid ${statusColor}40` }}>
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Occupancy bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${occupancyPct}%`, background: statusColor, borderRadius: 4, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>{room.occupied}/{room.capacity}</div>
        </div>

        {/* Fee mini summary */}
        {room.occupied > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            {paidCount > 0 && <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 12, background: 'rgba(34,197,94,0.12)', color: 'var(--success)', fontWeight: 700 }}>✓ {paidCount} Paid</span>}
            {pendingCount > 0 && <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 12, background: 'rgba(234,179,8,0.12)', color: 'var(--warning)', fontWeight: 700 }}>⏳ {pendingCount} Pending</span>}
          </div>
        )}
      </div>

      {/* Bed grid (inline — no modal needed for small rooms) */}
      <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: room.capacity <= 4 ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '8px' }}>
        {room.beds.map((bed: any) => (
          <BedCard key={bed.id} bed={bed} onAllocate={() => onAllocate(bed)} onPay={() => onPay(bed)} onPrint={() => onPrint({ ...bed, roomId: room.id })} onStudentClick={() => onStudentClick(bed)} onUnpay={() => onUnpay(bed)} />
        ))}
      </div>
    </div>
  );
}

function QuickPayModal({ bed, selectedMonth, onClose, onSuccess }: { bed: any; selectedMonth: string; onClose: () => void; onSuccess: () => void }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ amount: MONTHLY_FEE, method: 'Cash', upiProvider: 'PhonePe', transactionRef: '', date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || selectedMonth;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const studentId = bed.studentObj?.dbId || bed.studentDbId;
      if (!studentId) { showToast('Student not found', 'error'); return; }
      const res = await fetch('http://localhost:3001/api/fees/pay', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, month: selectedMonth, amount: form.amount, method: form.method, upiProvider: form.method === 'UPI' ? form.upiProvider : null, transactionRef: form.method === 'UPI' ? form.transactionRef : null, date: form.date })
      });
      if (res.status === 409) { const e = await res.json(); showToast(e.error, 'error'); }
      else if (res.ok) { showToast(`Payment recorded for ${bed.student}!`, 'success'); onSuccess(); onClose(); }
      else { showToast('Payment failed', 'error'); }
    } finally { setSaving(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title="Record Payment">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ fontWeight: 700 }}>{bed.student}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Bed {bed.bedIndex} · Month: <strong style={{ color: 'var(--primary)' }}>{monthLabel}</strong></div>
        </div>
        <div className="form-group"><label>Amount (₹)</label>
          <input type="number" required className="custom-input" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} /></div>
        <div className="form-group"><label>Payment Method</label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {['Cash', 'UPI'].map(m => (
              <button key={m} type="button" onClick={() => setForm({ ...form, method: m })}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '2px solid', borderColor: form.method === m ? 'var(--primary)' : 'var(--border-dim)', background: form.method === m ? 'rgba(249,115,22,0.1)' : 'transparent', color: form.method === m ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {m === 'Cash' ? <><Banknote size={16} /> Cash</> : <><Smartphone size={16} /> UPI</>}
              </button>
            ))}
          </div>
        </div>
        {form.method === 'UPI' && (<>
          <div className="form-group"><label>UPI Provider</label>
            <select className="custom-input" value={form.upiProvider} onChange={e => setForm({ ...form, upiProvider: e.target.value })}>
              <option>PhonePe</option><option>Google Pay</option><option>Paytm</option><option>Other UPI</option>
            </select></div>
          <div className="form-group"><label>Transaction Ref ID</label>
            <input className="custom-input" value={form.transactionRef} onChange={e => setForm({ ...form, transactionRef: e.target.value })} placeholder="Transaction ref" /></div>
        </>)}
        <div className="form-group"><label>Date</label>
          <input type="date" required className="custom-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" className="custom-select" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-btn" style={{ flex: 1, justifyContent: 'center', gap: '6px' }} disabled={saving}>{saving ? 'Saving…' : <><CheckCircle2 size={16}/> Confirm</>}</button>
        </div>
      </form>
    </Modal>
  );
}

function AllocateModal({ bed, selectedBuilding, onClose, onSuccess }: { bed: any; selectedBuilding: any; onClose: () => void; onSuccess: () => void }) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [allStudents, setAllStudents] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:3001/api/students').then(r => r.json()).then(data => setAllStudents(data));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      showToast('Please enter or select a student', 'error');
      return;
    }
    const student = allStudents.find(s => s.name === name);
    const payload = student ? { bedId: bed.id, studentId: student.id } : { bedId: bed.id, studentName: name };

    const res = await fetch('http://localhost:3001/api/beds/allocate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) { showToast('Allocated successfully!', 'success'); onSuccess(); onClose(); }
    else { const err = await res.json(); showToast(err.error || 'Failed', 'error'); }
  };

  const selectedStudent = allStudents.find(s => s.name === name);
  const isAlreadyAllocated = selectedStudent && selectedStudent.room !== 'Unallocated';

  return (
    <Modal isOpen onClose={onClose} title={`Allocate Bed ${bed.bedIndex}`}>
      <form onSubmit={handleSubmit}>
        <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 700 }}>Bed {bed.bedIndex}</span>
          <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: '0.8rem' }}>Monthly Fee: ₹{MONTHLY_FEE.toLocaleString()}</span>
        </div>
        <div className="form-group">
          <label>Student Name</label>
          <input required className="custom-input" list="student-list" value={name} onChange={e => setName(e.target.value)} placeholder="Start typing student name…" />
          <datalist id="student-list">{allStudents.map(s => <option key={s.id} value={s.name} />)}</datalist>
          <small style={{ color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>You can also type a name manually to allocate someone not yet in the system.</small>
        </div>
        {isAlreadyAllocated && (
          <div style={{ marginTop: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: '8px', color: 'var(--danger)', fontSize: '0.85rem', alignItems: 'center' }}>
            <Info size={16} />
            <span><strong>Warning:</strong> This student is already allocated to <strong>{selectedStudent.room}</strong>. Proceeding will move them to this bed.</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button type="button" className="custom-select" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-btn" style={{ flex: 1, justifyContent: 'center' }}>Confirm Allocation</button>
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

export default function Rooms() {
  const { showToast } = useToast();
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0].value);
  const [search, setSearch] = useState('');

  const [allocatingBed, setAllocatingBed] = useState<any>(null);
  const [payingBed, setPayingBed] = useState<any>(null);
  const [viewingReceiptBed, setViewingReceiptBed] = useState<any>(null);
  const [viewingStudent, setViewingStudent] = useState<any>(null);

  const fetchBuildings = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/buildings');
      if (res.ok) {
        const data = await res.json();
        setBuildings(data);
        if (data.length > 0 && !selectedBuilding) { handleSelectBuilding(data[0], selectedMonth); }
      }
    } catch (e) { showToast('Failed to fetch buildings', 'error'); }
  };

  const fetchRooms = useCallback(async (buildingId: string, month: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/rooms/${buildingId}?month=${month}`);
      if (res.ok) setRooms(await res.json());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  const handleSelectBuilding = (b: any, month?: string) => {
    setSelectedBuilding(b);
    fetchRooms(b.id, month || selectedMonth);
  };

  useEffect(() => { fetchBuildings(); }, []);
  useEffect(() => { if (selectedBuilding) fetchRooms(selectedBuilding.id, selectedMonth); }, [selectedMonth]);

  const floors = Array.from(new Set(rooms.map(r => r.floor))).sort();
  const filteredRooms = rooms.filter(r => r.id.toLowerCase().includes(search.toLowerCase()));

  const handleRefresh = () => {
    if (selectedBuilding) fetchRooms(selectedBuilding.id, selectedMonth);
    fetchBuildings();
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Room & Bed Management</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Legend */}
          {[{ color: 'var(--success)', label: 'Paid' }, { color: 'var(--warning)', label: 'Pending' }, { color: 'rgba(255,255,255,0.3)', label: 'Empty' }].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, display: 'inline-block' }} />{label}
            </div>
          ))}
          {/* Month selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-dim)', borderRadius: 10, padding: '7px 12px' }}>
            <Calendar size={14} color="var(--primary)" />
            <select style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.82rem', cursor: 'pointer' }}
              value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Building cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {buildings.map((b, i) => (
          <div key={b.id} className={`glass building-card ${selectedBuilding?.id === b.id ? 'selected' : ''}`}
            style={{ animationDelay: `${i * 0.07}s`, animation: 'slideInUp 0.35s ease-out both', cursor: 'pointer' }}
            onClick={() => handleSelectBuilding(b)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(245,158,11,0.1))', border: '1px solid rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={22} color="var(--primary)" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>{b.name}</h3>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{b.totalRooms} Rooms</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(34,197,94,0.08)', borderRadius: 10, padding: '8px 12px' }}>
                <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: '1.2rem' }}>{b.availableBeds}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>Available Beds</div>
              </div>
              <div style={{ background: 'rgba(249,115,22,0.08)', borderRadius: 10, padding: '8px 12px' }}>
                <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.2rem' }}>{b.totalBeds || '—'}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>Total Beds</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rooms section */}
      {selectedBuilding && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <Layers3 size={18} color="var(--primary)" />
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Rooms in <span style={{ color: 'var(--primary)' }}>{selectedBuilding.name}</span></h2>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 'auto' }}>{rooms.length} rooms</span>
            <div className="search-bar" style={{ width: 200 }}>
              <Search size={13} color="var(--text-muted)" />
              <input placeholder="Filter room…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading rooms…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              {floors.map(floor => (
                <div key={floor}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-muted)', padding: '4px 12px', border: '1px solid var(--border-dim)', borderRadius: 20 }}>
                      Floor {floor}
                    </div>
                    <div style={{ flex: 1, height: 1, background: 'var(--border-dim)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{filteredRooms.filter(r => r.floor === floor).length} rooms</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    {filteredRooms.filter(r => r.floor === floor).map((room, i) => (
                      <div key={room.id} style={{ animationDelay: `${i * 0.04}s`, animation: 'slideInUp 0.3s ease-out both' }}>
                        <PremiumRoomCard
                          room={room}
                          selectedMonth={selectedMonth}
                          onRoomClick={() => {}}
                          onAllocate={(bed) => setAllocatingBed(bed)}
                          onPay={(bed) => setPayingBed(bed)}
                          onPrint={(bed) => setViewingReceiptBed(bed)}
                          onStudentClick={(bed) => setViewingStudent(bed)}
                          onUnpay={async (bed) => {
                            if (!confirm(`Are you sure you want to mark the fee for ${bed.student} as NOT PAID?`)) return;
                            const studentId = bed.studentObj?.dbId || bed.studentDbId;
                            if (!studentId) return showToast('Student not found', 'error');
                            const res = await fetch('http://localhost:3001/api/fees/unpay', {
                              method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ studentId, month: selectedMonth })
                            });
                            if (res.ok) { showToast('Fee marked as unpaid', 'success'); handleRefresh(); }
                            else { const err = await res.json(); showToast(err.error || 'Failed', 'error'); }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {allocatingBed && (
        <AllocateModal bed={allocatingBed} selectedBuilding={selectedBuilding}
          onClose={() => setAllocatingBed(null)} onSuccess={handleRefresh} />
      )}
      {payingBed && (
        <QuickPayModal bed={payingBed} selectedMonth={selectedMonth}
          onClose={() => setPayingBed(null)} onSuccess={handleRefresh} />
      )}
      {viewingReceiptBed && (
        <PrintReceiptModal 
          record={{
            name: viewingReceiptBed.student,
            course: viewingReceiptBed.studentObj?.course || '',
            branch: viewingReceiptBed.studentObj?.branch || '',
            room: viewingReceiptBed.roomId || (selectedBuilding?.name + ' - ' + viewingReceiptBed.roomNumber),
            bedNumber: viewingReceiptBed.bedIndex,
            monthLabel: MONTHS.find(m => m.value === selectedMonth)?.label,
            amount: viewingReceiptBed.studentObj?.feeRecord?.amount || MONTHLY_FEE,
            paymentDate: viewingReceiptBed.studentObj?.feeRecord?.date?.split('T')[0] || new Date().toISOString().split('T')[0],
            method: viewingReceiptBed.studentObj?.feeRecord?.method || 'Cash',
            upiProvider: viewingReceiptBed.studentObj?.feeRecord?.upiProvider,
            transactionRef: viewingReceiptBed.studentObj?.feeRecord?.transactionRef
          }} 
          onClose={() => setViewingReceiptBed(null)} 
        />
      )}

      {viewingStudent && viewingStudent.studentObj && (
        <Modal isOpen onClose={() => setViewingStudent(null)} title="Student Details">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>
                {viewingStudent.student.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)' }}>{viewingStudent.student}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Bed {viewingStudent.bedIndex}</div>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border-dim)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: '6px' }}><GraduationCap size={13} /> Course</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: 4 }}>{viewingStudent.studentObj.course || '—'}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border-dim)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: '6px' }}><Layers3 size={13} /> Branch</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: 4 }}>{viewingStudent.studentObj.branch || '—'}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border-dim)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={13} /> Phone</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: 4 }}>{viewingStudent.studentObj.phone || '—'}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border-dim)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: '6px' }}><User size={13} /> Parent Name</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: 4 }}>{viewingStudent.studentObj.parentName || '—'}</div>
              </div>
            </div>

            <button className="primary-btn" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={() => setViewingStudent(null)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
