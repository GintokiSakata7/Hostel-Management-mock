import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupTestDues() {
  console.log('=== SETTING UP TARGET TEST DUES IN DATABASE (EXACT JOIN DATES & MONTHS) ===\n');

  const sep = '2026-09';
  const aug = '2026-08';
  const jul = '2026-07';

  // 1. Fetch all students
  const students = await prisma.student.findMany();
  console.log(`Auditing ${students.length} students...`);

  // Delete all existing fees in one call
  await prisma.fee.deleteMany();
  console.log('Cleared existing fee records.');

  const feeRecordsToCreate: any[] = [];

  for (const s of students) {
    const sName = s.name.trim().toLowerCase();

    if (sName.includes('rishi')) {
      // 1. RISHI: Joined Aug 15 2026 -> Due on 15th -> Paid August, Due September (1 Month: ₹5,500)
      console.log(`Configuring [Rishi]: Joined 2026-08-15 | 1 Month Due (2026-09)`);
      await prisma.student.update({
        where: { id: s.id },
        data: { dateOfJoining: new Date('2026-08-15T00:00:00Z'), status: 'Active' }
      });

      // August Paid
      feeRecordsToCreate.push({
        studentId: s.id,
        month: aug,
        amount: 5500,
        method: 'UPI',
        upiProvider: 'PhonePe',
        status: 'Completed',
        date: new Date('2026-08-15')
      });

      // September Pending
      feeRecordsToCreate.push({
        studentId: s.id,
        month: sep,
        amount: 5500,
        method: 'Cash',
        status: 'Pending',
        date: new Date('2026-09-06')
      });

    } else if (sName.includes('dhanush')) {
      // 2. DHANUSH: Joined July 10 2026 -> Due on 10th -> Paid July, Due August + September (2 Months: ₹11,000)
      console.log(`Configuring [Dhanush]: Joined 2026-07-10 | 2 Months Due (2026-08, 2026-09)`);
      await prisma.student.update({
        where: { id: s.id },
        data: { dateOfJoining: new Date('2026-07-10T00:00:00Z'), status: 'Active' }
      });

      // July Paid
      feeRecordsToCreate.push({
        studentId: s.id,
        month: jul,
        amount: 5500,
        method: 'UPI',
        upiProvider: 'Google Pay',
        status: 'Completed',
        date: new Date('2026-07-10')
      });

      // August Pending
      feeRecordsToCreate.push({
        studentId: s.id,
        month: aug,
        amount: 5500,
        method: 'Cash',
        status: 'Pending',
        date: new Date('2026-08-10')
      });

      // September Pending
      feeRecordsToCreate.push({
        studentId: s.id,
        month: sep,
        amount: 5500,
        method: 'Cash',
        status: 'Pending',
        date: new Date('2026-09-06')
      });

    } else if (sName.includes('koushik')) {
      // 3. KOUSHIK: Joined June 05 2026 -> Due on 5th -> Paid June, Due July + August + September (3 Months: ₹16,500)
      console.log(`Configuring [Koushik]: Joined 2026-06-05 | 3 Months Due (2026-07, 2026-08, 2026-09)`);
      await prisma.student.update({
        where: { id: s.id },
        data: { dateOfJoining: new Date('2026-06-05T00:00:00Z'), status: 'Active' }
      });

      // June Paid
      feeRecordsToCreate.push({
        studentId: s.id,
        month: '2026-06',
        amount: 5500,
        method: 'UPI',
        upiProvider: 'Paytm',
        status: 'Completed',
        date: new Date('2026-06-05')
      });

      // July Pending
      feeRecordsToCreate.push({
        studentId: s.id,
        month: jul,
        amount: 5500,
        method: 'Cash',
        status: 'Pending',
        date: new Date('2026-07-05')
      });

      // August Pending
      feeRecordsToCreate.push({
        studentId: s.id,
        month: aug,
        amount: 5500,
        method: 'Cash',
        status: 'Pending',
        date: new Date('2026-08-05')
      });

      // September Pending
      feeRecordsToCreate.push({
        studentId: s.id,
        month: sep,
        amount: 5500,
        method: 'Cash',
        status: 'Pending',
        date: new Date('2026-09-06')
      });

    } else {
      // ALL OTHER STUDENTS: 100% PAID for all elapsed months
      const joinDate = s.dateOfJoining ? new Date(s.dateOfJoining) : new Date('2025-07-01');
      const joinYear = joinDate.getFullYear();
      const joinMonth = joinDate.getMonth();

      let currY = joinYear < 2025 ? 2025 : joinYear;
      let currM = joinYear < 2025 ? 6 : joinMonth;

      while (currY < 2026 || (currY === 2026 && currM <= 8)) {
        const mStr = `${currY}-${String(currM + 1).padStart(2, '0')}`;
        feeRecordsToCreate.push({
          studentId: s.id,
          month: mStr,
          amount: 5500,
          method: 'UPI',
          upiProvider: 'PhonePe',
          status: 'Completed',
          date: new Date(`${mStr}-10`)
        });
        currM++;
        if (currM > 11) {
          currM = 0;
          currY++;
        }
      }
    }
  }

  console.log(`Inserting ${feeRecordsToCreate.length} fee records in bulk...`);
  await prisma.fee.createMany({
    data: feeRecordsToCreate
  });

  console.log('\n✅ Database configured successfully:');
  console.log('  1. Rishi   -> 1 Month Due (September 2026: ₹5,500 | Due: 15th)');
  console.log('  2. Dhanush -> 2 Months Due (August 2026, September 2026: ₹11,000 | Due: 10th)');
  console.log('  3. Koushik -> 3 Months Due (July 2026, August 2026, September 2026: ₹16,500 | Due: 5th)');
  console.log('  4. All other students -> 100% PAID for all months (0 pending)');
}

setupTestDues()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
