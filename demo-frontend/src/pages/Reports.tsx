import React, { useState } from 'react';
import {
  Download, FileSpreadsheet, Users, BedDouble, FileText,
  IndianRupee, ShieldCheck, CheckCircle2, Table
} from 'lucide-react';
import { useDemoData } from '../context/DemoDataContext';
import { useToast } from '../context/ToastContext';

export const Reports: React.FC = () => {
  const {
    students,
    rooms,
    buildings,
    feeRecords,
    expenses,
    selectedBuildingId,
    activeBuildingName,
    selectedMonth,
  } = useDemoData();

  const { success } = useToast();
  const [activeReport, setActiveReport] = useState<'students' | 'occupancy' | 'fees' | 'expenses'>('students');

  // Helper to trigger browser CSV download
  const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success(`Report "${filename}" exported successfully!`);
  };

  // Export 1: Student Roster
  const exportStudents = () => {
    const headers = ['ID', 'Name', 'Gender', 'Phone', 'Email', 'Course', 'Branch', 'Year', 'Roll Number', 'Building', 'Room', 'Date of Joining', 'Fee Status', 'Monthly Fee'];
    const rows = students.map(s => {
      const room = rooms.find(r => r.id === s.roomId);
      const building = buildings.find(b => b.id === s.buildingId);
      return [
        s.id,
        s.name,
        s.gender,
        s.phone,
        s.email,
        s.course,
        s.branch,
        s.year,
        s.rollNumber,
        building?.name || 'N/A',
        room?.roomNumber || 'Unassigned',
        s.dateOfJoining,
        s.feeStatus,
        s.monthlyFee,
      ];
    });
    downloadCSV(`VMR_Students_Roster_${selectedMonth}.csv`, headers, rows);
  };

  // Export 2: Occupancy
  const exportOccupancy = () => {
    const headers = ['Building', 'Room Number', 'Floor', 'Sharing Type', 'AC', 'Attached Washroom', 'Monthly Rent', 'Total Beds', 'Occupied Beds', 'Available Beds'];
    const rows = rooms.map(rm => {
      const bld = buildings.find(b => b.id === rm.buildingId);
      const occupied = rm.beds.filter(b => b.status === 'occupied').length;
      return [
        bld?.name || 'Main Wing',
        rm.roomNumber,
        rm.floor,
        rm.sharingType,
        rm.hasAC ? 'YES' : 'NO',
        rm.hasAttachedWashroom ? 'YES' : 'NO',
        rm.monthlyRent,
        rm.beds.length,
        occupied,
        rm.beds.length - occupied,
      ];
    });
    downloadCSV(`VMR_Room_Occupancy_${selectedMonth}.csv`, headers, rows);
  };

  // Export 3: Fees
  const exportFees = () => {
    const headers = ['Receipt No', 'Student Name', 'Mobile', 'Month', 'Amount', 'Payment Mode', 'Provider', 'Transaction Reference', 'Date', 'Status'];
    const rows = feeRecords.map(f => {
      const st = students.find(s => s.id === f.studentId);
      return [
        f.receiptNo,
        st?.name || 'Resident',
        st?.phone || '',
        f.month,
        f.amount,
        f.method,
        f.upiProvider || '',
        f.transactionRef || '',
        new Date(f.date).toLocaleDateString('en-IN'),
        f.status,
      ];
    });
    downloadCSV(`VMR_Fee_Receipts_${selectedMonth}.csv`, headers, rows);
  };

  // Export 4: Expenses
  const exportExpenses = () => {
    const headers = ['ID', 'Title', 'Category', 'Date', 'Amount', 'Payment Method', 'Vendor', 'Notes'];
    const rows = expenses.map(e => [
      e.id,
      e.title,
      e.category,
      e.date,
      e.amount,
      e.paymentMethod,
      e.vendor || '',
      e.notes || '',
    ]);
    downloadCSV(`VMR_Operating_Expenses_${selectedMonth}.csv`, headers, rows);
  };

  return (
    <div className="animate-fade-in reports-page">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Executive Reports & Data Export</h1>
          <p className="page-subtitle">
            Generate audited accounting spreadsheets, student master rolls, and occupancy summaries.
          </p>
        </div>
      </div>

      {/* Export Cards Grid */}
      <div className="responsive-grid-4 mb-6">
        {/* Card 1 */}
        <div className="glass-card stat-card report-box">
          <div className="stat-card-title">STUDENT MASTER ROSTER</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '8px 0 16px 0' }}>
            Complete profile directory with room allocations, college info, and parents' mobile numbers.
          </p>
          <button className="btn btn-primary btn-sm w-full" onClick={exportStudents}>
            <Download size={14} /> Download CSV Roster
          </button>
        </div>

        {/* Card 2 */}
        <div className="glass-card stat-card report-box">
          <div className="stat-card-title">ROOM OCCUPANCY MATRIX</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '8px 0 16px 0' }}>
            Wing-by-wing floor plan occupancy, vacant beds, and monthly rental yield breakdown.
          </p>
          <button className="btn btn-primary btn-sm w-full" onClick={exportOccupancy}>
            <Download size={14} /> Download Occupancy CSV
          </button>
        </div>

        {/* Card 3 */}
        <div className="glass-card stat-card report-box">
          <div className="stat-card-title">FEE COLLECTIONS & AUDIT</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '8px 0 16px 0' }}>
            Itemized payment ledger, GST e-receipt references, UPI transaction IDs, and defaulters.
          </p>
          <button className="btn btn-primary btn-sm w-full" onClick={exportFees}>
            <Download size={14} /> Download Fee Ledger
          </button>
        </div>

        {/* Card 4 */}
        <div className="glass-card stat-card report-box">
          <div className="stat-card-title">P&L OPERATING EXPENSES</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '8px 0 16px 0' }}>
            Mess provisions, cook staff salaries, electricity bills, and maintenance expense ledger.
          </p>
          <button className="btn btn-primary btn-sm w-full" onClick={exportExpenses}>
            <Download size={14} /> Download P&L Expenses
          </button>
        </div>
      </div>

      {/* Live Report Preview Table */}
      <div className="glass-card p-4 table-card">
        <div className="table-header-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Table size={18} className="text-primary" />
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Instant Report Data Preview</span>
          </div>

          <div className="tabs-pill-nav">
            <button
              className={`tab-pill-btn ${activeReport === 'students' ? 'active' : ''}`}
              onClick={() => setActiveReport('students')}
            >
              Students ({students.length})
            </button>
            <button
              className={`tab-pill-btn ${activeReport === 'occupancy' ? 'active' : ''}`}
              onClick={() => setActiveReport('occupancy')}
            >
              Rooms ({rooms.length})
            </button>
            <button
              className={`tab-pill-btn ${activeReport === 'fees' ? 'active' : ''}`}
              onClick={() => setActiveReport('fees')}
            >
              Receipts ({feeRecords.length})
            </button>
            <button
              className={`tab-pill-btn ${activeReport === 'expenses' ? 'active' : ''}`}
              onClick={() => setActiveReport('expenses')}
            >
              Expenses ({expenses.length})
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          {activeReport === 'students' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Roll No</th>
                  <th>Course</th>
                  <th>Mobile</th>
                  <th>Parent Contact</th>
                  <th>Monthly Rent</th>
                  <th>Fee Status</th>
                </tr>
              </thead>
              <tbody>
                {students.slice(0, 8).map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.rollNumber || 'N/A'}</td>
                    <td>{s.course}</td>
                    <td>+91 {s.phone}</td>
                    <td>{s.parentName} ({s.parentPhone})</td>
                    <td>₹{s.monthlyFee.toLocaleString('en-IN')}</td>
                    <td>
                      <span className={`badge ${s.feeStatus === 'Paid' ? 'badge-success' : 'badge-warning'}`}>
                        {s.feeStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReport === 'occupancy' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Floor</th>
                  <th>Sharing Type</th>
                  <th>AC Status</th>
                  <th>Monthly Rent</th>
                  <th>Occupied Beds</th>
                  <th>Available</th>
                </tr>
              </thead>
              <tbody>
                {rooms.slice(0, 8).map(r => {
                  const occ = r.beds.filter(b => b.status === 'occupied').length;
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700 }}>Room {r.roomNumber}</td>
                      <td>{r.floor}</td>
                      <td>{r.sharingType}</td>
                      <td>{r.hasAC ? 'Air Conditioned' : 'Non-AC'}</td>
                      <td>₹{r.monthlyRent.toLocaleString('en-IN')}</td>
                      <td>{occ} / {r.beds.length}</td>
                      <td>
                        <span className={`badge ${occ < r.beds.length ? 'badge-success' : 'badge-danger'}`}>
                          {r.beds.length - occ} Vacant
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeReport === 'fees' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Billing Month</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {feeRecords.slice(0, 8).map(f => (
                  <tr key={f.id}>
                    <td><strong className="text-primary">#{f.receiptNo}</strong></td>
                    <td>{f.month}</td>
                    <td style={{ fontWeight: 700, color: '#10b981' }}>₹{f.amount.toLocaleString('en-IN')}</td>
                    <td>{f.method} {f.upiProvider ? `(${f.upiProvider})` : ''}</td>
                    <td>{new Date(f.date).toLocaleDateString('en-IN')}</td>
                    <td><code>{f.transactionRef || 'Cash'}</code></td>
                    <td><span className="badge badge-success">Completed</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReport === 'expenses' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Expense Title</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Payment Mode</th>
                  <th>Vendor</th>
                </tr>
              </thead>
              <tbody>
                {expenses.slice(0, 8).map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600 }}>{e.title}</td>
                    <td><span className="badge badge-outline">{e.category}</span></td>
                    <td>{e.date}</td>
                    <td style={{ fontWeight: 700, color: '#ef4444' }}>₹{e.amount.toLocaleString('en-IN')}</td>
                    <td>{e.paymentMethod}</td>
                    <td>{e.vendor || 'Direct'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
