import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding test students Rishi, Dhanush, and Koushik with Indian phone numbers...');

  // Get current month YYYY-MM
  const d = new Date();
  const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  const testStudents = [
    {
      name: 'Rishi',
      phone: '6303772164',
      course: 'B.Tech CS',
      year: '3rd',
      status: 'Active',
      feeStatus: 'Pending',
      state: 'Andhra Pradesh'
    },
    {
      name: 'Dhanush',
      phone: '8919190254',
      course: 'B.Tech ECE',
      year: '2nd',
      status: 'Active',
      feeStatus: 'Pending',
      state: 'Telangana'
    },
    {
      name: 'Koushik',
      phone: '8074317022',
      course: 'MBA',
      year: '1st',
      status: 'Active',
      feeStatus: 'Pending',
      state: 'Andhra Pradesh'
    }
  ];

  // Find a building and rooms to allocate
  let building = await prisma.building.findFirst();
  if (!building) {
    building = await prisma.building.create({ data: { name: 'Test Block' } });
  }

  for (let i = 0; i < testStudents.length; i++) {
    const s = testStudents[i];
    
    // Check if student already exists by name/phone
    let student = await prisma.student.findFirst({ where: { name: s.name } });

    if (!student) {
      student = await prisma.student.create({
        data: s
      });
      console.log(`Created student: ${student.name} (${student.phone})`);
    } else {
      student = await prisma.student.update({
        where: { id: student.id },
        data: { phone: s.phone, status: 'Active' }
      });
      console.log(`Updated student: ${student.name} (${student.phone})`);
    }

    // Ensure fee entry for current month is Pending (or delete any paid fee entry)
    await prisma.fee.deleteMany({
      where: { studentId: student.id, month: currentMonth }
    });

    await prisma.fee.create({
      data: {
        studentId: student.id,
        month: currentMonth,
        amount: 5500,
        method: 'Cash',
        status: 'Pending',
        date: new Date()
      }
    });

    // Create room and allocate bed if not allocated
    const roomNum = `TEST-${101 + i}`;
    let room = await prisma.room.findFirst({ where: { roomNumber: roomNum } });
    if (!room) {
      room = await prisma.room.create({
        data: { roomNumber: roomNum, floor: '1st', buildingId: building.id }
      });
    }

    let bed = await prisma.bed.findFirst({ where: { roomId: room.id } });
    if (!bed) {
      bed = await prisma.bed.create({
        data: { bedNumber: 1, roomId: room.id, studentId: student.id, status: 'occupied' }
      });
    } else {
      await prisma.bed.update({
        where: { id: bed.id },
        data: { studentId: student.id, status: 'occupied' }
      });
    }

    console.log(`  └─ Set pending fee for month ${currentMonth} (₹5,500) | Room: ${roomNum}`);
  }

  console.log('✅ Successfully added/updated Rishi, Dhanush, and Koushik with pending fee status!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
