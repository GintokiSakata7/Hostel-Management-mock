import React, { useState } from 'react';
import {
  Settings as SettingsIcon, Building2, MessageSquare,
  Clock, Shield, RotateCcw, Save, Smartphone, Check,
  Trash2, Plus, Download, Sparkles
} from 'lucide-react';
import { useDemoData } from '../context/DemoDataContext';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';

export const Settings: React.FC = () => {
  const {
    settings,
    buildings,
    updateSettings,
    addBuilding,
    deleteBuilding,
    resetToDemoData,
  } = useDemoData();

  const { success, whatsapp } = useToast();

  const [formData, setFormData] = useState({ ...settings });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [newBldName, setNewBldName] = useState('');
  const [newBldAddress, setNewBldAddress] = useState('');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    success('Settings updated and saved to local state');
  };

  const handleTestWhatsAppNumber = () => {
    const phone = formData.whatsappDemoNumber || '9491554114';
    const text = 
`🔔 *HOSTEL MANAGEMENT SYSTEM - SETTINGS TEST* 🔔
━━━━━━━━━━━━━━━━━━━━
Hi! This is a test verification message confirming that the automated WhatsApp dispatch hook is operational.

Target Demo Phone: +91 ${phone}
UPI Configuration: ${formData.upiId}
Automated Reminders: Scheduled at ${formData.reminderTime} IST

Facility: ${formData.hostelName}
━━━━━━━━━━━━━━━━━━━━`;

    const url = `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;
    whatsapp('Launching WhatsApp Test', `Opening WhatsApp for +91 ${phone}`);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleExportJSON = () => {
    const fullState = {
      settings: formData,
      buildings,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(fullState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Majin_Hostel_Settings_Backup_${Date.now()}.json`;
    a.click();
    success('Settings JSON exported');
  };

  return (
    <div className="animate-fade-in settings-page">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">System Configuration & WhatsApp Setup</h1>
          <p className="page-subtitle">
            Configure hostel brand details, payment UPI IDs, and WhatsApp client redirect numbers.
          </p>
        </div>

        <button className="btn btn-outline" onClick={handleExportJSON}>
          <Download size={15} /> Backup Settings JSON
        </button>
      </div>

      <form onSubmit={handleSaveSettings}>
        {/* Section 1: Hostel Identity & Payments */}
        <div className="glass-card p-6 mb-6">
          <div className="widget-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="icon-badge badge-primary-glow">
                <Building2 size={20} color="#f97316" />
              </div>
              <div>
                <h3 className="widget-title">Hostel Identity & Official UPI Accounts</h3>
                <p className="widget-subtitle">Branding printed on digital receipts and resident invoices.</p>
              </div>
            </div>
          </div>

          <div className="form-grid-2">
            <div>
              <label className="form-label">HOSTEL / PG BRAND NAME *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.hostelName}
                onChange={e => setFormData({ ...formData, hostelName: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label">TAGLINE / SUBTITLE</label>
              <input
                type="text"
                className="form-input"
                value={formData.tagline}
                onChange={e => setFormData({ ...formData, tagline: e.target.value })}
              />
            </div>
          </div>

          <div className="form-grid-3 mt-4">
            <div>
              <label className="form-label">OFFICIAL UPI ID (FOR RENT COLLECTIONS) *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. 9491554114@ybl"
                value={formData.upiId}
                onChange={e => setFormData({ ...formData, upiId: e.target.value })}
              />
              <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                Included in WhatsApp reminders for instant UPI click-to-pay.
              </small>
            </div>

            <div>
              <label className="form-label">ADMINISTRATOR / WARDEN NAME</label>
              <input
                type="text"
                className="form-input"
                value={formData.ownerName}
                onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label">OFFICE HELPLINE MOBILE</label>
              <input
                type="text"
                className="form-input"
                value={formData.ownerPhone}
                onChange={e => setFormData({ ...formData, ownerPhone: e.target.value })}
              />
            </div>
          </div>

          <div className="form-grid-2 mt-4">
            <div>
              <label className="form-label">ADDRESS / LOCALITY</label>
              <input
                type="text"
                className="form-input"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label">CITY & STATE</label>
              <input
                type="text"
                className="form-input"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Section 2: WhatsApp Automation Configuration */}
        <div className="glass-card p-6 mb-6">
          <div className="widget-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="icon-badge badge-success-glow">
                <MessageSquare size={20} color="#25D366" />
              </div>
              <div>
                <h3 className="widget-title">WhatsApp Automation Hook & Client Test Mobile</h3>
                <p className="widget-subtitle">Configured number for demonstration reminders and receipt dispatches.</p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-whatsapp btn-sm"
              onClick={handleTestWhatsAppNumber}
            >
              <Smartphone size={14} />
              <span>Test Send to +91 {formData.whatsappDemoNumber}</span>
            </button>
          </div>

          <div className="form-grid-2">
            <div>
              <label className="form-label">
                CLIENT DEMO WHATSAPP TARGET MOBILE *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  className="form-input"
                  style={{ fontWeight: 700, letterSpacing: '0.5px' }}
                  value={formData.whatsappDemoNumber}
                  onChange={e => setFormData({ ...formData, whatsappDemoNumber: e.target.value })}
                />
              </div>
              <small className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4, display: 'block' }}>
                When you click "Send WhatsApp Reminder" across the platform, it opens WhatsApp Web/Mobile directed to this number (<strong>{formData.whatsappDemoNumber}</strong>).
              </small>
            </div>

            <div>
              <label className="form-label">DAILY REMINDER DISPATCH TIME (IST)</label>
              <input
                type="time"
                className="form-input"
                value={formData.reminderTime}
                onChange={e => setFormData({ ...formData, reminderTime: e.target.value })}
              />
              <small className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4, display: 'block' }}>
                Scheduled daily time (e.g. 19:00 / 7:00 PM IST) for automated billing audits.
              </small>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
          <button type="submit" className="btn btn-primary" style={{ minWidth: 200 }}>
            <Save size={16} /> Save System Settings
          </button>
        </div>
      </form>

      {/* Section 3: Buildings / Wings Portfolio */}
      <div className="glass-card p-6 mb-6">
        <div className="widget-header">
          <div>
            <h3 className="widget-title">Buildings & Wings Portfolio</h3>
            <p className="widget-subtitle">Manage multiple hostel branches under your unified brand.</p>
          </div>
        </div>

        <div className="buildings-manage-list">
          {buildings.map(b => (
            <div key={b.id} className="building-manage-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="building-icon-badge">
                  <Building2 size={18} color="#f97316" />
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{b.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {b.address || 'Gachibowli, Hyderabad'} • {b.tag || `${b.floorsCount} Floors`}
                  </div>
                </div>
              </div>

              {buildings.length > 1 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-danger"
                  onClick={() => {
                    deleteBuilding(b.id);
                    success(`Building "${b.name}" removed`);
                  }}
                  title="Remove Building"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Factory Reset Demo Dataset */}
      <div className="glass-card p-6 reset-danger-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: '#ef4444' }}>
              Factory Reset Demonstration State
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Restores all sample student admissions, room allocations, paid receipts, and financial expenses back to the pristine demonstration defaults.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setShowResetConfirm(true)}
          >
            <RotateCcw size={16} />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="Reset All Demo Data?"
        message="This will reset all students, rooms, fees, and expenses back to the default factory demonstration dataset. Proceed?"
        confirmLabel="Yes, Reset Everything"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={() => {
          resetToDemoData();
          setFormData(settings);
          setShowResetConfirm(false);
          success('Demo dataset restored to factory defaults');
        }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};

export default Settings;
