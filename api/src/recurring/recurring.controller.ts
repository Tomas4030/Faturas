import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma.service';

@UseGuards(JwtGuard)
@Controller('recurring-expenses')
export class RecurringController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll(@Req() req: { userId: string }) {
    return this.prisma.recurringExpense.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  create(
    @Req() req: { userId: string },
    @Body() body: { description: string; amount_cents: number; category?: string; day_of_month?: number },
  ) {
    return this.prisma.recurringExpense.create({
      data: {
        userId: req.userId,
        description: body.description,
        amountCents: body.amount_cents,
        category: body.category ?? null,
        dayOfMonth: body.day_of_month ?? 1,
      },
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: { userId: string }) {
    await this.prisma.recurringExpense.deleteMany({ where: { id, userId: req.userId } });
    return { deleted: true };
  }
}
