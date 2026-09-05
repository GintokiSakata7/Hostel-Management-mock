import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { initReminderScheduler, executeFeeReminderDispatch, getReminderScheduleSettings, updateReminderScheduleTime } from './services/reminderScheduler';

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();

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

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  const cm = currentMonth();
  const totalStudents = await prisma.student.count();
  const totalRooms = await prisma.room.count();
  const totalBeds = await prisma.bed.count();
  const occupiedBeds = await prisma.bed.count({ where: { status: 'occupied' } });
  const availableBeds = totalBeds - occupiedBeds;
  const activeComplaints = await prisma.complaint.count({ where: { status: { in: ['pending', 'in-progress'] } } });
  const paidThisMonth = await prisma.fee.count({ where: { month: cm, status: 'Completed' } });
  const pendingFees = totalStudents - paidThisMonth;
  const monthlyCollection = await prisma.fee.aggregate({ where: { month: cm, status: 'Completed' }, _sum: { amount: true } });

  res.json({
    totalStudents,
    totalRooms,
    occupiedBeds,
    availableBeds,
    activeComplaints,
    pendingFees,
    monthlyCollection: monthlyCollection._sum.amount || 0
  });
});

app.get('/api/activities', async (req, res) => {
  // Recent fee payments
  const recentFees = await prisma.fee.findMany({
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

// ─── STUDENTS ─────────────────────────────────────────────────────────────────
app.get('/api/students', async (req, res) => {
  const { month } = req.query as { month?: string };
  const m = month || currentMonth();

  const students = await prisma.student.findMany({
    include: { beds: { include: { room: { include: { building: true } } } }, fees: true }
  });

  const formatted = await Promise.all(students.map(async s => {
    // Get fee record for specified month
    const feeRecord = s.fees.find(f => f.month === m);
    const bed = s.beds.length > 0 ? s.beds[0] : null;

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
      aadhar: s.aadhar,
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
      // Full fee history
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
  }));
  res.json(formatted);
});

app.post('/api/students', async (req, res) => {
  try {
    const {
      name, gender, dob, email, photoUrl,
      course, branch, year, rollNumber,
      dateOfJoining, aadhar, phone,
      parentName, parentPhone, parentRelationship, parentAltPhone, parentAddress,
      emergencyName, emergencyPhone, emergencyRelationship,
      state, address, pincode, securityDeposit, feeStatus, status
    } = req.body;
    const student = await prisma.student.create({
      data: {
        name, gender, dob: dob ? new Date(dob) : undefined, email, photoUrl,
        course, branch, year, rollNumber,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : undefined,
        aadhar, phone,
        parentName, parentPhone, parentRelationship, parentAltPhone, parentAddress,
        emergencyName, emergencyPhone, emergencyRelationship,
        state, address, pincode,
        securityDeposit: securityDeposit ? Number(securityDeposit) : undefined,
        feeStatus: feeStatus || 'Pending',
        status: status || 'Active'
      }
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
      dateOfJoining, aadhar, phone,
      parentName, parentPhone, parentRelationship, parentAltPhone, parentAddress,
      emergencyName, emergencyPhone, emergencyRelationship,
      state, address, pincode, securityDeposit, feeStatus, status
    } = req.body;
    const student = await prisma.student.update({
      where: { id },
      data: {
        name, gender, dob: dob ? new Date(dob) : undefined, email, photoUrl,
        course, branch, year, rollNumber,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : undefined,
        aadhar, phone,
        parentName, parentPhone, parentRelationship, parentAltPhone, parentAddress,
        emergencyName, emergencyPhone, emergencyRelationship,
        state, address, pincode,
        securityDeposit: securityDeposit ? Number(securityDeposit) : undefined,
        feeStatus, status
      }
    });
    res.json(student);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  const { id } = req.params;
  await prisma.fee.deleteMany({ where: { studentId: id } });
  await prisma.complaint.deleteMany({ where: { studentId: id } });
  await prisma.bed.updateMany({ where: { studentId: id }, data: { studentId: null, status: 'available' } });
  await prisma.student.delete({ where: { id } });
  res.json({ success: true });
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

app.get('/api/rooms/:buildingId', async (req, res) => {
  const { buildingId } = req.params;
  const { month } = req.query as { month?: string };
  const m = month || currentMonth();

  const rooms = await prisma.room.findMany({
    where: { buildingId },
    include: {
      beds: {
        include: {
          student: { include: { fees: { where: { month: m } } } }
        }
      }
    },
    orderBy: { floor: 'asc' }
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
  await prisma.bed.updateMany({ where: { studentId: student.id }, data: { studentId: null, status: 'available' } });
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
    if (existing && existing.status === 'Pending') {
      fee = await prisma.fee.update({
        where: { id: existing.id },
        data: {
          amount: Number(amount),
          method,
          upiProvider: upiProvider || null,
          transactionRef: transactionRef || null,
          status: 'Completed',
          date: date ? new Date(date) : new Date()
        }
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
          date: date ? new Date(date) : new Date()
        }
      });
    }
    // Update legacy feeStatus field on student
    await prisma.student.update({
      where: { id: studentId },
      data: { feeStatus: 'Paid' }
    });
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

// Get all monthly transactions, optionally filtered by month
app.get('/api/fees/transactions', async (req, res) => {
  const { month } = req.query as { month?: string };
  const where = month ? { month } : {};
  const txs = await prisma.fee.findMany({
    where,
    include: { student: { include: { beds: { include: { room: true } } } } },
    orderBy: { date: 'desc' }
  });
  res.json(txs.map(t => ({
    id: t.id,
    studentId: t.studentId,
    student: t.student.name,
    room: t.student.beds.length > 0 ? t.student.beds[0].room.roomNumber : 'Unallocated',
    bedNumber: t.student.beds.length > 0 ? t.student.beds[0].bedNumber : null,
    month: t.month,
    monthLabel: monthLabel(t.month),
    amount: t.amount,
    date: t.date.toISOString().split('T')[0],
    method: t.method,
    upiProvider: t.upiProvider,
    transactionRef: t.transactionRef,
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

// Monthly summary: all students + their fee status for a given month
app.get('/api/fees/monthly-status', async (req, res) => {
  const { month } = req.query as { month?: string };
  const m = month || currentMonth();

  const students = await prisma.student.findMany({
    include: {
      beds: { include: { room: true } },
      fees: { where: { month: m } }
    }
  });

  res.json(students.map(s => {
    const feeRecord = s.fees[0] || null;
    const bed = s.beds[0] || null;
    return {
      studentId: s.id,
      name: s.name,
      course: s.course,
      branch: s.branch,
      room: bed ? bed.room.roomNumber : 'Unallocated',
      bedNumber: bed ? bed.bedNumber : null,
      month: m,
      monthLabel: monthLabel(m),
      feeStatus: feeRecord && feeRecord.status === 'Completed' ? 'Paid' : 'Pending',
      amount: feeRecord?.amount || 5500,
      paymentDate: feeRecord ? feeRecord.date.toISOString().split('T')[0] : null,
      method: feeRecord?.method || null,
      upiProvider: feeRecord?.upiProvider || null,
      transactionRef: feeRecord?.transactionRef || null,
      feeRecordId: feeRecord?.id || null
    };
  }));
});

// Reports: Fee report for a month
app.get('/api/reports/fees', async (req, res) => {
  const { month } = req.query as { month?: string };
  const m = month || currentMonth();
  const students = await prisma.student.findMany({
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
      room: bed ? bed.room.roomNumber : 'Unallocated',
      bedNumber: bed ? bed.bedNumber : null,
      feeStatus: fee && fee.status === 'Completed' ? 'Paid' : 'Pending',
      amount: fee?.amount || 5500,
      paymentDate: fee?.date.toISOString().split('T')[0] || null,
      method: fee?.method || null,
      upiProvider: fee?.upiProvider || null,
      transactionRef: fee?.transactionRef || null,
      month: m, monthLabel: monthLabel(m)
    };
  }));
});

// Reports: Room occupancy
app.get('/api/reports/rooms', async (req, res) => {
  const rooms = await prisma.room.findMany({
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
  const students = await prisma.student.findMany({
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

// ─── COMPLAINTS ─────────────────────────────────────────────────────────────
app.get('/api/complaints', async (req, res) => {
  const complaints = await prisma.complaint.findMany({
    include: { student: { include: { beds: { include: { room: true } } } } },
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

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
// ─── SETTINGS (persisted to settings.json) ───────────────────────────────────

const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');

const defaultSettings = {
  hostelName: 'VMR Hostel',
  hostelAddress: '',
  hostelPhone: '',
  hostelEmail: '',
  adminName: 'Admin',
  monthlyFee: 5500,
  securityDeposit: 5000,
  lateFinePerDay: 50,
  dueDateDay: 10,
  currency: 'INR',
  upiId: '',
  upiName: ''
};

const readSettings = () => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return { ...defaultSettings, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) };
    }
  } catch {}
  return { ...defaultSettings };
};

const writeSettings = (s: any) => {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2));
};

// GET settings
app.get('/api/settings', (req, res) => {
  res.json(readSettings());
});

// PUT settings
app.put('/api/settings', (req, res) => {
  const current = readSettings();
  const updated = { ...current, ...req.body };
  writeSettings(updated);
  res.json(updated);
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

// ─── ROOM MANAGEMENT ─────────────────────────────────────────────────────────
// Create a new room in a building
app.post('/api/rooms', async (req, res) => {
  const { buildingId, roomNumber, floor, capacity } = req.body;
  if (!buildingId || !roomNumber || !capacity) return res.status(400).json({ error: 'Missing fields' });
  try {
    const room = await prisma.room.create({
      data: {
        buildingId,
        roomNumber,
        floor: Number(floor) || 1,
        beds: {
          create: Array.from({ length: Number(capacity) }, (_, i) => ({
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

// Delete a room
app.delete('/api/rooms/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const beds = await prisma.bed.findMany({ where: { roomId: id } });
    for (const bed of beds) {
      if (bed.studentId) {
        await prisma.bed.update({ where: { id: bed.id }, data: { studentId: null, status: 'available' } });
      }
    }
    await prisma.bed.deleteMany({ where: { roomId: id } });
    await prisma.room.delete({ where: { id } });
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
