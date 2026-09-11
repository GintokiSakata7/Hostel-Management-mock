import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating September 2026 fees: setting ALL students to Paid EXCEPT Rishi, Dhanush, and Koushik...');

  const d = new Date();
  const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  const targetPendingNames = ['Rishi', 'Dhanush', 'Koushik'];

  const students = await prisma.student.findMany();

  for (const s of students) {
    const isTargetPending = targetPendingNames.some(name => s.name.toLowerCase().includes(name.toLowerCase()));
    const status = isTargetPending ? 'Pending' : 'Completed';

    // Delete existing fee record for current month
    await prisma.fee.deleteMany({
      where: { studentId: s.id, month: currentMonth }
    });

    // Create fee record
    await prisma.fee.create({
      data: {
        studentId: s.id,
        month: currentMonth,
        amount: 5500,
        method: isTargetPending ? 'Cash' : 'UPI',
        upiProvider: isTargetPending ? null : 'PhonePe',
        status: status,
        date: new Date()
      }
    });

    console.log(`Student: ${s.name} ➔ Fee Status: ${status}`);
  }

  console.log('✅ Updated! Only Rishi, Dhanush, and Koushik are currently PENDING for September 2026.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
