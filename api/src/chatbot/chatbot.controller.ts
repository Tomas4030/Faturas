import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { ChatbotService } from './chatbot.service';

@Controller('chatbot')
@UseGuards(JwtGuard)
export class ChatbotController {
  constructor(private readonly chatbot: ChatbotService) {}

  @Post('ask')
  ask(@Req() req: any, @Body('question') question: string) {
    return this.chatbot.answer(req.userId, question);
  }
}
