import React, { useState } from 'react';
import {
  Users, Search, Filter, Plus, MessageSquare, CreditCard,
  Eye, LogOut, CheckCircle2, AlertCircle, Clock, Smartphone,
  X, Shield, Building2, FileText, ChevronRight, Check
} from 'lucide-react';
import { useDemoData } from '../context/DemoDataContext';
import { useToast } from '../context/ToastContext';
import { Student, Room } from '../types';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { ConfirmModal } from '../components/ConfirmModal';

export const Students: React.FC = () => {
  const {
    students,
    rooms,
    buildings,
    selectedBuildingId,
    selectedMonth,
    addStudent,
    payFee,
    putOnNotice,
    vacateStudent,
    deleteStudent,
  } = useDemoData();

  const { success, whatsapp } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [feeStatusFilter, setFeeStatusFilter] = useState<'All' | 'Paid' | 'Pending' | 'Overdue'>('All');
  const [statusFilter, setStatusFilter] = useState<'Active' | 'Notice' | 'Vacated' | 'All'>('Active');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudentForWA, setSelectedStudentForWA] = useState<Student | null>(null);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [selectedStudentForPay, setSelectedStudentForPay] = useState<Student | null>(null);
  const [generatedReceipt, setGeneratedReceipt] = useState<any>(null);
  const [receiptStudent, setReceiptStudent] = useState<Student | null>(null);
  const [vacateConfirmStudent, setVacateConfirmStudent] = useState<Student | null>(null);
  const [noticeStudent, setNoticeStudent] = useState<Student | null>(null);
  const [noticeDate, setNoticeDate] = useState('');
  const [noticeReason, setNoticeReason] = useState('');

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState<number>(8500);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Bank Transfer'>('UPI');
  const [upiProvider, setUpiProvider] = useState<'PhonePe' | 'Google Pay' | 'Paytm' | 'BHIM' | 'Other UPI'>('PhonePe');
  const [txnRef, setTxnRef] = useState('');

  // New Student Form state
  const [newStudent, setNewStudent] = useState({
    name: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    phone: '',
    email: '',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
    course: 'B.Tech',
    branch: 'Computer Science',
    year: '3rd Year',
    rollNumber: '',
    dateOfJoining: new Date().toISOString().split('T')[0],
    aadhar: '4589 1234 9876',
    address: 'Plot 12, Jubilee Hills, Hyderabad',
    pincode: '500033',
    state: 'Telangana',
    parentName: '',
    parentPhone: '',
    parentRelationship: 'Father',
    emergencyName: '',
    emergencyPhone: '',
    securityDeposit: 5000,
    monthlyFee: 8500,
    buildingId: selectedBuildingId !== 'all' ? selectedBuildingId : (buildings[0]?.id || 'bld-1'),
    roomId: '',
    bedId: '',
  });

  // Filter students
  const filteredStudents = students.filter(s => {
    if (selectedBuildingId !== 'all' && s.buildingId !== selectedBuildingId) return false;
    if (feeStatusFilter !== 'All' && s.feeStatus !== feeStatusFilter) return false;
    if (statusFilter === 'Active' && s.status !== 'Active') return false;
    if (statusFilter === 'Notice' && (!s.isOnNotice || s.status !== 'Active')) return false;
    if (statusFilter === 'Vacated' && s.status !== 'Vacated') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchRoll = s.rollNumber.toLowerCase().includes(q);
      const matchPhone = s.phone.includes(q);
      const matchCourse = s.course.toLowerCase().includes(q);
      return matchName || matchRoll || matchPhone || matchCourse;
    }
    return true;
  });

  // Available beds for new admission
  const targetBuildingRooms = rooms.filter(r => r.buildingId === newStudent.buildingId);
  const availableBedsList: { room: Room; bedId: string; bedNumber: number }[] = [];
  targetBuildingRooms.forEach(rm => {
    rm.beds.forEach(b => {
      if (b.status === 'available') {
        availableBedsList.push({ room: rm, bedId: b.id, bedNumber: b.bedNumber });
      }
    });
  });

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name.trim() || !newStudent.phone.trim()) return;

    addStudent({
      ...newStudent,
      feeStatus: 'Paid',
      status: 'Active',
      isOnNotice: false,
    });

    success(`Student "${newStudent.name}" enrolled successfully!`);
    setShowAddModal(false);
  };

  const handlePayFeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForPay) return;

    const record = payFee({
      studentId: selectedStudentForPay.id,
      amount: paymentAmount,
      method: paymentMethod,
      upiProvider: paymentMethod === 'UPI' ? upiProvider : undefined,
      transactionRef: txnRef || undefined,
      month: selectedMonth,
    });

    setReceiptStudent(selectedStudentForPay);
    setGeneratedReceipt(record);
    setSelectedStudentForPay(null);
    success(`Fee of ₹${paymentAmount.toLocaleString()} recorded! Receipt #${record.receiptNo} generated.`);
  };

  const handleNoticeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeStudent || !noticeDate) return;
    putOnNotice(noticeStudent.id, noticeDate, noticeReason);
    success(`${noticeStudent.name} put on notice period until ${noticeDate}`);
    setNoticeStudent(null);
    setNoticeDate('');
    setNoticeReason('');
  };

  const handleVacateConfirm = () => {
    if (!vacateConfirmStudent) return;
    vacateStudent(vacateConfirmStudent.id);
    success(`${vacateConfirmStudent.name} has been vacated and bed released`);
    setVacateConfirmStudent(null);
  };

  return (
    <div className="animate-fade-in students-page">
      {/* Top Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Resident Student Directory</h1>
          <p className="page-subtitle">
            Manage student registrations, profile records, bed allotments, and live fee dues.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} />
          <span>+ Enroll New Resident</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card p-4 mb-6 search-filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search residents by name, phone, course, roll number..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
              <X size={15} />
            </button>
          )}
        </div>

        <div className="filter-group">
          {/* Fee Filter */}
          <div className="filter-pill-select">
            <Filter size={14} className="text-muted" />
            <select
              value={feeStatusFilter}
              onChange={e => setFeeStatusFilter(e.target.value as any)}
            >
              <option value="All">All Fees</option>
              <option value="Paid">Paid Only</option>
              <option value="Pending">Pending Only</option>
              <option value="Overdue">Overdue Only</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="filter-pill-select">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
            >
              <option value="Active">Active Residents</option>
              <option value="Notice">On Notice Period</option>
              <option value="Vacated">Vacated Past</option>
              <option value="All">All Statuses</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student Table */}
      <div className="glass-card p-4 table-card">
        <div className="table-header-info">
          <span>Showing <strong>{filteredStudents.length}</strong> resident profiles</span>
          <span className="text-muted">Month: {selectedMonth}</span>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Resident Profile</th>
                <th>Academic & Contact</th>
                <th>Room & Bed</th>
                <th>Date of Joining</th>
                <th>Fee Status ({selectedMonth})</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="text-muted">No students matching your filter criteria.</div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => {
                  const room = rooms.find(r => r.id === student.roomId);
                  const bed = room?.beds.find(b => b.id === student.bedId);
                  const building = buildings.find(b => b.id === student.buildingId);

                  return (
                    <tr key={student.id}>
                      {/* Name & Photo */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={student.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={student.name}
                            className="avatar-md"
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                              {student.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {student.rollNumber || 'ID: ' + student.id.slice(-6)} • {student.gender}
                            </div>
                            {student.isOnNotice && (
                              <span className="badge badge-warning" style={{ fontSize: '0.65rem', marginTop: 4 }}>
                                Notice: Vacating {student.noticeVacateDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Academic & Phone */}
                      <td>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{student.course} ({student.branch})</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          📱 +91 {student.phone}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Parent: {student.parentName} ({student.parentPhone})
                        </div>
                      </td>

                      {/* Room & Bed */}
                      <td>
                        {room ? (
                          <div>
                            <span className="badge badge-outline" style={{ fontWeight: 700 }}>
                              Room {room.roomNumber} • Bed {bed?.bedNumber || 1}
                            </span>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
                              {building?.name || 'Main Wing'} • {room.sharingType}
                            </div>
                          </div>
                        ) : (
                          <span className="badge badge-warning">Unallocated</span>
                        )}
                      </td>

                      {/* Date of Joining */}
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>
                          {new Date(student.dateOfJoining).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Rent: ₹{student.monthlyFee.toLocaleString('en-IN')}/mo
                        </div>
                      </td>

                      {/* Fee Status */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className={`badge ${
                            student.feeStatus === 'Paid' ? 'badge-success' :
                            student.feeStatus === 'Overdue' ? 'badge-danger' : 'badge-warning'
                          }`}>
                            {student.feeStatus === 'Paid' ? '✓ Paid' : student.feeStatus}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {student.feeStatus === 'Paid' ? 'Receipt Issued' : `₹${student.monthlyFee.toLocaleString('en-IN')} Due`}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          {/* WhatsApp Reminder (Target 9491554114) */}
                          <button
                            className="btn btn-whatsapp btn-sm"
                            onClick={() => setSelectedStudentForWA(student)}
                            title="Send WhatsApp Reminder to 9491554114"
                          >
                            <MessageSquare size={13} />
                            <span>WA</span>
                          </button>

                          {/* Collect Fee */}
                          {student.feeStatus !== 'Paid' && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setSelectedStudentForPay(student);
                                setPaymentAmount(student.monthlyFee);
                              }}
                              title="Record Rent Payment"
                            >
                              <CreditCard size={13} />
                              <span>Pay</span>
                            </button>
                          )}

                          {/* Profile View */}
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setSelectedStudentForProfile(student)}
                            title="View Full Profile & ID"
                          >
                            <Eye size={13} />
                          </button>

                          {/* Notice / Vacate Menu */}
                          {student.status === 'Active' && !student.isOnNotice && (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                setNoticeStudent(student);
                                setNoticeDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
                              }}
                              title="Put on Notice Period"
                            >
                              <Clock size={13} />
                            </button>
                          )}

                          {student.status === 'Active' && (
                            <button
                              className="btn btn-ghost btn-sm text-danger"
                              onClick={() => setVacateConfirmStudent(student)}
                              title="Vacate Resident & Free Bed"
                            >
                              <LogOut size={13} />
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

      {/* ===================== ADMISSION MODAL ===================== */}
      {showAddModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowAddModal(false)}>
          <div className="modal-card modal-lg animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="icon-badge badge-primary-glow">
                  <Users size={20} color="#f97316" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                    Admit New Resident Student
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Complete registration with photo, KYC identity, and bed assignment.
                  </p>
                </div>
              </div>
              <button className="btn-close" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateStudent}>
              <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                {/* Section 1: Personal Details */}
                <div className="form-section-title">1. PERSONAL DETAILS</div>
                <div className="form-grid-3">
                  <div>
                    <label className="form-label">FULL NAME *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. Arvind Swamy"
                      value={newStudent.name}
                      onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">GENDER</label>
                    <select
                      className="form-input"
                      value={newStudent.gender}
                      onChange={e => setNewStudent({ ...newStudent, gender: e.target.value as any })}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">MOBILE NUMBER *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. 9491554114"
                      value={newStudent.phone}
                      onChange={e => setNewStudent({ ...newStudent, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-3 mt-3">
                  <div>
                    <label className="form-label">EMAIL ADDRESS</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="student@gmail.com"
                      value={newStudent.email}
                      onChange={e => setNewStudent({ ...newStudent, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">AADHAR NUMBER</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="XXXX XXXX XXXX"
                      value={newStudent.aadhar}
                      onChange={e => setNewStudent({ ...newStudent, aadhar: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">PROFILE PHOTO URL</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newStudent.photoUrl}
                      onChange={e => setNewStudent({ ...newStudent, photoUrl: e.target.value })}
                    />
                  </div>
                </div>

                {/* Section 2: College & Academic */}
                <div className="form-section-title mt-4">2. ACADEMIC & EMPLOYMENT</div>
                <div className="form-grid-3">
                  <div>
                    <label className="form-label">COURSE / DEGREE</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. B.Tech / MBA / IT Professional"
                      value={newStudent.course}
                      onChange={e => setNewStudent({ ...newStudent, course: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">BRANCH / SPECIALIZATION</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Computer Science"
                      value={newStudent.branch}
                      onChange={e => setNewStudent({ ...newStudent, branch: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">ROLL NO / EMPLOYEE ID</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 21051A0589"
                      value={newStudent.rollNumber}
                      onChange={e => setNewStudent({ ...newStudent, rollNumber: e.target.value })}
                    />
                  </div>
                </div>

                {/* Section 3: Room & Bed Allocation */}
                <div className="form-section-title mt-4">3. HOSTEL ROOM ALLOCATION</div>
                <div className="form-grid-3">
                  <div>
                    <label className="form-label">BUILDING / BLOCK</label>
                    <select
                      className="form-input"
                      value={newStudent.buildingId}
                      onChange={e => setNewStudent({ ...newStudent, buildingId: e.target.value, bedId: '', roomId: '' })}
                    >
                      {buildings.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">AVAILABLE BED CHIP</label>
                    <select
                      className="form-input"
                      value={newStudent.bedId}
                      onChange={e => {
                        const bId = e.target.value;
                        const item = availableBedsList.find(x => x.bedId === bId);
                        setNewStudent({
                          ...newStudent,
                          bedId: bId,
                          roomId: item ? item.room.id : '',
                          monthlyFee: item ? item.room.monthlyRent : newStudent.monthlyFee,
                        });
                      }}
                    >
                      <option value="">Select Available Bed...</option>
                      {availableBedsList.map(item => (
                        <option key={item.bedId} value={item.bedId}>
                          Room {item.room.roomNumber} - Bed {item.bedNumber} ({item.room.sharingType} • ₹{item.room.monthlyRent}/mo)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">MONTHLY RENT (INR)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newStudent.monthlyFee}
                      onChange={e => setNewStudent({ ...newStudent, monthlyFee: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Section 4: Parent & Emergency */}
                <div className="form-section-title mt-4">4. GUARDIAN & EMERGENCY CONTACT</div>
                <div className="form-grid-3">
                  <div>
                    <label className="form-label">PARENT / GUARDIAN NAME</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Ramesh Swamy"
                      value={newStudent.parentName}
                      onChange={e => setNewStudent({ ...newStudent, parentName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">PARENT PHONE NUMBER</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 9491554114"
                      value={newStudent.parentPhone}
                      onChange={e => setNewStudent({ ...newStudent, parentPhone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">PERMANENT CITY & STATE</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Hyderabad, Telangana"
                      value={newStudent.address}
                      onChange={e => setNewStudent({ ...newStudent, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Admission & Allocate Bed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== COLLECT FEE MODAL ===================== */}
      {selectedStudentForPay && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setSelectedStudentForPay(null)}>
          <div className="modal-card modal-md animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="icon-badge badge-success-glow">
                  <CreditCard size={20} color="#22c55e" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                    Record Fee Payment
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Resident: <strong>{selectedStudentForPay.name}</strong> • Billing Month: {selectedMonth}
                  </p>
                </div>
              </div>
              <button className="btn-close" onClick={() => setSelectedStudentForPay(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePayFeeSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label">PAYMENT AMOUNT (INR) *</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="form-label">PAYMENT METHOD</label>
                  <div className="radio-group-tabs">
                    {(['UPI', 'Cash', 'Bank Transfer'] as const).map(m => (
                      <button
                        type="button"
                        key={m}
                        className={`radio-tab ${paymentMethod === m ? 'active' : ''}`}
                        onClick={() => setPaymentMethod(m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMethod === 'UPI' && (
                  <div>
                    <label className="form-label">UPI APP / PROVIDER</label>
                    <select
                      className="form-input"
                      value={upiProvider}
                      onChange={e => setUpiProvider(e.target.value as any)}
                    >
                      <option value="PhonePe">PhonePe</option>
                      <option value="Google Pay">Google Pay</option>
                      <option value="Paytm">Paytm</option>
                      <option value="BHIM">BHIM UPI</option>
                      <option value="Other UPI">Other UPI</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="form-label">TRANSACTION REFERENCE / UTR NO</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. T261012998811 or Cash Receipt"
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
                  Confirm & Issue Official Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== STUDENT PROFILE MODAL ===================== */}
      {selectedStudentForProfile && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setSelectedStudentForProfile(null)}>
          <div className="modal-card modal-md animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Resident Student Profile</h3>
              <button className="btn-close" onClick={() => setSelectedStudentForProfile(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <img
                  src={selectedStudentForProfile.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt=""
                  className="avatar-lg"
                />
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px 0' }}>
                    {selectedStudentForProfile.name}
                  </h2>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {selectedStudentForProfile.course} • {selectedStudentForProfile.branch} ({selectedStudentForProfile.year})
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <span className={`badge ${selectedStudentForProfile.feeStatus === 'Paid' ? 'badge-success' : 'badge-warning'}`}>
                      {selectedStudentForProfile.feeStatus}
                    </span>
                  </div>
                </div>
              </div>

              <div className="profile-detail-grid">
                <div className="profile-detail-item">
                  <span className="text-muted">Mobile Number</span>
                  <strong>+91 {selectedStudentForProfile.phone}</strong>
                </div>
                <div className="profile-detail-item">
                  <span className="text-muted">Email</span>
                  <strong>{selectedStudentForProfile.email}</strong>
                </div>
                <div className="profile-detail-item">
                  <span className="text-muted">Aadhar Card</span>
                  <strong>{selectedStudentForProfile.aadhar}</strong>
                </div>
                <div className="profile-detail-item">
                  <span className="text-muted">Monthly Rent</span>
                  <strong>₹{selectedStudentForProfile.monthlyFee.toLocaleString('en-IN')}/mo</strong>
                </div>
                <div className="profile-detail-item">
                  <span className="text-muted">Parent / Guardian</span>
                  <strong>{selectedStudentForProfile.parentName} (+91 {selectedStudentForProfile.parentPhone})</strong>
                </div>
                <div className="profile-detail-item">
                  <span className="text-muted">Permanent Address</span>
                  <strong>{selectedStudentForProfile.address}, {selectedStudentForProfile.state}</strong>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-whatsapp"
                onClick={() => {
                  setSelectedStudentForWA(selectedStudentForProfile);
                  setSelectedStudentForProfile(null);
                }}
              >
                <MessageSquare size={16} /> Send WhatsApp Reminder
              </button>
              <button className="btn btn-outline" onClick={() => setSelectedStudentForProfile(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== NOTICE PERIOD MODAL ===================== */}
      {noticeStudent && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setNoticeStudent(null)}>
          <div className="modal-card modal-sm animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Mark Notice Period</h3>
              <button className="btn-close" onClick={() => setNoticeStudent(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleNoticeSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Set vacating notice for <strong>{noticeStudent.name}</strong>.
                </p>
                <div>
                  <label className="form-label">EXPECTED VACATING DATE *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={noticeDate}
                    onChange={e => setNoticeDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">REASON FOR VACATING</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Semester Completed / Relocating"
                    value={noticeReason}
                    onChange={e => setNoticeReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setNoticeStudent(null)}>Cancel</button>
                <button type="submit" className="btn btn-warning">Save Notice</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Vacate Dialog */}
      <ConfirmModal
        isOpen={Boolean(vacateConfirmStudent)}
        title="Vacate Resident Student?"
        message={`Are you sure you want to vacate ${vacateConfirmStudent?.name}? Their allocated bed will immediately become available for other residents.`}
        confirmLabel="Yes, Vacate Resident"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleVacateConfirm}
        onCancel={() => setVacateConfirmStudent(null)}
      />

      {/* WhatsApp Modal */}
      {selectedStudentForWA && (
        <WhatsAppModal
          student={selectedStudentForWA}
          onClose={() => setSelectedStudentForWA(null)}
        />
      )}

      {/* Receipt Modal */}
      {generatedReceipt && receiptStudent && (
        <ReceiptModal
          feeRecord={generatedReceipt}
          student={receiptStudent}
          onClose={() => {
            setGeneratedReceipt(null);
            setReceiptStudent(null);
          }}
        />
      )}
    </div>
  );
};

export default Students;
