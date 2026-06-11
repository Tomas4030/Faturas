import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { StatsService } from './stats.service';

@UseGuards(JwtGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('summary')
  summary(@Query('month') month: string | undefined, @Req() req: { userId: string }) {
    return this.stats.summary(month, req.userId);
  }
}
