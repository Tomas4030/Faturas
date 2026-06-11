import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLANS = [
  { name: 'Free', priceCents: 0, monthlyReceiptLimit: 5, monthlySplitLimit: 2 },
  { name: 'Basic', priceCents: 399, monthlyReceiptLimit: 30, monthlySplitLimit: 15 },
  { name: 'Pro', priceCents: 799, monthlyReceiptLimit: 150, monthlySplitLimit: 50 },
  { name: 'Business', priceCents: 1999, monthlyReceiptLimit: 9999, monthlySplitLimit: 9999 },
];

async function main() {
  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
    console.log(`Plan "${plan.name}" seeded`);
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
