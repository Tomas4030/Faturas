import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma.service';

@Controller('spaces')
@UseGuards(JwtGuard)
export class SpacesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async create(@Req() req, @Body('name') name: string) {
    const space = await this.prisma.space.create({
      data: { name, ownerId: req.userId },
    });
    return space;
  }

  @Get()
  async list(@Req() req) {
    return this.prisma.space.findMany({
      where: {
        OR: [
          { ownerId: req.userId },
          { members: { some: { userId: req.userId } } },
        ],
      },
      include: { members: { include: { user: { select: { id: true, email: true, name: true } } } } },
    });
  }

  @Get(':id')
  async get(@Req() req, @Param('id') id: string) {
    const space = await this.prisma.space.findFirst({
      where: {
        id,
        OR: [
          { ownerId: req.userId },
          { members: { some: { userId: req.userId } } },
        ],
      },
      include: {
        members: { include: { user: { select: { id: true, email: true, name: true } } } },
        owner: { select: { id: true, email: true, name: true } },
      },
    });
    if (!space) throw new NotFoundException();
    return space;
  }

  @Post(':id/members')
  async addMember(@Req() req, @Param('id') id: string, @Body('email') email: string) {
    const space = await this.prisma.space.findFirst({ where: { id, ownerId: req.userId } });
    if (!space) throw new NotFoundException();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('Utilizador não encontrado');
    return this.prisma.spaceMember.create({
      data: { spaceId: id, userId: user.id },
    });
  }

  @Delete(':id/members/:memberId')
  async removeMember(@Req() req, @Param('id') id: string, @Param('memberId') memberId: string) {
    const space = await this.prisma.space.findFirst({ where: { id, ownerId: req.userId } });
    if (!space) throw new NotFoundException();
    await this.prisma.spaceMember.delete({ where: { id: memberId } });
    return { deleted: true };
  }
}
