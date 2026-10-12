import React from 'react';
import { X, Printer, Share2, CheckCircle2, Building2 } from 'lucide-react';
import { FeeRecord, Student } from '../types';
import { useDemoData } from '../context/DemoDataContext';
import { useToast } from '../context/ToastContext';

interface ReceiptModalProps {
  feeRecord: FeeRecord | null;
  student: Student | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ feeRecord, student, onClose }) => {
  const { settings, rooms, buildings } = useDemoData();
  const { whatsapp } = useToast();

  if (!feeRecord || !student) return null;

  const room = rooms.find(r => r.id === student.roomId);
  const building = buildings.find(b => b.id === student.buildingId);

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const shareText = 
`🧾 *OFFICIAL PAYMENT RECEIPT - ${settings.hostelName.toUpperCase()}* 🧾
━━━━━━━━━━━━━━━━━━━━
✅ *Receipt No:* ${feeRecord.receiptNo}
👤 *Student:* ${student.name}
🏠 *Room:* ${room?.roomNumber || 'Assigned'} | ${building?.name || 'Main Wing'}
📅 *Billing Month:* ${feeRecord.month}
💵 *Amount Paid:* ₹${feeRecord.amount.toLocaleString()}
💳 *Payment Mode:* ${feeRecord.method}${feeRecord.upiProvider ? ` (${feeRecord.upiProvider})` : ''}
🔖 *Transaction Ref:* ${feeRecord.transactionRef || 'N/A'}
⏱ *Date & Time:* ${new Date(feeRecord.date).toLocaleString('en-IN')}

_Thank you for your prompt payment! This is an authorized digital receipt._
━━━━━━━━━━━━━━━━━━━━`;

    // Direct WhatsApp redirect to 9491554114
    const url = `https://wa.me/919491554114?text=${encodeURIComponent(shareText)}`;
    whatsapp('Opening WhatsApp receipt dispatch', `Redirecting to +91 9491554114`);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="receipt-modal-card animate-scale-up" onClick={e => e.stopPropagation()}>
        {/* Modal Controls */}
        <div className="receipt-modal-actions no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-success">
              <CheckCircle2 size={13} style={{ marginRight: 4 }} /> Paid & Verified
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Receipt #{feeRecord.receiptNo}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-outline btn-sm" onClick={handleShareWhatsApp} title="Send via WhatsApp to 9491554114">
              <Share2 size={15} style={{ marginRight: 4, color: '#25D366' }} /> WhatsApp Share
            </button>
            <button className="btn btn-primary btn-sm" onClick={handlePrint} title="Print / Save PDF">
              <Printer size={15} style={{ marginRight: 4 }} /> Print PDF
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="receipt-paper" id="printable-receipt">
          {/* Header */}
          <div className="receipt-header">
            <div className="receipt-logo">
              <div className="receipt-logo-icon">
                <Building2 size={28} color="#f97316" />
              </div>
              <div>
                <h2 className="receipt-title">{settings.hostelName}</h2>
                <div className="receipt-subtitle">{settings.tagline}</div>
                <div className="receipt-contact">{settings.address}, {settings.city}</div>
                <div className="receipt-contact">Helpline: +91 {settings.whatsappDemoNumber} • Email: {settings.ownerEmail}</div>
              </div>
            </div>
            <div className="receipt-badge-right">
              <div className="receipt-tag">E-RECEIPT</div>
              <div className="receipt-number">#{feeRecord.receiptNo}</div>
              <div className="receipt-date">
                Date: {new Date(feeRecord.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          <div className="receipt-divider" />

          {/* Resident & Room Details */}
          <div className="receipt-meta-grid">
            <div className="receipt-meta-col">
              <div className="receipt-meta-label">RESIDENT DETAILS</div>
              <div className="receipt-meta-val bold">{student.name}</div>
              <div className="receipt-meta-sub">Roll No: {student.rollNumber || 'N/A'}</div>
              <div className="receipt-meta-sub">{student.course} • {student.branch}</div>
              <div className="receipt-meta-sub">Phone: +91 {student.phone}</div>
            </div>

            <div className="receipt-meta-col">
              <div className="receipt-meta-label">ACCOMMODATION ALLOCATION</div>
              <div className="receipt-meta-val bold">{building?.name || 'Main Wing'}</div>
              <div className="receipt-meta-sub">Room Number: <strong>{room?.roomNumber || 'Room N/A'}</strong></div>
              <div className="receipt-meta-sub">Room Type: {room?.sharingType || 'Standard'} {room?.hasAC ? '(Air Conditioned)' : ''}</div>
              <div className="receipt-meta-sub">Billing Period: <strong>{feeRecord.month}</strong></div>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="receipt-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Item Description</th>
                <th style={{ textAlign: 'center' }}>Billing Month</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right' }}>Amount (INR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Monthly Room Rent & Deluxe Mess Fee</strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Includes 3-time buffet meals, high-speed fiber Wi-Fi, 24/7 power backup, and housekeeping.
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>{feeRecord.month}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className="receipt-table-paid">PAID</span>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{feeRecord.amount.toLocaleString('en-IN')}.00</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>Total Amount Received:</td>
                <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
                  ₹{feeRecord.amount.toLocaleString('en-IN')}.00
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Payment Info */}
          <div className="receipt-payment-info">
            <div className="receipt-meta-col">
              <div className="receipt-meta-label">PAYMENT BREAKDOWN</div>
              <div className="receipt-meta-sub">Mode: <strong>{feeRecord.method} {feeRecord.upiProvider ? `(${feeRecord.upiProvider})` : ''}</strong></div>
              {feeRecord.transactionRef && (
                <div className="receipt-meta-sub">Transaction ID: <code>{feeRecord.transactionRef}</code></div>
              )}
              <div className="receipt-meta-sub">Payment Timestamp: {new Date(feeRecord.date).toLocaleTimeString('en-IN')}</div>
            </div>

            <div className="receipt-signature-box">
              <div className="signature-stamp">
                <div className="stamp-circle">
                  <span>{settings.hostelName.slice(0, 10).toUpperCase()}</span>
                  <span style={{ fontSize: '0.65rem' }}>★ VERIFIED ★</span>
                </div>
              </div>
              <div className="signature-line" />
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Authorized Signatory / Warden</div>
            </div>
          </div>

          <div className="receipt-footer-note">
            This is a computer-generated official receipt issued by {settings.hostelName}. All fees are subject to hostel terms & house rules.
          </div>
        </div>
      </div>
    </div>
  );
};
