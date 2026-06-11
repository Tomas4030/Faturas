import { Body, Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() body: { email: string; password: string; name?: string }) {
    return this.auth.register(body.email, body.password, body.name);
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }

  @UseGuards(JwtGuard)
  @Get('me')
  getProfile(@Req() req: { userId: string }) {
    return this.auth.getProfile(req.userId);
  }
}
