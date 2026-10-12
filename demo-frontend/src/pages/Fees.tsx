import React, { useState } from 'react';
import {
  FileText, IndianRupee, MessageSquare, CreditCard,
  Printer, CheckCircle2, Clock, AlertCircle, Share2,
  Filter, Search, X, Check, Building2
} from 'lucide-react';
import { useDemoData } from '../context/DemoDataContext';
import { useToast } from '../context/ToastContext';
import { Student, FeeRecord } from '../types';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { ReceiptModal } from '../components/ReceiptModal';

export const Fees: React.FC = () => {
  const {
    students,
    rooms,
    feeRecords,
    selectedBuildingId,
    activeBuildingName,
    selectedMonth,
    payFee,
    sendBulkWhatsAppReminders,
  } = useDemoData();

  const { success, whatsapp } = useToast();

  const [activeTab, setActiveTab] = useState<'dues' | 'history'>('dues');
  const [searchQuery, setSearchQuery] = useState('');
  const [feeStatusFilter, setFeeStatusFilter] = useState<'All' | 'Paid' | 'Pending' | 'Overdue'>('All');

  // Modals
  const [selectedStudentForWA, setSelectedStudentForWA] = useState<Student | null>(null);
  const [selectedStudentForPay, setSelectedStudentForPay] = useState<Student | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<{ record: FeeRecord; student: Student } | null>(null);

  // Payment form state
  const [payAmount, setPayAmount] = useState<number>(8500);
  const [payMethod, setPayMethod] = useState<'Cash' | 'UPI' | 'Bank Transfer'>('UPI');
  const [upiProvider, setUpiProvider] = useState<'PhonePe' | 'Google Pay' | 'Paytm' | 'BHIM' | 'Other UPI'>('PhonePe');
  const [txnRef, setTxnRef] = useState('');

  // Active students filtered by building
  const filteredStudents = students.filter(s => {
    if (s.status !== 'Active') return false;
    if (selectedBuildingId !== 'all' && s.buildingId !== selectedBuildingId) return false;
    if (feeStatusFilter !== 'All' && s.feeStatus !== feeStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.phone.includes(q) || s.rollNumber.toLowerCase().includes(q);
    }
    return true;
  });

  // Billing calculations
  const totalExpected = filteredStudents.reduce((acc, s) => acc + s.monthlyFee, 0);
  const paidStudents = filteredStudents.filter(s => s.feeStatus === 'Paid');
  const pendingStudents = filteredStudents.filter(s => s.feeStatus !== 'Paid');

  const monthlyRecords = feeRecords.filter(f => f.month === selectedMonth);
  const totalCollected = monthlyRecords.reduce((acc, f) => acc + f.amount, 0);
  const totalPendingDues = Math.max(0, totalExpected - totalCollected);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  // Filtered fee history records
  const filteredHistory = feeRecords.filter(f => {
    if (searchQuery.trim()) {
      const st = students.find(s => s.id === f.studentId);
      const q = searchQuery.toLowerCase();
      const matchName = st?.name.toLowerCase().includes(q);
      const matchRec = f.receiptNo.toLowerCase().includes(q);
      const matchRef = f.transactionRef?.toLowerCase().includes(q);
      return matchName || matchRec || matchRef;
    }
    return true;
  });

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForPay) return;

    const record = payFee({
      studentId: selectedStudentForPay.id,
      amount: payAmount,
      method: payMethod,
      upiProvider: payMethod === 'UPI' ? upiProvider : undefined,
      transactionRef: txnRef || undefined,
      month: selectedMonth,
    });

    success(`Payment recorded for ${selectedStudentForPay.name}! Receipt #${record.receiptNo} generated.`);
    setActiveReceipt({ record, student: selectedStudentForPay });
    setSelectedStudentForPay(null);
  };

  const handleShareReceiptWhatsApp = (record: FeeRecord) => {
    const student = students.find(s => s.id === record.studentId);
    if (!student) return;

    const msg = 
`🧾 *FEE PAYMENT RECEIPT - VMR LUXURY HOSTEL* 🧾
━━━━━━━━━━━━━━━━━━━━
Dear *${student.name}*,
Your payment for *${record.month}* has been confirmed!

✅ *Receipt No:* ${record.receiptNo}
💰 *Amount Paid:* ₹${record.amount.toLocaleString('en-IN')}
💳 *Payment Mode:* ${record.method} ${record.upiProvider ? `(${record.upiProvider})` : ''}
🔖 *Reference:* ${record.transactionRef || 'N/A'}
⏱ *Timestamp:* ${new Date(record.date).toLocaleString('en-IN')}

_Thank you! Your official electronic PDF receipt has been filed in the hostel system._
━━━━━━━━━━━━━━━━━━━━`;

    // Direct WhatsApp redirect to 9491554114
    const url = `https://wa.me/919491554114?text=${encodeURIComponent(msg)}`;
    whatsapp('Opening WhatsApp Receipt', `Redirecting receipt to +91 9491554114`);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="animate-fade-in fees-page">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Fee Collection & Digital Receipts</h1>
          <p className="page-subtitle">
            Billing Month: <strong>{selectedMonth}</strong> · Facility: <strong>{activeBuildingName}</strong>
          </p>
        </div>

        {/* Bulk WhatsApp Trigger Button */}
        <button
          className="btn btn-whatsapp"
          onClick={() => sendBulkWhatsAppReminders()}
          title="Send batch reminders to 9491554114"
        >
          <MessageSquare size={16} />
          <span>Broadcast Reminders to WhatsApp (+91 9491554114)</span>
        </button>
      </div>

      {/* Top Stat Cards */}
      <div className="responsive-grid-4 mb-6">
        <div className="glass-card stat-card">
          <div className="stat-card-title">PROJECTED REVENUE</div>
          <div className="stat-card-value text-indigo">₹{totalExpected.toLocaleString('en-IN')}</div>
          <div className="stat-card-footer text-muted">{filteredStudents.length} Total active billings</div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-card-title">FEES COLLECTED</div>
          <div className="stat-card-value text-emerald">₹{totalCollected.toLocaleString('en-IN')}</div>
          <div className="stat-card-footer">
            <span className="badge badge-success">{paidStudents.length} Residents Cleared</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-card-title">OUTSTANDING DUES</div>
          <div className="stat-card-value text-amber">₹{totalPendingDues.toLocaleString('en-IN')}</div>
          <div className="stat-card-footer">
            <span className="badge badge-warning">{pendingStudents.length} Defaulters</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-card-title">COLLECTION RATE</div>
          <div className="stat-card-value text-cyan">{collectionRate}%</div>
          <div className="stat-card-footer">
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${collectionRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Current Dues vs Historical Receipts) */}
      <div className="tabs-header-row mb-4">
        <div className="tabs-pill-nav">
          <button
            className={`tab-pill-btn ${activeTab === 'dues' ? 'active' : ''}`}
            onClick={() => setActiveTab('dues')}
          >
            <span>Current Month Dues ({selectedMonth})</span>
            <span className="tab-badge">{pendingStudents.length} Pending</span>
          </button>
          <button
            className={`tab-pill-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <span>Payment Audit History & Receipts</span>
            <span className="tab-badge">{feeRecords.length} Records</span>
          </button>
        </div>

        {/* Search */}
        <div className="search-input-wrapper-sm">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="search-input-sm"
            placeholder="Search student or receipt..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* TAB 1: CURRENT MONTH DUES */}
      {activeTab === 'dues' && (
        <div className="glass-card p-4 table-card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Resident Student</th>
                  <th>Room Allocation</th>
                  <th>Monthly Rent</th>
                  <th>Fee Status ({selectedMonth})</th>
                  <th>WhatsApp Delivery</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                      <div className="text-muted">No students matching criteria.</div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(student => {
                    const room = rooms.find(r => r.id === student.roomId);
                    const bed = room?.beds.find(b => b.id === student.bedId);
                    const isPaid = student.feeStatus === 'Paid';

                    return (
                      <tr key={student.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={student.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}
                              alt=""
                              className="avatar-sm"
                            />
                            <div>
                              <div style={{ fontWeight: 600 }}>{student.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                +91 {student.phone} • {student.course}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="badge badge-outline">
                            Room {room?.roomNumber || 'N/A'} (Bed {bed?.bedNumber || 1})
                          </span>
                        </td>

                        <td style={{ fontWeight: 700 }}>
                          ₹{student.monthlyFee.toLocaleString('en-IN')}
                        </td>

                        <td>
                          <span className={`badge ${
                            isPaid ? 'badge-success' :
                            student.feeStatus === 'Overdue' ? 'badge-danger' : 'badge-warning'
                          }`}>
                            {isPaid ? '✓ Paid' : student.feeStatus}
                          </span>
                        </td>

                        <td>
                          <span className="badge badge-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <MessageSquare size={12} color="#25D366" />
                            <span>DELIVERED</span>
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            {/* WhatsApp Reminder (Target 9491554114) */}
                            <button
                              className="btn btn-whatsapp btn-sm"
                              onClick={() => setSelectedStudentForWA(student)}
                              title="Send Reminder via WhatsApp to 9491554114"
                            >
                              <MessageSquare size={13} />
                              <span>Remind</span>
                            </button>

                            {/* Collect Fee Button */}
                            {!isPaid && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => {
                                  setSelectedStudentForPay(student);
                                  setPayAmount(student.monthlyFee);
                                }}
                              >
                                <CreditCard size={13} />
                                <span>Pay</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: RECEIPT AUDIT HISTORY */}
      {activeTab === 'history' && (
        <div className="glass-card p-4 table-card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Resident</th>
                  <th>Billing Month</th>
                  <th>Amount</th>
                  <th>Payment Mode</th>
                  <th>Payment Date</th>
                  <th>WhatsApp Status</th>
                  <th style={{ textAlign: 'right' }}>Receipt Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                      <div className="text-muted">No receipts found.</div>
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map(record => {
                    const student = students.find(s => s.id === record.studentId);

                    return (
                      <tr key={record.id}>
                        <td>
                          <span className="badge badge-accent" style={{ fontWeight: 700 }}>
                            #{record.receiptNo}
                          </span>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600 }}>{student?.name || 'Resident'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {student?.phone}
                          </div>
                        </td>

                        <td>
                          <strong>{record.month}</strong>
                        </td>

                        <td style={{ fontWeight: 800, color: '#10b981' }}>
                          ₹{record.amount.toLocaleString('en-IN')}
                        </td>

                        <td>
                          <span className="badge badge-outline">
                            {record.method} {record.upiProvider ? `(${record.upiProvider})` : ''}
                          </span>
                          {record.transactionRef && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              <code>{record.transactionRef}</code>
                            </div>
                          )}
                        </td>

                        <td>
                          <div style={{ fontSize: '0.85rem' }}>
                            {new Date(record.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {new Date(record.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td>
                          <span className={`badge ${
                            record.whatsappStatus === 'READ' ? 'badge-info' :
                            record.whatsappStatus === 'DELIVERED' ? 'badge-success' : 'badge-warning'
                          }`}>
                            WA: {record.whatsappStatus || 'DELIVERED'}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            {/* Share on WhatsApp */}
                            <button
                              className="btn btn-whatsapp btn-sm"
                              onClick={() => handleShareReceiptWhatsApp(record)}
                              title="Share Receipt on WhatsApp to 9491554114"
                            >
                              <Share2 size={13} />
                              <span>WhatsApp</span>
                            </button>

                            {/* View / Print PDF */}
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                if (student) {
                                  setActiveReceipt({ record, student });
                                }
                              }}
                              title="View & Print PDF Receipt"
                            >
                              <Printer size={13} />
                              <span>Receipt</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Collect Fee Modal */}
      {selectedStudentForPay && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setSelectedStudentForPay(null)}>
          <div className="modal-card modal-md animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                Receive Fee & Issue Receipt
              </h3>
              <button className="btn-close" onClick={() => setSelectedStudentForPay(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handlePaySubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Recording payment for resident <strong>{selectedStudentForPay.name}</strong> for <strong>{selectedMonth}</strong>.
                </p>

                <div>
                  <label className="form-label">PAYMENT AMOUNT (INR) *</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    value={payAmount}
                    onChange={e => setPayAmount(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="form-label">PAYMENT METHOD</label>
                  <div className="radio-group-tabs">
                    {(['UPI', 'Cash', 'Bank Transfer'] as const).map(m => (
                      <button
                        type="button"
                        key={m}
                        className={`radio-tab ${payMethod === m ? 'active' : ''}`}
                        onClick={() => setPayMethod(m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {payMethod === 'UPI' && (
                  <div>
                    <label className="form-label">UPI PROVIDER</label>
                    <select
                      className="form-input"
                      value={upiProvider}
                      onChange={e => setUpiProvider(e.target.value as any)}
                    >
                      <option value="PhonePe">PhonePe</option>
                      <option value="Google Pay">Google Pay</option>
                      <option value="Paytm">Paytm</option>
                      <option value="BHIM">BHIM UPI</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="form-label">TRANSACTION UTR / REFERENCE</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. UPI/261012998811"
                    value={txnRef}
                    onChange={e => setTxnRef(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setSelectedStudentForPay(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Payment & Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {selectedStudentForWA && (
        <WhatsAppModal
          student={selectedStudentForWA}
          onClose={() => setSelectedStudentForWA(null)}
        />
      )}

      {/* Printable Receipt Modal */}
      {activeReceipt && (
        <ReceiptModal
          feeRecord={activeReceipt.record}
          student={activeReceipt.student}
          onClose={() => setActiveReceipt(null)}
        />
      )}
    </div>
  );
};

export default Fees;
