import { useState, useEffect, useCallback } from 'react';
import {
  Settings, Building2, IndianRupee, Database,
  Save, Plus, Trash2, RefreshCw, Download,
  Layers3, FileText,
  User, MapPin, Calendar,
  ChevronDown, ChevronRight, Home, Clock, Check, X,
  Info, AlertCircle, CalendarCheck
} from 'lucide-react';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';
import { useSettings } from '../components/SettingsContext';
import { useBuilding } from '../components/BuildingContext';

const API = '';

const MONTHS = Array.from({ length: 24 }, (_, i) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 12 + i);
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
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 860 : false
  );
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 860);
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
  const [bulkMonth, setBulkMonth] = useState(MONTHS[12]?.value || '2026-11');
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [reminderTime, setReminderTime] = useState('19:00');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Fee Effective Schedule States
  const [showEffectiveModal, setShowEffectiveModal] = useState(false);
  const [pendingEffectiveMonth, setPendingEffectiveMonth] = useState(settings?.feeEffectiveMonth || '2026-11');

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

  useEffect(() => {
    setForm(settings);
    if (settings?.feeEffectiveMonth) {
      setPendingEffectiveMonth(settings.feeEffectiveMonth);
    }
  }, [settings]);

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const executeSave = async (dataToSave: any) => {
    setSaving(true);
    try {
      await onSave(dataToSave);
    } finally {
      setSaving(false);
    }
  };

  const handleInitiateSave = () => {
    const originalFee = Number(settings?.monthlyFee || 0);
    const newFee = Number(form.monthlyFee || 0);
    // If the monthly fee amount was modified, prompt for the effective starting month
    if (originalFee > 0 && newFee > 0 && originalFee !== newFee) {
      setShowEffectiveModal(true);
    } else {
      executeSave(form);
    }
  };

  const handleConfirmEffectiveFee = async () => {
    setShowEffectiveModal(false);
    const updated = {
      ...form,
      feeEffectiveMonth: pendingEffectiveMonth
    };
    setForm(updated);
    await executeSave(updated);
  };

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

  const effectiveLabel = MONTHS.find(m => m.value === (form.feeEffectiveMonth || pendingEffectiveMonth))?.label || (form.feeEffectiveMonth || 'November 2026');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SectionCard title="Monthly Fee Structure & Historical Policy" icon={IndianRupee}>
        <div className="settings-grid">
          <SettingField label="Monthly Fee (₹)" icon={IndianRupee}>
            <input className="custom-input" type="number" value={form.monthlyFee || ''} onChange={e => f('monthlyFee', Number(e.target.value))} placeholder="6000" />
          </SettingField>
          <SettingField label="Security Deposit (₹)" icon={IndianRupee}>
            <input className="custom-input" type="number" value={form.securityDeposit || ''} onChange={e => f('securityDeposit', Number(e.target.value))} placeholder="5000" />
          </SettingField>
          <SettingField label="Fee Effective From Month" icon={Calendar}>
            <select
              className="custom-input custom-select"
              value={form.feeEffectiveMonth || pendingEffectiveMonth}
              onChange={e => {
                f('feeEffectiveMonth', e.target.value);
                setPendingEffectiveMonth(e.target.value);
              }}
            >
              {MONTHS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </SettingField>
          <SettingField label="Prior Historical Fee (₹)" icon={Clock}>
            <input className="custom-input" type="number" value={form.previousMonthlyFee || 5500} readOnly disabled style={{ opacity: 0.75, cursor: 'not-allowed' }} />
          </SettingField>
        </div>

        {/* Historical Billing Preservation Notice */}
        <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(59,130,246,0.08)', borderRadius: 12, border: '1px solid rgba(59,130,246,0.25)', fontSize: '0.82rem', lineHeight: 1.6, color: '#bfdbfe' }}>
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#60a5fa' }}>
            <Info size={15} /> Effective-Date Fee Policy Active
          </div>
          <div>
            Billing cycles prior to <strong>{effectiveLabel}</strong> are locked at <strong>₹{(form.previousMonthlyFee || 5500).toLocaleString('en-IN')}/mo</strong>. Cycles starting from <strong>{effectiveLabel}</strong> onwards use <strong>₹{Number(form.monthlyFee || 6000).toLocaleString('en-IN')}/mo</strong>.
            For residents with dues spanning both periods, total outstanding dues are accurately compounded (e.g. ₹5,500 + ₹6,000 = ₹11,500) across all dashboards and invoices.
          </div>
        </div>

        <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(249,115,22,0.06)', borderRadius: 12, border: '1px solid rgba(249,115,22,0.15)' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
            <IndianRupee size={14} /> Fee Preview (Starting {effectiveLabel})
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
          onClick={handleInitiateSave} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Confirmation Modal: Select Effective Month for Fee Change */}
      {showEffectiveModal && (
        <Modal isOpen onClose={() => setShowEffectiveModal(false)} title="Update Fee: Select Effective Month">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 12, padding: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>Fee Change Detected</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.2rem', fontWeight: 800 }}>
                <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{(settings?.monthlyFee || 5500).toLocaleString('en-IN')}</span>
                <span style={{ color: 'var(--primary)' }}>➔ ₹{Number(form.monthlyFee).toLocaleString('en-IN')} / month</span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 6, display: 'block' }}>
                From which month should this new rate take effect?
              </label>
              <select
                className="custom-input custom-select"
                value={pendingEffectiveMonth}
                onChange={e => setPendingEffectiveMonth(e.target.value)}
                style={{ fontSize: '0.95rem', padding: '10px 12px' }}
              >
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Breakdown of Historical Rules */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dim)', borderRadius: 10, padding: '0.85rem 1rem', fontSize: '0.82rem', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: '#fff' }}>How Dues & Arrears Will Be Calculated:</div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <span style={{ color: 'var(--warning)', fontWeight: 700 }}>• Previous Months:</span>
                <span>Cycles before <strong>{MONTHS.find(m => m.value === pendingEffectiveMonth)?.label || pendingEffectiveMonth}</strong> remain at <strong>₹{(settings?.monthlyFee || 5500).toLocaleString('en-IN')}</strong>.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>• Effective From:</span>
                <span>Cycles starting <strong>{MONTHS.find(m => m.value === pendingEffectiveMonth)?.label || pendingEffectiveMonth}</strong> onwards are charged at <strong>₹{Number(form.monthlyFee).toLocaleString('en-IN')}</strong>.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>• 2-Month Due Example:</span>
                <span>A student with 1 old month + 1 new month overdue will show exactly <strong>₹{(settings?.monthlyFee || 5500).toLocaleString('en-IN')} + ₹{Number(form.monthlyFee).toLocaleString('en-IN')} = ₹{((settings?.monthlyFee || 5500) + Number(form.monthlyFee)).toLocaleString('en-IN')}</strong> due.</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowEffectiveModal(false)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-dim)', background: 'transparent', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleConfirmEffectiveFee}
                style={{ padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}
              >
                <Save size={15} /> Confirm & Apply Fee Schedule
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── FLOOR PLAN TAB ───────────────────────────────────────────────────────────
function FloorPlanTab() {
  const { showToast, confirmAction } = useToast();
  const isMobile = useIsMobile();
  const { fetchBuildings: refreshGlobalBuildings } = useBuilding();

  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const [floorData, setFloorData] = useState<any>(null);
  const [loadingFloor, setLoadingFloor] = useState(false);
  const [expandedFloors, setExpandedFloors] = useState<Set<string | number>>(new Set());

  // Building states
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');

  // Add Room drawer state
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ roomNumber: '', floor: '1', capacity: '2' });

  // Add Floor drawer state
  const [showAddFloor, setShowAddFloor] = useState(false);
  const [newFloorNumber, setNewFloorNumber] = useState('');
  const [newFloorInitialRoom, setNewFloorInitialRoom] = useState('');
  const [newFloorCapacity, setNewFloorCapacity] = useState('2');

  // Track any custom / empty floors locally per building
  const [localFloors, setLocalFloors] = useState<Record<string, string[]>>({});
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
      const floorKeys = Object.keys(data.floors || {}).map(Number);
      setExpandedFloors(new Set(floorKeys));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFloor(false);
    }
  }, []);

  useEffect(() => { fetchBuildings(); }, [fetchBuildings]);
  useEffect(() => { if (selectedBuilding) fetchFloorPlan(selectedBuilding.id); }, [selectedBuilding, fetchFloorPlan]);

  // Merge server floors and locally added empty floors
  const serverFloors: Record<string, any[]> = floorData?.floors || {};
  const extraFloors: string[] = (selectedBuilding ? localFloors[selectedBuilding.id] || [] : []).filter(f => !serverFloors[f]);
  const allFloorKeys: string[] = Array.from(new Set([...Object.keys(serverFloors), ...extraFloors])).sort((a, b) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  const getNextFloor = () => {
    const nums = allFloorKeys.map(f => parseInt(f)).filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return String(max + 1);
  };

  const handleOpenAddFloor = () => {
    const nextF = getNextFloor();
    setNewFloorNumber(nextF);
    setNewFloorInitialRoom(`${nextF}01`);
    setNewFloorCapacity('2');
    setShowAddFloor(true);
  };

  const handleOpenAddRoom = (defaultFloor?: string) => {
    const targetFloor = defaultFloor || (allFloorKeys.length > 0 ? allFloorKeys[0] : '1');
    setNewRoom({
      floor: targetFloor,
      roomNumber: `${targetFloor}01`,
      capacity: '2'
    });
    setShowAddRoom(true);
  };

  const addBuilding = async () => {
    if (!newBuildingName.trim()) return;
    setLoading(true);
    const res = await fetch(`${API}/api/buildings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newBuildingName.trim() })
    });
    if (res.ok) {
      showToast('Building added!', 'success');
      setNewBuildingName('');
      setShowAddBuilding(false);
      await fetchBuildings();
      refreshGlobalBuildings?.();
    } else {
      const e = await res.json();
      showToast(e.error, 'error');
    }
    setLoading(false);
  };

  const deleteBuilding = (id: string, name: string) => {
    confirmAction({
      title: 'Delete Building',
      message: `Delete building "${name}" and ALL its rooms? This cannot be undone.`,
      confirmText: 'Delete Building',
      variant: 'danger',
      onConfirm: async () => {
        const res = await fetch(`${API}/api/buildings/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast(`Building "${name}" deleted`, 'success');
          setSelectedBuilding(null);
          setFloorData(null);
          await fetchBuildings();
          refreshGlobalBuildings?.();
        } else {
          const e = await res.json();
          showToast(e.error, 'error');
        }
      }
    });
  };

  const handleAddFloor = async () => {
    const fl = newFloorNumber.trim();
    if (!fl) {
      showToast('Please specify a floor number or name', 'warning');
      return;
    }
    if (!selectedBuilding) return;

    if (allFloorKeys.includes(fl)) {
      showToast(`Floor ${fl} already exists in ${selectedBuilding.name}`, 'warning');
      return;
    }

    setLoading(true);

    const initialRoom = newFloorInitialRoom.trim();
    if (initialRoom) {
      try {
        const res = await fetch(`${API}/api/rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            buildingId: selectedBuilding.id,
            floor: fl,
            roomNumber: initialRoom,
            capacity: newFloorCapacity
          })
        });

        if (res.ok) {
          showToast(`Floor ${fl} and Room ${initialRoom} created successfully!`, 'success');
          setShowAddFloor(false);
          setNewFloorNumber('');
          setNewFloorInitialRoom('');
          await fetchFloorPlan(selectedBuilding.id);
          await fetchBuildings();
          refreshGlobalBuildings?.();
          setExpandedFloors(prev => new Set([...prev, Number(fl) || 0]));
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to add room', 'error');
        }
      } catch (err: any) {
        showToast('Error: ' + err.message, 'error');
      }
    } else {
      // Register empty floor locally
      setLocalFloors(prev => ({
        ...prev,
        [selectedBuilding.id]: [...(prev[selectedBuilding.id] || []).filter(f => f !== fl), fl]
      }));
      setExpandedFloors(prev => new Set([...prev, Number(fl) || 0]));
      showToast(`Floor ${fl} added to ${selectedBuilding.name}! Add rooms below.`, 'success');
      setShowAddFloor(false);
      setNewFloorNumber('');
    }
    setLoading(false);
  };

  const handleRemoveEmptyFloor = (floor: string) => {
    if (!selectedBuilding) return;
    setLocalFloors(prev => ({
      ...prev,
      [selectedBuilding.id]: (prev[selectedBuilding.id] || []).filter(f => f !== floor)
    }));
    showToast(`Floor ${floor} removed`, 'info');
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
      setLocalFloors(prev => ({
        ...prev,
        [selectedBuilding.id]: (prev[selectedBuilding.id] || []).filter(f => f !== newRoom.floor)
      }));
      await fetchFloorPlan(selectedBuilding.id);
      await fetchBuildings();
      refreshGlobalBuildings?.();
    } else {
      const e = await res.json();
      showToast(e.error || 'Failed to add room', 'error');
    }
    setLoading(false);
  };

  const deleteRoom = (roomId: string, roomNumber: string) => {
    confirmAction({
      title: 'Delete Room',
      message: `Delete Room ${roomNumber} and all its beds? This cannot be undone.`,
      confirmText: 'Delete Room',
      variant: 'danger',
      onConfirm: async () => {
        const res = await fetch(`${API}/api/rooms/${roomId}`, { method: 'DELETE' });
        if (res.ok) {
          showToast(`Room ${roomNumber} deleted`, 'success');
          await fetchFloorPlan(selectedBuilding.id);
          await fetchBuildings();
          refreshGlobalBuildings?.();
        } else {
          const e = await res.json();
          showToast(e.error, 'error');
        }
      }
    });
  };

  const toggleFloor = (floor: string | number) => {
    setExpandedFloors(prev => {
      const next = new Set(prev);
      const str = String(floor);
      const num = Number(floor);
      if (next.has(str) || (!isNaN(num) && next.has(num))) {
        next.delete(str);
        if (!isNaN(num)) next.delete(num);
      } else {
        next.add(str);
      }
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1.25rem', height: '100%', minHeight: isMobile ? 'auto' : 500 }}>
      {/* DESKTOP ONLY: Building left sidebar */}
      {!isMobile && (
        <div style={{
          width: 240,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.25rem'
          }}>
            <span style={{ fontWeight: 800, fontSize: '0.76rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              BUILDINGS ({buildings.length})
            </span>
            <button
              className="icon-btn-small"
              style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--primary)', border: '1px solid rgba(249,115,22,0.3)' }}
              title="Add Building"
              onClick={() => setShowAddBuilding(true)}
            >
              <Plus size={14} />
            </button>
          </div>

          {buildings.map(b => {
            const isSelected = selectedBuilding?.id === b.id;
            return (
              <div
                key={b.id}
                onClick={() => setSelectedBuilding(b)}
                className={`building-sidebar-card ${isSelected ? 'active' : ''}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: isSelected ? 'rgba(249,115,22,0.25)' : 'rgba(128,128,128,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid ${isSelected ? 'rgba(249,115,22,0.4)' : 'var(--border-dim)'}`
                    }}>
                      <Building2 size={16} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
      )}

      {/* Main Workspace */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'auto', minWidth: 0 }}>
        {!selectedBuilding ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: '1rem', padding: '3rem' }}>
            <Layers3 size={48} style={{ opacity: 0.2 }} />
            <span style={{ fontSize: '0.9rem' }}>Select a building to view its floor plan</span>
          </div>
        ) : (
          <>
            {/* MOBILE ONLY: Unified Building & Action Hub */}
            {isMobile ? (
              <div className="floorplan-header-card" style={{ flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'rgba(249,115,22,0.18)',
                      border: '1px solid rgba(249,115,22,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Building2 size={18} color="var(--primary)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Selected Building
                      </div>
                      <select
                        value={selectedBuilding?.id || ''}
                        onChange={e => {
                          const b = buildings.find(x => x.id === e.target.value);
                          if (b) setSelectedBuilding(b);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-main)',
                          fontSize: '1.05rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          outline: 'none',
                          padding: 0,
                          maxWidth: '100%',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {buildings.map(b => (
                          <option key={b.id} value={b.id} style={{ background: 'var(--surface-card, #111827)', color: 'var(--text-main, #fff)' }}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    <button
                      className="icon-btn-small"
                      style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--primary)', border: '1px solid rgba(249,115,22,0.3)', width: 34, height: 34 }}
                      title="Add New Building"
                      onClick={() => setShowAddBuilding(true)}
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      className="icon-btn-small"
                      style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)', width: 34, height: 34 }}
                      title="Delete current building"
                      onClick={() => deleteBuilding(selectedBuilding.id, selectedBuilding.name)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Quick 1-tap pill switcher if more than 1 building exists */}
                {buildings.length > 1 && (
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none', width: '100%' }}>
                    {buildings.map(b => {
                      const isSelected = selectedBuilding?.id === b.id;
                      return (
                        <button
                          key={b.id}
                          onClick={() => setSelectedBuilding(b)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 20,
                            border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-dim)',
                            background: isSelected ? 'rgba(249,115,22,0.2)' : 'rgba(128,128,128,0.06)',
                            color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <Building2 size={12} />
                          {b.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Stats & Floor Plan Action Buttons */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  paddingTop: '0.65rem',
                  borderTop: '1px solid var(--border-dim)',
                  width: '100%'
                }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {floorData ? `${allFloorKeys.length} Floors · ${selectedBuilding?.totalRooms || 0} Rooms · ${selectedBuilding?.totalBeds || 0} Total Beds` : 'Loading…'}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      className="primary-btn"
                      style={{
                        flex: '1 1 120px',
                        justifyContent: 'center',
                        fontSize: '0.78rem',
                        padding: '7px 10px',
                        minHeight: 34,
                        background: 'linear-gradient(135deg, rgba(249,115,22,0.22), rgba(249,115,22,0.12))',
                        border: '1px solid rgba(249,115,22,0.4)',
                        color: 'var(--primary)'
                      }}
                      onClick={handleOpenAddFloor}
                    >
                      <Layers3 size={14} /> Add Floor
                    </button>

                    <button
                      className="primary-btn"
                      style={{
                        flex: '1 1 120px',
                        justifyContent: 'center',
                        fontSize: '0.78rem',
                        padding: '7px 10px',
                        minHeight: 34
                      }}
                      onClick={() => handleOpenAddRoom()}
                    >
                      <Plus size={14} /> Add Room
                    </button>

                    <button
                      className="icon-btn"
                      style={{ width: 34, height: 34, flexShrink: 0 }}
                      title="Refresh"
                      onClick={() => fetchFloorPlan(selectedBuilding.id)}
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* DESKTOP ONLY: Top Header Card */
              <div className="floorplan-header-card">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={18} color="var(--primary)" />
                    <span style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-main)' }}>
                      {selectedBuilding.name} Floor Plan
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 3 }}>
                    {floorData ? `${allFloorKeys.length} Floors · ${selectedBuilding.totalRooms || 0} Rooms · ${selectedBuilding.totalBeds || 0} Total Beds` : 'Loading...'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    className="primary-btn"
                    style={{
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      padding: '7px 14px',
                      minHeight: 34,
                      background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(249,115,22,0.08))',
                      border: '1px solid rgba(249,115,22,0.4)',
                      color: 'var(--primary)'
                    }}
                    onClick={handleOpenAddFloor}
                  >
                    <Layers3 size={14} /> Add Floor
                  </button>

                  <button
                    className="primary-btn"
                    style={{
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      padding: '7px 14px',
                      minHeight: 34,
                      boxShadow: '0 2px 10px rgba(249,115,22,0.25)'
                    }}
                    onClick={() => handleOpenAddRoom()}
                  >
                    <Plus size={14} /> Add Room
                  </button>

                  <button className="icon-btn" title="Refresh" onClick={() => fetchFloorPlan(selectedBuilding.id)}>
                    <RefreshCw size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* Occupancy Legends */}
            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              {[
                { color: 'var(--success)', label: 'Available (Vacant Beds)' },
                { color: 'var(--warning)', label: 'Partial Occupancy' },
                { color: 'var(--danger)', label: 'Full (100% Occupied)' }
              ].map(l => (
                <div key={l.label} className="legend-chip">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, boxShadow: `0 0 6px ${l.color}` }} />
                  {l.label}
                </div>
              ))}
            </div>

            {/* FLOOR ACCORDIONS LIST */}
            {loadingFloor ? (
              <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                <RefreshCw size={26} className="animate-spin" style={{ opacity: 0.6, marginBottom: '0.75rem', display: 'inline-block' }} />
                <div style={{ fontSize: '0.88rem' }}>Loading floor plan…</div>
              </div>
            ) : allFloorKeys.length > 0 ? (
              allFloorKeys.map((floor) => {
                const rooms = serverFloors[floor] || [];
                const totalCap = rooms.reduce((s: number, r: any) => s + (r.capacity || 0), 0);
                const totalOcc = rooms.reduce((s: number, r: any) => s + (r.occupied || 0), 0);
                const occPct = totalCap > 0 ? Math.round((totalOcc / totalCap) * 100) : 0;
                const isExpanded = expandedFloors.has(floor) || (!isNaN(Number(floor)) && expandedFloors.has(Number(floor)));

                return (
                  <div key={floor} className="floor-card">
                    {/* Floor Header Bar */}
                    <div
                      className="floor-header"
                      style={{
                        borderBottom: isExpanded ? '1px solid var(--border-dim)' : 'none'
                      }}
                      onClick={() => toggleFloor(floor)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 9,
                          background: 'rgba(249,115,22,0.16)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid rgba(249,115,22,0.3)',
                          flexShrink: 0
                        }}>
                          <Layers3 size={16} color="var(--primary)" />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            Floor {floor}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: '0.74rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                            {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {rooms.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                            <span style={{ fontSize: '0.74rem', color: totalOcc === totalCap ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 700 }}>
                              {totalOcc}/{totalCap} beds ({occPct}%)
                            </span>
                            <div style={{ width: 68, height: 4, background: 'rgba(128,128,128,0.18)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${occPct}%`,
                                background: occPct === 100 ? 'var(--danger)' : occPct > 50 ? 'var(--primary)' : 'var(--success)',
                                borderRadius: 3
                              }} />
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Empty Floor
                          </span>
                        )}
                        {isExpanded ? <ChevronDown size={18} color="var(--primary)" /> : <ChevronRight size={18} color="var(--text-muted)" />}
                      </div>
                    </div>

                    {/* Rooms in Floor or Empty Floor Actions */}
                    {isExpanded && (
                      rooms.length > 0 ? (
                        <div
                          style={{
                            padding: isMobile ? '0.75rem' : '1rem',
                            display: 'grid',
                            gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'repeat(auto-fill, minmax(175px, 1fr))',
                            gap: '0.75rem'
                          }}
                        >
                          {rooms.map((room: any) => {
                            const statusColor = room.status === 'available' ? 'var(--success)' : room.status === 'full' ? 'var(--danger)' : 'var(--warning)';
                            return (
                              <div
                                key={room.id}
                                className="room-card-item"
                              >
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                      <Home size={14} color="var(--primary)" />
                                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                                        {room.roomNumber}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, boxShadow: `0 0 5px ${statusColor}` }} />
                                      <button
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)', opacity: 0.6, padding: 2 }}
                                        onClick={() => deleteRoom(room.id, room.roomNumber)}
                                        title="Delete room"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>

                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                                    {room.capacity} beds · {room.occupied} occupied
                                  </div>

                                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                    {room.beds.map((bed: any) => (
                                      <div
                                        key={bed.id}
                                        title={bed.studentName ? `Occupied by: ${bed.studentName}` : 'Vacant Bed'}
                                        className={bed.status === 'occupied' ? 'bed-chip-occupied' : 'bed-chip-vacant'}
                                      >
                                        B{bed.bedNumber}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {room.beds.some((b: any) => b.studentName) && (
                                  <div style={{ marginTop: '0.6rem', paddingTop: '0.45rem', borderTop: '1px solid var(--border-dim)', fontSize: '0.66rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
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
                      ) : (
                        <div style={{
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: isMobile ? 'column' : 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          background: 'rgba(128,128,128,0.03)'
                        }}>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            No rooms on Floor {floor} yet.
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="primary-btn"
                              style={{ fontSize: '0.76rem', padding: '6px 14px', minHeight: 32 }}
                              onClick={() => handleOpenAddRoom(floor)}
                            >
                              <Plus size={13} /> Add Room to Floor {floor}
                            </button>
                            {extraFloors.includes(floor) && (
                              <button
                                className="ghost-btn"
                                style={{ fontSize: '0.76rem', padding: '6px 12px', minHeight: 32, color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.25)' }}
                                onClick={() => handleRemoveEmptyFloor(floor)}
                              >
                                Remove Floor
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'rgba(128,128,128,0.03)', borderRadius: 16, border: '1px dashed var(--border-light)' }}>
                <Layers3 size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: 4 }}>No floors or rooms configured yet</div>
                <div style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>Click below to create your first floor and rooms.</div>
                <button className="primary-btn" style={{ margin: '0 auto', fontSize: '0.82rem' }} onClick={handleOpenAddFloor}>
                  <Layers3 size={15} /> Add First Floor
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL: Add New Building */}
      {showAddBuilding && (
        <Modal isOpen onClose={() => setShowAddBuilding(false)} title="Add New Building">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6, display: 'block' }}>
                Building Name *
              </label>
              <input
                className="custom-input"
                style={{ fontSize: '0.9rem', padding: '10px 12px' }}
                value={newBuildingName}
                onChange={e => setNewBuildingName(e.target.value)}
                placeholder="e.g. Block B, Main Hostel, Annex"
                onKeyDown={e => e.key === 'Enter' && addBuilding()}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowAddBuilding(false)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-dim)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={addBuilding}
                disabled={loading || !newBuildingName.trim()}
                style={{ padding: '8px 20px', borderRadius: 8, fontWeight: 700 }}
              >
                <Plus size={15} /> Add Building
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Add New Floor */}
      {showAddFloor && (
        <Modal isOpen onClose={() => setShowAddFloor(false)} title={`Add Floor to ${selectedBuilding?.name || 'Building'}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6, display: 'block' }}>
                Floor Number or Name *
              </label>
              <input
                className="custom-input"
                value={newFloorNumber}
                onChange={e => setNewFloorNumber(e.target.value)}
                placeholder="e.g. 1, 2, Ground Floor"
                autoFocus
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6, display: 'block' }}>
                Initial Room Number (Optional)
              </label>
              <input
                className="custom-input"
                value={newFloorInitialRoom}
                onChange={e => setNewFloorInitialRoom(e.target.value)}
                placeholder={`e.g. ${newFloorNumber}01 (leave blank to create empty floor)`}
              />
            </div>

            {newFloorInitialRoom.trim() && (
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6, display: 'block' }}>
                  Room Bed Capacity
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['1', '2', '3', '4', '5', '6'].map(cap => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setNewFloorCapacity(cap)}
                      style={{
                        flex: 1,
                        minWidth: 38,
                        padding: '8px 6px',
                        borderRadius: 8,
                        border: newFloorCapacity === cap ? '1px solid var(--primary)' : '1px solid var(--border-dim)',
                        background: newFloorCapacity === cap ? 'rgba(249,115,22,0.25)' : 'rgba(128,128,128,0.06)',
                        color: newFloorCapacity === cap ? 'var(--primary)' : 'var(--text-muted)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {cap} {cap === '1' ? 'Bed' : 'Beds'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowAddFloor(false)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-dim)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleAddFloor}
                disabled={loading || !newFloorNumber.trim()}
                style={{ padding: '8px 20px', borderRadius: 8, fontWeight: 700 }}
              >
                <Layers3 size={15} /> {newFloorInitialRoom.trim() ? 'Create Floor & Room' : 'Create Floor'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Add New Room */}
      {showAddRoom && (
        <Modal isOpen onClose={() => setShowAddRoom(false)} title={`Add Room to ${selectedBuilding?.name || 'Building'}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6, display: 'block' }}>
                Room Number *
              </label>
              <input
                className="custom-input"
                value={newRoom.roomNumber}
                onChange={e => setNewRoom(p => ({ ...p, roomNumber: e.target.value }))}
                placeholder={`e.g. ${newRoom.floor}01, 204B`}
                autoFocus
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6, display: 'block' }}>
                Target Floor *
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {allFloorKeys.map(fl => (
                  <button
                    key={fl}
                    type="button"
                    onClick={() => setNewRoom(p => ({
                      ...p,
                      floor: fl,
                      roomNumber: p.roomNumber && /^\d+$/.test(p.roomNumber) ? `${fl}01` : p.roomNumber
                    }))}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: newRoom.floor === fl ? '1px solid var(--primary)' : '1px solid var(--border-dim)',
                      background: newRoom.floor === fl ? 'rgba(249,115,22,0.25)' : 'rgba(128,128,128,0.06)',
                      color: newRoom.floor === fl ? 'var(--primary)' : 'var(--text-muted)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Floor {fl}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6, display: 'block' }}>
                Bed Capacity
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['1', '2', '3', '4', '5', '6'].map(cap => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => setNewRoom(p => ({ ...p, capacity: cap }))}
                    style={{
                      flex: 1,
                      minWidth: 38,
                      padding: '8px 6px',
                      borderRadius: 8,
                      border: newRoom.capacity === cap ? '1px solid var(--primary)' : '1px solid var(--border-dim)',
                      background: newRoom.capacity === cap ? 'rgba(249,115,22,0.25)' : 'rgba(128,128,128,0.06)',
                      color: newRoom.capacity === cap ? 'var(--primary)' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {cap} {cap === '1' ? 'Bed' : 'Beds'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowAddRoom(false)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-dim)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={addRoom}
                disabled={loading || !newRoom.roomNumber.trim()}
                style={{ padding: '8px 20px', borderRadius: 8, fontWeight: 700 }}
              >
                <Plus size={15} /> Add Room
              </button>
            </div>
          </div>
        </Modal>
      )}
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

      <div className="app-nav-tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`app-tab-btn ${activeTab === id ? 'active' : ''}`}
          >
            <Icon size={15} />
            <span>{label}</span>
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
