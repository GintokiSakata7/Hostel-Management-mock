import React, { useState } from 'react';
import { Sparkles, MessageSquare, RotateCcw, Building2, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { useDemoData } from '../context/DemoDataContext';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from './ConfirmModal';

export const DemoBanner: React.FC = () => {
  const { settings, students, rooms, resetToDemoData } = useDemoData();
  const { success, whatsapp } = useToast();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Calculate live stats
  const totalStudents = students.filter(s => s.status === 'Active').length;
  const totalBeds = rooms.reduce((acc, r) => acc + r.beds.length, 0);
  const occupiedBeds = rooms.reduce((acc, r) => acc + r.beds.filter(b => b.status === 'occupied').length, 0);
  const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const pendingCount = students.filter(s => s.status === 'Active' && s.feeStatus !== 'Paid').length;

  const handleQuickWhatsAppTest = () => {
    const demoPhone = settings.whatsappDemoNumber || '9491554114';
    const text = 
`🚀 *CLIENT LIVE DEMONSTRATION - ${settings.hostelName.toUpperCase()}* 🚀
━━━━━━━━━━━━━━━━━━━━
Hi! You are testing the automated WhatsApp integration for ${settings.hostelName}.

✨ *Current System Status:*
• Total Enrolled Residents: ${totalStudents}
• Current Occupancy: ${occupancyPct}% (${occupiedBeds}/${totalBeds} beds)
• Pending Fee Defaulters: ${pendingCount} students
• Test Target Number: +91 ${demoPhone}

Features demonstrated:
1. Automated monthly fee reminders with prefilled UPI links
2. Real-time PDF fee payment receipt sharing
3. Maintenance complaint status resolution alerts

Management Helpline: +91 ${demoPhone}
━━━━━━━━━━━━━━━━━━━━`;

    const url = `https://wa.me/91${demoPhone}?text=${encodeURIComponent(text)}`;
    whatsapp(`Launching WhatsApp Showcase`, `Opening preformatted message to +91 ${demoPhone}`);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleConfirmReset = () => {
    resetToDemoData();
    setShowResetConfirm(false);
    success('Demo state reset to original factory demo data');
  };

  if (collapsed) {
    return (
      <div className="demo-banner-collapsed">
        <button className="demo-pill-btn" onClick={() => setCollapsed(false)}>
          <Sparkles size={14} color="#f97316" />
          <span>Demo Showcase Mode Active</span>
          <ChevronDown size={14} />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="demo-banner animate-slide-in-down">
        <div className="demo-banner-inner">
          <div className="demo-banner-left">
            <div className="demo-sparkle-icon">
              <Sparkles size={16} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="demo-title">Client Demonstration Mode</span>
                <span className="demo-pill-tag">100% Pure Frontend</span>
                <span className="demo-pill-tag demo-pill-green">WhatsApp Target: +91 {settings.whatsappDemoNumber}</span>
              </div>
              <div className="demo-subtitle">
                All actions (Adding students, Bed allocations, Payments, Receipts, P&L Expenses) operate live with browser-stored state.
              </div>
            </div>
          </div>

          <div className="demo-banner-right">
            <button className="btn-demo-action btn-demo-wa" onClick={handleQuickWhatsAppTest} title="Test WhatsApp integration to 9491554114">
              <MessageSquare size={14} color="#25D366" />
              <span>Test WhatsApp (+91 {settings.whatsappDemoNumber})</span>
            </button>

            <button className="btn-demo-action btn-demo-reset" onClick={() => setShowResetConfirm(true)} title="Reset all changes to pristine demo dataset">
              <RotateCcw size={14} />
              <span>Reset Data</span>
            </button>

            <button className="btn-demo-collapse" onClick={() => setCollapsed(true)} title="Minimize banner">
              <ChevronUp size={16} />
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showResetConfirm}
        title="Reset Demo Data?"
        message="This will reset all residents, room allocations, fee payments, and financial expenses back to the pristine demonstration dataset. Any custom records you added during this demo session will be reset."
        confirmLabel="Yes, Reset Data"
        cancelLabel="Keep Current Changes"
        isDestructive={true}
        onConfirm={handleConfirmReset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </>
  );
};
