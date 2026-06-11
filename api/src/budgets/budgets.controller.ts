import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { JwtGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma.service';
import { MACRO_CATEGORIES } from '../receipts/dto';

const createBudgetSchema = z.object({
  category: z.enum(MACRO_CATEGORIES),
  monthly_limit_cents: z.number().int().positive().max(2_147_483_647),
});

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
    @Body() body: unknown,
  ) {
    const parsed = createBudgetSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.prisma.budget.upsert({
      where: {
        userId_category: { userId: req.userId, category: parsed.data.category },
      },
      create: {
        userId: req.userId,
        category: parsed.data.category,
        monthlyLimitCents: parsed.data.monthly_limit_cents,
      },
      update: { monthlyLimitCents: parsed.data.monthly_limit_cents },
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: { userId: string }) {
    await this.prisma.budget.deleteMany({ where: { id, userId: req.userId } });
    return { deleted: true };
  }
}
