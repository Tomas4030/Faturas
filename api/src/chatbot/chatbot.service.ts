import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ChatbotService {
  constructor(private readonly prisma: PrismaService) {}

  async answer(userId: string, question: string): Promise<{ answer: string; data?: any }> {
    const q = question.toLowerCase();

    const month = this.detectMonth(q);
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);

    if (q.includes('media') || q.includes('média')) {
      const category = this.detectCategory(q);
      return this.averageCategory(userId, category);
    }

    if (q.includes('onde gastei mais') || q.includes('mais gastei')) {
      return this.topCategory(userId, start, end);
    }

    const category = this.detectCategory(q);
    if (category) {
      return this.sumCategory(userId, category, start, end);
    }

    return this.totalMonth(userId, start, end);
  }

  private async sumCategory(userId: string, category: string, start: Date, end: Date) {
    const result = await this.prisma.receipt.aggregate({
      where: { userId, category, status: 'ready', documentDate: { gte: start, lt: end } },
      _sum: { totalCents: true },
    });
    const cents = result._sum.totalCents ?? 0;
    return { answer: `Gastaste ${this.fmt(cents)} em ${category} este mês.`, data: { cents, category } };
  }

  private async totalMonth(userId: string, start: Date, end: Date) {
    const result = await this.prisma.receipt.aggregate({
      where: { userId, status: 'ready', documentDate: { gte: start, lt: end } },
      _sum: { totalCents: true },
    });
    const cents = result._sum.totalCents ?? 0;
    return { answer: `Total deste mês: ${this.fmt(cents)}.`, data: { cents } };
  }

  private async topCategory(userId: string, start: Date, end: Date) {
    const groups = await this.prisma.receipt.groupBy({
      by: ['category'],
      where: { userId, status: 'ready', category: { not: null }, documentDate: { gte: start, lt: end } },
      _sum: { totalCents: true },
      orderBy: { _sum: { totalCents: 'desc' } },
      take: 1,
    });
    if (!groups.length) return { answer: 'Não encontrei despesas este mês.' };
    const top = groups[0];
    return { answer: `A categoria onde gastaste mais foi ${top.category} com ${this.fmt(top._sum.totalCents ?? 0)}.`, data: { category: top.category, cents: top._sum.totalCents } };
  }

  private async averageCategory(userId: string, category: string | null) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const where: any = { userId, status: 'ready' as const, documentDate: { gte: start } };
    if (category) where.category = category;
    const result = await this.prisma.receipt.aggregate({ where, _sum: { totalCents: true }, _count: true });
    const cents = result._sum.totalCents ?? 0;
    const avg = Math.round(cents / 3);
    const label = category ?? 'todas as categorias';
    return { answer: `Média mensal em ${label} (últimos 3 meses): ${this.fmt(avg)}.`, data: { avgCents: avg } };
  }

  private detectCategory(q: string): string | null {
    const cats = ['supermercado', 'restaurante', 'transporte', 'saúde', 'lazer', 'educação', 'serviços', 'outros'];
    return cats.find((c) => q.includes(c)) ?? null;
  }

  private detectMonth(q: string): Date {
    if (q.includes('mês passado') || q.includes('mes passado')) {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return d;
    }
    return new Date();
  }

  private fmt(cents: number): string {
    return (cents / 100).toFixed(2) + ' €';
  }
}
