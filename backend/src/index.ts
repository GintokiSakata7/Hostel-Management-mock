import dotenv from 'dotenv';
dotenv.config({ override: true });
import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {
  // Ignore in environments where setDefaultResultOrder is unavailable
}
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { initReminderScheduler, executeFeeReminderDispatch, executeSingleStudentReminder, getReminderScheduleSettings, updateReminderScheduleTime } from './services/reminderScheduler';
import { calculateStudentDueStatus, getStudentMonthFeeStatus, computeStudentBillingLedger, getMonthlyFeeForMonth, getOrdinal, formatMonthLabel, getCycleForMonth, toMonthString } from './services/billingHelper';
import { generateFeeReceiptPDFBuffer } from './services/pdfService';
import { sendPaymentReceiptEmail, sendEmail } from './services/emailService';
import { createFinanceRouter } from './routes/financeRoutes';
import { initSettings, readSettings, saveSettings } from './services/settingsService';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const prisma = new PrismaClient();
const financeRouter = createFinanceRouter(prisma);
const invalidateFinanceCache = () => (financeRouter as any).invalidateCache?.();
app.use('/api/finance', financeRouter);

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Health check endpoints for Render & monitoring
app.get('/', (_req, res) => {
  res.json({ success: true, message: 'Majin Hostel Backend API is live & running' });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// File upload endpoint for student photo & Aadhar documents
app.post('/api/upload', express.json({ limit: '20mb' }), (req: any, res: any) => {
  try {
    const { fileName, fileData } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'fileName and fileData are required' });
    }

    const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    if (matches && matches.length === 3) {
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(fileData, 'base64');
    }

    const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(UPLOADS_DIR, safeName);
    fs.writeFileSync(filePath, buffer);

    res.json({ url: `/uploads/${safeName}` });
  } catch (err: any) {
    console.error('File upload error:', err);
    res.status(500).json({ error: err.message || 'File upload failed' });
  }
});


// Helper: get current month string YYYY-MM
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Helper: format month label
const monthLabel = (m?: string | null) => {
  if (!m || typeof m !== 'string') return 'N/A';
  const parts = m.split('-');
  if (parts.length < 2) return m;
  const [y, mo] = parts;
  const date = new Date(Number(y), Number(mo) - 1, 1);
  if (isNaN(date.getTime())) return m;
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

// ─── SETTINGS (PostgreSQL DB backed with in-memory caching) ────────────────────
// Initial background load from DB
initSettings(prisma).catch(e => console.error('[Startup] Failed to load settings from DB:', e));

app.get('/api/settings', (req, res) => {
  const settings = readSettings();
  // Never expose plaintext admin password in generic public settings endpoint
  const safe = { ...settings };
  delete safe.adminPassword;
  res.json({ ...safe, hasAdminPassword: Boolean(settings.adminPassword) });
});

app.put('/api/settings', async (req, res) => {
  try {
    // If request contains adminPassword, do not overwrite unless via dedicated change-password endpoint
    const body = { ...req.body };
    delete body.adminPassword;
    const updated = await saveSettings(prisma, body);
    const safe = { ...updated };
    delete safe.adminPassword;
    res.json(safe);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save settings: ' + err.message });
  }
});

// Admin Password Verification
app.post('/api/admin/verify-password', (req, res) => {
  const { password } = req.body;
  const settings = readSettings();
  const currentPass = settings.adminPassword || 'admin123';
  if (password === currentPass) {
    return res.json({ success: true, adminName: settings.adminName || 'Admin' });
  }
  return res.status(401).json({ success: false, error: 'Incorrect admin password' });
});

// Admin Password Change
app.post('/api/admin/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const settings = readSettings();
  const currentPass = settings.adminPassword || 'admin123';

  if (currentPassword !== currentPass) {
    return res.status(400).json({ success: false, error: 'Current password does not match' });
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 4) {
    return res.status(400).json({ success: false, error: 'New password must be at least 4 characters' });
  }

  try {
    await saveSettings(prisma, { adminPassword: newPassword.trim() });
    console.log('[Admin Auth]: Admin password was updated successfully in DB.');
    return res.json({ success: true, message: 'Admin password updated successfully!' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update admin password: ' + err.message });
  }
});


// ─── POSTGRESQL PDF RECEIPT STREAMING ─────────────────────────────────────────
app.get('/api/fees/receipt/:feeId', async (req, res) => {
  const { feeId } = req.params;
  try {
    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: {
        receipt: true,
        student: { include: { beds: { include: { room: true } } } }
      }
    });

    if (!fee) {
      return res.status(404).json({ error: 'Fee payment record not found' });
    }

    let pdfBuffer: Buffer;
    const receiptNo = fee.receiptNo || 'REC-001';

    // 1. If stored in PostgreSQL Receipt table (pdfData Bytes)
    if (fee.receipt && fee.receipt.pdfData) {
      pdfBuffer = Buffer.from(fee.receipt.pdfData);
    } else {
      // 2. Generate PDF on the fly if not generated yet, and persist to PostgreSQL
      const settings = readSettings();
      const bed = fee.student.beds[0] || null;
      const joinDate = fee.student.dateOfJoining ? new Date(fee.student.dateOfJoining) : new Date();
      const joinDay = joinDate.getDate() || 1;
      const cycle = getCycleForMonth(joinDay, fee.month || currentMonth());

      pdfBuffer = await generateFeeReceiptPDFBuffer({
        receiptNo,
        paymentDate: fee.date ? fee.date.toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
        monthLabel: monthLabel(fee.month),
        cycleLabel: cycle.cycleLabel,
        amount: fee.amount,
        method: fee.method,
        upiProvider: fee.upiProvider,
        transactionRef: fee.transactionRef,
        studentName: fee.student.name,
        studentPhone: fee.student.phone,
        rollNumber: fee.student.rollNumber,
        course: fee.student.course,
        roomName: bed ? bed.room.roomNumber : 'Unallocated',
        bedNumber: bed ? bed.bedNumber : null,
        hostelName: settings.hostelName,
        hostelPhone: settings.hostelPhone,
        hostelEmail: settings.hostelEmail,
        hostelAddress: settings.hostelAddress
      });

      // Save to PostgreSQL Receipt table
      await prisma.receipt.upsert({
        where: { feeId: fee.id },
        update: { pdfData: pdfBuffer },
        create: {
          feeId: fee.id,
          receiptNo,
          fileName: `Receipt_${receiptNo}.pdf`,
          mimeType: 'application/pdf',
          pdfData: pdfBuffer
        }
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Receipt_${receiptNo}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Failed to retrieve PDF receipt:', err.message);
    res.status(500).json({ error: 'Failed to generate PDF receipt: ' + err.message });
  }
});



// Helper: validate and resolve buildingId filter against DB
async function resolveBuildingId(buildingId?: string): Promise<string | undefined> {
  if (!buildingId || buildingId === 'all') return undefined;
  const exists = await prisma.building.findUnique({ where: { id: buildingId } });
  return exists ? buildingId : undefined;
}

// ─── DASHBOARD STATS (parallelized — all queries fire simultaneously) ─────────
app.get('/api/stats', async (req, res) => {
  const { buildingId } = req.query as { buildingId?: string };
  const effectiveBuildingId = await resolveBuildingId(buildingId);
  const isBuildingFiltered = !!effectiveBuildingId;

  // Only active students count for stats
  const studentWhere: any = {
    status: 'Active',
    ...(isBuildingFiltered ? {
      OR: [
        { beds: { some: { room: { buildingId: effectiveBuildingId } } } },
        { beds: { none: {} } }
      ]
    } : {})
  };
  const roomWhere: any = isBuildingFiltered ? { buildingId: effectiveBuildingId } : {};
  const bedWhere: any = isBuildingFiltered ? { room: { buildingId: effectiveBuildingId } } : {};
  const occupiedBedWhere: any = isBuildingFiltered ? { status: 'occupied', room: { buildingId: effectiveBuildingId } } : { status: 'occupied' };
  const complaintWhere: any = isBuildingFiltered
    ? {
        status: { in: ['pending', 'in-progress'] },
        student: {
          OR: [
            { beds: { some: { room: { buildingId: effectiveBuildingId } } } },
            { beds: { none: {} } }
          ]
        }
      }
    : { status: { in: ['pending', 'in-progress'] } };
  const cm = currentMonth();
  const feeWhere: any = isBuildingFiltered
    ? {
        month: cm,
        status: 'Completed',
        student: {
          status: 'Active',
          OR: [
            { beds: { some: { room: { buildingId: effectiveBuildingId } } } },
            { beds: { none: {} } }
          ]
        }
      }
    : { month: cm, status: 'Completed', student: { status: 'Active' } };

  const settings = readSettings();
  const monthlyFee = Number(settings.monthlyFee) || 6000;

  const [
    totalStudents,
    totalRooms,
    totalBeds,
    occupiedBeds,
    activeComplaints,
    monthlyCollection
  ] = await Promise.all([
    prisma.student.count({ where: studentWhere }),
    prisma.room.count({ where: roomWhere }),
    prisma.bed.count({ where: bedWhere }),
    prisma.bed.count({ where: occupiedBedWhere }),
    prisma.complaint.count({ where: complaintWhere }),
    prisma.fee.aggregate({ where: feeWhere, _sum: { amount: true } })
  ]);

  // Dynamic pending fees: count only active students who have at least 1 overdue month right now
  const now = new Date();
  const activeStudentsForPending = await prisma.student.findMany({
    where: studentWhere,
    include: {
      beds: { include: { room: { include: { building: true } } } },
      fees: true
    }
  });
  const pendingFees = activeStudentsForPending.filter(s => {
    const dueStatus = calculateStudentDueStatus(s, monthlyFee, now);
    return dueStatus.pendingMonthsCount > 0;
  }).length;

  res.json({
    totalStudents,
    totalRooms,
    occupiedBeds,
    availableBeds: totalBeds - occupiedBeds,
    activeComplaints,
    pendingFees,
    monthlyCollection: monthlyCollection._sum.amount || 0
  });
});

app.get('/api/activities', async (req, res) => {
  const { buildingId } = req.query as { buildingId?: string };
  const effectiveBuildingId = await resolveBuildingId(buildingId);
  const filterByBuilding = !!effectiveBuildingId;
  const studentWhere: any = filterByBuilding
    ? {
        student: {
          OR: [
            { beds: { some: { room: { buildingId: effectiveBuildingId } } } },
            { beds: { none: {} } }
          ]
        }
      }
    : {};

  try {
    const [recentFees, recentComplaints] = await Promise.all([
      prisma.fee.findMany({
        where: { ...studentWhere, status: 'Completed' },
        take: 4,
        orderBy: { date: 'desc' },
        include: { student: true }
      }),
      prisma.complaint.findMany({
        where: studentWhere,
        take: 4,
        orderBy: { date: 'desc' },
        include: { student: { include: { beds: { include: { room: true } } } } }
      })
    ]);

    const feeActivities = recentFees.map(f => ({
      id: f.id,
      action: 'Fee Payment Received',
      details: `₹${f.amount.toLocaleString('en-IN')} from ${f.student.name} (${monthLabel(f.month)})`,
      time: f.date ? f.date.toLocaleDateString('en-IN') : 'Recently',
      rawDate: f.date ? f.date.toISOString() : new Date().toISOString(),
      type: 'fee'
    }));

    const complaintActivities = recentComplaints.map(c => {
      const roomNum = c.student?.beds?.[0]?.room?.roomNumber;
      return {
        id: c.id,
        action: `Complaint: ${c.title}`,
        details: `${c.student?.name || 'Resident'}${roomNum ? ` · Room ${roomNum}` : ''} · [${c.status.toUpperCase()}]`,
        time: c.date ? c.date.toLocaleDateString('en-IN') : 'Recently',
        rawDate: c.date ? c.date.toISOString() : new Date().toISOString(),
        type: 'complaint',
        status: c.status
      };
    });

    const combined = [...feeActivities, ...complaintActivities]
      .sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime())
      .slice(0, 6);

    res.json(combined);
  } catch (err: any) {
    console.error('Error fetching activities:', err);
    res.json([]);
  }
});

// ─── STUDENTS (optimized — scoped fee queries, computed due status uses settings) ─
app.get('/api/students', async (req, res) => {
  const { month, buildingId } = req.query as { month?: string; buildingId?: string };
  const m = month || currentMonth();
  const settings = readSettings();
  const monthlyFee = Number(settings.monthlyFee) || 6000;

  const effectiveBuildingId = await resolveBuildingId(buildingId);
  const studentWhere: any = effectiveBuildingId
    ? {
        OR: [
          { beds: { some: { room: { buildingId: effectiveBuildingId } } } },
          { beds: { none: {} } }
        ]
      }
    : {};

  const students = await prisma.student.findMany({
    where: studentWhere,
    include: {
      beds: { include: { room: { include: { building: true } } } },
      fees: { where: { status: 'Completed' } }
    }
  });

  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  const nowDay = now.getDate();

  const [qYear, qMonth] = m.split('-').map(Number);

  const formatted = students.map(s => {
    // Get fee record for specified month
    const feeRecord = s.fees.find(f => f.month === m);
    const bed = s.beds.length > 0 ? s.beds[0] : null;
    const dueStatus = calculateStudentDueStatus(s, monthlyFee, now);
    const monthStatus = getStudentMonthFeeStatus(s, m, now, monthlyFee);

    const sJoinDate = s.dateOfJoining ? new Date(s.dateOfJoining) : new Date();
    const joiningMonthLabel = sJoinDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    const dateOfJoiningFormatted = sJoinDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const isBeforeJoining = monthStatus.status === 'Not Enrolled';
    const feeStatus = isBeforeJoining
      ? 'Not Enrolled'
      : (dueStatus.totalPendingAmount > 0 ? 'Pending' : monthStatus.status);

    return {
      id: s.id,
      dbId: s.id,
      name: s.name,
      gender: s.gender,
      dob: s.dob,
      email: s.email,
      photoUrl: s.photoUrl,
      course: s.course,
      branch: s.branch,
      year: s.year,
      rollNumber: s.rollNumber,
      dateOfJoining: s.dateOfJoining,
      dateOfJoiningFormatted,
      joiningMonthLabel,
      isBeforeJoining,
      dueDayOfMonth: dueStatus.dueDayOfMonth,
      dueDayLabel: dueStatus.dueDayLabel,
      nextDueDate: dueStatus.nextDueDate,
      pendingMonthsCount: isBeforeJoining ? 0 : dueStatus.pendingMonthsCount,
      pendingMonths: isBeforeJoining ? [] : dueStatus.pendingMonths,
      totalPendingAmount: isBeforeJoining ? 0 : dueStatus.totalPendingAmount,
      aadhar: s.aadhar,
      aadharCardUrl: (s as any).aadharCardUrl || null,
      phone: s.phone,
      parentName: s.parentName,
      parentPhone: s.parentPhone,
      parentRelationship: s.parentRelationship,
      parentAltPhone: s.parentAltPhone,
      parentAddress: s.parentAddress,
      emergencyName: s.emergencyName,
      emergencyPhone: s.emergencyPhone,
      emergencyRelationship: s.emergencyRelationship,
      state: s.state,
      address: s.address,
      pincode: s.pincode,
      securityDeposit: s.securityDeposit,
      status: s.status,
      // Notice Period / Departure details
      isOnNotice: (s as any).isOnNotice || false,
      noticeVacateDate: (s as any).noticeVacateDate ? (s as any).noticeVacateDate.toISOString().split('T')[0] : null,
      noticeReason: (s as any).noticeReason || null,
      // Month-specific fee status
      feeStatus,
      cycleLabel: monthStatus.cycleLabel,
      hasArrears: dueStatus.pendingMonthsCount > 0,
      feeRecord: feeRecord || null,
      // Legacy overall field
      overallFeeStatus: s.feeStatus,
      room: bed ? bed.room.roomNumber : 'Unallocated',
      building: bed ? bed.room.building?.name : null,
      bedNumber: bed ? bed.bedNumber : null,
      bedId: bed ? bed.id : null,
      roomDbId: bed ? bed.room.id : null,
      // Full fee history (only completed payments)
      fees: s.fees.map(f => ({
        id: f.id,
        month: f.month,
        monthLabel: monthLabel(f.month),
        amount: f.amount,
        date: f.date.toISOString().split('T')[0],
        method: f.method,
        upiProvider: f.upiProvider,
        transactionRef: f.transactionRef,
        status: f.status
      }))
    };
  });

  // Sort: Pending students to top, ordered by highest pending months count desc, then Upcoming, Paid, Not Enrolled
  const statusPriority: Record<string, number> = { Pending: 0, Upcoming: 1, Paid: 2, 'Not Enrolled': 3 };
  formatted.sort((a, b) => {
    const diff = (statusPriority[a.feeStatus] ?? 99) - (statusPriority[b.feeStatus] ?? 99);
    if (diff !== 0) return diff;
    if (b.pendingMonthsCount !== a.pendingMonthsCount) {
      return b.pendingMonthsCount - a.pendingMonthsCount;
    }
    return a.name.localeCompare(b.name);
  });

  res.json(formatted);
});

app.post('/api/students', async (req, res) => {
  try {
    const {
      name, gender, dob, email, photoUrl,
      course, branch, year, rollNumber,
      dateOfJoining, aadhar, aadharCardUrl, phone,
      parentName, parentPhone, parentRelationship, parentAltPhone, parentAddress,
      emergencyName, emergencyPhone, emergencyRelationship,
      state, address, pincode, securityDeposit, feeStatus, status,
      isOnNotice, noticeVacateDate, noticeReason
    } = req.body;
    const student = await prisma.student.create({
      data: {
        name, gender, dob: dob ? new Date(dob) : undefined, email, photoUrl,
        course, branch, year, rollNumber,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : undefined,
        aadhar, aadharCardUrl, phone,
        parentName, parentPhone, parentRelationship, parentAltPhone, parentAddress,
        emergencyName, emergencyPhone, emergencyRelationship,
        state, address, pincode,
        securityDeposit: securityDeposit ? Number(securityDeposit) : undefined,
        feeStatus: feeStatus || 'Pending',
        status: status || 'Active',
        isOnNotice: Boolean(isOnNotice),
        noticeVacateDate: noticeVacateDate ? new Date(noticeVacateDate) : undefined,
        noticeReason: noticeReason || undefined
      } as any
    });
    res.json(student);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, gender, dob, email, photoUrl,
      course, branch, year, rollNumber,
      dateOfJoining, aadhar, aadharCardUrl, phone,
      parentName, parentPhone, parentRelationship, parentAltPhone, parentAddress,
      emergencyName, emergencyPhone, emergencyRelationship,
      state, address, pincode, securityDeposit, feeStatus, status,
      isOnNotice, noticeVacateDate, noticeReason
    } = req.body;
    const student = await prisma.student.update({
      where: { id },
      data: {
        name, gender, dob: dob ? new Date(dob) : undefined, email, photoUrl,
        course, branch, year, rollNumber,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : undefined,
        aadhar, aadharCardUrl, phone,
        parentName, parentPhone, parentRelationship, parentAltPhone, parentAddress,
        emergencyName, emergencyPhone, emergencyRelationship,
        state, address, pincode,
        securityDeposit: securityDeposit ? Number(securityDeposit) : undefined,
        feeStatus, status,
        isOnNotice: Boolean(isOnNotice),
        noticeVacateDate: noticeVacateDate ? new Date(noticeVacateDate) : null,
        noticeReason: noticeReason || null
      } as any
    });
    res.json(student);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/students/:id/notice', async (req, res) => {
  try {
    const { id } = req.params;
    const { isOnNotice, noticeVacateDate, noticeReason } = req.body;
    const student = await prisma.student.update({
      where: { id },
      data: {
        isOnNotice: Boolean(isOnNotice),
        noticeVacateDate: noticeVacateDate ? new Date(noticeVacateDate) : null,
        noticeReason: noticeReason || null
      } as any
    });
    res.json(student);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/students/:id/vacate', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.bed.updateMany({
      where: { studentId: id },
      data: { studentId: null, status: 'available' }
    });
    const student = await prisma.student.update({
      where: { id },
      data: {
        status: 'Vacated',
        isOnNotice: false
      }
    });
    res.json({ success: true, student });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/students/:id/readmit', async (req, res) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.update({
      where: { id },
      data: {
        status: 'Active'
      }
    });
    res.json({ success: true, student });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({ where: { id } });
    if (student) {
      if (student.photoUrl && student.photoUrl.startsWith('/uploads/')) {
        const p = path.join(UPLOADS_DIR, path.basename(student.photoUrl));
        if (fs.existsSync(p)) {
          try { fs.unlinkSync(p); } catch (e) { console.error('Error unlinking photo:', e); }
        }
      }
      if (student.aadharCardUrl && student.aadharCardUrl.startsWith('/uploads/')) {
        const p = path.join(UPLOADS_DIR, path.basename(student.aadharCardUrl));
        if (fs.existsSync(p)) {
          try { fs.unlinkSync(p); } catch (e) { console.error('Error unlinking Aadhaar document:', e); }
        }
      }
    }
    await prisma.fee.deleteMany({ where: { studentId: id } });
    await prisma.complaint.deleteMany({ where: { studentId: id } });
    await prisma.bed.updateMany({ where: { studentId: id }, data: { studentId: null, status: 'available' } });
    await prisma.student.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Lightweight student list for dropdowns (allocation modal etc.) — avoids loading fees/full data
app.get('/api/students/names', async (req, res) => {
  const students = await prisma.student.findMany({
    select: {
      id: true,
      name: true,
      beds: { select: { room: { select: { roomNumber: true } } }, take: 1 }
    },
    orderBy: { name: 'asc' }
  });
  res.json(students.map(s => ({
    id: s.id,
    name: s.name,
    room: s.beds.length > 0 ? s.beds[0].room.roomNumber : 'Unallocated'
  })));
});

// ─── ROOMS & BUILDINGS ─────────────────────────────────────────────────────
app.get('/api/buildings', async (req, res) => {
  const buildings = await prisma.building.findMany({
    include: { rooms: { include: { beds: true } } }
  });
  const formatted = buildings.map(b => {
    let totalBeds = 0, availableBeds = 0;
    b.rooms.forEach(r => {
      totalBeds += r.beds.length;
      availableBeds += r.beds.filter(bed => bed.status === 'available').length;
    });
    return { id: b.id, name: b.name, totalRooms: b.rooms.length, totalBeds, availableBeds };
  });
  res.json(formatted);
});

app.post('/api/buildings', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Building name is required' });
    const building = await prisma.building.create({
      data: { name: name.trim() }
    });
    res.json(building);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/buildings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Building name is required' });
    const building = await prisma.building.update({
      where: { id },
      data: { name: name.trim() }
    });
    res.json(building);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new room with specified bed capacity
app.post('/api/rooms', async (req, res) => {
  try {
    const { buildingId, floor, roomNumber, capacity } = req.body;
    if (!buildingId || !floor || !roomNumber || !capacity) {
      return res.status(400).json({ error: 'buildingId, floor, roomNumber, and capacity are required' });
    }

    // Check if room number already exists
    const existing = await prisma.room.findFirst({
      where: { roomNumber: String(roomNumber).trim() }
    });
    if (existing) {
      return res.status(400).json({ error: `Room number ${roomNumber} already exists.` });
    }

    const capNum = Math.max(1, Number(capacity));

    const room = await prisma.room.create({
      data: {
        buildingId,
        floor: String(floor).trim(),
        roomNumber: String(roomNumber).trim(),
        beds: {
          create: Array.from({ length: capNum }, (_, i) => ({
            bedNumber: i + 1,
            status: 'available'
          }))
        }
      },
      include: { beds: true }
    });

    res.json(room);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update room details (floor, room number, capacity)
app.put('/api/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { floor, roomNumber, capacity } = req.body;

    const room = await prisma.room.findUnique({
      where: { id },
      include: { beds: true }
    });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const newCap = capacity ? Math.max(1, Number(capacity)) : room.beds.length;
    const currentCap = room.beds.length;

    if (newCap > currentCap) {
      // Add new beds
      const newBedsData = Array.from({ length: newCap - currentCap }, (_, i) => ({
        roomId: room.id,
        bedNumber: currentCap + i + 1,
        status: 'available'
      }));
      await prisma.bed.createMany({ data: newBedsData });
    } else if (newCap < currentCap) {
      // Remove excess available beds
      const availableBeds = room.beds.filter(b => b.status === 'available');
      const neededRemovals = currentCap - newCap;

      if (availableBeds.length < neededRemovals) {
        return res.status(400).json({
          error: `Cannot reduce room capacity to ${newCap}. Room has occupied beds that cannot be removed.`
        });
      }

      const bedIdsToRemove = availableBeds.slice(0, neededRemovals).map(b => b.id);
      await prisma.bed.deleteMany({
        where: { id: { in: bedIdsToRemove } }
      });
    }

    const updated = await prisma.room.update({
      where: { id },
      data: {
        floor: floor ? String(floor).trim() : undefined,
        roomNumber: roomNumber ? String(roomNumber).trim() : undefined
      },
      include: { beds: true }
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete room (only if no occupied beds)
app.delete('/api/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const room = await prisma.room.findUnique({
      where: { id },
      include: { beds: true }
    });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const occupiedCount = room.beds.filter(b => b.status === 'occupied').length;
    if (occupiedCount > 0) {
      return res.status(400).json({
        error: `Cannot delete Room ${room.roomNumber}. It currently has ${occupiedCount} active resident(s). Please vacate them first.`
      });
    }

    await prisma.bed.deleteMany({ where: { roomId: id } });
    await prisma.room.delete({ where: { id } });

    res.json({ success: true, message: `Room ${room.roomNumber} deleted successfully` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rooms/:buildingId', async (req, res) => {
  const { buildingId } = req.params;
  const { month } = req.query as { month?: string };
  const m = month || currentMonth();

  const effectiveBuildingId = await resolveBuildingId(buildingId);
  const whereClause = effectiveBuildingId ? { buildingId: effectiveBuildingId } : {};

  const rooms = await prisma.room.findMany({
    where: whereClause,
    include: {
      building: true,
      beds: {
        include: {
          student: { include: { fees: true } }
        }
      }
    },
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }]
  });

  const settings = readSettings();
  const monthlyFee = Number(settings.monthlyFee) || 6000;
  const now = new Date();

  const formatted = rooms.map(r => {
    const sortedBeds = [...r.beds].sort((a, b) => a.bedNumber - b.bedNumber);
    const occupied = r.beds.filter(b => b.status === 'occupied').length;
    return {
      id: r.roomNumber,
      dbId: r.id,
      floor: r.floor,
      capacity: r.beds.length,
      occupied,
      status: occupied === r.beds.length ? 'full' : occupied === 0 ? 'available' : 'partial',
      beds: sortedBeds.map((b, idx) => {
        if (!b.student) {
          return {
            id: b.id,
            bedIndex: idx + 1,
            status: b.status,
            student: null,
            studentDbId: null,
            feeStatus: null,
            studentObj: null
          };
        }
        // Use unified billing helper for accurate fee status
        const monthStatus = getStudentMonthFeeStatus(b.student, m, now, monthlyFee);
        const dueStatus = calculateStudentDueStatus(b.student, monthlyFee, now);
        const feeRecord = b.student?.fees?.find(f => f.month === m && f.status === 'Completed') || null;
        return {
          id: b.id,
          bedIndex: idx + 1,
          status: b.status,
          student: b.student.name,
          studentDbId: b.student.id,
          feeStatus: monthStatus.status,
          cycleLabel: monthStatus.cycleLabel,
          dueDayLabel: monthStatus.cycleDueDay ? `${monthStatus.cycleDueDay}th` : null,
          hasArrears: monthStatus.hasAccumulatedArrears,
          arrearsCount: monthStatus.pendingMonthsCount,
          totalPendingAmount: dueStatus.totalPendingAmount,
          pendingMonths: dueStatus.pendingMonths,
          studentObj: {
            dbId: b.student.id,
            name: b.student.name,
            course: b.student.course,
            branch: b.student.branch,
            phone: b.student.phone,
            parentName: b.student.parentName,
            feeStatus: monthStatus.status,
            cycleLabel: monthStatus.cycleLabel,
            feeRecord: feeRecord,
            totalPendingAmount: dueStatus.totalPendingAmount,
            amountDue: monthStatus.amountDue,
            pendingMonths: dueStatus.pendingMonths,
            pendingMonthsCount: dueStatus.pendingMonthsCount
          }
        };
      })
    };
  });
  res.json(formatted);
});

app.post('/api/beds/allocate', async (req, res) => {
  const { bedId, studentName, studentId } = req.body;
  let student = null;
  if (studentName) {
    student = await prisma.student.findFirst({
      where: { name: { contains: studentName, mode: 'insensitive' } }
    });
  } else if (studentId) {
    student = await prisma.student.findUnique({ where: { id: studentId } });
  }
  if (!student) return res.status(404).json({ error: 'Student not found. Please check the name and try again.' });

  // Check if student is ALREADY allocated to another room/bed
  const existingBed = await prisma.bed.findFirst({
    where: { studentId: student.id },
    include: { room: true }
  });

  if (existingBed) {
    // If the student is already in the target bed, allow idempotent update
    if (existingBed.id === bedId) {
      return res.json({ ...existingBed, studentName: student.name });
    }
    return res.status(400).json({
      error: `${student.name} is already allocated to Room ${existingBed.room.roomNumber}. Please de-allocate / vacate ${student.name} from Room ${existingBed.room.roomNumber} first before allocating to a new room.`
    });
  }

  const bed = await prisma.bed.update({
    where: { id: bedId },
    data: { status: 'occupied', studentId: student.id }
  });
  res.json({ ...bed, studentName: student.name });
});

app.delete('/api/beds/:bedId/vacate', async (req, res) => {
  const { bedId } = req.params;
  const bed = await prisma.bed.update({
    where: { id: bedId },
    data: { studentId: null, status: 'available' }
  });
  res.json(bed);
});

app.post('/api/beds/deallocate', async (req, res) => {
  try {
    const { bedId } = req.body;
    if (!bedId) return res.status(400).json({ error: 'bedId is required' });
    const bed = await prisma.bed.findUnique({ where: { id: bedId }, include: { student: true, room: true } });
    if (!bed) return res.status(404).json({ error: 'Bed not found' });
    const studentName = bed.student?.name;
    const roomNumber = bed.room?.roomNumber;
    await prisma.bed.update({
      where: { id: bedId },
      data: { studentId: null, status: 'available' }
    });
    res.json({ success: true, message: `Deallocated ${studentName || 'resident'} from Room ${roomNumber}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/beds/transfer', async (req, res) => {
  try {
    const { sourceBedId, targetBedId } = req.body;
    if (!sourceBedId || !targetBedId) {
      return res.status(400).json({ error: 'sourceBedId and targetBedId are required' });
    }
    if (sourceBedId === targetBedId) {
      return res.status(400).json({ error: 'Source and target bed are the same' });
    }

    const sourceBed = await prisma.bed.findUnique({ where: { id: sourceBedId }, include: { room: true, student: true } });
    const targetBed = await prisma.bed.findUnique({ where: { id: targetBedId }, include: { room: true, student: true } });

    if (!sourceBed || !sourceBed.studentId) {
      return res.status(400).json({ error: 'Source bed has no resident to move' });
    }
    if (!targetBed) {
      return res.status(404).json({ error: 'Target bed not found' });
    }

    const sourceStudentName = sourceBed.student?.name || 'Resident';
    const sourceRoomNum = sourceBed.room.roomNumber;
    const targetRoomNum = targetBed.room.roomNumber;

    if (targetBed.status === 'occupied') {
      const targetStudentId = targetBed.studentId;
      const targetStudentName = targetBed.student?.name || 'Resident';
      await prisma.$transaction([
        prisma.bed.update({ where: { id: sourceBedId }, data: { studentId: targetStudentId, status: 'occupied' } }),
        prisma.bed.update({ where: { id: targetBedId }, data: { studentId: sourceBed.studentId, status: 'occupied' } })
      ]);
      return res.json({
        success: true,
        message: `Swapped ${sourceStudentName} (Room ${sourceRoomNum}) with ${targetStudentName} (Room ${targetRoomNum})`
      });
    } else {
      await prisma.$transaction([
        prisma.bed.update({ where: { id: sourceBedId }, data: { studentId: null, status: 'available' } }),
        prisma.bed.update({ where: { id: targetBedId }, data: { studentId: sourceBed.studentId, status: 'occupied' } })
      ]);
      return res.json({
        success: true,
        message: `Moved ${sourceStudentName} to Room ${targetRoomNum} (Bed ${targetBed.bedNumber})`
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── FEES ─────────────────────────────────────────────────────────────────────
// Record a payment (with duplicate-month check)
app.post('/api/fees/pay', async (req, res) => {
  const { studentId, amount, method, upiProvider, transactionRef, date, month } = req.body;
  const m = month || currentMonth();
  const settings = readSettings();
  const standardFeeForMonth = getMonthlyFeeForMonth(m, settings);
  const finalAmount = (amount !== undefined && amount !== null && !isNaN(Number(amount)) && Number(amount) > 0)
    ? Number(amount)
    : standardFeeForMonth;
  try {
    // Check student and calculate ledger before payment
    const studentBefore = await prisma.student.findUnique({
      where: { id: studentId },
      include: { beds: { include: { room: { include: { building: true } } } }, fees: true }
    });
    if (!studentBefore) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const ledgerBefore = computeStudentBillingLedger(studentBefore, undefined, new Date());
    const existing = await prisma.fee.findFirst({ where: { studentId, month: m } });

    // Block payment only if the student has NO outstanding dues at all AND month m was already completed
    if (existing && existing.status === 'Completed' && ledgerBefore.totalRemainingDue === 0) {
      return res.status(409).json({
        error: `Fee for ${monthLabel(m)} has already been paid and all outstanding dues are cleared.`,
        existing
      });
    }

    let fee;
    // Generate a static receipt number YYMM-XXX based on the fee's month (e.g. 2609-001)
    const prefix = m.substring(2, 4) + m.substring(5, 7); // "2026-09" -> "2609"
    
    // Find the latest receipt in this month to increment
    const lastFee = await prisma.fee.findFirst({
      where: { receiptNo: { startsWith: prefix } },
      orderBy: { receiptNo: 'desc' }
    });
    let nextNum = 1;
    if (lastFee && lastFee.receiptNo) {
      const parts = lastFee.receiptNo.split('-');
      if (parts.length === 2) nextNum = parseInt(parts[1], 10) + 1;
    }
    const generatedReceiptNo = `${prefix}-${nextNum.toString().padStart(3, '0')}`;

    if (existing && existing.status === 'Pending') {
      fee = await prisma.fee.update({
        where: { id: existing.id },
        data: {
          amount: finalAmount,
          method,
          upiProvider: upiProvider || null,
          transactionRef: transactionRef || null,
          status: 'Completed',
          date: date ? new Date(date) : new Date(),
          receiptNo: (existing as any).receiptNo || generatedReceiptNo
        } as any
      });
    } else {
      fee = await prisma.fee.create({
        data: {
          studentId,
          month: m,
          amount: finalAmount,
          method,
          upiProvider: upiProvider || null,
          transactionRef: transactionRef || null,
          status: 'Completed',
          date: date ? new Date(date) : new Date(),
          receiptNo: generatedReceiptNo
        } as any
      });
    }

    // Recompute and sync Student.feeStatus after payment using unified ledger
    const updatedForStatus = await prisma.student.findUnique({
      where: { id: studentId },
      include: { beds: { include: { room: { include: { building: true } } } }, fees: true }
    });
    let updatedLedger = ledgerBefore;
    if (updatedForStatus) {
      updatedLedger = computeStudentBillingLedger(updatedForStatus, undefined, new Date());
      await prisma.student.update({
        where: { id: studentId },
        data: { feeStatus: updatedLedger.totalRemainingDue === 0 ? 'Paid' : 'Pending' }
      });
    }
    // Bust finance summary cache so Finance page reflects updated totals immediately
    invalidateFinanceCache();

    // Fetch full student & room info for PDF & WhatsApp dispatch
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { beds: { include: { room: true } } }
    });

    if (student) {
      const settings = readSettings();
      const bed = student.beds[0] || null;
      const receiptNo = fee.receiptNo || generatedReceiptNo;
      const formattedDate = fee.date ? fee.date.toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
      const label = monthLabel(m);
      const joinDate = student.dateOfJoining ? new Date(student.dateOfJoining) : new Date();
      const joinDay = joinDate.getDate() || 1;
      const cycle = getCycleForMonth(joinDay, m);

      // 1. Generate PDF Receipt Buffer
      try {
        const pdfBuffer = await generateFeeReceiptPDFBuffer({
          receiptNo,
          paymentDate: formattedDate,
          monthLabel: label,
          cycleLabel: cycle.cycleLabel,
          amount: finalAmount,
          remainingBalance: updatedLedger.totalRemainingDue,
          method,
          upiProvider: upiProvider || null,
          transactionRef: transactionRef || null,
          studentName: student.name,
          studentPhone: student.phone,
          rollNumber: student.rollNumber,
          course: student.course,
          roomName: bed ? bed.room.roomNumber : 'Unallocated',
          bedNumber: bed ? bed.bedNumber : null,
          hostelName: settings.hostelName,
          hostelPhone: settings.hostelPhone,
          hostelEmail: settings.hostelEmail,
          hostelAddress: settings.hostelAddress
        });

        // 2. Store binary PDF in PostgreSQL Receipt table (pdfData Bytes)
        await prisma.receipt.upsert({
          where: { feeId: fee.id },
          update: { pdfData: pdfBuffer },
          create: {
            feeId: fee.id,
            receiptNo,
            fileName: `Receipt_${receiptNo}.pdf`,
            mimeType: 'application/pdf',
            pdfData: pdfBuffer
          }
        });
        console.log(`[PostgreSQL Bucket]: PDF Receipt ${receiptNo} stored in database for Fee ${fee.id}`);

        let lastEmailSuccess: boolean | null = null;
        let lastEmailError: string | null = null;

        // 3. Dispatch Detailed Invoice & PDF Receipt via Email
        if (student.name) {
          const targetEmails = new Set<string>();
          // Testing / Admin recipient verified for notifications
          targetEmails.add('rishivardhan165@gmail.com');
          if (student.email && student.email.trim().includes('@')) {
            targetEmails.add(student.email.trim());
          }

          for (const emailTo of targetEmails) {
            const emailRes = await sendPaymentReceiptEmail({
              to: emailTo,
              studentName: student.name,
              studentPhone: student.phone,
              rollNumber: student.rollNumber,
              roomName: bed ? bed.room.roomNumber : 'Unallocated',
              bedNumber: bed ? bed.bedNumber : null,
              receiptNo,
              amount: finalAmount,
              remainingBalance: updatedLedger.totalRemainingDue,
              monthLabel: label,
              paymentDate: formattedDate,
              method,
              upiProvider: upiProvider || null,
              transactionRef: transactionRef || null,
              hostelName: settings.hostelName,
              hostelPhone: settings.hostelPhone,
              hostelEmail: settings.hostelEmail,
              hostelAddress: settings.hostelAddress,
              fileName: `Receipt_${receiptNo}.pdf`,
              pdfBuffer
            });

            if (emailRes.success) {
              lastEmailSuccess = true;
              await prisma.fee.update({
                where: { id: fee.id },
                data: { whatsappStatus: 'SENT_EMAIL' }
              });
              console.log(`[Email Dispatch]: Fee ${fee.id} detailed receipt & invoice sent successfully to ${emailTo}`);
            } else {
              lastEmailSuccess = false;
              lastEmailError = emailRes.error || 'Failed to dispatch email';
              await prisma.fee.update({
                where: { id: fee.id },
                data: { whatsappStatus: 'FAILED_EMAIL' }
              });
              console.warn(`[Email Dispatch Warning]: Fee ${fee.id} email delivery failed to ${emailTo}: ${emailRes.error}`);
            }
          }
        }

        return res.json({
          ...fee,
          monthLabel: monthLabel(m),
          totalRemainingDue: updatedLedger.totalRemainingDue,
          pendingMonthsCount: updatedLedger.pendingCycles.length,
          advanceCredit: updatedLedger.advanceCredit,
          emailStatus: lastEmailSuccess === true ? 'SENT' : (lastEmailSuccess === false ? 'FAILED' : 'SKIPPED'),
          emailError: lastEmailError || undefined
        });

      } catch (pdfErr: any) {
        console.error('[PDF Generation / Dispatch Error]:', pdfErr.message);
      }
    }

    res.json({
      ...fee,
      monthLabel: monthLabel(m),
      totalRemainingDue: updatedLedger.totalRemainingDue,
      pendingMonthsCount: updatedLedger.pendingCycles.length,
      advanceCredit: updatedLedger.advanceCredit
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record payment: ' + err.message });
  }
});

// Remove a payment (unpay)
app.post('/api/fees/unpay', async (req, res) => {
  const { studentId, month } = req.body;
  const m = month || currentMonth();
  try {
    const existing = await prisma.fee.findFirst({ where: { studentId, month: m } });
    if (existing) {
      await prisma.fee.delete({ where: { id: existing.id } });

      // Recompute and sync Student.feeStatus after deletion
      const updatedStudent = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          beds: { include: { room: { include: { building: true } } } },
          fees: true
        }
      });
      if (updatedStudent) {
        // Use computeStudentBillingLedger (same as /api/fees/pay) for consistent feeStatus sync.
        // Passing undefined lets getMonthlyFeeForMonth resolve the correct per-cycle fee,
        // matching the pay path which never hardcodes a single monthlyFee value.
        const updatedLedger = computeStudentBillingLedger(updatedStudent, undefined, new Date());
        await prisma.student.update({
          where: { id: studentId },
          data: { feeStatus: updatedLedger.totalRemainingDue === 0 ? 'Paid' : 'Pending' }
        });
      }
      // Bust finance summary cache so Finance page reflects updated totals immediately
      invalidateFinanceCache();

      return res.json({ success: true });
    }
    return res.status(404).json({ error: 'Fee record not found' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to unpay fee: ' + err.message });
  }
});

// Send or resend an official fee receipt email on demand
app.post('/api/fees/:feeId/email-receipt', async (req, res) => {
  try {
    const { feeId } = req.params;
    const { to } = req.body;

    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: {
        student: {
          include: {
            beds: { include: { room: true } },
            fees: true
          }
        },
        receipt: true
      }
    });

    if (!fee) {
      return res.status(404).json({ error: 'Fee record not found' });
    }

    const settings = readSettings();
    const bed = fee.student.beds[0] || null;
    const receiptNo = fee.receiptNo || 'REC-' + fee.id.substring(0, 8);
    const label = monthLabel(fee.month);
    const formattedDate = fee.date ? fee.date.toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
    const joinDate = fee.student.dateOfJoining ? new Date(fee.student.dateOfJoining) : new Date();
    const joinDay = joinDate.getDate() || 1;
    const cycle = getCycleForMonth(joinDay, fee.month || currentMonth());
    const studentLedger = computeStudentBillingLedger(fee.student, Number(settings.monthlyFee) || 6000, new Date());

    // Get or generate PDF Buffer
    let pdfBuffer: Buffer;
    if (fee.receipt && fee.receipt.pdfData) {
      pdfBuffer = Buffer.from(fee.receipt.pdfData);
    } else {
      pdfBuffer = await generateFeeReceiptPDFBuffer({
        receiptNo,
        paymentDate: formattedDate,
        monthLabel: label,
        cycleLabel: cycle.cycleLabel,
        amount: Number(fee.amount),
        remainingBalance: studentLedger.totalRemainingDue,
        method: fee.method,
        upiProvider: fee.upiProvider || null,
        transactionRef: fee.transactionRef || null,
        studentName: fee.student.name,
        studentPhone: fee.student.phone,
        rollNumber: fee.student.rollNumber,
        course: fee.student.course,
        roomName: bed ? bed.room.roomNumber : 'Unallocated',
        bedNumber: bed ? bed.bedNumber : null,
        hostelName: settings.hostelName,
        hostelPhone: settings.hostelPhone,
        hostelEmail: settings.hostelEmail,
        hostelAddress: settings.hostelAddress
      });

      await prisma.receipt.upsert({
        where: { feeId: fee.id },
        update: { pdfData: pdfBuffer },
        create: {
          feeId: fee.id,
          receiptNo,
          fileName: `Receipt_${receiptNo}.pdf`,
          mimeType: 'application/pdf',
          pdfData: pdfBuffer
        }
      });
    }

    const emailTo = to || fee.student.email || 'rishivardhan165@gmail.com';
    const emailRes = await sendPaymentReceiptEmail({
      to: emailTo,
      studentName: fee.student.name,
      studentPhone: fee.student.phone,
      rollNumber: fee.student.rollNumber,
      roomName: bed ? bed.room.roomNumber : 'Unallocated',
      bedNumber: bed ? bed.bedNumber : null,
      receiptNo,
      amount: Number(fee.amount),
      remainingBalance: studentLedger.totalRemainingDue,
      monthLabel: label,
      paymentDate: formattedDate,
      method: fee.method,
      upiProvider: fee.upiProvider || null,
      transactionRef: fee.transactionRef || null,
      hostelName: settings.hostelName,
      hostelPhone: settings.hostelPhone,
      hostelEmail: settings.hostelEmail,
      hostelAddress: settings.hostelAddress,
      fileName: `Receipt_${receiptNo}.pdf`,
      pdfBuffer
    });

    if (!emailRes.success) {
      return res.status(500).json({ error: 'Failed to send email: ' + emailRes.error });
    }

    await prisma.fee.update({
      where: { id: fee.id },
      data: { whatsappStatus: 'SENT_EMAIL' }
    });

    res.json({
      success: true,
      message: `Receipt sent successfully to ${emailTo}`,
      receiptNo,
      studentName: fee.student.name,
      to: emailTo
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to dispatch receipt: ' + err.message });
  }
});

// Trigger a test email receipt to the user's email address
app.post('/api/fees/test-email-receipt', async (req, res) => {
  try {
    const to = req.body.to || 'rishivardhan165@gmail.com';
    // Find any completed fee or latest student
    const sampleFee = await prisma.fee.findFirst({
      where: { status: 'Completed' },
      include: {
        student: {
          include: {
            beds: { include: { room: true } }
          }
        },
        receipt: true
      },
      orderBy: { date: 'desc' }
    });

    const settings = readSettings();

    let studentName = 'Rahul Sharma';
    let roomName = '101';
    let bedNumber = 1;
    let amount = 6500;
    let method = 'UPI';
    let upiProvider = 'Google Pay';
    let transactionRef = 'UPI-' + Math.floor(10000000 + Math.random() * 90000000);
    let receiptNo = 'REC-' + new Date().getFullYear() + '10-099';
    let label = 'October 2026';
    let formattedDate = new Date().toLocaleDateString('en-IN');
    let studentPhone = '+91 98765 43210';
    let rollNumber = 'MH-2026-042';

    if (sampleFee && sampleFee.student) {
      studentName = sampleFee.student.name;
      const bed = sampleFee.student.beds[0] || null;
      roomName = bed ? bed.room.roomNumber : '101';
      bedNumber = bed ? bed.bedNumber : 1;
      amount = sampleFee.amount;
      method = sampleFee.method;
      upiProvider = sampleFee.upiProvider || 'Google Pay';
      transactionRef = sampleFee.transactionRef || 'UPI-' + Math.floor(10000000 + Math.random() * 90000000);
      receiptNo = sampleFee.receiptNo || receiptNo;
      label = monthLabel(sampleFee.month);
      formattedDate = sampleFee.date ? sampleFee.date.toLocaleDateString('en-IN') : formattedDate;
      studentPhone = sampleFee.student.phone || studentPhone;
      rollNumber = sampleFee.student.rollNumber || rollNumber;
    }

    const pdfBuffer = await generateFeeReceiptPDFBuffer({
      receiptNo,
      paymentDate: formattedDate,
      monthLabel: label,
      amount,
      method,
      upiProvider,
      transactionRef,
      studentName,
      studentPhone,
      rollNumber,
      course: 'B.Tech',
      roomName,
      bedNumber,
      hostelName: settings.hostelName,
      hostelPhone: settings.hostelPhone,
      hostelEmail: settings.hostelEmail,
      hostelAddress: settings.hostelAddress
    });

    const emailRes = await sendPaymentReceiptEmail({
      to,
      studentName,
      studentPhone,
      rollNumber,
      roomName,
      bedNumber,
      receiptNo,
      amount,
      monthLabel: label,
      paymentDate: formattedDate,
      method,
      upiProvider,
      transactionRef,
      hostelName: settings.hostelName,
      hostelPhone: settings.hostelPhone,
      hostelEmail: settings.hostelEmail,
      hostelAddress: settings.hostelAddress,
      fileName: `Receipt_${receiptNo}.pdf`,
      pdfBuffer
    });

    if (!emailRes.success) {
      return res.status(500).json({ error: 'Failed to send test email: ' + emailRes.error });
    }

    res.json({
      success: true,
      message: `Test payment invoice & PDF receipt sent successfully to ${to}`,
      receiptNo,
      studentName,
      amount,
      month: label,
      to
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Test email failed: ' + err.message });
  }
});

// Get monthly transactions — defaults to current month for performance, pass month= to filter
app.get('/api/fees/transactions', async (req, res) => {
  const { month, all, buildingId } = req.query as { month?: string; all?: string; buildingId?: string };
  // Default to current month unless 'all=true' is explicitly passed
  const where: any = all === 'true' ? {} : { month: month || currentMonth() };
  if (buildingId && buildingId !== 'all') {
    where.student = {
      OR: [
        { beds: { some: { room: { buildingId } } } },
        { beds: { none: {} } }
      ]
    };
  }

  const txs = await prisma.fee.findMany({
    where,
    include: { student: { include: { beds: { include: { room: true } } } } },
    orderBy: { date: 'desc' },
    take: 100 // cap results for performance
  });
  res.json(txs.map(t => ({
    id: t.id,
    studentId: t.studentId,
    student: t.student.name,
    course: t.student.course,
    branch: t.student.branch,
    address: t.student.address,
    phone: t.student.phone,
    parentPhone: t.student.parentPhone,
    room: t.student.beds.length > 0 ? t.student.beds[0].room.roomNumber : 'Unallocated',
    bedNumber: t.student.beds.length > 0 ? t.student.beds[0].bedNumber : null,
    month: t.month,
    monthLabel: monthLabel(t.month),
    amount: t.amount,
    date: t.date.toISOString().split('T')[0],
    method: t.method,
    upiProvider: t.upiProvider,
    transactionRef: t.transactionRef,
    receiptNo: (t as any).receiptNo || null,
    whatsappStatus: (t as any).whatsappStatus || null,
    whatsappMsgId: (t as any).whatsappMsgId || null,
    status: t.status
  })));
});

// Get per-student full payment history
app.get('/api/fees/student/:id', async (req, res) => {
  const fees = await prisma.fee.findMany({
    where: { studentId: req.params.id },
    orderBy: { month: 'desc' }
  });
  res.json(fees.map(f => ({
    ...f,
    monthLabel: monthLabel(f.month),
    date: f.date.toISOString().split('T')[0]
  })));
});

// Monthly summary: all students + their fee status for a given month (optimized DB filtering)
app.get('/api/fees/monthly-status', async (req, res) => {
  const { month, buildingId } = req.query as { month?: string; buildingId?: string };
  const m = month || currentMonth();
  const settings = readSettings();
  const monthlyFee = Number(settings.monthlyFee) || 6000;

  const effectiveBuildingId = await resolveBuildingId(buildingId);
  const studentWhere: any = effectiveBuildingId
    ? {
        status: 'Active',
        OR: [
          { beds: { some: { room: { buildingId: effectiveBuildingId } } } },
          { beds: { none: {} } }
        ]
      }
    : { status: 'Active' };

  const students = await prisma.student.findMany({
    where: studentWhere,
    include: {
      beds: { include: { room: true } },
      fees: true
    }
  });

  const now = new Date();

  const mapped = students.map(s => {
    const feeRecord = s.fees.find(f => f.month === m && f.status === 'Completed') || null;
    const bed = s.beds[0] || null;
    const dueStatus = calculateStudentDueStatus(s, monthlyFee, now);
    const monthStatus = getStudentMonthFeeStatus(s, m, now, monthlyFee);

    const sJoinDate = s.dateOfJoining ? new Date(s.dateOfJoining) : new Date();
    const joiningMonthLabel = sJoinDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    const dateOfJoiningFormatted = sJoinDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const isBeforeJoining = monthStatus.status === 'Not Enrolled';

    return {
      studentId: s.id,
      name: s.name,
      course: s.course,
      branch: s.branch,
      address: s.address,
      phone: s.phone,
      parentPhone: s.parentPhone,
      room: bed ? bed.room.roomNumber : 'Unallocated',
      bedNumber: bed ? bed.bedNumber : null,
      month: m,
      monthLabel: monthLabel(m),
      dateOfJoining: s.dateOfJoining,
      dateOfJoiningFormatted,
      joiningMonthLabel,
      isBeforeJoining,
      dueDayOfMonth: dueStatus.dueDayOfMonth,
      dueDayLabel: dueStatus.dueDayLabel,
      nextDueDate: dueStatus.nextDueDate,
      pendingMonthsCount: isBeforeJoining ? 0 : dueStatus.pendingMonthsCount,
      pendingMonths: isBeforeJoining ? [] : dueStatus.pendingMonths,
      pendingMonthsList: isBeforeJoining ? [] : dueStatus.pendingMonths.map(p => p.monthLabel),
      totalPendingAmount: isBeforeJoining ? 0 : dueStatus.totalPendingAmount,
      feeStatus: monthStatus.status,
      cycleLabel: monthStatus.cycleLabel,
      hasArrears: dueStatus.pendingMonthsCount > 0,
      amount: feeRecord?.amount || (isBeforeJoining ? 0 : (monthStatus.amountDue || getMonthlyFeeForMonth(m, settings))),
      paymentDate: feeRecord && feeRecord.status === 'Completed' ? feeRecord.date.toISOString().split('T')[0] : null,
      method: feeRecord?.method || null,
      upiProvider: feeRecord?.upiProvider || null,
      transactionRef: feeRecord?.transactionRef || null,
      feeRecordId: feeRecord?.id || null,
      receiptNo: (feeRecord as any)?.receiptNo || null,
      whatsappStatus: (feeRecord as any)?.whatsappStatus || null,
      whatsappMsgId: (feeRecord as any)?.whatsappMsgId || null
    };
  });

  // Sort: Pending students to top, ordered by highest pending months count desc, then Upcoming, Paid, Not Enrolled
  const statusPriority: Record<string, number> = { Pending: 0, Upcoming: 1, Paid: 2, 'Not Enrolled': 3 };
  mapped.sort((a, b) => {
    const diff = (statusPriority[a.feeStatus] ?? 99) - (statusPriority[b.feeStatus] ?? 99);
    if (diff !== 0) return diff;
    if (b.pendingMonthsCount !== a.pendingMonthsCount) {
      return b.pendingMonthsCount - a.pendingMonthsCount;
    }
    return a.name.localeCompare(b.name);
  });

  res.json(mapped);
});

// Reports: Fee report for a month
app.get('/api/reports/fees', async (req, res) => {
  const { month, buildingId } = req.query as { month?: string; buildingId?: string };
  const m = month || currentMonth();
  const effectiveBuildingId = await resolveBuildingId(buildingId);
  // Include all statuses — unallocated students are included explicitly
  const studentWhere: any = effectiveBuildingId
    ? {
        OR: [
          { beds: { some: { room: { buildingId: effectiveBuildingId } } } },
          { beds: { none: {} } }
        ]
      }
    : {};
  const settings = readSettings();
  const monthlyFee = getMonthlyFeeForMonth(m, settings);
  const now = new Date();

  const students = await prisma.student.findMany({
    where: studentWhere,
    include: {
      beds: { include: { room: true } },
      fees: true
    }
  });

  const rows = students.map(s => {
    const monthStatus = getStudentMonthFeeStatus(s, m, now, monthlyFee);
    // Skip residents who were not yet admitted in this month
    if (monthStatus.status === 'Not Enrolled') return null;
    const fee = s.fees.find(f => f.month === m && f.status === 'Completed') || null;
    const bed = s.beds[0] || null;
    return {
      name: s.name, course: s.course, branch: s.branch, year: s.year,
      address: s.address, phone: s.phone, parentPhone: s.parentPhone,
      room: bed ? bed.room.roomNumber : 'Unallocated',
      bedNumber: bed ? bed.bedNumber : null,
      feeStatus: monthStatus.status,
      cycleLabel: monthStatus.cycleLabel,
      amount: fee?.amount || monthlyFee,
      paymentDate: fee?.date?.toISOString().split('T')[0] || null,
      method: fee?.method || null,
      upiProvider: fee?.upiProvider || null,
      transactionRef: fee?.transactionRef || null,
      receiptNo: (fee as any)?.receiptNo || null,
      month: m, monthLabel: monthLabel(m)
    };
  }).filter(Boolean);

  res.json(rows);
});

// Reports: Room occupancy
app.get('/api/reports/rooms', async (req, res) => {
  const { buildingId } = req.query as { buildingId?: string };
  const roomWhere: any = (buildingId && buildingId !== 'all') ? { buildingId } : {};
  const rooms = await prisma.room.findMany({
    where: roomWhere,
    include: { building: true, beds: { include: { student: true } } }
  });
  res.json(rooms.map(r => {
    const occupied = r.beds.filter(b => b.status === 'occupied').length;
    return {
      building: r.building.name, floor: r.floor, room: r.roomNumber,
      capacity: r.beds.length, occupied,
      available: r.beds.length - occupied,
      occupancyPct: Math.round((occupied / r.beds.length) * 100)
    };
  }));
});

// Reports: Student report
app.get('/api/reports/students', async (req, res) => {
  const { buildingId } = req.query as { buildingId?: string };
  const studentWhere: any = (buildingId && buildingId !== 'all')
    ? {
        OR: [
          { beds: { some: { room: { buildingId } } } },
          { beds: { none: {} } }
        ]
      }
    : {};
  const students = await prisma.student.findMany({
    where: studentWhere,
    include: { beds: { include: { room: true } } }
  });
  res.json(students.map(s => {
    const bed = s.beds[0] || null;
    return {
      name: s.name, course: s.course, branch: s.branch, year: s.year,
      rollNumber: s.rollNumber, phone: s.phone, email: s.email,
      room: bed ? bed.room.roomNumber : 'Unallocated',
      bedNumber: bed ? bed.bedNumber : null,
      admissionDate: s.dateOfJoining?.toISOString().split('T')[0] || null,
      status: s.status
    };
  }));
});

// Reports: Complaints
app.get('/api/reports/complaints', async (req, res) => {
  const complaints = await prisma.complaint.findMany({
    include: { student: { include: { beds: { include: { room: true } } } } },
    orderBy: { date: 'desc' }
  });
  res.json(complaints.map(c => ({
    title: c.title, description: c.description,
    student: c.student.name,
    room: c.student.beds[0]?.room.roomNumber || 'N/A',
    priority: c.priority, status: c.status,
    date: c.date.toISOString().split('T')[0]
  })));
});

// ─── COMPLAINTS (optimized — only select needed student fields) ─────────────
app.get('/api/complaints', async (req, res) => {
  const complaints = await prisma.complaint.findMany({
    include: {
      student: {
        select: {
          name: true,
          beds: { select: { room: { select: { roomNumber: true } } }, take: 1 }
        }
      }
    },
    orderBy: { date: 'desc' }
  });
  res.json(complaints.map(c => ({
    id: c.id,
    title: c.title,
    description: c.description || '',
    room: c.student.beds.length > 0 ? c.student.beds[0].room.roomNumber : 'N/A',
    student: c.student.name,
    priority: c.priority,
    status: c.status,
    date: c.date.toISOString().split('T')[0]
  })));
});

app.post('/api/complaints', async (req, res) => {
  const { title, description, student, priority } = req.body;
  let stu = await prisma.student.findFirst({ where: { name: { contains: student, mode: 'insensitive' } } });
  if (!stu) return res.status(404).json({ error: 'Student not found.' });
  const complaint = await prisma.complaint.create({
    data: { title, description, priority, status: 'pending', studentId: stu.id }
  });
  res.json(complaint);
});

app.put('/api/complaints/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const complaint = await prisma.complaint.update({ where: { id }, data: { status } });
  res.json(complaint);
});



// ─── BUILDING MANAGEMENT ─────────────────────────────────────────────────────
// Create a new building
app.post('/api/buildings', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const building = await prisma.building.create({ data: { name } });
    res.json(building);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a building (cascade: delete rooms and beds inside)
app.delete('/api/buildings/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // First get all room ids
    const rooms = await prisma.room.findMany({ where: { buildingId: id }, include: { beds: true } });
    for (const room of rooms) {
      for (const bed of room.beds) {
        // Unallocate students
        if (bed.studentId) {
          await prisma.bed.update({ where: { id: bed.id }, data: { studentId: null, status: 'available' } });
        }
      }
      await prisma.bed.deleteMany({ where: { roomId: room.id } });
      await prisma.room.delete({ where: { id: room.id } });
    }
    await prisma.building.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Floor Plan API: get full building floor structure
app.get('/api/floor-plan/:buildingId', async (req, res) => {
  const { buildingId } = req.params;
  const rooms = await prisma.room.findMany({
    where: { buildingId },
    include: {
      beds: {
        include: { student: true }
      }
    },
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }]
  });

  // Group by floor
  const floors: Record<string, any[]> = {};
  for (const room of rooms) {
    if (!floors[room.floor]) floors[room.floor] = [];
    const occupied = room.beds.filter(b => b.status === 'occupied').length;
    floors[room.floor].push({
      id: room.id,
      roomNumber: room.roomNumber,
      floor: room.floor,
      capacity: room.beds.length,
      occupied,
      available: room.beds.length - occupied,
      status: occupied === room.beds.length ? 'full' : occupied === 0 ? 'available' : 'partial',
      beds: room.beds.map(b => ({
        id: b.id,
        bedNumber: b.bedNumber,
        status: b.status,
        studentName: b.student?.name || null
      }))
    });
  }

  const building = await prisma.building.findUnique({ where: { id: buildingId } });
  res.json({ building, floors });
});

// Data Export: export all students as JSON
app.get('/api/export/students', async (req, res) => {
  const students = await prisma.student.findMany({
    include: { beds: { include: { room: { include: { building: true } } } }, fees: true }
  });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=vmr-students.json');
  res.json(students);
});

// Data Export: export all fees as JSON
app.get('/api/export/fees', async (req, res) => {
  const fees = await prisma.fee.findMany({
    include: { student: true },
    orderBy: { date: 'desc' }
  });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=vmr-fees.json');
  res.json(fees);
});

// Bulk fee apply: create pending fees for all students for a given month
app.post('/api/fees/bulk-apply', async (req, res) => {
  const { month, amount } = req.body;
  const m = month || currentMonth();
  const amt = Number(amount) || readSettings().monthlyFee;
  try {
    const students = await prisma.student.findMany({ where: { status: 'Active' } });
    let created = 0;
    for (const s of students) {
      const existing = await prisma.fee.findFirst({ where: { studentId: s.id, month: m } });
      if (!existing) {
        await prisma.fee.create({
          data: { studentId: s.id, month: m, amount: amt, method: 'Cash', status: 'Pending', date: new Date() }
        });
        created++;
      }
    }
    res.json({ success: true, created, total: students.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Fee Reminders API endpoints
app.post('/api/reminders/trigger', async (req, res) => {
  try {
    const result = await executeFeeReminderDispatch();
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Individual Student Reminder endpoint
app.post('/api/reminders/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await executeSingleStudentReminder(studentId);
    if (!result.success) {
      const statusCode = result.message?.includes('not found') ? 404 : 502;
      return res.status(statusCode).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/reminders/send-individual', async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ success: false, error: 'studentId is required' });
    }
    const result = await executeSingleStudentReminder(studentId);
    if (!result.success) {
      const statusCode = result.message?.includes('not found') ? 404 : 502;
      return res.status(statusCode).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reminders/settings', (req, res) => {
  try {
    const settings = getReminderScheduleSettings();
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/reminders/settings', async (req, res) => {
  try {
    const { reminderTime } = req.body;
    if (!reminderTime) {
      return res.status(400).json({ success: false, error: 'reminderTime (HH:MM) is required' });
    }
    const newSettings = await updateReminderScheduleTime(reminderTime);
    res.json({ success: true, settings: newSettings });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Diagnostic endpoint to verify live SMTP delivery
app.post('/api/reminders/test-email', async (req, res) => {
  try {
    const to = req.body?.to || process.env.EMAIL_ADDRESS || 'rishichepuri764@gmail.com';
    const result = await sendEmail(
      to,
      'Majin Hostel - Deployment Email Connectivity Verification',
      'This is an automated verification email from the Majin Hostel Management backend confirming that outbound Gmail SMTP over IPv4 is active, connected, and functioning properly.',
      '<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #22c55e; border-radius: 12px; background: #f0fdf4;">' +
        '<h2 style="color: #15803d; margin-top: 0;">✓ Deployment Email Service Online</h2>' +
        '<p>This email confirms that the deployed backend on Render has successfully resolved and connected to Google SMTP via IPv4 (Port 465 / 587).</p>' +
        '<p>Timestamp: <strong>' + new Date().toISOString() + '</strong></p>' +
        '<p>Sender: <strong>' + (process.env.EMAIL_ADDRESS || 'rishichepuri764@gmail.com') + '</strong></p>' +
      '</div>'
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── NOTIFICATIONS ENDPOINT ──────────────────────────────────────────────────
app.get('/api/notifications', async (req, res) => {
  const { buildingId } = req.query as { buildingId?: string };
  const filterByBuilding = buildingId && buildingId !== 'all';
  const studentWhere: any = filterByBuilding
    ? {
        OR: [
          { beds: { some: { room: { buildingId } } } },
          { beds: { none: {} } }
        ]
      }
    : {};
  const roomWhere: any = filterByBuilding ? { buildingId } : {};

  try {
    const settings = readSettings();
    const monthlyFee = Number(settings.monthlyFee) || 6000;
    const cm = currentMonth();
    const today = new Date();
    const todayDay = today.getDate();

    const [students, rooms, complaints, recentPayments] = await Promise.all([
      prisma.student.findMany({
        where: studentWhere,
        include: {
          beds: { include: { room: { include: { building: true } } } },
          fees: { where: { status: 'Completed' } }
        }
      }),
      prisma.room.findMany({
        where: roomWhere,
        include: { beds: true }
      }),
      prisma.complaint.findMany({
        where: {
          status: { in: ['pending', 'in-progress'] },
          ...(filterByBuilding ? { student: studentWhere } : {})
        },
        take: 5,
        orderBy: { date: 'desc' },
        include: { student: { include: { beds: { include: { room: true } } } } }
      }),
      prisma.fee.findMany({
        where: {
          status: 'Completed',
          ...(filterByBuilding ? { student: studentWhere } : {})
        },
        take: 3,
        orderBy: { date: 'desc' },
        include: { student: { include: { beds: { include: { room: true } } } } }
      })
    ]);

    const notifications: any[] = [];

    // 1. Fee Dues Today & Overdue
    const dueTodayStudents: any[] = [];
    const overdueStudents: any[] = [];
    let totalDueTodayAmount = 0;
    let totalOverdueAmount = 0;

    students.forEach(s => {
      if (s.status !== 'Active') return; // Skip vacated students from notifications
      const dueStatus = calculateStudentDueStatus(s, monthlyFee, today);

      if (dueStatus.isDueToday) {
        dueTodayStudents.push({ ...s, dueStatus });
        totalDueTodayAmount += dueStatus.totalPendingAmount || monthlyFee;
      } else if (dueStatus.pendingMonthsCount > 0) {
        overdueStudents.push({ ...s, dueStatus });
        totalOverdueAmount += dueStatus.totalPendingAmount;
      }
    });

    // Main Fee Due Today / Urgent Collection Alert
    if (dueTodayStudents.length > 0) {
      notifications.push({
        id: `notif-due-today-${cm}`,
        type: 'fee_due_today',
        category: 'dues',
        priority: 'urgent',
        title: `${dueTodayStudents.length} ${dueTodayStudents.length === 1 ? 'Member' : 'Members'} Due Today`,
        message: `${dueTodayStudents.length} residents have their fee payment due today (₹${totalDueTodayAmount.toLocaleString('en-IN')} total).`,
        link: '/fees',
        count: dueTodayStudents.length,
        timestamp: new Date().toISOString(),
        actionText: 'Collect Fees'
      });
    } else if (overdueStudents.length > 0) {
      const activeCount = overdueStudents.length;
      notifications.push({
        id: `notif-due-cycle-${cm}`,
        type: 'fee_due_today',
        category: 'dues',
        priority: 'urgent',
        title: `${activeCount} ${activeCount === 1 ? 'Member' : 'Members'} Due Today / Pending`,
        message: `${activeCount} residents have pending fee payments for ${monthLabel(cm)} (₹${totalOverdueAmount.toLocaleString('en-IN')} pending).`,
        link: '/fees',
        count: activeCount,
        timestamp: new Date().toISOString(),
        actionText: 'Collect Dues'
      });
    }

    // Individual Member Notices
    const highlightStudents = dueTodayStudents.length > 0 ? dueTodayStudents : overdueStudents;
    highlightStudents.slice(0, 4).forEach((s, idx) => {
      const roomNum = s.beds?.[0]?.room?.roomNumber || 'Unallocated';
      const amount = s.dueStatus?.totalPendingAmount || monthlyFee;
      notifications.push({
        id: `notif-student-due-${s.id}-${cm}`,
        type: 'student_due',
        category: 'dues',
        priority: 'high',
        title: `Fee Due: ${s.name}`,
        message: `Room ${roomNum} · ₹${amount.toLocaleString('en-IN')} pending (${s.dueStatus?.dueDayLabel || 'Due now'}).`,
        link: '/fees',
        timestamp: new Date(Date.now() - (idx + 1) * 20 * 60 * 1000).toISOString(),
        actionText: 'Record Payment'
      });
    });

    // 2. Active Complaints
    complaints.forEach((c, idx) => {
      const roomNum = c.student?.beds?.[0]?.room?.roomNumber || 'N/A';
      notifications.push({
        id: `notif-complaint-${c.id}`,
        type: 'complaint',
        category: 'complaints',
        priority: c.status === 'pending' ? 'high' : 'medium',
        title: `Complaint: ${c.title}`,
        message: `${c.student?.name || 'Resident'} (Room ${roomNum}): ${c.description?.slice(0, 75) || 'Pending review'}`,
        link: '/complaints',
        timestamp: c.date ? c.date.toISOString() : new Date(Date.now() - (idx + 2) * 3600000).toISOString(),
        actionText: 'Open Ticket'
      });
    });

    // 3. Room Occupancy
    const totalBeds = rooms.reduce((acc, r) => acc + r.beds.length, 0);
    const occupiedBeds = rooms.reduce((acc, r) => acc + r.beds.filter(b => b.status === 'occupied').length, 0);
    const availableBeds = totalBeds - occupiedBeds;
    const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    if (totalBeds > 0 && availableBeds <= 5) {
      notifications.push({
        id: `notif-high-occ-${cm}`,
        type: 'occupancy',
        category: 'rooms',
        priority: 'medium',
        title: `High Occupancy Alert (${occupancyPct}%)`,
        message: `Only ${availableBeds} beds remaining out of ${totalBeds} total beds across ${rooms.length} rooms.`,
        link: '/rooms',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        actionText: 'View Rooms'
      });
    } else if (availableBeds > 0) {
      notifications.push({
        id: `notif-avail-beds-${cm}`,
        type: 'occupancy',
        category: 'rooms',
        priority: 'info',
        title: `${availableBeds} Vacant Beds Available`,
        message: `Ready for allocations across ${rooms.length} rooms (${occupancyPct}% occupied).`,
        link: '/rooms',
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        actionText: 'Manage Beds'
      });
    }

    // 4. Recent Payment Confirmations
    recentPayments.forEach((p, idx) => {
      const roomNum = p.student?.beds?.[0]?.room?.roomNumber || 'N/A';
      notifications.push({
        id: `notif-pay-${p.id}`,
        type: 'payment_received',
        category: 'activity',
        priority: 'info',
        title: `Payment Received: ₹${p.amount.toLocaleString('en-IN')}`,
        message: `${p.student.name} (Room ${roomNum}) paid for ${monthLabel(p.month)} via ${p.method}.`,
        link: '/fees',
        timestamp: p.date ? p.date.toISOString() : new Date(Date.now() - (idx + 3) * 7200000).toISOString(),
        actionText: 'View Receipt'
      });
    });

    res.json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (err: any) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`API Server running on port ${PORT}`);
  try {
    await initSettings(prisma);
    await initReminderScheduler();
  } catch (e: any) {
    console.error('Error during startup background tasks:', e);
  }
});

