import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { buildInsights } from './insights';

/** Faturas que contam para estatísticas (exclui processing/failed). */
const COUNTED_STATUSES = ['ready', 'needs_review'] as const;

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(month?: string, userId?: string) {
    const now = new Date();
    const monthStr =
      month ??
      `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!/^\d{4}-\d{2}$/.test(monthStr)) {
      throw new BadRequestException('month deve ter o formato YYYY-MM');
    }
    const [year, monthNum] = monthStr.split('-').map(Number);
    const start = new Date(Date.UTC(year, monthNum - 1, 1));
    const end = new Date(Date.UTC(year, monthNum, 1));
    const prevStart = new Date(Date.UTC(year, monthNum - 2, 1));

    // Data efetiva: documentDate quando existe, senão createdAt.
    // Para simplicidade da Fase 1 filtramos por documentDate OR createdAt.
    const dateFilter = (from: Date, to: Date) => ({
      OR: [
        { documentDate: { gte: from, lt: to } },
        { documentDate: null, createdAt: { gte: from, lt: to } },
      ],
    });

    const receipts = await this.prisma.receipt.findMany({
      where: {
        ...(userId ? { userId } : {}),
        status: { in: COUNTED_STATUSES as unknown as any },
        ...dateFilter(start, end),
      },
      select: {
        totalCents: true,
        category: true,
        documentDate: true,
        createdAt: true,
        supplier: { select: { id: true, name: true } },
      },
    });

    const previous = await this.prisma.receipt.aggregate({
      where: {
        ...(userId ? { userId } : {}),
        status: { in: COUNTED_STATUSES as unknown as any },
        ...dateFilter(prevStart, start),
      },
      _sum: { totalCents: true },
    });

    const totalCents = receipts.reduce((s, r) => s + (r.totalCents ?? 0), 0);

    const byCategoryMap = new Map<
      string,
      { totalCents: number; count: number }
    >();
    const byDayMap = new Map<string, number>();
    const bySupplierMap = new Map<
      string,
      { name: string; totalCents: number; count: number }
    >();

    for (const r of receipts) {
      const cents = r.totalCents ?? 0;
      const cat = r.category ?? 'outros';
      const catAgg = byCategoryMap.get(cat) ?? { totalCents: 0, count: 0 };
      catAgg.totalCents += cents;
      catAgg.count += 1;
      byCategoryMap.set(cat, catAgg);

      const day = (r.documentDate ?? r.createdAt).toISOString().slice(0, 10);
      byDayMap.set(day, (byDayMap.get(day) ?? 0) + cents);

      if (r.supplier) {
        const sAgg = bySupplierMap.get(r.supplier.id) ?? {
          name: r.supplier.name,
          totalCents: 0,
          count: 0,
        };
        sAgg.totalCents += cents;
        sAgg.count += 1;
        bySupplierMap.set(r.supplier.id, sAgg);
      }
    }

    const byCategory = [...byCategoryMap.entries()]
      .map(([category, agg]) => ({
        category,
        total_cents: agg.totalCents,
        count: agg.count,
      }))
      .sort((a, b) => b.total_cents - a.total_cents);

    const byDay = [...byDayMap.entries()]
      .map(([day, cents]) => ({ day, total_cents: cents }))
      .sort((a, b) => a.day.localeCompare(b.day));

    const topSuppliers = [...bySupplierMap.entries()]
      .map(([id, agg]) => ({
        supplier_id: id,
        name: agg.name,
        total_cents: agg.totalCents,
        count: agg.count,
      }))
      .sort((a, b) => b.total_cents - a.total_cents)
      .slice(0, 5);

    const previousMonthTotalCents = previous._sum.totalCents ?? 0;

    // Forecast: average daily spending projected to full month
    const today = new Date();
    const daysElapsed =
      year === today.getUTCFullYear() && monthNum - 1 === today.getUTCMonth()
        ? today.getUTCDate()
        : new Date(Date.UTC(year, monthNum, 0)).getUTCDate(); // past month → full
    const totalDaysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
    const forecastCents =
      daysElapsed > 0
        ? Math.round((totalCents / daysElapsed) * totalDaysInMonth)
        : 0;

    return {
      month: monthStr,
      forecast_cents: forecastCents,
      total_cents: totalCents,
      receipt_count: receipts.length,
      by_category: byCategory,
      by_day: byDay,
      top_suppliers: topSuppliers,
      previous_month_total_cents: previousMonthTotalCents,
      insights: buildInsights({
        totalCents,
        previousMonthTotalCents,
        byCategory: byCategory.map((c) => ({
          category: c.category,
          totalCents: c.total_cents,
        })),
        topSuppliers: topSuppliers.map((s) => ({
          name: s.name,
          totalCents: s.total_cents,
        })),
      }),
    };
  }
}
