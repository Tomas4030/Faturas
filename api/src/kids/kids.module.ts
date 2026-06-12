import { Module } from '@nestjs/common';
import { KidsController } from './kids.controller';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [KidsController],
  providers: [PrismaService],
})
export class KidsModule {}
