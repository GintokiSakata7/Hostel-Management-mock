import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, IndianRupee, Calendar, Search, Printer, Banknote, Smartphone, Send, MessageSquare, PhoneCall, FileText
} from 'lucide-react';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';
import { useSettings } from '../components/SettingsContext';
import { useBuilding } from '../components/BuildingContext';

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
  const { settings } = useSettings();
  const monthlyFee = settings?.monthlyFee || 5500;
  const [form, setForm] = useState({
    amount: monthlyFee,
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
      const res = await fetch('/api/fees/pay', {
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

export function PrintReceiptModal({ record, onClose }: { record: any; onClose: () => void }) {
  const [alignMode, setAlignMode] = useState(false);
  const [coords, setCoords] = useState({
    sno: { top: 26.9, left: 12.0, size: 2.7 },
    date: { top: 25.3, left: 80.1, size: 3.6 },
    paidStamp: { top: 87.0, left: 76.9, size: 3.2 },
    name: { top: 32.7, left: 31.1, size: 4.0 },
    address: { top: 40.2, left: 12.0, size: 2.5 },
    candCell: { top: 52.4, left: 18.0, size: 2.2 },
    parCell: { top: 51.9, left: 64.1, size: 2.6 },
    advRs: { top: 58.5, left: 15.0, size: 2.8 },
    advTowards: { top: 58.5, left: 52.0, size: 2.5 },
    feesRs: { top: 64.0, left: 14.0, size: 3.3 },
    feesTowards: { top: 64.3, left: 54.0, size: 3.0 },
    checkCash: { top: 70.6, left: 23.3, size: 3.7 },
    checkUpi: { top: 70.6, left: 38.3, size: 3.8 },
    checkTransfer: { top: 70.6, left: 73.5, size: 3.6 },
    amountBox: { top: 79.5, left: 10.0, size: 4.0 },
    room: { top: 79.5, left: 42.0, size: 3.5 }
  });

  const [activeField, setActiveField] = useState<keyof typeof coords>('name');

  const updateCoord = (axis: 'top' | 'left' | 'size', value: number) => {
    setCoords(prev => ({ ...prev, [activeField]: { ...prev[activeField], [axis]: value } }));
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    
    const dateStr = record.paymentDate || new Date().toISOString().split('T')[0];
    const [dYear, dMonth, dDay] = dateStr.split('-');
    const formattedDate = `${dDay}/${dMonth}/${dYear}`;


    win.document.write(`
      <html><head><title>Print Receipt</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
        .receipt-container { position: relative; width: 100%; max-width: 800px; margin: 0 auto; user-select: none; -webkit-user-select: none; pointer-events: none; container-type: inline-size; }
        .receipt-container img.bg { width: 100%; height: auto; display: block; }
        .overlay-text { position: absolute; color: #00257a; font-weight: bold; font-family: 'Bodoni MT', serif; opacity: 0.75; filter: blur(0.5px); mix-blend-mode: multiply; }
        .sno { top: ${coords.sno.top}%; left: ${coords.sno.left}%; font-size: ${coords.sno.size}cqw; color: #e51e25; }
        .date { top: ${coords.date.top}%; left: ${coords.date.left}%; font-size: ${coords.date.size}cqw; }
        .name { top: ${coords.name.top}%; left: ${coords.name.left}%; font-size: ${coords.name.size}cqw; color: #000; }
        .address { top: ${coords.address.top}%; left: ${coords.address.left}%; font-size: ${coords.address.size}cqw; color: #000; }
        .candCell { top: ${coords.candCell.top}%; left: ${coords.candCell.left}%; font-size: ${coords.candCell.size}cqw; color: #000; }
        .parCell { top: ${coords.parCell.top}%; left: ${coords.parCell.left}%; font-size: ${coords.parCell.size}cqw; color: #000; }
        .advRs { top: ${coords.advRs.top}%; left: ${coords.advRs.left}%; font-size: ${coords.advRs.size}cqw; color: #000; }
        .advTowards { top: ${coords.advTowards.top}%; left: ${coords.advTowards.left}%; font-size: ${coords.advTowards.size}cqw; color: #000; }
        .fees-rs { top: ${coords.feesRs.top}%; left: ${coords.feesRs.left}%; font-size: ${coords.feesRs.size}cqw; color: #000; }
        .fees-towards { top: ${coords.feesTowards.top}%; left: ${coords.feesTowards.left}%; font-size: ${coords.feesTowards.size}cqw; color: #000; }
        .check-cash { top: ${coords.checkCash.top}%; left: ${coords.checkCash.left}%; font-size: ${coords.checkCash.size}cqw; }
        .check-upi { top: ${coords.checkUpi.top}%; left: ${coords.checkUpi.left}%; font-size: ${coords.checkUpi.size}cqw; }
        .check-transfer { top: ${coords.checkTransfer.top}%; left: ${coords.checkTransfer.left}%; font-size: ${coords.checkTransfer.size}cqw; }
        .amount-box { top: ${coords.amountBox.top}%; left: ${coords.amountBox.left}%; font-size: ${coords.amountBox.size}cqw; color: #000; width: 16%; text-align: center; }
        .room-no { top: ${coords.room.top}%; left: ${coords.room.left}%; font-size: ${coords.room.size}cqw; color: #000; }
        .paidStamp { position: absolute; top: ${coords.paidStamp.top}%; left: ${coords.paidStamp.left}%; font-size: ${coords.paidStamp.size}cqw; color: rgba(220, 20, 60, 0.7); border: 0.4cqw solid rgba(220, 20, 60, 0.7); border-radius: 0.5cqw; font-family: 'Arial Black', sans-serif; font-weight: 900; text-transform: uppercase; transform: rotate(-15deg); padding: 0.5cqw 1.5cqw; letter-spacing: 0.2cqw; filter: blur(0.6px); mix-blend-mode: multiply; }
        @media print {
          /* Add any print specific scaling if necessary */
        }
      </style></head><body>
      <div class="receipt-container">
        <img class="bg" src="${window.location.origin}/receipt-template.jpg" onload="window.print()" />
        <div class="overlay-text sno">${record.receiptNo || '-----'}</div>
        <div class="overlay-text date">${formattedDate}</div>
        <div class="overlay-text name">${record.name}</div>
        <div class="overlay-text address">${record.address ? record.address.split(',').pop()?.trim() : ''}</div>
        <div class="overlay-text candCell">${record.phone || ''}</div>
        <div class="overlay-text parCell">${record.parentPhone || ''}</div>
        <div class="overlay-text advRs"></div>
        <div class="overlay-text advTowards"></div>
        <div class="overlay-text fees-rs">${record.amount}</div>
        <div class="overlay-text fees-towards">${record.monthLabel}</div>
        ${record.method === 'Cash' ? '<div class="overlay-text check-cash">✔</div>' : ''}
        ${record.method === 'UPI' ? '<div class="overlay-text check-upi">✔</div>' : ''}
        ${record.method === 'Transfer' ? '<div class="overlay-text check-transfer">✔</div>' : ''}
        <div class="overlay-text amount-box">${record.amount}</div>
        <div class="overlay-text room-no">${record.room}</div>
        <div class="paidStamp">PAID</div>
      </div></body></html>
    `);
    win.document.close();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '1rem' }}
      onClick={onClose}>
      <div style={{ width: '100%', maxWidth: '900px', maxHeight: '95vh', display: 'flex', flexDirection: 'column', background: '#000', borderRadius: '12px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        
        {/* Scrollable Receipt Area */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', background: '#fff', flex: 1 }}>
          
          {alignMode && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', background: '#f8f9fa', padding: '16px', border: '1px solid #ccc', borderRadius: '8px', width: '100%', maxWidth: '800px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                <strong style={{ color: '#0055a5' }}>Alignment Mode Active</strong>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Tweak the sliders to perfectly align any missing fields, or resize the text. When done, copy the coordinates at the bottom!</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Select Field:</label>
                <select value={activeField} onChange={e => setActiveField(e.target.value as any)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #aaa' }}>
                  {Object.keys(coords).map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '150px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Top (%): {coords[activeField].top.toFixed(1)}%</label>
                <input type="range" min="0" max="100" step="0.1" value={coords[activeField].top} onChange={e => updateCoord('top', parseFloat(e.target.value))} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '150px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Left (%): {coords[activeField].left.toFixed(1)}%</label>
                <input type="range" min="0" max="100" step="0.1" value={coords[activeField].left} onChange={e => updateCoord('left', parseFloat(e.target.value))} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '150px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Size (vw): {coords[activeField].size.toFixed(1)}</label>
                <input type="range" min="0.5" max="4" step="0.1" value={coords[activeField].size} onChange={e => updateCoord('size', parseFloat(e.target.value))} />
              </div>
            </div>
          )}

          <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1rem', userSelect: 'none', WebkitUserSelect: 'none', pointerEvents: 'none' }} onClick={e => e.stopPropagation()}>
            <div style={{ position: 'relative', width: '100%', margin: '0 auto', overflow: 'hidden', fontFamily: '"Bodoni MT", serif', containerType: 'inline-size' }}>
              <img src="/receipt-template.jpg" alt="Receipt Background" style={{ width: '100%', display: 'block' }} />

              <div style={{ position: 'absolute', inset: 0, opacity: 0.75, filter: 'blur(0.5px)', mixBlendMode: 'multiply' }}>
                <div style={{ position: 'absolute', top: `${coords.sno.top}%`, left: `${coords.sno.left}%`, color: '#e51e25', fontWeight: 'bold', fontSize: `${coords.sno.size}cqw`, ...(activeField === 'sno' && alignMode ? {boxShadow: '0 0 0 4px yellow'} : {}) }}>
                  {record.receiptNo || '-----'}
                </div>
                <div style={{ position: 'absolute', top: `${coords.date.top}%`, left: `${coords.date.left}%`, color: '#00257a', fontWeight: 'bold', fontSize: `${coords.date.size}cqw`, ...(activeField === 'date' && alignMode ? {background: 'rgba(255,255,0,0.5)'} : {}) }}>
                  {(() => {
                    const dStr = record.paymentDate || new Date().toISOString().split('T')[0];
                    const [y, m, d] = dStr.split('-');
                    return `${d}/${m}/${y}`;
                  })()}
                </div>
                
                <div style={{ position: 'absolute', top: `${coords.name.top}%`, left: `${coords.name.left}%`, color: '#000', fontWeight: 'bold', fontSize: `${coords.name.size}cqw`, ...(activeField === 'name' && alignMode ? {background: 'rgba(255,255,0,0.5)'} : {}) }}>
                  {record.name}
                </div>

                <div style={{ position: 'absolute', top: `${coords.address.top}%`, left: `${coords.address.left}%`, color: '#000', fontWeight: 'bold', fontSize: `${coords.address.size}cqw`, ...(activeField === 'address' && alignMode ? {background: 'rgba(255,255,0,0.5)'} : {}) }}>
                  {(record.address ? record.address.split(',').pop()?.trim() : '') || (alignMode ? '[Address Placeholder]' : '')}
                </div>
                <div style={{ position: 'absolute', top: `${coords.candCell.top}%`, left: `${coords.candCell.left}%`, color: '#000', fontWeight: 'bold', fontSize: `${coords.candCell.size}cqw`, ...(activeField === 'candCell' && alignMode ? {background: 'rgba(255,255,0,0.5)'} : {}) }}>
                  {record.phone || (alignMode ? '[Candidate Cell]' : '')}
                </div>
                <div style={{ position: 'absolute', top: `${coords.parCell.top}%`, left: `${coords.parCell.left}%`, color: '#000', fontWeight: 'bold', fontSize: `${coords.parCell.size}cqw`, ...(activeField === 'parCell' && alignMode ? {background: 'rgba(255,255,0,0.5)'} : {}) }}>
                  {record.parentPhone || (alignMode ? '[Parents Cell]' : '')}
                </div>
                
                {alignMode && <div style={{ position: 'absolute', top: `${coords.advRs.top}%`, left: `${coords.advRs.left}%`, color: '#000', fontWeight: 'bold', fontSize: `${coords.advRs.size}cqw`, background: activeField === 'advRs' ? 'rgba(255,255,0,0.5)' : 'transparent' }}>[Adv Rs]</div>}
                {alignMode && <div style={{ position: 'absolute', top: `${coords.advTowards.top}%`, left: `${coords.advTowards.left}%`, color: '#000', fontWeight: 'bold', fontSize: `${coords.advTowards.size}cqw`, background: activeField === 'advTowards' ? 'rgba(255,255,0,0.5)' : 'transparent' }}>[Adv Towards]</div>}

                <div style={{ position: 'absolute', top: `${coords.feesRs.top}%`, left: `${coords.feesRs.left}%`, color: '#000', fontWeight: 'bold', fontSize: `${coords.feesRs.size}cqw`, ...(activeField === 'feesRs' && alignMode ? {background: 'rgba(255,255,0,0.5)'} : {}) }}>
                  {record.amount}
                </div>
                <div style={{ position: 'absolute', top: `${coords.feesTowards.top}%`, left: `${coords.feesTowards.left}%`, color: '#000', fontWeight: 'bold', fontSize: `${coords.feesTowards.size}cqw`, ...(activeField === 'feesTowards' && alignMode ? {background: 'rgba(255,255,0,0.5)'} : {}) }}>
                  {record.monthLabel}
                </div>

                {(record.method === 'Cash' || alignMode) && <div style={{ position: 'absolute', top: `${coords.checkCash.top}%`, left: `${coords.checkCash.left}%`, color: '#00257a', fontWeight: '900', fontSize: `${coords.checkCash.size}cqw`, ...(activeField === 'checkCash' && alignMode ? {background: 'rgba(255,255,0,0.5)'} : {}) }}>✔</div>}
                {(record.method === 'UPI' || alignMode) && <div style={{ position: 'absolute', top: `${coords.checkUpi.top}%`, left: `${coords.checkUpi.left}%`, color: '#00257a', fontWeight: '900', fontSize: `${coords.checkUpi.size}cqw`, ...(activeField === 'checkUpi' && alignMode ? {background: 'rgba(255,255,0,0.5)'} : {}) }}>✔</div>}
                {(record.method === 'Transfer' || alignMode) && <div style={{ position: 'absolute', top: `${coords.checkTransfer.top}%`, left: `${coords.checkTransfer.left}%`, color: '#00257a', fontWeight: '900', fontSize: `${coords.checkTransfer.size}cqw`, ...(activeField === 'checkTransfer' && alignMode ? {background: 'rgba(255,255,0,0.5)'} : {}) }}>✔</div>}
    
                <div style={{ position: 'absolute', top: `${coords.amountBox.top}%`, left: `${coords.amountBox.left}%`, color: '#000', fontWeight: 'bold', fontSize: `${coords.amountBox.size}cqw`, width: '16%', textAlign: 'center', ...(activeField === 'amountBox' && alignMode ? {background: 'rgba(255,255,0,0.5)'} : {}) }}>
                  {record.amount}
                </div>
                <div style={{ position: 'absolute', top: `${coords.room.top}%`, left: `${coords.room.left}%`, color: '#000', fontWeight: 'bold', fontSize: `${coords.room.size}cqw`, ...(activeField === 'room' && alignMode ? {background: 'rgba(255,255,0,0.5)'} : {}) }}>
                  {record.room}
                </div>

                <div style={{ position: 'absolute', top: `${coords.paidStamp.top}%`, left: `${coords.paidStamp.left}%`, color: 'rgba(220, 20, 60, 0.7)', border: '0.4cqw solid rgba(220, 20, 60, 0.7)', borderRadius: '0.5cqw', fontFamily: '"Arial Black", sans-serif', fontWeight: 900, textTransform: 'uppercase', transform: 'rotate(-15deg)', padding: '0.5cqw 1.5cqw', letterSpacing: '0.2cqw', filter: 'blur(0.6px)', mixBlendMode: 'multiply', fontSize: `${coords.paidStamp.size}cqw`, ...(activeField === 'paidStamp' && alignMode ? {boxShadow: '0 0 0 4px yellow'} : {}) }}>
                  PAID
                </div>
              </div>
            </div>
            
            {alignMode && (
              <div style={{ background: '#111', color: '#fff', padding: '16px', borderRadius: '8px', width: '100%', fontSize: '0.85rem' }}>
                <strong style={{ color: '#4ade80' }}>Updated Coordinates Array:</strong><br/><br/>
                <code style={{ whiteSpace: 'pre-wrap', color: '#a3a3a3' }}>
                  {JSON.stringify(coords, null, 2)}
                </code>
              </div>
            )}
          </div>
        </div>

        {/* Dark Modal Footer */}
        <div style={{ padding: '16px 24px', background: '#111', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            onClick={() => setAlignMode(!alignMode)}
            style={{ background: 'transparent', color: '#a3a3a3', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            {alignMode ? 'Disable Alignment Mode' : 'Tune Alignment'}
          </button>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={onClose} 
              style={{ background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', padding: '10px 24px', borderRadius: '12px', cursor: 'pointer', fontWeight: '500', fontSize: '0.95rem', transition: 'all 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = '#1a1a1a'}
              onMouseOut={(e) => e.currentTarget.style.background = '#000'}
            >
              Close
            </button>
            <button 
              onClick={handlePrint} 
              style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)' }}
              onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            >
              <Printer size={18} /> Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Fees() {
  const { showToast } = useToast();
  const { settings } = useSettings();
  const monthlyFee = settings?.monthlyFee || 5500;
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0].value);
  const [monthlyStatus, setMonthlyStatus] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [feeFilter, setFeeFilter] = useState<'all' | 'Paid' | 'Pending'>('all');
  const [payingStudent, setPayingStudent] = useState<any>(null);
  const [viewingReceipt, setViewingReceipt] = useState<any>(null);
  const [triggeringReminders, setTriggeringReminders] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [reminderModalData, setReminderModalData] = useState<any>(null);
  const [serialSearch, setSerialSearch] = useState('');

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobileTab, setMobileTab] = useState<'status' | 'transactions'>('status');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSendIndividualReminder = async (student: any) => {
    const studentId = student.studentId || student.dbId || student.id;
    if (!studentId) return;
    setSendingReminderId(studentId);
    try {
      const res = await fetch(`/api/reminders/student/${studentId}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`🎙️ Voice & Text reminder sent to ${student.name}!`, 'success');
        setReminderModalData({
          monthLabel: MONTHS.find(m => m.value === selectedMonth)?.label || selectedMonth,
          totalPendingCount: 1,
          totalPendingAmount: data.result.totalAmount,
          summaryMessage: `Personal fee reminder successfully delivered to ${student.name}.`,
          results: [data.result]
        });
      } else {
        showToast(data.message || data.error || 'Failed to send reminder', 'error');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setSendingReminderId(null);
    }
  };

  const handleSendReminders = async () => {
    setTriggeringReminders(true);
    try {
      const res = await fetch('/api/reminders/trigger', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Reminders sent successfully! (${data.data.totalPendingCount} pending students notified)`, 'success');
        setReminderModalData(data.data);
      } else {
        showToast(data.error || 'Failed to dispatch fee reminders', 'error');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setTriggeringReminders(false);
    }
  };

  const { selectedBuildingId } = useBuilding();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, txRes] = await Promise.all([
        fetch(`/api/fees/monthly-status?month=${selectedMonth}&buildingId=${selectedBuildingId}`),
        fetch(`/api/fees/transactions?month=${selectedMonth}&buildingId=${selectedBuildingId}`)
      ]);
      if (statusRes.ok) setMonthlyStatus(await statusRes.json());
      if (txRes.ok) setTransactions(await txRes.json());
    } catch (e) {
      showToast('Failed to load fee data', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedBuildingId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = monthlyStatus.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.room.toLowerCase().includes(search.toLowerCase());
    const matchFee = feeFilter === 'all' || s.feeStatus === feeFilter;
    return matchSearch && matchFee;
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

  const paidCount = monthlyStatus.filter(s => s.feeStatus === 'Paid').length;
  const pendingCount = monthlyStatus.filter(s => s.feeStatus === 'Pending').length;
  const totalCollected = monthlyStatus.filter(s => s.feeStatus === 'Paid').reduce((sum, s) => sum + s.amount, 0);

  // Fee statistics — transactions are already filtered by selectedMonth from API
  const thisMonthRevenue = transactions.reduce((s: number, t: any) => s + t.amount, 0);
  const totalRevenue = thisMonthRevenue;
  const thisMonthTx = transactions; // Already month-scoped

  const methodBreakdown = thisMonthTx.reduce((acc: any, t: any) => {
    acc[t.method] = (acc[t.method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const monthTx = serialSearch.trim()
    ? transactions.filter((t: any) => t.receiptNo && t.receiptNo.toLowerCase().includes(serialSearch.toLowerCase()))
    : transactions.slice(0, 50);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: '0 0 4px 0' }}>Fees Management</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Monthly fee tracking · ₹{monthlyFee.toLocaleString()}/student</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            className="primary-btn" 
            disabled={triggeringReminders}
            onClick={handleSendReminders}
            style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', boxShadow: '0 4px 14px rgba(249,115,22,0.3)', gap: '8px' }}>
            {triggeringReminders ? <Clock size={16} className="animate-spin" /> : <Send size={16} />}
            {triggeringReminders ? 'Sending Reminders…' : 'Send Fee Reminders Now (7 PM IST)'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-dim)', borderRadius: 10, padding: '8px 12px' }}>
            <Calendar size={16} color="var(--primary)" />
            <select className="custom-select" style={{ background: 'transparent', border: 'none', padding: 0, color: 'var(--text-main)' }}
              value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Fee Reminder Results Modal */}
      {reminderModalData && (
        <Modal isOpen onClose={() => setReminderModalData(null)} title="Automated Fee Reminders Dispatch Report">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 12, padding: '12px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>📢 Fee Reminders Summary ({reminderModalData.monthLabel})</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {reminderModalData.summaryMessage}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
              {reminderModalData.results.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>No pending students found. All student fees are up to date!</div>
              ) : reminderModalData.results.map((r: any) => (
                <div key={r.studentId} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dim)', borderRadius: 10, padding: '12px 14px', fontSize: '0.82rem' }}>
                  <div style={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem' }}>👤 {r.studentName} {r.roomName ? `· ${r.roomName}` : ''}</span>
                    <span style={{ color: 'var(--warning)', fontWeight: 800 }}>₹{Number(r.totalAmount || 5500).toLocaleString('en-IN')}</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: 4, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <span>📞 {r.phone}</span>
                    <span>•</span>
                    <span>🗓️ Due Day: <strong>{r.dueDayLabel || '10th'}</strong> of every month</span>
                    <span>•</span>
                    <span style={{ color: r.pendingMonthsCount > 1 ? '#f87171' : 'var(--text-muted)' }}>
                      Backlog: <strong>{r.pendingMonthsCount || 1} Month(s)</strong> {r.pendingMonthsList ? `(${r.pendingMonthsList.join(', ')})` : ''}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: 8, fontSize: '0.75rem', paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Send size={12} /> Telegram: {r.telegramStatus}
                    </span>
                    <span style={{ color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <PhoneCall size={12} /> Voice Note: {r.telegramVoiceStatus}
                    </span>
                    <span style={{ color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <MessageSquare size={12} /> WhatsApp: {r.whatsappStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
              <button className="primary-btn" onClick={() => setReminderModalData(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Stats row */}
      <div className="responsive-grid-3" style={{ marginBottom: '1.5rem' }}>
        {[
          { icon: CheckCircle2, label: 'Paid', value: paidCount, sub: `₹${totalCollected.toLocaleString()}`, color: 'var(--success)', bg: 'rgba(34,197,94,0.1)' },
          { icon: XCircle, label: 'Pending', value: pendingCount, sub: `₹${(pendingCount * monthlyFee).toLocaleString()} due`, color: 'var(--warning)', bg: 'rgba(234,179,8,0.1)' },
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

      <div className="responsive-grid-1-1">
        
        {/* Mobile Tabs */}
        {isMobile && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: 12 }}>
            <button onClick={() => setMobileTab('status')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: mobileTab === 'status' ? 'var(--primary)' : 'transparent', color: mobileTab === 'status' ? '#fff' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Student Status</button>
            <button onClick={() => setMobileTab('transactions')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: mobileTab === 'transactions' ? 'var(--primary)' : 'transparent', color: mobileTab === 'transactions' ? '#fff' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Recent Txns</button>
          </div>
        )}

        {/* Left: Student fee status table */}
        {(!isMobile || mobileTab === 'status') && (
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0 }}>Student Fee Status — {MONTHS.find(m => m.value === selectedMonth)?.label}</h3>
            {isMobile && (
              <button className="icon-btn-small" onClick={() => setShowMobileFilters(true)}>
                <Search size={16} /> Filters
              </button>
            )}
          </div>

          {/* Filters (Desktop) */}
          {!isMobile && (
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
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '520px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No students found.</div>
            ) : filtered.map(s => (
              <div key={s.studentId} style={{
                display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: '12px', padding: '12px 14px',
                background: 'rgba(0,0,0,0.15)', borderRadius: 12,
                border: `1px solid ${s.feeStatus === 'Paid' ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.15)'}`,
                transition: 'all 0.2s', animation: 'slideInUp 0.3s ease-out'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  {/* Avatar */}
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {s.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span>{s.course}{s.branch ? ` · ${s.branch}` : ''} · {s.room}</span>
                      {s.dueDayLabel && (
                        <span style={{ background: 'rgba(249,115,22,0.12)', color: 'var(--primary)', padding: '1px 6px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600 }}>
                          Due: {s.dueDayLabel}
                        </span>
                      )}
                      {s.pendingMonthsCount > 1 && (
                        <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '1px 6px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700 }}>
                          {s.pendingMonthsCount} Mos Overdue (₹{s.totalPendingAmount?.toLocaleString('en-IN')})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-end', gap: '12px', marginTop: isMobile ? '4px' : 0, paddingTop: isMobile ? '8px' : 0, borderTop: isMobile ? '1px dashed rgba(255,255,255,0.05)' : 'none' }}>
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
                  {/* WhatsApp status badge if available */}
                  {s.feeStatus === 'Paid' && s.whatsappStatus && (
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                      background: s.whatsappStatus === 'READ' ? 'rgba(59,130,246,0.15)' : s.whatsappStatus === 'DELIVERED' ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)',
                      color: s.whatsappStatus === 'READ' ? '#60a5fa' : s.whatsappStatus === 'DELIVERED' ? '#4ade80' : '#fb923c',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }} title={`Meta WhatsApp Status: ${s.whatsappStatus}`}>
                      WA: {s.whatsappStatus}
                    </span>
                  )}
                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      className="icon-btn-small"
                      title={`Send Personal Voice & Text Reminder to ${s.name}`}
                      disabled={sendingReminderId === s.studentId}
                      onClick={() => handleSendIndividualReminder(s)}
                      style={{ color: 'var(--primary)', border: '1px solid rgba(249,115,22,0.25)', background: 'rgba(249,115,22,0.08)' }}
                    >
                      {sendingReminderId === s.studentId ? <Clock size={13} className="animate-spin" /> : <Send size={13} />}
                    </button>
                    {s.feeStatus === 'Paid' ? (
                      <>
                        <a
                          href={`/api/fees/receipt/${s.feeRecordId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="icon-btn-small"
                          title="Download Official PDF Receipt (Stored in PostgreSQL)"
                          style={{ color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.1)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <FileText size={14} />
                        </a>
                        <button className="icon-btn-small" title="Print Receipt Template"
                          onClick={() => setViewingReceipt(s)}>
                          <Printer size={14} />
                        </button>
                      </>
                    ) : (
                      <button className="primary-btn" style={{ padding: '5px 12px', fontSize: '0.75rem', minHeight: 32, flexShrink: 0 }}
                        onClick={() => setPayingStudent(s)}>
                        <IndianRupee size={12} /> Pay
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}


        {/* Right: Chart + Monthly transactions */}
        {(!isMobile || mobileTab === 'transactions') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Fee statistics panel */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="var(--primary)" /> Fee Statistics
            </h3>
            <div className="responsive-grid-2" style={{ gap: '0.875rem', marginBottom: '1rem' }}>
              {[
                { label: 'This Month', value: `₹${thisMonthRevenue.toLocaleString()}`, color: 'var(--success)', icon: IndianRupee, sub: `${thisMonthTx.length} payments` },
                { label: 'Paid / Pending', value: `${paidCount} / ${pendingCount}`, color: paidCount >= pendingCount ? 'var(--success)' : 'var(--warning)', icon: paidCount >= pendingCount ? TrendingUp : TrendingDown, sub: `₹${totalCollected.toLocaleString()} collected` },
                { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, color: 'var(--primary)', icon: IndianRupee, sub: `${transactions.length} transactions` },
                { label: 'Avg Per Student', value: transactions.length > 0 ? `₹${Math.round(totalRevenue / transactions.length).toLocaleString()}` : '—', color: 'var(--accent)', icon: IndianRupee, sub: 'per payment' },
              ].map(({ label, value, color, icon: Icon, sub }) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '0.875rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 4 }}>
                    <Icon size={13} color={color} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</span>
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
                </div>
              ))}
            </div>
            {/* Payment method breakdown */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.875rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Payment Methods (This Month)</div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {Object.entries(methodBreakdown).length === 0
                  ? <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No data yet</div>
                  : Object.entries(methodBreakdown).map(([method, count]: [string, any]) => (
                    <div key={method} style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, padding: '4px 12px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {method}: {count}
                    </div>
                  ))
                }
              </div>
            </div>
          </div>

          {/* This month's transaction list */}
          <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Recent Transactions</h3>
          </div>
          {/* Serial number search */}
          <div className="search-bar" style={{ marginBottom: '1rem' }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              placeholder="Search by S.No (e.g. 2609-001)…"
              value={serialSearch}
              onChange={e => setSerialSearch(e.target.value)}
            />
            {serialSearch && (
              <button onClick={() => setSerialSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 4px' }}>✕</button>
            )}
          </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '520px', overflowY: 'auto' }}>
              {monthTx.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                  {serialSearch ? `No receipt found for "${serialSearch}"` : 'No transactions found.'}
                </div>
              ) : monthTx.map(tx => (
                <div key={tx.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                  background: 'rgba(0,0,0,0.15)', borderRadius: 12,
                  border: serialSearch && tx.receiptNo?.toLowerCase().includes(serialSearch.toLowerCase()) ? '1px solid rgba(249,115,22,0.5)' : '1px solid rgba(34,197,94,0.2)',
                  transition: 'all 0.2s', animation: 'slideInUp 0.3s ease-out'
                }}>
                  {/* Avatar */}
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {tx.student.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.student}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {tx.monthLabel} · {tx.date}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.9rem' }}>₹{Number(tx.amount).toLocaleString()}</div>
                    {tx.receiptNo && <div style={{ color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 700 }}>S.No: {tx.receiptNo}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
                    <a
                      href={`/api/fees/receipt/${tx.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="icon-btn-small"
                      title="Download PDF Receipt (From PostgreSQL)"
                      style={{ color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.1)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <FileText size={14} />
                    </a>
                    <button className="icon-btn-small" title="Print Receipt Template" onClick={() => setViewingReceipt({ ...tx, name: tx.student, room: tx.room, paymentDate: tx.date })}>
                      <Printer size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Mobile Filters Bottom Sheet */}
      {isMobile && showMobileFilters && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 2000 }}
          onClick={() => setShowMobileFilters(false)}>
          <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="bottom-sheet-handle" />
            <h3 style={{ margin: '0 0 1rem 0' }}>Filters</h3>
            <div className="search-bar" style={{ marginBottom: '1rem', width: '100%' }}>
              <Search size={14} color="var(--text-muted)" />
              <input placeholder="Search student or room…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Fee Status</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
              {(['all', 'Paid', 'Pending'] as const).map(f => (
                <button key={f} onClick={() => { setFeeFilter(f); setShowMobileFilters(false); }}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid', fontSize: '0.9rem', cursor: 'pointer',
                    borderColor: feeFilter === f ? 'var(--primary)' : 'var(--border-dim)',
                    background: feeFilter === f ? 'rgba(249,115,22,0.1)' : 'transparent',
                    color: feeFilter === f ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>
            <button className="primary-btn" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={() => setShowMobileFilters(false)}>Apply Filters</button>
          </div>
        </div>
      )}

      {payingStudent && (
        <PaymentModal student={payingStudent} selectedMonth={selectedMonth}
          onClose={() => setPayingStudent(null)} onSuccess={fetchData} />
      )}
      {viewingReceipt && <PrintReceiptModal record={viewingReceipt} onClose={() => setViewingReceipt(null)} />}
    </div>
  );
}
