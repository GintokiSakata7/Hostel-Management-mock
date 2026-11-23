import { useState, useEffect } from 'react';
import {
  Settings, Building2, IndianRupee, Database,
  Save, Download, FileText,
  User, MapPin, Calendar,
  Check, X, AlertCircle
} from 'lucide-react';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';
import { useSettings } from '../components/SettingsContext';

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
  { id: 'data', label: 'Data & Backup', icon: Database },
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
    const originalFee = Number(settings?.monthlyFee || 0);
    const priorFee = originalFee > 0 ? originalFee : (Number(form.previousMonthlyFee) || 6000);
    const updated = {
      ...form,
      previousMonthlyFee: priorFee,
      feeEffectiveMonth: pendingEffectiveMonth
    };
    setForm(updated);
    await executeSave(updated);
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
            <input
              className="custom-input"
              type="number"
              value={form.previousMonthlyFee ?? 6000}
              onChange={e => f('previousMonthlyFee', Number(e.target.value))}
              placeholder="6000"
            />
          </SettingField>
        </div>

        {/* Historical Billing Preservation Notice */}
        <div className="info-callout-banner">
          <div className="callout-title">
            <Info size={15} /> Effective-Date Fee Policy Active
          </div>
          <div>
            Billing cycles prior to <strong>{effectiveLabel}</strong> are locked at <strong>₹{Number(form.previousMonthlyFee ?? 6000).toLocaleString('en-IN')}/mo</strong>. Cycles starting from <strong>{effectiveLabel}</strong> onwards use <strong>₹{Number(form.monthlyFee || 6999).toLocaleString('en-IN')}/mo</strong>.
            For residents with dues spanning both periods, total outstanding dues are accurately compounded (e.g. ₹{Number(form.previousMonthlyFee ?? 6000).toLocaleString('en-IN')} + ₹{Number(form.monthlyFee || 6999).toLocaleString('en-IN')} = ₹{(Number(form.previousMonthlyFee ?? 6000) + Number(form.monthlyFee || 6999)).toLocaleString('en-IN')}) across all dashboards and invoices.
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
              <div key={label} className="preview-fee-card">
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
                <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{(settings?.monthlyFee || 6000).toLocaleString('en-IN')}</span>
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
                <span>Cycles before <strong>{MONTHS.find(m => m.value === pendingEffectiveMonth)?.label || pendingEffectiveMonth}</strong> remain at <strong>₹{(settings?.monthlyFee || 6000).toLocaleString('en-IN')}</strong>.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>• Effective From:</span>
                <span>Cycles starting <strong>{MONTHS.find(m => m.value === pendingEffectiveMonth)?.label || pendingEffectiveMonth}</strong> onwards are charged at <strong>₹{Number(form.monthlyFee).toLocaleString('en-IN')}</strong>.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>• 2-Month Due Example:</span>
                <span>A student with 1 old month + 1 new month overdue will show exactly <strong>₹{(settings?.monthlyFee || 6000).toLocaleString('en-IN')} + ₹{Number(form.monthlyFee).toLocaleString('en-IN')} = ₹{((settings?.monthlyFee || 6000) + Number(form.monthlyFee)).toLocaleString('en-IN')}</strong> due.</span>
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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

      <div style={{ flex: 1, minHeight: 0, paddingRight: '4px' }}>
        {settings === null ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading settings…</div>
        ) : (
          <>
            {activeTab === 'profile' && <ProfileTab settings={settings} onSave={saveSettings} />}
            {activeTab === 'fees' && <FeeTab settings={settings} onSave={saveSettings} />}
            {activeTab === 'data' && <DataTab />}
          </>
        )}
      </div>
    </div>
  );
}
