import { Module } from '@nestjs/common';
import { SplitController } from './split.controller';
import { SplitService } from './split.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SplitController],
  providers: [SplitService, PrismaService],
})
export class SplitModule {}
