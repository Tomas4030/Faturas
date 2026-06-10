import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { categoryLabel } from '../stats/insights';
import { toCsv } from './csv';

export interface ReportFilters {
  month?: string;
  category?: string;
  supplier_id?: string;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async expenses(filters: ReportFilters) {
    const where: Record<string, unknown> = {
      status: { in: ['ready', 'needs_review'] },
    };
    if (filters.month) {
      if (!/^\d{4}-\d{2}$/.test(filters.month)) {
        throw new BadRequestException('month deve ter o formato YYYY-MM');
      }
      const [year, monthNum] = filters.month.split('-').map(Number);
      const start = new Date(Date.UTC(year, monthNum - 1, 1));
      const end = new Date(Date.UTC(year, monthNum, 1));
      where.OR = [
        { documentDate: { gte: start, lt: end } },
        { documentDate: null, createdAt: { gte: start, lt: end } },
      ];
    }
    if (filters.category) where.category = filters.category;
    if (filters.supplier_id) where.supplierId = filters.supplier_id;

    const receipts = await this.prisma.receipt.findMany({
      where,
      include: { taxes: true, supplier: { select: { name: true } } },
      orderBy: [{ documentDate: 'desc' }, { createdAt: 'desc' }],
    });

    const rows = receipts.map((r) => {
      const totalCents = r.totalCents ?? 0;
      const hasTaxes = r.taxes.length > 0;
      const taxCents = hasTaxes
        ? r.taxes.reduce((s, t) => s + t.amountCents, 0)
        : null;
      return {
        id: r.id,
        date: (r.documentDate ?? r.createdAt).toISOString().slice(0, 10),
        supplier: r.supplier?.name ?? r.merchantName ?? null,
        document_number: r.documentNumber,
        category: r.category,
        net_cents: taxCents == null ? null : totalCents - taxCents,
        tax_cents: taxCents,
        total_cents: totalCents,
      };
    });

    return {
      filters: {
        month: filters.month ?? null,
        category: filters.category ?? null,
        supplier_id: filters.supplier_id ?? null,
      },
      rows,
      totals: {
        net_cents: rows.reduce((s, r) => s + (r.net_cents ?? 0), 0),
        tax_cents: rows.reduce((s, r) => s + (r.tax_cents ?? 0), 0),
        total_cents: rows.reduce((s, r) => s + r.total_cents, 0),
        receipt_count: rows.length,
      },
    };
  }

  async expensesCsv(filters: ReportFilters): Promise<string> {
    const report = await this.expenses(filters);
    return toCsv(
      [
        'Data',
        'Fornecedor',
        'Nº Documento',
        'Categoria',
        'Total s/ IVA',
        'IVA',
        'Total c/ IVA',
      ],
      report.rows.map((r) => [
        r.date,
        r.supplier,
        r.document_number,
        r.category ? categoryLabel(r.category) : null,
        r.net_cents,
        r.tax_cents,
        r.total_cents,
      ]),
      [4, 5, 6],
    );
  }
}
