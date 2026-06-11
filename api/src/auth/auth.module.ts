import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET', 'dev-secret-change-me'),
        signOptions: { expiresIn: '30d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtGuard, PrismaService],
  exports: [JwtGuard, JwtModule],
})
export class AuthModule {}
