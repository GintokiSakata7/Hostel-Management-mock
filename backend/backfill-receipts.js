const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfill() {
  const fees = await prisma.fee.findMany({
    orderBy: { date: 'asc' }
  });

  console.log(`Found ${fees.length} fees to process.`);

  // Group fees by month to maintain sequential counters
  const counters = {};

  for (const fee of fees) {
    if (fee.receiptNo) {
      console.log(`Skipping fee ${fee.id} - already has receiptNo ${fee.receiptNo}`);
      continue;
    }

    const monthStr = fee.month || new Date().toISOString().substring(0, 7);
    const prefix = monthStr.substring(2, 4) + monthStr.substring(5, 7); // e.g. "2609"

    if (!counters[prefix]) {
      // Find the current max for this prefix in DB
      const lastFee = await prisma.fee.findFirst({
        where: { receiptNo: { startsWith: prefix } },
        orderBy: { receiptNo: 'desc' }
      });
      let startNum = 0;
      if (lastFee && lastFee.receiptNo) {
        const parts = lastFee.receiptNo.split('-');
        if (parts.length === 2) startNum = parseInt(parts[1], 10);
      }
      counters[prefix] = startNum;
    }

    counters[prefix]++;
    const newReceiptNo = `${prefix}-${counters[prefix].toString().padStart(3, '0')}`;

    await prisma.fee.update({
      where: { id: fee.id },
      data: { receiptNo: newReceiptNo }
    });
    console.log(`Updated fee ${fee.id} with ${newReceiptNo}`);
  }

  console.log('Backfill complete!');
}

backfill().catch(console.error).finally(() => prisma.$disconnect());
