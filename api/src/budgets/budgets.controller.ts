import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma.service';

@UseGuards(JwtGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Req() req: { userId: string }) {
    const budgets = await this.prisma.budget.findMany({ where: { userId: req.userId } });

    // Calculate spent per category this month
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const receipts = await this.prisma.receipt.findMany({
      where: {
        userId: req.userId,
        status: { in: ['ready', 'needs_review'] },
        OR: [
          { documentDate: { gte: start, lt: end } },
          { documentDate: null, createdAt: { gte: start, lt: end } },
        ],
      },
      select: { category: true, totalCents: true },
    });

    const spentMap = new Map<string, number>();
    for (const r of receipts) {
      const cat = r.category ?? 'outros';
      spentMap.set(cat, (spentMap.get(cat) ?? 0) + (r.totalCents ?? 0));
    }

    return budgets.map((b) => ({
      id: b.id,
      category: b.category,
      monthly_limit_cents: b.monthlyLimitCents,
      spent_cents: spentMap.get(b.category) ?? 0,
    }));
  }

  @Post()
  create(
    @Req() req: { userId: string },
    @Body() body: { category: string; monthly_limit_cents: number },
  ) {
    return this.prisma.budget.upsert({
      where: { userId_category: { userId: req.userId, category: body.category } },
      create: { userId: req.userId, category: body.category, monthlyLimitCents: body.monthly_limit_cents },
      update: { monthlyLimitCents: body.monthly_limit_cents },
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: { userId: string }) {
    await this.prisma.budget.deleteMany({ where: { id, userId: req.userId } });
    return { deleted: true };
  }
}
