import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { SplitService } from './split.service';
import { SPLIT_PAGE_HTML } from './split-page';

@Controller()
export class SplitController {
  constructor(private readonly split: SplitService) {}

  @Post('receipts/:id/split-sessions')
  @UseGuards(JwtGuard)
  create(@Param('id') receiptId: string, @Req() req: { userId: string }) {
    return this.split.createForReceipt(receiptId, req.userId);
  }

  @Get('split-sessions/:token')
  getPublic(@Param('token') token: string) {
    return this.split.getPublic(token);
  }

  @Post('split-sessions/:token/participants')
  join(@Param('token') token: string, @Body() body: unknown) {
    return this.split.join(token, body);
  }

  @Put('split-sessions/:token/participants/:participantId/claims')
  setClaims(
    @Param('token') token: string,
    @Param('participantId') participantId: string,
    @Body() body: unknown,
  ) {
    return this.split.setClaims(token, participantId, body);
  }

  @Get('split-sessions/:token/summary')
  summary(@Param('token') token: string) {
    return this.split.summary(token);
  }

  @Post('split-sessions/:token/close')
  @UseGuards(JwtGuard)
  close(@Param('token') token: string, @Req() req: { userId: string }) {
    return this.split.close(token, req.userId);
  }

  /** Página pública para os amigos (browser, sem app). */
  @Get('s/:token')
  @Header('Content-Type', 'text/html; charset=utf-8')
  page() {
    return SPLIT_PAGE_HTML;
  }
}
