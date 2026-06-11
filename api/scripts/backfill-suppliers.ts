/**
 * One-off: liga faturas existentes (Fase 0) a fornecedores.
 * Correr com: npx ts-node scripts/backfill-suppliers.ts
 */
import { PrismaClient } from '@prisma/client';
import { normalizeName } from '../src/suppliers/normalize';

const prisma = new PrismaClient();

async function main() {
  const receipts = await prisma.receipt.findMany({
    where: { supplierId: null, merchantName: { not: null } },
  });
  let linked = 0;
  for (const receipt of receipts) {
    const name = receipt.merchantName as string;
    const normalized = normalizeName(name);
    if (!normalized) continue;

    let supplier =
      (receipt.merchantNif
        ? await prisma.supplier.findFirst({
            where: { userId: receipt.userId, nif: receipt.merchantNif },
          })
        : null) ??
      (await prisma.supplier.findUnique({
        where: {
          userId_normalizedName: {
            userId: receipt.userId,
            normalizedName: normalized,
          },
        },
      }));

    if (supplier && receipt.merchantNif && !supplier.nif) {
      supplier = await prisma.supplier.update({
        where: { id: supplier.id },
        data: { nif: receipt.merchantNif },
      });
    }

    if (!supplier) {
      supplier = await prisma.supplier.create({
        data: {
          userId: receipt.userId,
          name: name.trim(),
          nif: receipt.merchantNif,
          normalizedName: normalized,
        },
      });
    }
    await prisma.receipt.update({
      where: { id: receipt.id },
      data: { supplierId: supplier.id },
    });
    linked++;
  }
  console.log(`Backfill concluído: ${linked} faturas ligadas a fornecedores.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
