import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { initReminderScheduler, executeFeeReminderDispatch, executeSingleStudentReminder, getReminderScheduleSettings, updateReminderScheduleTime } from './services/reminderScheduler';
import { calculateStudentDueStatus, getOrdinal } from './services/billingHelper';
import { generateFeeReceiptPDFBuffer } from './services/pdfService';
import { sendPaymentReceiptWhatsApp } from './services/whatsappCloudService';
import { handleWebhookVerification, processWebhookPayload } from './services/whatsappWebhookService';
import { sendTelegramMessage } from './services/telegramService';
import { createFinanceRouter } from './routes/financeRoutes';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const prisma = new PrismaClient();
app.use('/api/finance', createFinanceRouter(prisma));

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

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

// ─── SETTINGS (in-memory cache — avoids fs.readFileSync on every request) ─────
const SETTINGS_FILE = path.join(__dirname, '../../settings.json');
const DEFAULT_SETTINGS = {
  hostelName: 'VMR Hostel',
  adminName: 'Admin',
  hostelPhone: '',
  hostelEmail: '',
  hostelAddress: '',
  upiId: '',
  upiName: 'VMR Hostel',
  monthlyFee: 5500,
  securityDeposit: 5000,
  lateFinePerDay: 50,
  dueDateDay: 10,
};
let _settingsCache: any = null;
const readSettings = () => {
  if (_settingsCache) return _settingsCache;
  try { _settingsCache = { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) }; }
  catch { _settingsCache = { ...DEFAULT_SETTINGS }; }
  return _settingsCache;
};
const writeSettings = (s: any) => {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2));
  _settingsCache = s; // bust cache on write
};

app.get('/api/settings', (req, res) => res.json(readSettings()));
app.put('/api/settings', (req, res) => {
  const updated = { ...readSettings(), ...req.body };
  writeSettings(updated);
  res.json(updated);
});

// ─── META WHATSAPP WEBHOOKS ──────────────────────────────────────────────────
app.get('/api/whatsapp/webhook', handleWebhookVerification);
app.post('/api/whatsapp/webhook', async (req, res) => {
  res.sendStatus(200); // Immediate 200 OK acknowledgment to Meta
  await processWebhookPayload(req.body, prisma);
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

      pdfBuffer = await generateFeeReceiptPDFBuffer({
        receiptNo,
        paymentDate: fee.date ? fee.date.toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
        monthLabel: monthLabel(fee.month),
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



// ─── DASHBOARD STATS (parallelized — all queries fire simultaneously) ─────────
app.get('/api/stats', async (req, res) => {
  const { buildingId } = req.query as { buildingId?: string };
  const cm = currentMonth();

  const isBuildingFiltered = buildingId && buildingId !== 'all';
  const studentWhere: any = isBuildingFiltered ? { beds: { some: { room: { buildingId } } } } : {};
  const roomWhere: any = isBuildingFiltered ? { buildingId } : {};
  const bedWhere: any = isBuildingFiltered ? { room: { buildingId } } : {};
  const occupiedBedWhere: any = isBuildingFiltered ? { status: 'occupied', room: { buildingId } } : { status: 'occupied' };
  const complaintWhere: any = isBuildingFiltered
    ? { status: { in: ['pending', 'in-progress'] }, student: { beds: { some: { room: { buildingId } } } } }
    : { status: { in: ['pending', 'in-progress'] } };
  const feeWhere: any = isBuildingFiltered
    ? { month: cm, status: 'Completed', student: { beds: { some: { room: { buildingId } } } } }
    : { month: cm, status: 'Completed' };

  const [
    totalStudents,
    totalRooms,
    totalBeds,
    occupiedBeds,
    activeComplaints,
    paidThisMonth,
    monthlyCollection
  ] = await Promise.all([
    prisma.student.count({ where: studentWhere }),
    prisma.room.count({ where: roomWhere }),
    prisma.bed.count({ where: bedWhere }),
    prisma.bed.count({ where: occupiedBedWhere }),
    prisma.complaint.count({ where: complaintWhere }),
    prisma.fee.count({ where: feeWhere }),
    prisma.fee.aggregate({ where: feeWhere, _sum: { amount: true } })
  ]);

  res.json({
    totalStudents,
    totalRooms,
    occupiedBeds,
    availableBeds: totalBeds - occupiedBeds,
    activeComplaints,
    pendingFees: totalStudents - paidThisMonth,
    monthlyCollection: monthlyCollection._sum.amount || 0
  });
});

app.get('/api/activities', async (req, res) => {
  const { buildingId } = req.query as { buildingId?: string };
  const feeWhere: any = buildingId && buildingId !== 'all'
    ? { student: { beds: { some: { room: { buildingId } } } } }
    : {};
  const recentFees = await prisma.fee.findMany({
    where: feeWhere,
    take: 3, orderBy: { date: 'desc' },
    include: { student: true }
  });
  const activities = recentFees.map(f => ({
    id: f.id,
    action: 'Fee Received',
    details: `₹${f.amount} from ${f.student.name} (${monthLabel(f.month)})`,
    time: f.date.toLocaleDateString('en-IN'),
    type: 'fee'
  }));
  res.json(activities);
});

// ─── STUDENTS (optimized — scoped fee queries, computed due status uses settings) ─
app.get('/api/students', async (req, res) => {
  const { month, buildingId } = req.query as { month?: string; buildingId?: string };
  const m = month || currentMonth();
  const settings = readSettings();
  const monthlyFee = settings.monthlyFee || 5500;

  const studentWhere: any = (buildingId && buildingId !== 'all')
    ? { beds: { some: { room: { buildingId } } } }
    : {};

  const students = await prisma.student.findMany({
    where: studentWhere,
    include: {
      beds: { include: { room: { include: { building: true } } } },
      fees: { where: { status: 'Completed' } }
    }
  });

  const formatted = students.map(s => {
    // Get fee record for specified month
    const feeRecord = s.fees.find(f => f.month === m);
    const bed = s.beds.length > 0 ? s.beds[0] : null;
    const dueStatus = calculateStudentDueStatus(s, monthlyFee);

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
      dueDayOfMonth: dueStatus.dueDayOfMonth,
      dueDayLabel: dueStatus.dueDayLabel,
      nextDueDate: dueStatus.nextDueDate,
      pendingMonthsCount: dueStatus.pendingMonthsCount,
      pendingMonths: dueStatus.pendingMonths,
      totalPendingAmount: dueStatus.totalPendingAmount,
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
      feeStatus: feeRecord && feeRecord.status === 'Completed' ? 'Paid' : 'Pending',
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

  // Sort: Pending students to top, ordered by highest pending months count desc
  formatted.sort((a, b) => {
    if (a.feeStatus !== b.feeStatus) {
      return a.feeStatus === 'Pending' ? -1 : 1;
    }
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

  const whereClause = (buildingId && buildingId !== 'all') ? { buildingId } : {};

  const rooms = await prisma.room.findMany({
    where: whereClause,
    include: {
      building: true,
      beds: {
        include: {
          student: { include: { fees: { where: { month: m } } } }
        }
      }
    },
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }]
  });

  const formatted = rooms.map(r => {
    const occupied = r.beds.filter(b => b.status === 'occupied').length;
    return {
      id: r.roomNumber,
      dbId: r.id,
      floor: r.floor,
      capacity: r.beds.length,
      occupied,
      status: occupied === r.beds.length ? 'full' : occupied === 0 ? 'available' : 'partial',
      beds: r.beds.map(b => {
        const feeRecord = b.student?.fees?.[0];
        return {
          id: b.id,
          bedIndex: b.bedNumber,
          status: b.status,
          student: b.student ? b.student.name : null,
          studentDbId: b.student?.id || null,
          feeStatus: b.student ? (feeRecord && feeRecord.status === 'Completed' ? 'Paid' : 'Pending') : null,
          studentObj: b.student ? {
            dbId: b.student.id,
            name: b.student.name,
            course: b.student.course,
            branch: b.student.branch,
            phone: b.student.phone,
            parentName: b.student.parentName,
            feeStatus: feeRecord && feeRecord.status === 'Completed' ? 'Paid' : 'Pending',
            feeRecord: feeRecord || null
          } : null
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

// ─── FEES ─────────────────────────────────────────────────────────────────────
// Record a payment (with duplicate-month check)
app.post('/api/fees/pay', async (req, res) => {
  const { studentId, amount, method, upiProvider, transactionRef, date, month } = req.body;
  const m = month || currentMonth();
  try {
    // Check duplicate
    const existing = await prisma.fee.findFirst({ where: { studentId, month: m } });
    if (existing && existing.status === 'Completed') {
      return res.status(409).json({
        error: `Fee for ${monthLabel(m)} has already been paid.`,
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
          amount: Number(amount),
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
          amount: Number(amount),
          method,
          upiProvider: upiProvider || null,
          transactionRef: transactionRef || null,
          status: 'Completed',
          date: date ? new Date(date) : new Date(),
          receiptNo: generatedReceiptNo
        } as any
      });
    }
    // Update legacy feeStatus field on student
    await prisma.student.update({
      where: { id: studentId },
      data: { feeStatus: 'Paid' }
    });

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

      // 1. Generate PDF Receipt Buffer
      try {
        const pdfBuffer = await generateFeeReceiptPDFBuffer({
          receiptNo,
          paymentDate: formattedDate,
          monthLabel: label,
          amount: Number(amount),
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

        // 3. Dispatch PDF Receipt via Meta WhatsApp Cloud API if student phone exists
        if (student.phone) {
          sendPaymentReceiptWhatsApp(
            student.phone,
            student.name,
            receiptNo,
            pdfBuffer,
            Number(amount),
            label
          ).then(async (waRes) => {
            if (waRes.success && waRes.messageId) {
              await prisma.fee.update({
                where: { id: fee.id },
                data: {
                  whatsappMsgId: waRes.messageId,
                  whatsappStatus: waRes.status || 'SENT'
                }
              });
              console.log(`[Meta WhatsApp Dispatch]: Fee ${fee.id} updated with MsgID ${waRes.messageId}`);
            } else {
              await prisma.fee.update({
                where: { id: fee.id },
                data: { whatsappStatus: waRes.status || 'FAILED' }
              });
            }
          }).catch(err => console.error('[Meta WhatsApp Background Error]:', err.message));
        }

        // 4. Secondary Telegram Notification (Preserving existing Telegram setup)
        const tgMessage = `<b>✅ PAYMENT RECEIVED & RECEIPT ISSUED</b>\n\n` +
          `<b>Student:</b> ${student.name}\n` +
          `<b>Receipt No:</b> ${receiptNo}\n` +
          `<b>Billing Month:</b> ${label}\n` +
          `<b>Amount Paid:</b> ₹${Number(amount).toLocaleString('en-IN')}\n` +
          `<b>Method:</b> ${method}${upiProvider ? ` (${upiProvider})` : ''}\n` +
          `<b>Txn Ref:</b> ${transactionRef || 'N/A'}`;

        sendTelegramMessage(tgMessage, student.phone || undefined).catch(() => {});

      } catch (pdfErr: any) {
        console.error('[PDF Generation / Dispatch Error]:', pdfErr.message);
      }
    }

    res.json({ ...fee, monthLabel: monthLabel(m) });
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
      return res.json({ success: true });
    }
    return res.status(404).json({ error: 'Fee record not found' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to unpay fee: ' + err.message });
  }
});

// Get monthly transactions — defaults to current month for performance, pass month= to filter
app.get('/api/fees/transactions', async (req, res) => {
  const { month, all, buildingId } = req.query as { month?: string; all?: string; buildingId?: string };
  // Default to current month unless 'all=true' is explicitly passed
  const where: any = all === 'true' ? {} : { month: month || currentMonth() };
  if (buildingId && buildingId !== 'all') {
    where.student = { beds: { some: { room: { buildingId } } } };
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
  const monthlyFee = settings.monthlyFee || 5500;

  const studentWhere: any = (buildingId && buildingId !== 'all')
    ? { beds: { some: { room: { buildingId } } } }
    : {};

  const students = await prisma.student.findMany({
    where: studentWhere,
    include: {
      beds: { include: { room: true } },
      fees: { where: { status: 'Completed' } }
    }
  });

  const mapped = students.map(s => {
    const feeRecord = s.fees.find(f => f.month === m) || null;
    const bed = s.beds[0] || null;
    const dueStatus = calculateStudentDueStatus(s, monthlyFee);

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
      dueDayOfMonth: dueStatus.dueDayOfMonth,
      dueDayLabel: dueStatus.dueDayLabel,
      nextDueDate: dueStatus.nextDueDate,
      pendingMonthsCount: dueStatus.pendingMonthsCount,
      pendingMonthsList: dueStatus.pendingMonths.map(p => p.monthLabel),
      totalPendingAmount: dueStatus.totalPendingAmount,
      feeStatus: feeRecord && feeRecord.status === 'Completed' ? 'Paid' : 'Pending',
      amount: feeRecord?.amount || monthlyFee,
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

  // Sort: Pending students to top, ordered by highest pending months count desc
  mapped.sort((a, b) => {
    if (a.feeStatus !== b.feeStatus) {
      return a.feeStatus === 'Pending' ? -1 : 1;
    }
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
  const studentWhere: any = (buildingId && buildingId !== 'all')
    ? { beds: { some: { room: { buildingId } } } }
    : {};
  const students = await prisma.student.findMany({
    where: studentWhere,
    include: {
      beds: { include: { room: true } },
      fees: { where: { month: m } }
    }
  });
  res.json(students.map(s => {
    const fee = s.fees[0] || null;
    const bed = s.beds[0] || null;
    return {
      name: s.name, course: s.course, branch: s.branch, year: s.year,
      address: s.address, phone: s.phone, parentPhone: s.parentPhone,
      room: bed ? bed.room.roomNumber : 'Unallocated',
      bedNumber: bed ? bed.bedNumber : null,
      feeStatus: fee && fee.status === 'Completed' ? 'Paid' : 'Pending',
      amount: fee?.amount || 5500,
      paymentDate: fee?.date.toISOString().split('T')[0] || null,
      method: fee?.method || null,
      upiProvider: fee?.upiProvider || null,
      transactionRef: fee?.transactionRef || null,
      receiptNo: (fee as any)?.receiptNo || null,
      month: m, monthLabel: monthLabel(m)
    };
  }));
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
    ? { beds: { some: { room: { buildingId } } } }
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
  const floors: Record<number, any[]> = {};
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
      return res.status(404).json(result);
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
      return res.status(404).json(result);
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

app.post('/api/reminders/settings', (req, res) => {
  try {
    const { reminderTime } = req.body;
    if (!reminderTime) {
      return res.status(400).json({ success: false, error: 'reminderTime (HH:MM) is required' });
    }
    const newSettings = updateReminderScheduleTime(reminderTime);
    res.json({ success: true, settings: newSettings });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
  // Start background daily 19:00 IST cron scheduler
  initReminderScheduler();
});
