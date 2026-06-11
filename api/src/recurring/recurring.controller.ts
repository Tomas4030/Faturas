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

const createRecurringExpenseSchema = z.object({
  description: z.string().trim().min(1).max(120),
  amount_cents: z.number().int().positive().max(2_147_483_647),
  category: z.enum(MACRO_CATEGORIES).nullish(),
  day_of_month: z.number().int().min(1).max(31).optional(),
});

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
    @Body() body: unknown,
  ) {
    const parsed = createRecurringExpenseSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.prisma.recurringExpense.create({
      data: {
        userId: req.userId,
        description: parsed.data.description,
        amountCents: parsed.data.amount_cents,
        category: parsed.data.category ?? null,
        dayOfMonth: parsed.data.day_of_month ?? 1,
      },
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: { userId: string }) {
    await this.prisma.recurringExpense.deleteMany({ where: { id, userId: req.userId } });
    return { deleted: true };
  }
}
