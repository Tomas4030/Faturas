import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { SubscriptionsService } from './subscriptions.service';

@UseGuards(JwtGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly svc: SubscriptionsService) {}

  @Get('detected')
  detect(@Req() req: { userId: string }) {
    return this.svc.detectSubscriptions(req.userId);
  }
}
