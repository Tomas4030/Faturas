import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async detectSubscriptions(userId: string) {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const receipts = await this.prisma.receipt.findMany({
      where: {
        userId,
        status: { in: ['ready', 'needs_review'] },
        supplierId: { not: null },
        createdAt: { gte: threeMonthsAgo },
      },
      select: {
        totalCents: true,
        createdAt: true,
        documentDate: true,
        supplier: { select: { id: true, name: true } },
      },
    });

    // Group by supplier, then by month
    const bySupplier = new Map<
      string,
      { name: string; months: Map<string, number[]> }
    >();

    for (const r of receipts) {
      if (!r.supplier) continue;
      const date = r.documentDate ?? r.createdAt;
      const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      let entry = bySupplier.get(r.supplier.id);
      if (!entry) {
        entry = { name: r.supplier.name, months: new Map() };
        bySupplier.set(r.supplier.id, entry);
      }
      const arr = entry.months.get(monthKey) ?? [];
      arr.push(r.totalCents ?? 0);
      entry.months.set(monthKey, arr);
    }

    const detected: {
      supplier_name: string;
      average_amount_cents: number;
      frequency: string;
      months_detected: number;
    }[] = [];

    for (const [, { name, months }] of bySupplier) {
      if (months.size < 2) continue;
      // Sum per month, check ±20% similarity
      const monthlySums = [...months.values()].map((arr) =>
        arr.reduce((a, b) => a + b, 0),
      );
      const avg = Math.round(
        monthlySums.reduce((a, b) => a + b, 0) / monthlySums.length,
      );
      const similar = monthlySums.every(
        (s) => Math.abs(s - avg) <= avg * 0.2,
      );
      if (!similar) continue;
      detected.push({
        supplier_name: name,
        average_amount_cents: avg,
        frequency: 'monthly',
        months_detected: months.size,
      });
    }

    return detected;
  }
}
