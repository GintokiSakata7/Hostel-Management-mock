import { useState, useEffect, useCallback } from 'react';
import {
  Settings, Building2, IndianRupee, Database,
  Save, Plus, Trash2, RefreshCw, Download,
  Layers3, FileText,
  User, MapPin, Calendar,
  ChevronDown, ChevronRight, Home, Clock
} from 'lucide-react';
import { useToast } from '../components/ToastContext';
import { useSettings } from '../components/SettingsContext';

const API = '';

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - 6 + i);
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0');
  return { value: `${y}-${m}`, label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
});

const TABS = [
  { id: 'profile', label: 'Hostel Profile', icon: Building2 },
  { id: 'fees', label: 'Fee Settings', icon: IndianRupee },
  { id: 'floorplan', label: 'Floor Plan', icon: Layers3 },
  { id: 'data', label: 'Data & Export', icon: Database },
];

function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-dim)', borderRadius: 16, padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', paddingBottom: '0.875rem', borderBottom: '1px solid var(--border-dim)' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(249,115,22,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color="var(--primary)" />
        </div>
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function SettingField({ label, icon: Icon, children }: { label: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
        <Icon size={13} style={{ opacity: 0.6 }} /> {label}
      </label>
      {children}
    </div>
  );
}

// ─── PROFILE TAB ─────────────────────────────────────────────────────────────
function ProfileTab({ settings, onSave }: { settings: any; onSave: (s: any) => void }) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(settings), [settings]);
  const f = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SectionCard title="Hostel Information" icon={Building2}>
        <div className="settings-grid">
          <SettingField label="Hostel Name" icon={Building2}>
            <input className="custom-input" value={form.hostelName || ''} onChange={e => f('hostelName', e.target.value)} placeholder="VMR Hostel" />
          </SettingField>
          <SettingField label="Admin Name" icon={User}>
            <input className="custom-input" value={form.adminName || ''} onChange={e => f('adminName', e.target.value)} placeholder="Admin" />
          </SettingField>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <SettingField label="Address" icon={MapPin}>
            <textarea className="custom-input" rows={3} value={form.hostelAddress || ''} onChange={e => f('hostelAddress', e.target.value)} placeholder="Street, City, State, Pincode" style={{ resize: 'vertical', fontFamily: 'inherit' }} />
          </SettingField>
        </div>
      </SectionCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="primary-btn" style={{ minWidth: 140, justifyContent: 'center' }}
          onClick={async () => { setSaving(true); await onSave(form); setSaving(false); }} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ─── FEE TAB ─────────────────────────────────────────────────────────────────
function FeeTab({ settings, onSave }: { settings: any; onSave: (s: any) => void }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [bulkMonth, setBulkMonth] = useState(MONTHS[6]?.value || '');
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [reminderTime, setReminderTime] = useState('19:00');
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/reminders/settings`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings?.reminderTime) {
          setReminderTime(data.settings.reminderTime);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    try {
      const res = await fetch(`${API}/api/reminders/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderTime })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Cron Schedule updated! Fee reminders will run daily at ${reminderTime} IST`, 'success');
      } else {
        showToast(data.error || 'Failed to update schedule time', 'error');
      }
    } catch {
      showToast('Failed to update schedule time', 'error');
    } finally {
      setSavingSchedule(false);
    }
  };

  useEffect(() => setForm(settings), [settings]);
  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const handleBulkApply = async () => {
    const label = MONTHS.find(m => m.value === bulkMonth)?.label || bulkMonth;
    const amt = Number(bulkAmount) || form.monthlyFee;
    if (!confirm(`Apply fee of ₹${amt} for ALL active students for ${label}?`)) return;
    setBulkLoading(true);
    try {
      const res = await fetch(`${API}/api/fees/bulk-apply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: bulkMonth, amount: amt })
      });
      const data = await res.json();
      if (res.ok) showToast(`Created ${data.created} fee entries (${data.total} students total)`, 'success');
      else showToast(data.error || 'Failed', 'error');
    } catch { showToast('Network error', 'error'); }
    setBulkLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SectionCard title="Monthly Fee Structure" icon={IndianRupee}>
        <div className="settings-grid">
          <SettingField label="Monthly Fee (₹)" icon={IndianRupee}>
            <input className="custom-input" type="number" value={form.monthlyFee || ''} onChange={e => f('monthlyFee', Number(e.target.value))} placeholder="5500" />
          </SettingField>
          <SettingField label="Security Deposit (₹)" icon={IndianRupee}>
            <input className="custom-input" type="number" value={form.securityDeposit || ''} onChange={e => f('securityDeposit', Number(e.target.value))} placeholder="5000" />
          </SettingField>
        </div>
        <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(249,115,22,0.06)', borderRadius: 12, border: '1px solid rgba(249,115,22,0.15)' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
            <IndianRupee size={14} /> Fee Preview
          </div>
          <div className="responsive-grid-3" style={{ gap: '0.75rem', fontSize: '0.82rem' }}>
            {[
              { label: 'Monthly', value: `₹${Number(form.monthlyFee || 0).toLocaleString()}` },
              { label: '3-Month Advance', value: `₹${(Number(form.monthlyFee || 0) * 3).toLocaleString()}` },
              { label: 'Annual Total', value: `₹${(Number(form.monthlyFee || 0) * 12).toLocaleString()}` },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.75rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{label}</div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary)', marginTop: 4 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Automated Fee Reminders Daily Schedule (IST)" icon={Clock}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem', lineHeight: 1.6 }}>
          Set the exact time of day when the backend background job will automatically query pending fees and dispatch Telegram, WhatsApp, and Voice Call reminders in Indian Standard Time (Asia/Kolkata).
        </p>
        <div className="settings-grid" style={{ alignItems: 'flex-end' }}>
          <SettingField label="Reminder Time (24-Hour Format HH:MM IST)" icon={Clock}>
            <input 
              className="custom-input" 
              type="time" 
              value={reminderTime} 
              onChange={e => setReminderTime(e.target.value)} 
            />
          </SettingField>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '100%' }}>Quick Presets:</span>
            {[
              { label: '12:00 AM (Midnight/Test)', value: '00:00' },
              { label: '09:00 AM (Morning)', value: '09:00' },
              { label: '12:00 PM (Noon)', value: '12:00' },
              { label: '07:00 PM (Standard)', value: '19:00' },
              { label: '09:00 PM (Night)', value: '21:00' },
            ].map(preset => (
              <button 
                key={preset.value} 
                type="button"
                onClick={() => setReminderTime(preset.value)}
                style={{ 
                  padding: '4px 10px', 
                  borderRadius: 6, 
                  border: '1px solid',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  borderColor: reminderTime === preset.value ? 'var(--primary)' : 'var(--border-dim)',
                  background: reminderTime === preset.value ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.03)',
                  color: reminderTime === preset.value ? 'var(--primary)' : 'var(--text-muted)'
                }}>
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} /> Active Cron Schedule: <strong>Daily at {reminderTime} IST (Asia/Kolkata)</strong>
          </div>
          <button 
            className="primary-btn" 
            style={{ justifyContent: 'center', minWidth: 160 }}
            onClick={handleSaveSchedule} 
            disabled={savingSchedule}>
            <Save size={14} /> {savingSchedule ? 'Saving Schedule…' : 'Save Cron Schedule'}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Bulk Fee Apply" icon={RefreshCw}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem', lineHeight: 1.6 }}>
          Automatically create fee entries for all active students for a selected month. Students who already have a record for that month will be skipped.
        </p>
        <div className="settings-grid">
          <SettingField label="Month" icon={Calendar}>
            <select className="custom-input custom-select" value={bulkMonth} onChange={e => setBulkMonth(e.target.value)}>
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </SettingField>
          <SettingField label="Override Amount (₹) — blank uses monthly fee" icon={IndianRupee}>
            <input className="custom-input" type="number" value={bulkAmount} onChange={e => setBulkAmount(e.target.value)} placeholder={`Default: ₹${form.monthlyFee}`} />
          </SettingField>
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="primary-btn" style={{ justifyContent: 'center', minWidth: 200, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: 'var(--success)' }}
            onClick={handleBulkApply} disabled={bulkLoading}>
            <RefreshCw size={14} /> {bulkLoading ? 'Applying…' : 'Apply Fees for Month'}
          </button>
        </div>
      </SectionCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="primary-btn" style={{ minWidth: 140, justifyContent: 'center' }}
          onClick={async () => { setSaving(true); await onSave(form); setSaving(false); }} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ─── FLOOR PLAN TAB ───────────────────────────────────────────────────────────
function FloorPlanTab() {
  const { showToast } = useToast();
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const [floorData, setFloorData] = useState<any>(null);
  const [loadingFloor, setLoadingFloor] = useState(false);
  const [expandedFloors, setExpandedFloors] = useState<Set<number>>(new Set());
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ roomNumber: '', floor: '1', capacity: '2' });
  const [loading, setLoading] = useState(false);

  const fetchBuildings = useCallback(async () => {
    const res = await fetch(`${API}/api/buildings`);
    setBuildings(await res.json());
  }, []);

  const fetchFloorPlan = useCallback(async (buildingId: string) => {
    setLoadingFloor(true);
    const res = await fetch(`${API}/api/floor-plan/${buildingId}`);
    const data = await res.json();
    setFloorData(data);
    setExpandedFloors(new Set(Object.keys(data.floors || {}).map(Number)));
    setLoadingFloor(false);
  }, []);

  useEffect(() => { fetchBuildings(); }, [fetchBuildings]);
  useEffect(() => { if (selectedBuilding) fetchFloorPlan(selectedBuilding.id); }, [selectedBuilding, fetchFloorPlan]);

  const addBuilding = async () => {
    if (!newBuildingName.trim()) return;
    setLoading(true);
    const res = await fetch(`${API}/api/buildings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newBuildingName }) });
    if (res.ok) { showToast('Building added!', 'success'); setNewBuildingName(''); setShowAddBuilding(false); fetchBuildings(); }
    else { const e = await res.json(); showToast(e.error, 'error'); }
    setLoading(false);
  };

  const deleteBuilding = async (id: string, name: string) => {
    if (!confirm(`Delete building "${name}" and ALL its rooms? This cannot be undone.`)) return;
    const res = await fetch(`${API}/api/buildings/${id}`, { method: 'DELETE' });
    if (res.ok) { showToast('Building deleted', 'success'); setSelectedBuilding(null); setFloorData(null); fetchBuildings(); }
    else { const e = await res.json(); showToast(e.error, 'error'); }
  };

  const addRoom = async () => {
    if (!newRoom.roomNumber || !selectedBuilding) return;
    setLoading(true);
    const res = await fetch(`${API}/api/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ buildingId: selectedBuilding.id, ...newRoom }) });
    if (res.ok) { showToast('Room added!', 'success'); setNewRoom({ roomNumber: '', floor: '1', capacity: '2' }); setShowAddRoom(false); fetchFloorPlan(selectedBuilding.id); fetchBuildings(); }
    else { const e = await res.json(); showToast(e.error, 'error'); }
    setLoading(false);
  };

  const deleteRoom = async (roomId: string) => {
    if (!confirm('Delete this room and all its beds?')) return;
    const res = await fetch(`${API}/api/rooms/${roomId}`, { method: 'DELETE' });
    if (res.ok) { showToast('Room deleted', 'success'); fetchFloorPlan(selectedBuilding.id); fetchBuildings(); }
    else { const e = await res.json(); showToast(e.error, 'error'); }
  };

  const toggleFloor = (floor: number) => {
    setExpandedFloors(prev => {
      const next = new Set(prev);
      next.has(floor) ? next.delete(floor) : next.add(floor);
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', gap: '1.25rem', height: '100%', minHeight: 500 }}>
      {/* Building sidebar */}
      <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-muted)', letterSpacing: 1 }}>BUILDINGS</span>
          <button className="icon-btn-small" title="Add Building" onClick={() => setShowAddBuilding(v => !v)}><Plus size={14} /></button>
        </div>

        {showAddBuilding && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-dim)', borderRadius: 10, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <input className="custom-input" style={{ fontSize: '0.8rem' }} value={newBuildingName} onChange={e => setNewBuildingName(e.target.value)} placeholder="Building name…" onKeyDown={e => e.key === 'Enter' && addBuilding()} autoFocus />
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="primary-btn" style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem', padding: '4px 8px', minHeight: 28 }} onClick={addBuilding} disabled={loading}><Plus size={12} /> Add</button>
              <button onClick={() => setShowAddBuilding(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-dim)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>Cancel</button>
            </div>
          </div>
        )}

        {buildings.map(b => (
          <div key={b.id} onClick={() => setSelectedBuilding(b)} style={{
            padding: '0.875rem 1rem', borderRadius: 12, cursor: 'pointer',
            border: `1px solid ${selectedBuilding?.id === b.id ? 'var(--primary)' : 'var(--border-dim)'}`,
            background: selectedBuilding?.id === b.id ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.02)',
            transition: 'all 0.2s'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Building2 size={16} color={selectedBuilding?.id === b.id ? 'var(--primary)' : 'var(--text-muted)'} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{b.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{b.totalRooms} rooms · {b.totalBeds} beds</div>
                </div>
              </div>
              <button className="icon-btn-small" style={{ opacity: 0.5, color: 'var(--danger)' }} onClick={e => { e.stopPropagation(); deleteBuilding(b.id, b.name); }}><Trash2 size={13} /></button>
            </div>
          </div>
        ))}

        {buildings.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', padding: '1.5rem 0', lineHeight: 1.8 }}>No buildings yet.<br />Click + to add one.</div>
        )}
      </div>

      {/* Floor plan content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', overflow: 'auto' }}>
        {!selectedBuilding ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: '1rem', padding: '3rem' }}>
            <Layers3 size={48} style={{ opacity: 0.2 }} />
            <span style={{ fontSize: '0.9rem' }}>Select a building to view its floor plan</span>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{selectedBuilding.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>
                  {floorData ? `${Object.keys(floorData.floors || {}).length} floors · ${selectedBuilding.totalRooms} rooms · ${selectedBuilding.totalBeds} beds` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="primary-btn" style={{ justifyContent: 'center', fontSize: '0.8rem', padding: '6px 14px', minHeight: 34 }} onClick={() => setShowAddRoom(v => !v)}>
                  <Plus size={14} /> Add Room
                </button>
                <button className="icon-btn" title="Refresh" onClick={() => fetchFloorPlan(selectedBuilding.id)}><RefreshCw size={16} /></button>
              </div>
            </div>

            {showAddRoom && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dim)', borderRadius: 12, padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ margin: 0, flex: '1 1 120px' }}>
                  <label style={{ fontSize: '0.72rem' }}>Room Number</label>
                  <input className="custom-input" value={newRoom.roomNumber} onChange={e => setNewRoom(p => ({ ...p, roomNumber: e.target.value }))} placeholder="e.g. 101" />
                </div>
                <div className="form-group" style={{ margin: 0, flex: '0 0 90px' }}>
                  <label style={{ fontSize: '0.72rem' }}>Floor</label>
                  <input className="custom-input" type="number" value={newRoom.floor} onChange={e => setNewRoom(p => ({ ...p, floor: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0, flex: '0 0 110px' }}>
                  <label style={{ fontSize: '0.72rem' }}>Beds (Capacity)</label>
                  <input className="custom-input" type="number" min={1} max={10} value={newRoom.capacity} onChange={e => setNewRoom(p => ({ ...p, capacity: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button className="primary-btn" style={{ justifyContent: 'center', minHeight: 38 }} onClick={addRoom} disabled={loading}><Plus size={14} /> Add</button>
                  <button onClick={() => setShowAddRoom(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-dim)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', padding: '0 14px', minHeight: 38 }}>Cancel</button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {[{ color: 'var(--success)', label: 'Available' }, { color: 'var(--warning)', label: 'Partial' }, { color: 'var(--danger)', label: 'Full' }].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>

            {loadingFloor ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading floor plan…</div>
            ) : floorData && Object.keys(floorData.floors || {}).length > 0 ? (
              Object.entries(floorData.floors as Record<string, any[]>).sort((a, b) => Number(a[0]) - Number(b[0])).map(([floor, rooms]) => (
                <div key={floor} style={{ border: '1px solid var(--border-dim)', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '0.875rem 1.25rem', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}
                    onClick={() => toggleFloor(Number(floor))}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Layers3 size={15} color="var(--primary)" />
                      Floor {floor}
                      <span style={{ fontWeight: 400, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{(rooms as any[]).length} rooms</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {(rooms as any[]).reduce((s, r) => s + r.occupied, 0)}/{(rooms as any[]).reduce((s, r) => s + r.capacity, 0)} occupied
                      </span>
                      {expandedFloors.has(Number(floor)) ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </div>
                  </div>

                  {expandedFloors.has(Number(floor)) && (
                    <div className="room-grid" style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '0.75rem' }}>
                      {(rooms as any[]).map((room: any) => {
                        const statusColor = room.status === 'available' ? 'var(--success)' : room.status === 'full' ? 'var(--danger)' : 'var(--warning)';
                        return (
                          <div key={room.id} style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '0.875rem', background: 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <Home size={13} color="var(--primary)" />
                                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{room.roomNumber}</span>
                              </div>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} />
                                <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)', opacity: 0.6, padding: 2 }} onClick={() => deleteRoom(room.id)} title="Delete room">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.625rem' }}>{room.capacity} beds · {room.occupied} occupied</div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {room.beds.map((bed: any) => (
                                <div key={bed.id} title={bed.studentName || 'Empty'} style={{
                                  width: 30, height: 30, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: bed.status === 'occupied' ? 'rgba(249,115,22,0.18)' : 'rgba(34,197,94,0.1)',
                                  border: `1px solid ${bed.status === 'occupied' ? 'rgba(249,115,22,0.35)' : 'rgba(34,197,94,0.2)'}`,
                                  fontSize: '0.65rem', fontWeight: 700, color: bed.status === 'occupied' ? 'var(--primary)' : 'var(--success)',
                                  cursor: 'default'
                                }}>
                                  {bed.bedNumber}
                                </div>
                              ))}
                            </div>
                            {room.beds.some((b: any) => b.studentName) && (
                              <div style={{ marginTop: '0.5rem', fontSize: '0.63rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                                {room.beds.filter((b: any) => b.studentName).map((b: any) => (
                                  <div key={b.id}><span style={{ color: 'var(--primary)', fontWeight: 600 }}>B{b.bedNumber}:</span> {b.studentName}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No rooms yet. Click "Add Room" to get started.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── DATA TAB ─────────────────────────────────────────────────────────────────
function DataTab() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/api/stats`).then(r => r.json()).then(setStats);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SectionCard title="Export Data" icon={Download}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          Download a complete backup of your hostel data as JSON files. These can be used for record-keeping or data migration.
        </p>
        <div className="responsive-grid-2" style={{ gap: '1rem' }}>
          {[
            { label: 'Export Students', desc: 'All student profiles, room allocations, and full fee history', icon: User, url: `${API}/api/export/students` },
            { label: 'Export Fee Records', desc: 'All payment transactions and fee status for every student', icon: FileText, url: `${API}/api/export/fees` },
          ].map(({ label, desc, icon: Icon, url }) => (
            <div key={label} style={{ border: '1px solid var(--border-dim)', borderRadius: 14, padding: '1.25rem', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                <Icon size={18} color="var(--primary)" />
                {label}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', flex: 1, margin: 0 }}>{desc}</p>
              <button className="primary-btn" style={{ justifyContent: 'center', marginTop: '0.5rem' }}
                onClick={() => { window.open(url, '_blank'); showToast('Download started…', 'success'); }}>
                <Download size={15} /> Download JSON
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Database Summary" icon={Database}>
        {stats ? (
          <div className="room-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.875rem' }}>
            {[
              { label: 'Total Students', value: stats.totalStudents, color: 'var(--primary)' },
              { label: 'Total Rooms', value: stats.totalRooms, color: 'var(--accent)' },
              { label: 'Occupied Beds', value: stats.occupiedBeds, color: 'var(--warning)' },
              { label: 'Available Beds', value: stats.availableBeds, color: 'var(--success)' },
              { label: 'Fees Pending', value: stats.pendingFees, color: 'var(--danger)' },
              { label: 'Monthly Revenue', value: `₹${Number(stats.monthlyCollection || 0).toLocaleString()}`, color: 'var(--success)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dim)', borderRadius: 10, padding: '0.875rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading…</div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { showToast } = useToast();
  const { settings, refreshSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('profile');

  const saveSettings = async (updated: any) => {
    const res = await fetch(`${API}/api/settings`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    if (res.ok) { 
      await refreshSettings();
      showToast('Settings saved!', 'success'); 
    }
    else showToast('Failed to save', 'error');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ marginBottom: '1.5rem', flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings size={22} color="var(--primary)" /> Settings
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Manage hostel profile, fees, floor plan, and data exports
        </p>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '4px', flexShrink: 0, overflowX: 'auto' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
            padding: '9px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
            background: activeTab === id ? 'var(--primary)' : 'transparent',
            color: activeTab === id ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.2s',
            minWidth: 120,
            whiteSpace: 'nowrap'
          }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', paddingRight: '4px' }}>
        {settings === null ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading settings…</div>
        ) : (
          <>
            {activeTab === 'profile' && <ProfileTab settings={settings} onSave={saveSettings} />}
            {activeTab === 'fees' && <FeeTab settings={settings} onSave={saveSettings} />}
            {activeTab === 'floorplan' && <FloorPlanTab />}
            {activeTab === 'data' && <DataTab />}
          </>
        )}
      </div>
    </div>
  );
}
