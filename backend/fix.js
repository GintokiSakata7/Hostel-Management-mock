const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  try {
    const res = await prisma.$runCommandRaw({
      update: "Fee",
      updates: [
        {
          q: { month: null },
          u: { $set: { month: "2026-09", method: "Cash" } },
          multi: true
        }
      ]
    });
    console.log('Fixed Fees:', res);
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}
fix();
