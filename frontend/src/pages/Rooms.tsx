import { useState, useEffect, useCallback } from 'react';
import { Calendar, IndianRupee, BedDouble, Layers3, Search, Plus, Printer, Banknote, Smartphone, CheckCircle2, Phone, GraduationCap, User, XCircle, Home, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';
import { PrintReceiptModal } from './Fees';

import { useSettings } from '../components/SettingsContext';
import { useBuilding } from '../components/BuildingContext';

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

  let borderColor = 'rgba(255,255,255,0.06)';
  let bgGrad = 'rgba(255,255,255,0.015)';
  let statusColor = 'rgba(255,255,255,0.35)';
  let statusDot = 'rgba(255,255,255,0.25)';

  if (isOccupied) {
    if (isPaid) {
      borderColor = 'rgba(34,197,94,0.2)';
      bgGrad = 'linear-gradient(135deg, rgba(34,197,94,0.06), rgba(34,197,94,0.02))';
      statusColor = 'var(--success)';
      statusDot = '#22c55e';
    } else {
      borderColor = 'rgba(234,179,8,0.2)';
      bgGrad = 'linear-gradient(135deg, rgba(234,179,8,0.06), rgba(234,179,8,0.02))';
      statusColor = 'var(--warning)';
      statusDot = '#eab308';
    }
  }

  return (
    <div style={{
      border: `1px solid ${borderColor}`, borderRadius: 12,
      background: bgGrad, padding: '12px',
      transition: 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
      position: 'relative', overflow: 'hidden'
    }}
      className="bed-card-hover">
      {/* Glow pulse for pending */}
      {isOccupied && !isPaid && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: 12, pointerEvents: 'none', animation: 'pendingPulse 2.5s ease-in-out infinite', background: 'rgba(234,179,8,0.03)' }} />
      )}

      {/* Bed header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <BedDouble size={13} color={isOccupied ? statusColor : 'rgba(255,255,255,0.3)'} />
          <span style={{ fontWeight: 700, fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Bed {bed.bedIndex}</span>
        </div>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusDot, boxShadow: isOccupied ? `0 0 6px ${statusDot}` : 'none', flexShrink: 0 }} />
      </div>

      {/* Student name or empty */}
      <div style={{ minHeight: 28, marginBottom: 8 }}>
        {isOccupied ? (
          <div onClick={e => { e.stopPropagation(); if (onStudentClick) onStudentClick(); }}
            style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.3, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            className="student-name-hover">{bed.student}</div>
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.78rem', fontStyle: 'italic' }}>Vacant</div>
        )}
      </div>

      {/* Action */}
      <div>
        {isOccupied ? (
          !isPaid ? (
            <button className="primary-btn" style={{ width: '100%', justifyContent: 'center', padding: '6px 8px', fontSize: '0.7rem', minHeight: 28, borderRadius: 8, boxShadow: '0 2px 8px rgba(249,115,22,0.25)' }}
              onClick={e => { e.stopPropagation(); onPay(); }}>
              <IndianRupee size={11} /> Record Payment
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button style={{ flex: 1, justifyContent: 'center', padding: '5px 6px', fontSize: '0.68rem', minHeight: 26, borderRadius: 7, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', transition: 'all 0.15s' }}
                onClick={e => { e.stopPropagation(); onPrint(); }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                <Printer size={10} /> Receipt
              </button>
              <button style={{ flex: 1, justifyContent: 'center', padding: '5px 6px', fontSize: '0.68rem', minHeight: 26, borderRadius: 7, background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.7)', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', transition: 'all 0.15s' }}
                onClick={e => { e.stopPropagation(); onUnpay(); }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = 'rgba(239,68,68,0.7)'; }}>
                <XCircle size={10} /> Unpay
              </button>
            </div>
          )
        ) : (
          <button onClick={e => { e.stopPropagation(); onAllocate(); }}
            style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: '1px dashed rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.04)', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'all 0.2s', minHeight: 26 }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(249,115,22,0.12)'; e.currentTarget.style.borderStyle = 'solid'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(249,115,22,0.04)'; e.currentTarget.style.borderStyle = 'dashed'; }}>
            <Plus size={11} /> Allocate
          </button>
        )}
      </div>
    </div>
  );
}

function PremiumRoomCard({ room, onRoomClick, onAllocate, onPay, onPrint, onStudentClick, onUnpay, isMobile, onOpenMobileBeds }: {
  room: any; onRoomClick: () => void; onAllocate: (bed: any) => void; onPay: (bed: any) => void; onPrint: (bed: any) => void; onStudentClick: (bed: any) => void; onUnpay: (bed: any) => void; isMobile?: boolean; onOpenMobileBeds?: () => void;
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
        onClick={() => {
          if (isMobile && onOpenMobileBeds) onOpenMobileBeds();
          else onRoomClick();
        }}>
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

      {/* Bed grid (inline — no modal needed for desktop) */}
      {!isMobile && (
        <div className={room.capacity <= 4 ? 'responsive-grid-2' : 'responsive-grid-3'} style={{ padding: '1rem', gap: '8px' }}>
          {room.beds.map((bed: any) => (
            <BedCard key={bed.id} bed={bed} onAllocate={() => onAllocate(bed)} onPay={() => onPay(bed)} onPrint={() => onPrint({ ...bed, roomId: room.id })} onStudentClick={() => onStudentClick(bed)} onUnpay={() => onUnpay(bed)} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuickPayModal({ bed, selectedMonth, onClose, onSuccess }: { bed: any; selectedMonth: string; onClose: () => void; onSuccess: () => void }) {
  const { showToast } = useToast();
  const { settings } = useSettings();
  const monthlyFee = settings?.monthlyFee || 5500;
  const [form, setForm] = useState({ amount: monthlyFee, method: 'Cash', upiProvider: 'PhonePe', transactionRef: '', date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || selectedMonth;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const studentId = bed.studentObj?.dbId || bed.studentDbId;
      if (!studentId) { showToast('Student not found', 'error'); return; }
      const res = await fetch('/api/fees/pay', {
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

function AllocateModal({ bed, onClose, onSuccess }: { bed: any; onClose: () => void; onSuccess: () => void }) {
  const { showToast } = useToast();
  const { settings } = useSettings();
  const monthlyFee = settings?.monthlyFee || 5500;
  const [name, setName] = useState('');
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    fetch('/api/students/names').then(r => r.json()).then(data => setAllStudents(data));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      showToast('Please enter or select a student', 'error');
      return;
    }
    const student = allStudents.find(s => s.name.toLowerCase() === name.trim().toLowerCase());
    const payload = student ? { bedId: bed.id, studentId: student.id } : { bedId: bed.id, studentName: name };

    const res = await fetch('/api/beds/allocate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) { showToast('Allocated successfully!', 'success'); onSuccess(); onClose(); }
    else { const err = await res.json(); showToast(err.error || 'Failed', 'error'); }
  };

  const selectedStudent = allStudents.find(s => s.name.toLowerCase() === name.trim().toLowerCase());
  const isAlreadyAllocated = selectedStudent && selectedStudent.room !== 'Unallocated';

  const matchingSuggestions = name.trim().length > 0 
    ? allStudents.filter(s => s.name.toLowerCase().includes(name.trim().toLowerCase()))
    : allStudents;

  return (
    <Modal isOpen onClose={onClose} title={`Allocate Bed ${bed.bedIndex}`}>
      <form onSubmit={handleSubmit}>
        <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 700 }}>Bed {bed.bedIndex}</span>
          <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: '0.8rem' }}>Monthly Fee: ₹{monthlyFee.toLocaleString()}</span>
        </div>

        <div className="form-group" style={{ position: 'relative' }}>
          <label>Student Name</label>
          <input 
            required 
            className="custom-input" 
            value={name} 
            onChange={e => {
              setName(e.target.value);
              setShowSuggestions(true);
            }} 
            onFocus={() => setShowSuggestions(true)}
            placeholder="Start typing student name (e.g. Rishi)…" 
            autoComplete="off"
          />

          {/* Real-time Autocomplete Suggestions Dropdown */}
          {showSuggestions && matchingSuggestions.length > 0 && (
            <div 
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 100,
                marginTop: 4,
                background: 'rgba(22, 26, 38, 0.96)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 12,
                maxHeight: 200,
                overflowY: 'auto',
                boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
                padding: '4px'
              }}
            >
              {matchingSuggestions.map(student => (
                <div
                  key={student.id}
                  onClick={() => {
                    setName(student.name);
                    setShowSuggestions(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.85rem',
                    color: '#fff',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(249,115,22,0.18)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontWeight: 600 }}>{student.name}</span>
                  {student.room !== 'Unallocated' ? (
                    <span style={{ fontSize: '0.72rem', color: '#fb923c', background: 'rgba(249,115,22,0.15)', padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(249,115,22,0.3)' }}>
                      In {student.room}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#4ade80', background: 'rgba(34,197,94,0.15)', padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(34,197,94,0.3)' }}>
                      Unallocated
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <small style={{ color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
            Type initial letters to search existing residents, or enter a new name manually.
          </small>
        </div>

        {isAlreadyAllocated && (
          <div style={{ marginTop: '0.75rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: '10px', color: '#ef4444', fontSize: '0.85rem', alignItems: 'center' }}>
            <XCircle size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong>Action Required:</strong> <span>{selectedStudent.name} is already allocated to <strong>Room {selectedStudent.room}</strong>. Please vacate / de-allocate them from Room {selectedStudent.room} first before allocating to a new bed.</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button type="button" className="custom-select" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-btn" style={{ flex: 1, justifyContent: 'center' }} disabled={isAlreadyAllocated}>Confirm Allocation</button>
        </div>
      </form>
    </Modal>
  );
}



function EditBuildingModal({
  building,
  rooms,
  onClose,
  onSuccess
}: {
  building: any;
  rooms: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { showToast } = useToast();
  const [buildingName, setBuildingName] = useState(building ? building.name : '');
  const [saving, setSaving] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  // Track locally-added floors (before any rooms exist on them)
  const [localNewFloors, setLocalNewFloors] = useState<string[]>([]);

  // Derive floors from rooms + any locally-added empty floors, always synced
  const existingFloors = Array.from(new Set(rooms.map(r => r.floor))).sort();
  const floorsList = Array.from(new Set([...existingFloors, ...localNewFloors])).sort();
  
  // Default active floor to the first one that actually exists
  const [activeTabFloor, setActiveTabFloor] = useState<string>(
    existingFloors.length > 0 ? existingFloors[0] : '1'
  );

  // New room state
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState(4);
  const [addingRoom, setAddingRoom] = useState(false);

  // If active floor no longer exists (all rooms deleted from it), switch to first available
  useEffect(() => {
    if (floorsList.length > 0 && !floorsList.includes(activeTabFloor)) {
      setActiveTabFloor(floorsList[0]);
    }
    // Clean up localNewFloors that now have real rooms
    if (existingFloors.length > 0) {
      setLocalNewFloors(prev => prev.filter(f => !existingFloors.includes(f)));
    }
  }, [rooms]);

  const handleRenameBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!building || !buildingName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/buildings/${building.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: buildingName.trim() })
      });
      if (res.ok) {
        showToast('Building name updated!', 'success');
        setIsRenaming(false);
        onSuccess();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to rename building', 'error');
      }
    } catch (e: any) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddFloor = () => {
    const allFloors = [...floorsList];
    const maxFloor = allFloors.reduce((max, f) => {
      const n = parseInt(f);
      return !isNaN(n) && n > max ? n : max;
    }, 0);
    const newFloorLabel = String(maxFloor + 1);
    if (!floorsList.includes(newFloorLabel)) {
      setLocalNewFloors(prev => [...prev, newFloorLabel]);
      setActiveTabFloor(newFloorLabel);
      showToast(`Floor ${newFloorLabel} added! Add rooms below.`, 'info');
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber.trim()) {
      showToast('Please enter a room number', 'error');
      return;
    }
    setAddingRoom(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingId: building.id,
          floor: activeTabFloor,
          roomNumber: newRoomNumber.trim(),
          capacity: newRoomCapacity
        })
      });
      if (res.ok) {
        showToast(`Room ${newRoomNumber} added to Floor ${activeTabFloor}!`, 'success');
        setNewRoomNumber('');
        onSuccess();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to add room', 'error');
      }
    } catch (e: any) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setAddingRoom(false);
    }
  };

  const handleUpdateRoomCapacity = async (room: any, newCap: number) => {
    try {
      const res = await fetch(`/api/rooms/${room.dbId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capacity: newCap })
      });
      if (res.ok) {
        showToast(`Room ${room.id} → ${newCap} beds`, 'success');
        onSuccess();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update capacity', 'error');
      }
    } catch (e: any) {
      showToast('Error: ' + e.message, 'error');
    }
  };

  const handleDeleteRoom = async (room: any) => {
    if (!confirm(`Are you sure you want to delete Room ${room.id}?`)) return;
    try {
      const res = await fetch(`/api/rooms/${room.dbId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Room ${room.id} deleted`, 'success');
        onSuccess();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to delete room', 'error');
      }
    } catch (e: any) {
      showToast('Error: ' + e.message, 'error');
    }
  };

  const floorRooms = rooms.filter(r => r.floor === activeTabFloor);
  const totalBeds = rooms.reduce((s, r) => s + r.capacity, 0);
  const totalOccupied = rooms.reduce((s, r) => s + r.occupied, 0);
  const floorBeds = floorRooms.reduce((s, r) => s + r.capacity, 0);
  const floorOccupied = floorRooms.reduce((s, r) => s + r.occupied, 0);

  return (
    <div
      className="edit-building-overlay"
      onClick={onClose}
    >
      <div
        className="edit-building-container"
        onClick={e => e.stopPropagation()}
      >
        {/* ===== Header Bar ===== */}
        <div className="edit-building-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(249,115,22,0.4)'
            }}>
              <Home size={20} color="#fff" />
            </div>
            <div>
              {isRenaming ? (
                <form onSubmit={handleRenameBuilding} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    autoFocus
                    className="custom-input"
                    value={buildingName}
                    onChange={e => setBuildingName(e.target.value)}
                    style={{ padding: '5px 10px', fontSize: '1rem', fontWeight: 700, width: 220, background: 'rgba(0,0,0,0.3)' }}
                  />
                  <button type="submit" disabled={saving} style={{
                    background: 'var(--primary)', border: 'none', color: '#fff',
                    padding: '4px 12px', borderRadius: 8, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer'
                  }}>
                    {saving ? '…' : 'Save'}
                  </button>
                  <button type="button" onClick={() => { setIsRenaming(false); setBuildingName(building.name); }} style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    color: 'var(--text-muted)', padding: '4px 10px', borderRadius: 8, fontSize: '0.78rem', cursor: 'pointer'
                  }}>
                    Cancel
                  </button>
                </form>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, letterSpacing: -0.5 }}>
                    {building.name}
                  </h2>
                  <button type="button" onClick={() => setIsRenaming(true)} style={{
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 6, fontSize: '0.68rem',
                    fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                  }}
                    onMouseOver={e => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = 'rgba(249,115,22,0.4)'; }}
                    onMouseOut={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                  >
                    ✎ Rename
                  </button>
                </div>
              )}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Building Layout Configuration
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Building Stats Chips */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="edit-building-stat-chip">
                <Layers3 size={12} />
                <span>{floorsList.length} Floor{floorsList.length > 1 ? 's' : ''}</span>
              </div>
              <div className="edit-building-stat-chip">
                <Home size={12} />
                <span>{rooms.length} Room{rooms.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="edit-building-stat-chip">
                <BedDouble size={12} />
                <span>{totalOccupied}/{totalBeds} Beds</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="icon-btn-small"
              style={{ width: 36, height: 36 }}
            >
              <XCircle size={18} />
            </button>
          </div>
        </div>

        {/* ===== Two-Panel Body ===== */}
        <div className="edit-building-body">
          {/* Left: Floor Navigation */}
          <div className="edit-building-floors-nav">
            <div style={{ padding: '16px 16px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-muted)' }}>
                Floors
              </span>
              <button
                type="button"
                onClick={handleAddFloor}
                style={{
                  background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(245,158,11,0.15))',
                  border: '1px solid rgba(249,115,22,0.35)', color: 'var(--primary)',
                  borderRadius: 8, padding: '4px 10px', fontSize: '0.7rem', fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(249,115,22,0.3)'}
                onMouseOut={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(245,158,11,0.15))'}
              >
                <Plus size={12} /> Add
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 10px', flex: 1, overflowY: 'auto' }}>
              {floorsList.map(f => {
                const fRooms = rooms.filter(r => r.floor === f);
                const fBeds = fRooms.reduce((s, r) => s + r.capacity, 0);
                const fOcc = fRooms.reduce((s, r) => s + r.occupied, 0);
                const isActive = activeTabFloor === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setActiveTabFloor(f)}
                    className={`edit-building-floor-tab ${isActive ? 'active' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: isActive ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.04)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${isActive ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        transition: 'all 0.2s'
                      }}>
                        <Layers3 size={14} color={isActive ? 'var(--primary)' : 'var(--text-muted)'} />
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isActive ? '#fff' : 'var(--text-muted)' }}>
                          Floor {f}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: isActive ? 'rgba(249,115,22,0.8)' : 'rgba(255,255,255,0.35)' }}>
                          {fRooms.length} room{fRooms.length !== 1 ? 's' : ''} · {fOcc}/{fBeds} beds
                        </div>
                      </div>
                    </div>
                    {fOcc > 0 && (
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: fOcc === fBeds ? 'var(--danger)' : 'var(--success)',
                        boxShadow: `0 0 8px ${fOcc === fBeds ? 'var(--danger)' : 'var(--success)'}`,
                        flexShrink: 0
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Room Management Panel */}
          <div className="edit-building-rooms-panel">
            {/* Floor Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.015)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, letterSpacing: -0.3 }}>
                  Floor {activeTabFloor}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {floorRooms.length} room{floorRooms.length !== 1 ? 's' : ''} · {floorOccupied}/{floorBeds} beds occupied
                </div>
              </div>
              {floorBeds > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 80, height: 5, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4, transition: 'width 0.5s ease',
                      width: `${Math.round((floorOccupied / floorBeds) * 100)}%`,
                      background: floorOccupied === floorBeds ? 'var(--danger)' : floorOccupied > 0 ? 'var(--warning)' : 'var(--success)'
                    }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    {floorBeds > 0 ? Math.round((floorOccupied / floorBeds) * 100) : 0}%
                  </span>
                </div>
              )}
            </div>

            {/* Rooms Grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {floorRooms.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '3rem 2rem',
                  color: 'var(--text-muted)', fontSize: '0.88rem'
                }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 16, margin: '0 auto 16px',
                    background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Home size={24} color="rgba(255,255,255,0.2)" />
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>No rooms on Floor {activeTabFloor}</div>
                  <div style={{ fontSize: '0.78rem', opacity: 0.6 }}>Use the form below to add the first room.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                  {floorRooms.map((room, idx) => {
                    const occPct = room.capacity > 0 ? Math.round((room.occupied / room.capacity) * 100) : 0;
                    const roomColor = room.occupied === 0 ? 'var(--success)' : room.occupied >= room.capacity ? 'var(--danger)' : 'var(--warning)';
                    return (
                      <div
                        key={room.dbId}
                        className="edit-building-room-card"
                        style={{ animationDelay: `${idx * 0.04}s` }}
                      >
                        {/* Room Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 10,
                              background: `rgba(${room.occupied === 0 ? '34,197,94' : room.occupied >= room.capacity ? '239,68,68' : '234,179,8'},0.1)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              border: `1px solid ${roomColor}30`
                            }}>
                              <Home size={16} color={roomColor} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>
                                Room {room.id}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                {room.occupied}/{room.capacity} occupied
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={room.occupied > 0}
                            onClick={() => handleDeleteRoom(room)}
                            title={room.occupied > 0 ? 'Cannot delete: beds occupied' : 'Delete Room'}
                            className="icon-btn-small delete"
                            style={{
                              width: 28, height: 28,
                              opacity: room.occupied > 0 ? 0.3 : 1,
                              cursor: room.occupied > 0 ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Occupancy Mini Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <div style={{ flex: 1, height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 3, width: `${occPct}%`,
                              background: roomColor, transition: 'width 0.4s ease'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: roomColor }}>{occPct}%</span>
                        </div>

                        {/* Bed Capacity Controller */}
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: '6px 10px',
                          border: '1px solid rgba(255,255,255,0.06)'
                        }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Beds</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <button
                              type="button"
                              disabled={room.capacity <= 1 || room.capacity <= room.occupied}
                              onClick={() => handleUpdateRoomCapacity(room, room.capacity - 1)}
                              className="edit-building-cap-btn"
                              style={{ opacity: (room.capacity <= 1 || room.capacity <= room.occupied) ? 0.25 : 1 }}
                            >
                              −
                            </button>
                            <span style={{
                              fontWeight: 800, fontSize: '0.9rem', color: '#fff',
                              minWidth: 36, textAlign: 'center', display: 'inline-block'
                            }}>
                              {room.capacity}
                            </span>
                            <button
                              type="button"
                              disabled={room.capacity >= 12}
                              onClick={() => handleUpdateRoomCapacity(room, room.capacity + 1)}
                              className="edit-building-cap-btn"
                              style={{ opacity: room.capacity >= 12 ? 0.25 : 1 }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add New Room Footer */}
            <div className="edit-building-add-room-bar">
              <form onSubmit={handleAddRoom} style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%' }}>
                <div style={{ flex: 2, position: 'relative' }}>
                  <input
                    required
                    className="custom-input"
                    value={newRoomNumber}
                    onChange={e => setNewRoomNumber(e.target.value)}
                    placeholder={`Room number (e.g. ${activeTabFloor}01)`}
                    style={{ padding: '10px 14px', fontSize: '0.85rem', width: '100%', background: 'rgba(0,0,0,0.35)' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[2, 3, 4, 6, 8].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewRoomCapacity(c)}
                      className={`edit-building-cap-chip ${newRoomCapacity === c ? 'active' : ''}`}
                    >
                      {c}
                    </button>
                  ))}
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 2 }}>beds</span>
                </div>
                <button
                  type="submit"
                  className="primary-btn"
                  style={{ padding: '10px 18px', fontSize: '0.82rem', whiteSpace: 'nowrap', borderRadius: 10 }}
                  disabled={addingRoom}
                >
                  {addingRoom ? 'Adding…' : '+ Add Room'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Rooms() {
  const { showToast } = useToast();
  const { settings } = useSettings();
  const { selectedBuildingId, setSelectedBuildingId, fetchBuildings: refreshContextBuildings } = useBuilding();
  const monthlyFee = settings?.monthlyFee || 5500;
  const [buildings, setBuildings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0].value);
  const [search, setSearch] = useState('');

  const [allocatingBed, setAllocatingBed] = useState<any>(null);
  const [payingBed, setPayingBed] = useState<any>(null);
  const [viewingReceiptBed, setViewingReceiptBed] = useState<any>(null);
  const [viewingStudent, setViewingStudent] = useState<any>(null);
  const [showEditLayoutModal, setShowEditLayoutModal] = useState<boolean>(false);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [selectedMobileFloor, setSelectedMobileFloor] = useState<string | null>(null);
  const [mobileBedsRoom, setMobileBedsRoom] = useState<any>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchBuildings = async () => {
    try {
      const res = await fetch('/api/buildings');
      if (res.ok) {
        const data = await res.json();
        setBuildings(data);
      }
    } catch (e) { showToast('Failed to fetch buildings', 'error'); }
  };

  const fetchRooms = useCallback(async (bId: string, month: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${bId}?month=${month}`);
      if (res.ok) setRooms(await res.json());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBuildings(); }, []);

  useEffect(() => {
    fetchRooms(selectedBuildingId, selectedMonth);
  }, [selectedBuildingId, selectedMonth, fetchRooms]);

  const activeBuilding = buildings.find(b => b.id === selectedBuildingId);
  const activeBuildingDisplayName = selectedBuildingId === 'all'
    ? 'All Buildings (Global View)'
    : activeBuilding ? activeBuilding.name : 'Hostel Building';

  const floors = Array.from(new Set(rooms.map(r => r.floor))).sort();
  const filteredRooms = rooms.filter(r => r.id.toLowerCase().includes(search.toLowerCase()));

  const handleRefresh = () => {
    fetchRooms(selectedBuildingId, selectedMonth);
    fetchBuildings();
    refreshContextBuildings();
  };

  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [isFloorsPinned, setIsFloorsPinned] = useState<boolean>(true);

  const formatFloorName = (f: string) => {
    if (!f) return 'Floor 1';
    const clean = f.replace(/(st|nd|rd|th)/gi, '').trim();
    if (/^\d+$/.test(clean)) return `Floor ${clean}`;
    if (clean.toLowerCase().includes('floor') || clean.toLowerCase().includes('penthouse')) return clean;
    return `Floor ${clean}`;
  };

  const activeFloorRooms = selectedFloor ? filteredRooms.filter(r => r.floor === selectedFloor) : filteredRooms;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header & Tab Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.4rem' }}>Hostel Virtual Workspace</h1>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 3, border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setSelectedFloor(null)}
              style={{
                padding: '5px 14px', borderRadius: 9, border: 'none',
                background: selectedFloor === null ? 'var(--primary)' : 'transparent',
                color: selectedFloor === null ? '#fff' : 'var(--text-muted)',
                fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              All Floors
            </button>
            {floors.map(f => (
              <button
                key={f}
                onClick={() => setSelectedFloor(f)}
                style={{
                  padding: '5px 14px', borderRadius: 9, border: 'none',
                  background: selectedFloor === f ? 'var(--primary)' : 'transparent',
                  color: selectedFloor === f ? '#fff' : 'var(--text-muted)',
                  fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                {formatFloorName(f)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Status Legends */}
          {[{ color: 'var(--success)', label: 'Paid' }, { color: 'var(--warning)', label: 'Pending' }, { color: 'rgba(255,255,255,0.3)', label: 'Empty' }].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, display: 'inline-block' }} />{label}
            </div>
          ))}

          {/* Toggle Unpinned Floors Button if collapsed */}
          {!isFloorsPinned && !isMobile && (
            <button
              onClick={() => setIsFloorsPinned(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)',
                color: 'var(--primary)', padding: '6px 12px', borderRadius: 10,
                fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <Layers3 size={14} /> Show Floors Panel (📌 Pin)
            </button>
          )}

          {/* Month selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-dim)', borderRadius: 10, padding: '6px 12px' }}>
            <Calendar size={14} color="var(--primary)" />
            <select style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}
              value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Main Full-Width Virtual Workspace Canvas */}
      <div className="velozty-canvas-container" style={{ padding: '1.5rem', width: '100%' }}>
        {/* Workspace Search & Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Layers3 size={18} color="var(--primary)" />
            <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>
              Rooms & Beds in <span style={{ color: 'var(--primary)' }}>{activeBuildingDisplayName}</span>
            </span>
            <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.08)', padding: '2px 10px', borderRadius: 12, color: 'var(--text-muted)' }}>
              {activeFloorRooms.length} Rooms
            </span>

            {selectedBuildingId !== 'all' && activeBuilding && (
              <button
                type="button"
                onClick={() => setShowEditLayoutModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '5px 12px', borderRadius: 10,
                  background: 'rgba(249,115,22,0.14)', border: '1px solid rgba(249,115,22,0.35)',
                  color: 'var(--primary)', fontWeight: 700, fontSize: '0.78rem',
                  cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(249,115,22,0.15)'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(249,115,22,0.25)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(249,115,22,0.14)'}
              >
                ⚙️ Edit Building Layout
              </button>
            )}
          </div>

          <div className="search-bar" style={{ width: 220, background: 'rgba(0,0,0,0.4)' }}>
            <Search size={13} color="var(--text-muted)" />
            <input placeholder="Search room number..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading virtual workspace...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {(selectedFloor ? [selectedFloor] : floors).map(floor => {
              const floorRooms = activeFloorRooms.filter(r => r.floor === floor);
              if (floorRooms.length === 0) return null;
              return (
                <div key={floor} id={`floor-section-${floor}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--primary)', padding: '4px 14px', background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 20 }}>
                      {formatFloorName(floor)} Workspace
                    </div>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{floorRooms.length} rooms</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                    {floorRooms.map((room, i) => (
                      <div key={room.id} className="velozty-room-box" style={{ animationDelay: `${i * 0.04}s`, animation: 'slideInUp 0.3s ease-out both' }}>
                        <PremiumRoomCard
                          room={room}
                          onRoomClick={() => {}}
                          onAllocate={(bed) => setAllocatingBed(bed)}
                          onPay={(bed) => setPayingBed(bed)}
                          onPrint={(bed) => setViewingReceiptBed(bed)}
                          onStudentClick={(bed) => setViewingStudent(bed)}
                          onUnpay={async (bed) => {
                            if (!confirm(`Are you sure you want to mark the fee for ${bed.student} as NOT PAID?`)) return;
                            const studentId = bed.studentObj?.dbId || bed.studentDbId;
                            if (!studentId) return showToast('Student not found', 'error');
                            const res = await fetch('/api/fees/unpay', {
                              method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ studentId, month: selectedMonth })
                            });
                            if (res.ok) { showToast('Fee marked as unpaid', 'success'); handleRefresh(); }
                            else { const err = await res.json(); showToast(err.error || 'Failed', 'error'); }
                          }}
                          isMobile={isMobile}
                          onOpenMobileBeds={() => setMobileBedsRoom(room)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {isMobile && mobileBedsRoom && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 2000 }}
          onClick={() => setMobileBedsRoom(null)}>
          <div className="bottom-sheet" style={{ height: '80vh' }} onClick={e => e.stopPropagation()}>
            <div className="bottom-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>Room {mobileBedsRoom.id}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{mobileBedsRoom.beds.length} Beds</span>
              </div>
              <button className="icon-btn-small" onClick={() => setMobileBedsRoom(null)}><XCircle size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {mobileBedsRoom.beds.map((bed: any) => (
                <BedCard key={bed.id} bed={bed} onAllocate={() => setAllocatingBed(bed)} onPay={() => setPayingBed(bed)} onPrint={() => setViewingReceiptBed({ ...bed, roomId: mobileBedsRoom.id })} onStudentClick={() => setViewingStudent(bed)} onUnpay={async () => {
                  if (!confirm(`Are you sure you want to mark the fee for ${bed.student} as NOT PAID?`)) return;
                  const studentId = bed.studentObj?.dbId || bed.studentDbId;
                  if (!studentId) return showToast('Student not found', 'error');
                  const res = await fetch('/api/fees/unpay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId, month: selectedMonth }) });
                  if (res.ok) { showToast('Fee marked as unpaid', 'success'); handleRefresh(); }
                  else { const err = await res.json(); showToast(err.error || 'Failed', 'error'); }
                }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {allocatingBed && (
        <AllocateModal bed={allocatingBed}
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
            room: viewingReceiptBed.roomId || (activeBuildingDisplayName + ' - ' + viewingReceiptBed.roomNumber),
            bedNumber: viewingReceiptBed.bedIndex,
            monthLabel: MONTHS.find(m => m.value === selectedMonth)?.label,
            amount: viewingReceiptBed.studentObj?.feeRecord?.amount || monthlyFee,
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
            
            <div className="responsive-grid-2" style={{ gap: '0.75rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border-dim)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: '6px' }}><GraduationCap size={13} /> Course</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: 4 }}>{viewingStudent.studentObj.course || '—'}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border-dim)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: '6px' }}><Layers3 size={13} /> Branch</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: 4 }}>{viewingStudent.studentObj.branch || '—'}</div>
              </div>
            </div>

            <div className="responsive-grid-2" style={{ gap: '0.75rem' }}>
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

      {showEditLayoutModal && activeBuilding && (
        <EditBuildingModal
          building={activeBuilding}
          rooms={rooms}
          onClose={() => setShowEditLayoutModal(false)}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
