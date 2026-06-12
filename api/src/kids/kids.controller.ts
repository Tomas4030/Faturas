import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { JwtGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma.service';

const createKidSchema = z.object({
  name: z.string().min(1).max(100),
  allowance_cents: z.number().int().min(0).max(2_147_483_647).default(0),
  allowance_day: z.number().int().min(1).max(31).default(1),
});

const createTaskSchema = z.object({
  description: z.string().min(1).max(500),
  reward_cents: z.number().int().min(0).max(2_147_483_647),
});

@UseGuards(JwtGuard)
@Controller('kids')
export class KidsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll(@Req() req: { userId: string }) {
    return this.prisma.kidProfile.findMany({
      where: { parentId: req.userId },
      include: { tasks: true },
    });
  }

  @Get(':kidId')
  async findOne(@Param('kidId') kidId: string, @Req() req: { userId: string }) {
    const kid = await this.prisma.kidProfile.findFirst({
      where: { id: kidId, parentId: req.userId },
      include: { tasks: true },
    });
    if (!kid) throw new NotFoundException();
    return kid;
  }

  @Post()
  create(@Req() req: { userId: string }, @Body() body: unknown) {
    const parsed = createKidSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.prisma.kidProfile.create({
      data: {
        parentId: req.userId,
        name: parsed.data.name,
        allowanceCents: parsed.data.allowance_cents,
        allowanceDay: parsed.data.allowance_day,
      },
    });
  }

  @Post(':kidId/tasks')
  async createTask(
    @Param('kidId') kidId: string,
    @Req() req: { userId: string },
    @Body() body: unknown,
  ) {
    const kid = await this.prisma.kidProfile.findFirst({
      where: { id: kidId, parentId: req.userId },
    });
    if (!kid) throw new NotFoundException();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.prisma.kidTask.create({
      data: {
        kidId,
        description: parsed.data.description,
        rewardCents: parsed.data.reward_cents,
      },
    });
  }

  @Patch(':kidId/tasks/:taskId/complete')
  async completeTask(
    @Param('kidId') kidId: string,
    @Param('taskId') taskId: string,
    @Req() req: { userId: string },
  ) {
    const kid = await this.prisma.kidProfile.findFirst({
      where: { id: kidId, parentId: req.userId },
    });
    if (!kid) throw new NotFoundException();
    const task = await this.prisma.kidTask.findFirst({
      where: { id: taskId, kidId },
    });
    if (!task) throw new NotFoundException();
    if (task.completed) throw new BadRequestException('Task already completed');

    const [updatedTask] = await this.prisma.$transaction([
      this.prisma.kidTask.update({
        where: { id: taskId },
        data: { completed: true, completedAt: new Date() },
      }),
      this.prisma.kidProfile.update({
        where: { id: kidId },
        data: { balanceCents: { increment: task.rewardCents } },
      }),
    ]);
    return updatedTask;
  }
}
