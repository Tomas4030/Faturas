/**
 * One-off: remove os dados de teste (faturas mock "Restaurante Sakura"),
 * fornecedores órfãos e encurta o nome da fatura real da FNAC.
 * Correr com: npx ts-node scripts/clean-test-data.ts
 */
import { PrismaClient } from '@prisma/client';
import { normalizeName } from '../src/suppliers/normalize';

const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.receipt.deleteMany({
    where: { merchantName: 'Restaurante Sakura' },
  });
  console.log(`Faturas de teste apagadas: ${deleted.count}`);

  // encurta nomes legais enormes da FNAC (fatura real do utilizador)
  const fnacReceipts = await prisma.receipt.findMany({
    where: { merchantName: { startsWith: 'FNAC' } },
  });
  for (const r of fnacReceipts) {
    await prisma.receipt.update({
      where: { id: r.id },
      data: { merchantName: 'FNAC' },
    });
  }
  if (fnacReceipts.length > 0) {
    const fnacSupplier = await prisma.supplier.findFirst({
      where: { name: { startsWith: 'FNAC' } },
    });
    if (fnacSupplier) {
      await prisma.supplier.update({
        where: { id: fnacSupplier.id },
        data: { name: 'FNAC', normalizedName: normalizeName('FNAC') },
      });
    }
    console.log(`Nomes FNAC encurtados: ${fnacReceipts.length}`);
  }

  const orphans = await prisma.supplier.findMany({
    where: { receipts: { none: {} } },
    select: { id: true, name: true },
  });
  if (orphans.length > 0) {
    await prisma.supplier.deleteMany({
      where: { id: { in: orphans.map((o) => o.id) } },
    });
  }
  console.log(
    `Fornecedores órfãos apagados: ${orphans.length} (${orphans.map((o) => o.name).join(', ') || '—'})`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
