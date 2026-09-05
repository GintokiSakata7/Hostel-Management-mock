import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.fee.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.room.deleteMany();
  await prisma.building.deleteMany();
  await prisma.student.deleteMany();

  console.log('Seeding database...');

  // ─── BUILDINGS ────────────────────────────────────────────
  const buildingA = await prisma.building.create({ data: { name: 'Building A' } });
  const buildingB = await prisma.building.create({ data: { name: 'Building B' } });
  const buildingC = await prisma.building.create({ data: { name: 'Building C' } });

  // ─── BUILDING A: 3 floors × 5 rooms + Penthouse (7 beds) ──
  const createdRooms: any[] = [];

  for (let floor = 1; floor <= 3; floor++) {
    const floorLabel = floor === 1 ? '1st' : floor === 2 ? '2nd' : '3rd';
    for (let r = 1; r <= 5; r++) {
      const roomNum = `A-${floor}0${r}`;
      const room = await prisma.room.create({
        data: { roomNumber: roomNum, floor: floorLabel, buildingId: buildingA.id }
      });
      createdRooms.push(room);
      for (let b = 1; b <= 4; b++) {
        await prisma.bed.create({ data: { bedNumber: b, roomId: room.id, status: 'available' } });
      }
    }
  }
  // Penthouse (1 room, 7 beds)
  const penthouse = await prisma.room.create({
    data: { roomNumber: 'A-PH', floor: 'Penthouse', buildingId: buildingA.id }
  });
  createdRooms.push(penthouse);
  for (let b = 1; b <= 7; b++) {
    await prisma.bed.create({ data: { bedNumber: b, roomId: penthouse.id, status: 'available' } });
  }

  // ─── BUILDING B: 2nd & 3rd floors, 4 rooms each ─────────
  const buildingBRooms: any[] = [];
  for (let floor = 2; floor <= 3; floor++) {
    const floorLabel = floor === 2 ? '2nd' : '3rd';
    for (let r = 1; r <= 4; r++) {
      const roomNum = `B-${floor}0${r}`;
      const room = await prisma.room.create({
        data: { roomNumber: roomNum, floor: floorLabel, buildingId: buildingB.id }
      });
      buildingBRooms.push(room);
      for (let b = 1; b <= 4; b++) {
        await prisma.bed.create({ data: { bedNumber: b, roomId: room.id, status: 'available' } });
      }
    }
  }

  // ─── BUILDING C: 2 floors, 3 rooms each ─────────────────
  const buildingCRooms: any[] = [];
  for (let floor = 1; floor <= 2; floor++) {
    const floorLabel = floor === 1 ? '1st' : '2nd';
    for (let r = 1; r <= 3; r++) {
      const roomNum = `C-${floor}0${r}`;
      const room = await prisma.room.create({
        data: { roomNumber: roomNum, floor: floorLabel, buildingId: buildingC.id }
      });
      buildingCRooms.push(room);
      for (let b = 1; b <= 4; b++) {
        await prisma.bed.create({ data: { bedNumber: b, roomId: room.id, status: 'available' } });
      }
    }
  }

  // ─── STUDENTS (Telugu Names & States) ─────────────────────────────
  const studentsData = [
    { name: 'Sai Krishna Reddy',  course: 'B.Tech CS',    year: '3rd', feeStatus: 'Paid',    status: 'Active',    dateOfJoining: new Date('2025-07-15'), aadhar: '234567890123', phone: '9876501234', parentPhone: '9876501235', state: 'Andhra Pradesh' },
    { name: 'Venkata Ramana',     course: 'B.Tech IT',    year: '2nd', feeStatus: 'Pending', status: 'Active',    dateOfJoining: new Date('2025-08-10'), aadhar: '345678901234', phone: '8765401234', parentPhone: '8765401235', state: 'Telangana' },
    { name: 'Harsha Vardhan',     course: 'BBA',          year: '1st', feeStatus: 'Paid',    status: 'Active',    dateOfJoining: new Date('2025-08-01'), aadhar: '456789012345', phone: '7654301234', parentPhone: '7654301235', state: 'Andhra Pradesh' },
    { name: 'Pavan Kalyan',       course: 'B.Com',        year: '2nd', feeStatus: 'Paid',    status: 'Active',    dateOfJoining: new Date('2025-07-20'), aadhar: '567890123456', phone: '9845012345', parentPhone: '9845012346', state: 'Telangana' },
    { name: 'Srinivas Goud',      course: 'MCA',          year: '1st', feeStatus: 'Pending', status: 'On Leave',  dateOfJoining: new Date('2025-09-01'), aadhar: '678901234567', phone: '9123456789', parentPhone: '9123456790', state: 'Telangana' },
    { name: 'Divya Sree',         course: 'MBA',          year: '1st', feeStatus: 'Paid',    status: 'Active',    dateOfJoining: new Date('2025-08-05'), aadhar: '789012345678', phone: '8012345678', parentPhone: '8012345679', state: 'Andhra Pradesh' },
    { name: 'Naveen Kumar',       course: 'B.Tech ECE',   year: '3rd', feeStatus: 'Pending', status: 'Active',    dateOfJoining: new Date('2025-07-25'), aadhar: '890123456789', phone: '7901234567', parentPhone: '7901234568', state: 'Telangana' },
    { name: 'Anusha Chowdary',    course: 'B.Tech CS',    year: '4th', feeStatus: 'Paid',    status: 'Active',    dateOfJoining: new Date('2025-06-15'), aadhar: '901234567890', phone: '8890123456', parentPhone: '8890123457', state: 'Andhra Pradesh' },
    { name: 'Karthik Raju',       course: 'BBA',          year: '3rd', feeStatus: 'Paid',    status: 'Active',    dateOfJoining: new Date('2025-07-10'), aadhar: '012345678901', phone: '9780123456', parentPhone: '9780123457', state: 'Andhra Pradesh' },
    { name: 'Sowmya Naidu',       course: 'B.Com',        year: '1st', feeStatus: 'Pending', status: 'Active',    dateOfJoining: new Date('2025-09-05'), aadhar: '112345678901', phone: '9670234567', parentPhone: '9670234568', state: 'Andhra Pradesh' },
    { name: 'Teja Varma',         course: 'MCA',          year: '2nd', feeStatus: 'Paid',    status: 'Active',    dateOfJoining: new Date('2025-07-30'), aadhar: '223456789012', phone: '9560345678', parentPhone: '9560345679', state: 'Telangana' },
    { name: 'Bhavani Prasad',     course: 'MBA',          year: '2nd', feeStatus: 'Paid',    status: 'Active',    dateOfJoining: new Date('2025-08-20'), aadhar: '334567890123', phone: '9450456789', parentPhone: '9450456790', state: 'Andhra Pradesh' },
    { name: 'Sandeep Reddy',      course: 'B.Tech IT',    year: '4th', feeStatus: 'Pending', status: 'On Leave',  dateOfJoining: new Date('2025-06-10'), aadhar: '445678901234', phone: '9340567890', parentPhone: '9340567891', state: 'Telangana' },
    { name: 'Manasa Rao',         course: 'B.Tech CS',    year: '2nd', feeStatus: 'Paid',    status: 'Active',    dateOfJoining: new Date('2025-08-12'), aadhar: '556789012345', phone: '9230678901', parentPhone: '9230678902', state: 'Andhra Pradesh' },
    { name: 'Akhil Akkineni',     course: 'B.Tech ECE',   year: '1st', feeStatus: 'Pending', status: 'Active',    dateOfJoining: new Date('2025-09-03'), aadhar: '667890123456', phone: '9120789012', parentPhone: '9120789013', state: 'Telangana' },
  ];

  const allRooms = [...createdRooms, ...buildingBRooms, ...buildingCRooms];
  const createdStudents: any[] = [];

  for (let i = 0; i < studentsData.length; i++) {
    const s = studentsData[i];
    const student = await prisma.student.create({ data: s });
    createdStudents.push(student);

    // Allocate first 10 students to beds
    if (i < 10 && allRooms[i]) {
      const bed = await prisma.bed.findFirst({ where: { roomId: allRooms[i].id, status: 'available' } });
      if (bed) {
        await prisma.bed.update({ where: { id: bed.id }, data: { status: 'occupied', studentId: student.id } });
      }
    }

    // Fee transactions
    await prisma.fee.create({
      data: {
        studentId: student.id,
        amount: s.feeStatus === 'Pending' ? 0 : 5500,
        method: i % 3 === 0 ? 'Cash' : i % 3 === 1 ? 'UPI' : 'Bank Transfer',
        status: s.feeStatus === 'Paid' ? 'Completed' : 'Pending'
      }
    });
  }

  // ─── COMPLAINTS ──────────────────────────────────────────
  await prisma.complaint.create({
    data: { title: 'AC Not Working', description: 'AC in room not working since 2 days', priority: 'high', status: 'pending', studentId: createdStudents[0].id }
  });
  await prisma.complaint.create({
    data: { title: 'Water Leakage', description: 'Pipe leaking near bathroom area', priority: 'medium', status: 'in-progress', studentId: createdStudents[1].id }
  });
  await prisma.complaint.create({
    data: { title: 'Noisy Neighbour', description: 'Loud music after 11PM regularly', priority: 'low', status: 'pending', studentId: createdStudents[2].id }
  });
  await prisma.complaint.create({
    data: { title: 'Broken Door Lock', description: 'Room door lock broken, needs replacement', priority: 'high', status: 'resolved', studentId: createdStudents[3].id }
  });

  console.log('Database seeded successfully with Indian names and expanded rooms!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
