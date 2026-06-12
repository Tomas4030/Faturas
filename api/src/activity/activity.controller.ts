import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { ActivityService } from './activity.service';

@Controller('activity')
@UseGuards(JwtGuard)
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.activity.findAll(req.user.sub);
  }
}
