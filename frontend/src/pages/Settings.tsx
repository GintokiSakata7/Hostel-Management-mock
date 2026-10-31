import { useState, useEffect, useCallback } from 'react';
import {
  Settings, Building2, IndianRupee, Database,
  Save, Plus, Trash2, RefreshCw, Download,
  Layers3, FileText,
  User, MapPin, Calendar,
  ChevronDown, ChevronRight, Home, Clock, Check
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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-dim)', borderRadius: 16, padding: isMobile ? '1.15rem 0.85rem' : '1.5rem' }}>
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
  const isMobile = useIsMobile();
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
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} /> Active Cron Schedule: <strong>Daily at {reminderTime} IST (Asia/Kolkata)</strong>
          </div>
          <button 
            className="primary-btn" 
            style={{ justifyContent: 'center', minWidth: 160, width: isMobile ? '100%' : 'auto' }}
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
  const isMobile = useIsMobile();
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
    try {
      const res = await fetch(`${API}/api/buildings`);
      const data = await res.json();
      setBuildings(data);
      setSelectedBuilding((prev: any) => {
        if (!data || data.length === 0) return null;
        if (prev) {
          const match = data.find((b: any) => b.id === prev.id);
          return match || data[0];
        }
        return data[0];
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchFloorPlan = useCallback(async (buildingId: string) => {
    setLoadingFloor(true);
    try {
      const res = await fetch(`${API}/api/floor-plan/${buildingId}`);
      const data = await res.json();
      setFloorData(data);
      setExpandedFloors(new Set(Object.keys(data.floors || {}).map(Number)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFloor(false);
    }
  }, []);

  useEffect(() => { fetchBuildings(); }, [fetchBuildings]);
  useEffect(() => { if (selectedBuilding) fetchFloorPlan(selectedBuilding.id); }, [selectedBuilding, fetchFloorPlan]);

  const addBuilding = async () => {
    if (!newBuildingName.trim()) return;
    setLoading(true);
    const res = await fetch(`${API}/api/buildings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newBuildingName.trim() }) });
    if (res.ok) {
      showToast('Building added!', 'success');
      setNewBuildingName('');
      setShowAddBuilding(false);
      fetchBuildings();
    } else {
      const e = await res.json();
      showToast(e.error, 'error');
    }
    setLoading(false);
  };

  const deleteBuilding = async (id: string, name: string) => {
    if (!confirm(`Delete building "${name}" and ALL its rooms? This cannot be undone.`)) return;
    const res = await fetch(`${API}/api/buildings/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Building deleted', 'success');
      setSelectedBuilding(null);
      setFloorData(null);
      fetchBuildings();
    } else {
      const e = await res.json();
      showToast(e.error, 'error');
    }
  };

  const addRoom = async () => {
    if (!newRoom.roomNumber.trim() || !selectedBuilding) {
      showToast('Please specify a room number', 'warning');
      return;
    }
    setLoading(true);
    const res = await fetch(`${API}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildingId: selectedBuilding.id, ...newRoom })
    });
    if (res.ok) {
      showToast('Room added successfully!', 'success');
      setNewRoom({ roomNumber: '', floor: newRoom.floor, capacity: '2' });
      setShowAddRoom(false);
      fetchFloorPlan(selectedBuilding.id);
      fetchBuildings();
    } else {
      const e = await res.json();
      showToast(e.error || 'Failed to add room', 'error');
    }
    setLoading(false);
  };

  const deleteRoom = async (roomId: string) => {
    if (!confirm('Delete this room and all its beds?')) return;
    const res = await fetch(`${API}/api/rooms/${roomId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Room deleted', 'success');
      fetchFloorPlan(selectedBuilding.id);
      fetchBuildings();
    } else {
      const e = await res.json();
      showToast(e.error, 'error');
    }
  };

  const toggleFloor = (floor: number) => {
    setExpandedFloors(prev => {
      const next = new Set(prev);
      next.has(floor) ? next.delete(floor) : next.add(floor);
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1.25rem', height: '100%', minHeight: isMobile ? 'auto' : 500 }}>
      {/* Building sidebar / mobile ribbon */}
      <div style={{
        width: isMobile ? '100%' : 240,
        flexShrink: 0,
        display: 'flex',
        flexDirection: isMobile ? 'row' : 'column',
        gap: '0.65rem',
        overflowX: isMobile ? 'auto' : 'visible',
        paddingBottom: isMobile ? '6px' : 0,
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isMobile ? 0 : '0.25rem',
          flexShrink: 0,
          minWidth: isMobile ? 120 : 'auto',
          padding: isMobile ? '4px 0' : 0
        }}>
          <span style={{ fontWeight: 800, fontSize: '0.76rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            BUILDINGS ({buildings.length})
          </span>
          <button
            className="icon-btn-small"
            style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--primary)', border: '1px solid rgba(249,115,22,0.3)' }}
            title="Add Building"
            onClick={() => setShowAddBuilding(v => !v)}
          >
            <Plus size={14} />
          </button>
        </div>

        {showAddBuilding && (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-dim)',
            borderRadius: 12,
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            minWidth: isMobile ? 220 : 'auto',
            flexShrink: 0
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>Add New Building</div>
            <input
              className="custom-input"
              style={{ fontSize: '0.82rem', padding: '6px 10px' }}
              value={newBuildingName}
              onChange={e => setNewBuildingName(e.target.value)}
              placeholder="Building name (e.g. Block C)…"
              onKeyDown={e => e.key === 'Enter' && addBuilding()}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="primary-btn"
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem', padding: '5px 8px', minHeight: 30 }}
                onClick={addBuilding}
                disabled={loading}
              >
                <Plus size={12} /> Add
              </button>
              <button
                onClick={() => setShowAddBuilding(false)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-dim)',
                  borderRadius: 8,
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  padding: '5px 8px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {buildings.map(b => {
          const isSelected = selectedBuilding?.id === b.id;
          return (
            <div
              key={b.id}
              onClick={() => setSelectedBuilding(b)}
              style={{
                padding: '0.75rem 0.875rem',
                borderRadius: 14,
                cursor: 'pointer',
                border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(249,115,22,0.18), rgba(249,115,22,0.06))'
                  : 'rgba(255,255,255,0.03)',
                boxShadow: isSelected ? '0 4px 14px rgba(249,115,22,0.2)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                minWidth: isMobile ? 180 : 'auto',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: isSelected ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${isSelected ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.08)'}`
                  }}>
                    <Building2 size={16} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: isSelected ? '#fff' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {b.name}
                      {isSelected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {b.totalRooms || 0} rooms · {b.totalBeds || 0} beds
                    </div>
                  </div>
                </div>
                <button
                  className="icon-btn-small"
                  style={{ opacity: 0.6, color: 'var(--danger)', padding: 4 }}
                  onClick={e => { e.stopPropagation(); deleteBuilding(b.id, b.name); }}
                  title="Delete building"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}

        {buildings.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', padding: '1.5rem 0', lineHeight: 1.8 }}>
            No buildings yet.<br />Click + to add one.
          </div>
        )}
      </div>

      {/* Floor plan main workspace */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'auto' }}>
        {!selectedBuilding ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: '1rem', padding: '3rem' }}>
            <Layers3 size={48} style={{ opacity: 0.2 }} />
            <span style={{ fontSize: '0.9rem' }}>Select a building to view its floor plan</span>
          </div>
        ) : (
          <>
            {/* Building Header Card */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14,
              padding: '0.875rem 1.1rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={18} color="var(--primary)" />
                  <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#fff' }}>{selectedBuilding.name} Floor Plan</span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 3 }}>
                  {floorData ? `${Object.keys(floorData.floors || {}).length} Floors · ${selectedBuilding.totalRooms || 0} Rooms · ${selectedBuilding.totalBeds || 0} Total Beds` : 'Loading...'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className="primary-btn"
                  style={{
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    padding: '7px 14px',
                    minHeight: 34,
                    boxShadow: '0 2px 10px rgba(249,115,22,0.25)'
                  }}
                  onClick={() => setShowAddRoom(v => !v)}
                >
                  <Plus size={14} /> Add Room
                </button>
                <button className="icon-btn" title="Refresh" onClick={() => fetchFloorPlan(selectedBuilding.id)}>
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>

            {/* Mobile / Responsive Add Room Drawer */}
            {showAddRoom && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(255,255,255,0.03))',
                border: '1px solid rgba(249,115,22,0.3)',
                borderRadius: 14,
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.875rem',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>
                    Add Room to {selectedBuilding.name}
                  </span>
                  <button
                    onClick={() => setShowAddRoom(false)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Room Number</label>
                    <input
                      className="custom-input"
                      value={newRoom.roomNumber}
                      onChange={e => setNewRoom(p => ({ ...p, roomNumber: e.target.value }))}
                      placeholder="e.g. 101, 204B"
                      autoFocus
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Floor Number</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input
                        className="custom-input"
                        type="number"
                        min={0}
                        max={20}
                        style={{ flex: 1 }}
                        value={newRoom.floor}
                        onChange={e => setNewRoom(p => ({ ...p, floor: e.target.value }))}
                      />
                      {['1', '2', '3'].map(fl => (
                        <button
                          key={fl}
                          type="button"
                          onClick={() => setNewRoom(p => ({ ...p, floor: fl }))}
                          style={{
                            padding: '0 8px',
                            borderRadius: 8,
                            border: newRoom.floor === fl ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                            background: newRoom.floor === fl ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.04)',
                            color: newRoom.floor === fl ? 'var(--primary)' : 'var(--text-muted)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          F{fl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Bed Capacity</label>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {['1', '2', '3', '4', '6'].map(cap => (
                        <button
                          key={cap}
                          type="button"
                          onClick={() => setNewRoom(p => ({ ...p, capacity: cap }))}
                          style={{
                            flex: 1,
                            padding: '6px 4px',
                            borderRadius: 8,
                            border: newRoom.capacity === cap ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                            background: newRoom.capacity === cap ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.04)',
                            color: newRoom.capacity === cap ? 'var(--primary)' : 'var(--text-muted)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {cap} {cap === '1' ? 'Bed' : 'Beds'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    onClick={() => setShowAddRoom(false)}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border-dim)',
                      borderRadius: 8,
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0 16px',
                      minHeight: 36,
                      fontSize: '0.8rem'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="primary-btn"
                    style={{ justifyContent: 'center', minHeight: 36, padding: '0 20px', fontSize: '0.82rem' }}
                    onClick={addRoom}
                    disabled={loading}
                  >
                    <Plus size={14} /> Add Room
                  </button>
                </div>
              </div>
            )}

            {/* Occupancy Legends */}
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              {[
                { color: 'var(--success)', label: 'Available (Vacant Beds)' },
                { color: 'var(--warning)', label: 'Partial Occupancy' },
                { color: 'var(--danger)', label: 'Full (100% Occupied)' }
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, boxShadow: `0 0 6px ${l.color}` }} />
                  {l.label}
                </div>
              ))}
            </div>

            {loadingFloor ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="spin" style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                <div>Loading floor plan…</div>
              </div>
            ) : floorData && Object.keys(floorData.floors || {}).length > 0 ? (
              Object.entries(floorData.floors as Record<string, any[]>).sort((a, b) => Number(a[0]) - Number(b[0])).map(([floor, rooms]) => {
                const totalCap = (rooms as any[]).reduce((s, r) => s + r.capacity, 0);
                const totalOcc = (rooms as any[]).reduce((s, r) => s + r.occupied, 0);
                const occPct = totalCap > 0 ? Math.round((totalOcc / totalCap) * 100) : 0;
                const isExpanded = expandedFloors.has(Number(floor));

                return (
                  <div key={floor} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
                    {/* Floor Header Bar */}
                    <div
                      style={{
                        padding: '0.875rem 1.15rem',
                        background: isExpanded ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: 700,
                        borderBottom: isExpanded ? '1px solid rgba(255,255,255,0.06)' : 'none',
                        transition: 'background 0.2s ease'
                      }}
                      onClick={() => toggleFloor(Number(floor))}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: 'rgba(249,115,22,0.18)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid rgba(249,115,22,0.3)'
                        }}>
                          <Layers3 size={15} color="var(--primary)" />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff' }}>Floor {floor}</span>
                          <span style={{ fontWeight: 500, fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                            {(rooms as any[]).length} rooms
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <span style={{ fontSize: '0.72rem', color: totalOcc === totalCap ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>
                            {totalOcc}/{totalCap} beds ({occPct}%)
                          </span>
                          <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${occPct}%`,
                              background: occPct === 100 ? 'var(--danger)' : occPct > 50 ? 'var(--primary)' : 'var(--success)',
                              borderRadius: 3
                            }} />
                          </div>
                        </div>
                        {isExpanded ? <ChevronDown size={17} color="var(--primary)" /> : <ChevronRight size={17} color="var(--text-muted)" />}
                      </div>
                    </div>

                    {/* Rooms in Floor */}
                    {isExpanded && (
                      <div
                        className="room-grid"
                        style={{
                          padding: isMobile ? '0.75rem' : '1rem',
                          display: 'grid',
                          gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'repeat(auto-fill, minmax(175px, 1fr))',
                          gap: '0.65rem'
                        }}
                      >
                        {(rooms as any[]).map((room: any) => {
                          const statusColor = room.status === 'available' ? 'var(--success)' : room.status === 'full' ? 'var(--danger)' : 'var(--warning)';
                          return (
                            <div
                              key={room.id}
                              style={{
                                border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: 12,
                                padding: '0.75rem',
                                background: 'rgba(255,255,255,0.02)',
                                transition: 'all 0.2s',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between'
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <Home size={13} color="var(--primary)" />
                                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#fff' }}>{room.roomNumber}</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, boxShadow: `0 0 5px ${statusColor}` }} />
                                    <button
                                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)', opacity: 0.6, padding: 2 }}
                                      onClick={() => deleteRoom(room.id)}
                                      title="Delete room"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>

                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                  {room.capacity} beds · {room.occupied} occupied
                                </div>

                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {room.beds.map((bed: any) => (
                                    <div
                                      key={bed.id}
                                      title={bed.studentName || 'Empty'}
                                      style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 7,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: bed.status === 'occupied' ? 'rgba(249,115,22,0.18)' : 'rgba(34,197,94,0.1)',
                                        border: `1px solid ${bed.status === 'occupied' ? 'rgba(249,115,22,0.35)' : 'rgba(34,197,94,0.2)'}`,
                                        fontSize: '0.65rem',
                                        fontWeight: 800,
                                        color: bed.status === 'occupied' ? 'var(--primary)' : 'var(--success)',
                                        cursor: 'default'
                                      }}
                                    >
                                      B{bed.bedNumber}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {room.beds.some((b: any) => b.studentName) && (
                                <div style={{ marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.63rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                  {room.beds.filter((b: any) => b.studentName).map((b: any) => (
                                    <div key={b.id} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      <span style={{ color: 'var(--primary)', fontWeight: 700 }}>B{b.bedNumber}:</span> {b.studentName}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: 14 }}>
                No rooms added yet. Click "+ Add Room" to configure your floor plan.
              </div>
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
