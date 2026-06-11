import { Module } from '@nestjs/common';
import { SplitController } from './split.controller';
import { SplitService } from './split.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SplitController],
  providers: [SplitService, PrismaService],
})
export class SplitModule {}
