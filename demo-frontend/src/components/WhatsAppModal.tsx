import React, { useState } from 'react';
import { X, MessageSquare, Copy, ExternalLink, Check, Smartphone, Sparkles } from 'lucide-react';
import { Student } from '../types';
import { useDemoData } from '../context/DemoDataContext';
import { useToast } from '../context/ToastContext';

interface WhatsAppModalProps {
  student: Student | null;
  onClose: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ student, onClose }) => {
  const { settings, rooms, selectedMonth } = useDemoData();
  const { success, whatsapp } = useToast();

  const [targetChoice, setTargetChoice] = useState<'demo' | 'student' | 'custom'>('demo');
  const [customPhone, setCustomPhone] = useState<string>('9491554114');
  const [copied, setCopied] = useState<boolean>(false);

  if (!student) return null;

  const room = rooms.find(r => r.id === student.roomId);
  const bed = room?.beds.find(b => b.id === student.bedId);

  // Default demo number from requirements: 9491554114
  const demoPhone = settings.whatsappDemoNumber || '9491554114';

  const defaultMessage = 
`🔔 *FEE REMINDER - ${settings.hostelName.toUpperCase()}* 🔔
━━━━━━━━━━━━━━━━━━━━
Dear *${student.name}*,

This is a gentle reminder that your accommodation and mess fee for *${selectedMonth}* is pending.

🏠 *Room No:* ${room?.roomNumber || 'Assigned Room'} (Bed ${bed?.bedNumber || 1})
💰 *Amount Due:* ₹${student.monthlyFee.toLocaleString('en-IN')}
📅 *Due Date:* 5th of ${new Date().toLocaleString('en-IN', { month: 'long' })}

💳 *UPI ID:* ${settings.upiId}
📞 *Office / Warden Helpline:* +91 ${demoPhone}

_Kindly complete payment via UPI and reply to this message with your transaction screenshot to get your official PDF receipt._
━━━━━━━━━━━━━━━━━━━━`;

  const [message, setMessage] = useState<string>(defaultMessage);

  const getEffectivePhone = () => {
    if (targetChoice === 'demo') return demoPhone;
    if (targetChoice === 'student') return student.phone;
    return customPhone || demoPhone;
  };

  const handleLaunchWhatsApp = () => {
    const raw = getEffectivePhone().replace(/\D/g, '');
    const phone = raw.startsWith('91') && raw.length > 10 ? raw : `91${raw}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    
    whatsapp('Opening WhatsApp Redirect', `Sending pre-filled reminder to +${phone}`);
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    success('Message copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="modal-card whatsapp-modal-card animate-scale-up" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="icon-badge-wa">
              <MessageSquare size={20} color="#25D366" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                WhatsApp Fee Reminder
                <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>Live Redirect</span>
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Targeting resident: <strong>{student.name}</strong> ({student.course})
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Target Phone Selector */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>SELECT RECIPIENT PHONE NUMBER</span>
              <span style={{ fontSize: '0.75rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} /> Client Showcase Mode
              </span>
            </label>

            <div className="radio-group-options">
              {/* Demo Phone (9491554114) */}
              <label className={`radio-card-option ${targetChoice === 'demo' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="targetChoice"
                  checked={targetChoice === 'demo'}
                  onChange={() => setTargetChoice('demo')}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <Smartphone size={15} color="#f97316" />
                    <span>Client Demo Number: <strong>+91 {demoPhone}</strong></span>
                    <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Requested Test No</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Opens WhatsApp chat directly to test the message on your phone (9491554114).
                  </div>
                </div>
              </label>

              {/* Student Phone */}
              <label className={`radio-card-option ${targetChoice === 'student' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="targetChoice"
                  checked={targetChoice === 'student'}
                  onChange={() => setTargetChoice('student')}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>Student Registered Mobile: +91 {student.phone}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Sends directly to resident's profile number.
                  </div>
                </div>
              </label>

              {/* Custom Number */}
              <label className={`radio-card-option ${targetChoice === 'custom' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="targetChoice"
                  checked={targetChoice === 'custom'}
                  onChange={() => setTargetChoice('custom')}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>Enter Any Custom Mobile Number</div>
                  {targetChoice === 'custom' && (
                    <input
                      type="text"
                      className="form-input mt-2"
                      placeholder="e.g. 9491554114"
                      value={customPhone}
                      onChange={e => setCustomPhone(e.target.value)}
                      onClick={e => e.stopPropagation()}
                    />
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Message Preview */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0 }}>PRE-FILLED WHATSAPP MESSAGE (EDITABLE)</label>
              <button className="btn-link" onClick={handleCopy} style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {copied ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy Text'}
              </button>
            </div>
            <textarea
              className="form-input wa-preview-textarea"
              rows={8}
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>

          {/* Callout box */}
          <div className="wa-info-callout">
            <span style={{ fontSize: '1.1rem' }}>💡</span>
            <div style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
              Clicking <strong>"Launch WhatsApp"</strong> will open <code>https://wa.me/91{getEffectivePhone()}</code> in WhatsApp Web or your phone's WhatsApp application with the exact reminder formatted above.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-whatsapp" onClick={handleLaunchWhatsApp}>
            <ExternalLink size={16} style={{ marginRight: 6 }} /> Launch WhatsApp (+91 {getEffectivePhone()})
          </button>
        </div>
      </div>
    </div>
  );
};
