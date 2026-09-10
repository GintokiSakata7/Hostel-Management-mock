import { useState, useEffect } from 'react';
import { Printer, Search, Calendar, Users, Building, CreditCard, AlertCircle, FileText } from 'lucide-react';
import { useSettings } from '../components/SettingsContext';


const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return { value: `${y}-${m}`, label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
});

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
}

const printTable = (title: string, headers: string[], rows: any[][], subtitle = '', hostelName = 'VMR Hostel') => {
  const win = window.open('', '', 'width=900,height=700');
  if (!win) return;
  win.document.write(`
    <html><head><title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Inter', sans-serif; background: #fff; color: #1a1a1a; padding: 1.5cm; }
      .header { border-bottom: 3px solid #f97316; padding-bottom: 1rem; margin-bottom: 1.5rem; }
      .header h1 { font-size: 1.4rem; font-weight: 800; color: #f97316; }
      .header p { color: #666; font-size: 0.78rem; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
      th { background: #fff7ed; color: #ea580c; font-weight: 700; padding: 8px 10px; text-align: left; border: 1px solid #fed7aa; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px; }
      td { padding: 8px 10px; border: 1px solid #f5f5f5; vertical-align: middle; }
      tr:nth-child(even) td { background: #fafafa; }
      .paid { color: #16a34a; font-weight: 700; }
      .pending { color: #d97706; font-weight: 700; }
      .footer { margin-top: 2rem; font-size: 0.7rem; color: #aaa; text-align: center; border-top: 1px dashed #ddd; padding-top: 0.75rem; }
      @media print { body { padding: 0.5cm; } }
    </style></head><body>
    <div class="header">
      <h1 style="display: flex; align-items: center;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        ${hostelName} — ${title}
      </h1>
      <p>${subtitle || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </div>
    <table>
      <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>
        ${rows.map(row => `<tr>${row.map((cell) => {
          const cls = String(cell) === 'Paid' ? 'paid' : String(cell) === 'Pending' ? 'pending' : '';
          return `<td class="${cls}">${cell ?? '—'}</td>`;
        }).join('')}</tr>`).join('')}
      </tbody>
    </table>
    <div class="footer">${hostelName} Management System · Generated on ${new Date().toLocaleString('en-IN')}</div>
    </body></html>`);
  win.document.close(); win.focus();
  setTimeout(() => { win.print(); }, 600);
};

// ─── STUDENT REPORT ────────────────────────────────────────────────────────────
function StudentReport() {
  const [data, setData] = useState<any[]>([]);
  const { settings } = useSettings();
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetch('/api/reports/students').then(r => r.json()).then(d => { setData(d); setFiltered(d); setLoading(false); });
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(data.filter(s => s.name.toLowerCase().includes(q) || (s.room || '').toLowerCase().includes(q) || (s.course || '').toLowerCase().includes(q)));
  }, [search, data]);

  const handlePrint = () => {
    printTable('Student Report', ['Name', 'Course', 'Branch', 'Year', 'Roll No.', 'Room', 'Bed', 'Phone', 'Admission Date'],
      filtered.map(s => [s.name, s.course, s.branch, s.year, s.rollNumber, s.room, s.bedNumber, s.phone, s.admissionDate]), '', settings?.hostelName || 'VMR Hostel');
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1 }}><Search size={14} color="var(--text-muted)" /><input placeholder="Search student, room, course…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{filtered.length} records</span>
        <button className="primary-btn" onClick={handlePrint}><Printer size={15} /> Print Report</button>
      </div>
      {isMobile ? (
        <div className="mobile-card-list">
          {loading ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</div> :
            filtered.map((s, i) => (
              <div key={i} className="glass" style={{ padding: '1rem', borderRadius: 12, marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{s.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{s.year} Year</div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>{s.course}{s.branch ? ` · ${s.branch}` : ''}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <div style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 8 }}>
                    Room {s.room} {s.bedNumber ? `/ Bed ${s.bedNumber}` : ''}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.phone || '—'}</div>
                </div>
              </div>
            ))
          }
        </div>
      ) : (
        <div className="table-container">
        <div className="table-responsive">
          <table className="custom-table" style={{ width: '100%' }}>
            <thead><tr><th>Name</th><th>Course · Branch</th><th>Year</th><th>Room / Bed</th><th>Phone</th><th>Admitted</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</td></tr>
                : filtered.map((s, i) => (
                  <tr key={i}>
                    <td data-label="Name"><strong>{s.name}</strong></td>
                    <td data-label="Course · Branch">{s.course}{s.branch ? ` · ${s.branch}` : ''}</td>
                    <td data-label="Year">{s.year} Year</td>
                    <td data-label="Room / Bed">{s.room} {s.bedNumber ? `/ Bed ${s.bedNumber}` : ''}</td>
                    <td data-label="Phone" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{s.phone || '—'}</td>
                    <td data-label="Admitted" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{s.admissionDate || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </div>
  );
}

// ─── ROOM OCCUPANCY REPORT ────────────────────────────────────────────────────
function RoomReport() {
  const [data, setData] = useState<any[]>([]);
  const { settings } = useSettings();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetch('/api/reports/rooms').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  const filtered = data.filter(r => r.room.toLowerCase().includes(search.toLowerCase()) || r.building.toLowerCase().includes(search.toLowerCase()));

  const handlePrint = () => {
    printTable('Room Occupancy Report', ['Building', 'Floor', 'Room', 'Capacity', 'Occupied', 'Available', 'Occupancy %'],
      filtered.map(r => [r.building, r.floor, r.room, r.capacity, r.occupied, r.available, `${r.occupancyPct}%`]), '', settings?.hostelName || 'VMR Hostel');
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1 }}><Search size={14} color="var(--text-muted)" /><input placeholder="Search room or building…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{filtered.length} rooms</span>
        <button className="primary-btn" onClick={handlePrint}><Printer size={15} /> Print</button>
      </div>
      {isMobile ? (
        <div className="mobile-card-list">
          {loading ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</div> :
            filtered.map((r, i) => (
              <div key={i} className="glass" style={{ padding: '1rem', borderRadius: 12, marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>Room {r.room}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Floor {r.floor} · {r.building}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <div style={{ fontSize: '0.8rem' }}>
                    <span style={{ color: r.occupied > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{r.occupied}</span> / {r.capacity} Occupied
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>{r.available} Available</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${r.occupancyPct}%`, background: r.occupancyPct === 100 ? 'var(--danger)' : r.occupancyPct > 50 ? 'var(--warning)' : 'var(--success)', borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', minWidth: 35 }}>{r.occupancyPct}%</span>
                </div>
              </div>
            ))
          }
        </div>
      ) : (
        <div className="table-container">
        <div className="table-responsive">
          <table className="custom-table" style={{ width: '100%' }}>
            <thead><tr><th>Building</th><th>Floor</th><th>Room</th><th>Capacity</th><th>Occupied</th><th>Available</th><th>Occupancy</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</td></tr>
                : filtered.map((r, i) => (
                  <tr key={i}>
                    <td data-label="Building">{r.building}</td>
                    <td data-label="Floor">{r.floor}</td>
                    <td data-label="Room"><strong>{r.room}</strong></td>
                    <td data-label="Capacity">{r.capacity}</td>
                    <td data-label="Occupied" style={{ color: r.occupied > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{r.occupied}</td>
                    <td data-label="Available" style={{ color: r.available > 0 ? 'var(--success)' : 'var(--text-muted)' }}>{r.available}</td>
                    <td data-label="Occupancy">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
                          <div style={{ height: '100%', width: `${r.occupancyPct}%`, background: r.occupancyPct === 100 ? 'var(--danger)' : r.occupancyPct > 50 ? 'var(--warning)' : 'var(--success)', borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', minWidth: 35 }}>{r.occupancyPct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </div>
  );
}

// ─── FEE REPORT ───────────────────────────────────────────────────────────────
function FeeReport({ pendingOnly = false }: { pendingOnly?: boolean }) {
  const { settings } = useSettings();
  const monthlyFee = settings?.monthlyFee || 5500;
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0].value);
  const [search, setSearch] = useState('');
  const isMobile = useIsMobile();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/fees?month=${selectedMonth}`).then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, [selectedMonth]);

  const filtered = data.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || (s.room || '').includes(search);
    const matchStatus = pendingOnly ? s.feeStatus === 'Pending' : true;
    return matchSearch && matchStatus;
  });

  const handlePrint = () => {
    const title = pendingOnly ? 'Pending Fee Report' : 'Fee Collection Report';
    const subtitle = `Month: ${MONTHS.find(m => m.value === selectedMonth)?.label}`;
    const hostelName = settings?.hostelName || 'VMR Hostel';
    if (pendingOnly) {
      printTable(title, ['Student', 'Course', 'Room', 'Bed', 'Pending Amount'], filtered.map(s => [s.name, s.course, s.room, s.bedNumber, `₹${monthlyFee}`]), subtitle, hostelName);
    } else {
      printTable(title, ['Student', 'Course', 'Room', 'Bed', 'Amount', 'Status', 'Date', 'Mode', 'Ref ID'],
        filtered.map(s => [s.name, s.course, s.room, s.bedNumber, `₹${s.amount}`, s.feeStatus, s.paymentDate, s.method, s.transactionRef]), subtitle, hostelName);
    }
  };

  const total = filtered.filter(s => s.feeStatus === 'Paid').reduce((sum, s) => sum + s.amount, 0);

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-dim)', borderRadius: 8, padding: '6px 12px' }}>
          <Calendar size={13} color="var(--primary)" />
          <select style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.82rem' }} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="search-bar" style={{ flex: 1 }}><Search size={14} color="var(--text-muted)" /><input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{filtered.length} records</span>
        {!pendingOnly && <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.85rem' }}>₹{total.toLocaleString()} collected</span>}
        <button className="primary-btn" onClick={handlePrint}><Printer size={15} /> Print</button>
      </div>

      {isMobile ? (
        <div className="mobile-card-list">
          {loading ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</div> :
            filtered.map((s, i) => (
              <div key={i} className="glass" style={{ padding: '1rem', borderRadius: 12, marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{s.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{s.course} · Room {s.room}</div>
                  </div>
                  {!pendingOnly ? (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1rem' }}>₹{s.amount?.toLocaleString()}</div>
                      <span className={`fee-status-chip ${s.feeStatus === 'Paid' ? 'fee-paid' : 'fee-pending'}`} style={{ fontSize: '0.68rem', marginTop: 4, display: 'inline-block' }}>{s.feeStatus}</span>
                    </div>
                  ) : (
                    <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '1rem' }}>₹{monthlyFee}</div>
                  )}
                </div>
                {!pendingOnly && s.feeStatus === 'Paid' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.paymentDate}</div>
                    <div style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 8 }}>{s.method}</div>
                  </div>
                )}
              </div>
            ))
          }
        </div>
      ) : (
        <div className="table-container">
        <div className="table-responsive">
          <table className="custom-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Student</th><th>Room / Bed</th>
                {!pendingOnly && <><th>Amount</th><th>Status</th><th>Date</th><th>Mode</th><th>Ref ID</th></>}
                {pendingOnly && <th>Pending Amount</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</td></tr>
                : filtered.map((s, i) => (
                  <tr key={i}>
                    <td data-label="Student">
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>{s.course}</div>
                    </td>
                    <td data-label="Room / Bed">{s.room} {s.bedNumber ? `/ Bed ${s.bedNumber}` : ''}</td>
                    {!pendingOnly && (
                      <>
                        <td data-label="Amount" style={{ fontWeight: 600 }}>₹{s.amount?.toLocaleString()}</td>
                        <td data-label="Status"><span className={`fee-status-chip ${s.feeStatus === 'Paid' ? 'fee-paid' : 'fee-pending'}`} style={{ fontSize: '0.68rem' }}>{s.feeStatus}</span></td>
                        <td data-label="Date" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{s.paymentDate || '—'}</td>
                        <td data-label="Mode" style={{ fontSize: '0.8rem' }}>{s.method || '—'}{s.upiProvider ? ` (${s.upiProvider})` : ''}</td>
                        <td data-label="Ref ID" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{s.transactionRef || '—'}</td>
                      </>
                    )}
                    {pendingOnly && <td data-label="Pending Amount" style={{ fontWeight: 700, color: 'var(--warning)' }}>₹{(monthlyFee).toLocaleString()}</td>}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </div>
  );
}

// ─── COMPLAINT REPORT ─────────────────────────────────────────────────────────
function ComplaintReport() {
  const [data, setData] = useState<any[]>([]);
  const { settings } = useSettings();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetch('/api/reports/complaints').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  const filtered = data.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.student.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handlePrint = () => {
    printTable('Complaint Report', ['Title', 'Student', 'Room', 'Priority', 'Status', 'Date'],
      filtered.map(c => [c.title, c.student, c.room, c.priority, c.status, c.date]), '', settings?.hostelName || 'VMR Hostel');
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1 }}><Search size={14} color="var(--text-muted)" /><input placeholder="Search complaint or student…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select className="custom-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option><option value="pending">Pending</option><option value="in-progress">In Progress</option><option value="resolved">Resolved</option>
        </select>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{filtered.length} records</span>
        <button className="primary-btn" onClick={handlePrint}><Printer size={15} /> Print</button>
      </div>

      {isMobile ? (
        <div className="mobile-card-list">
          {loading ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</div> :
            filtered.map((c, i) => (
              <div key={i} className="glass" style={{ padding: '1rem', borderRadius: 12, marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{c.title}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{c.student} · Room {c.room}</div>
                  </div>
                  <span className={`status-badge badge-${c.status === 'resolved' ? 'available' : c.status === 'in-progress' ? 'partial' : 'full'}`}>{c.status}</span>
                </div>
                {c.description && <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginTop: 2 }}>{c.description.slice(0, 60)}…</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.date}</div>
                  <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: '0.68rem', fontWeight: 700, background: c.priority === 'high' ? 'rgba(239,68,68,0.12)' : c.priority === 'medium' ? 'rgba(234,179,8,0.12)' : 'rgba(34,197,94,0.12)', color: c.priority === 'high' ? 'var(--danger)' : c.priority === 'medium' ? 'var(--warning)' : 'var(--success)' }}>{c.priority}</span>
                </div>
              </div>
            ))
          }
        </div>
      ) : (
        <div className="table-container">
        <div className="table-responsive">
          <table className="custom-table" style={{ width: '100%' }}>
            <thead><tr><th>Complaint</th><th>Student</th><th>Room</th><th>Priority</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</td></tr>
                : filtered.map((c, i) => (
                  <tr key={i}>
                    <td data-label="Complaint"><strong style={{ fontSize: '0.88rem' }}>{c.title}</strong>{c.description && <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginTop: 2 }}>{c.description.slice(0, 60)}…</div>}</td>
                    <td data-label="Student">{c.student}</td>
                    <td data-label="Room">{c.room}</td>
                    <td data-label="Priority"><span style={{ padding: '3px 8px', borderRadius: 12, fontSize: '0.68rem', fontWeight: 700, background: c.priority === 'high' ? 'rgba(239,68,68,0.12)' : c.priority === 'medium' ? 'rgba(234,179,8,0.12)' : 'rgba(34,197,94,0.12)', color: c.priority === 'high' ? 'var(--danger)' : c.priority === 'medium' ? 'var(--warning)' : 'var(--success)' }}>{c.priority}</span></td>
                    <td data-label="Status"><span className={`status-badge badge-${c.status === 'resolved' ? 'available' : c.status === 'in-progress' ? 'partial' : 'full'}`}>{c.status}</span></td>
                    <td data-label="Date" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{c.date}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN REPORTS ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'students', label: 'Students', icon: Users },
  { id: 'rooms', label: 'Room Occupancy', icon: Building },
  { id: 'fees', label: 'Fee Collection', icon: CreditCard },
  { id: 'pending', label: 'Pending Fees', icon: AlertCircle },
  { id: 'complaints', label: 'Complaints', icon: FileText },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('students');

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: '0 0 4px 0' }}>System Reports</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Filter, search, and print structured hostel reports</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: 14, padding: '4px', overflowX: 'auto' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ flex: 1, minWidth: 120, padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s',
              background: activeTab === id ? 'var(--glass-bg)' : 'transparent',
              color: activeTab === id ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: activeTab === id ? '0 2px 8px rgba(0,0,0,0.15)' : 'none' }}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {activeTab === 'students' && <StudentReport />}
        {activeTab === 'rooms' && <RoomReport />}
        {activeTab === 'fees' && <FeeReport />}
        {activeTab === 'pending' && <FeeReport pendingOnly />}
        {activeTab === 'complaints' && <ComplaintReport />}
      </div>
    </div>
  );
}
