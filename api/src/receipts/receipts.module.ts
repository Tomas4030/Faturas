import { Module } from '@nestjs/common';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { ExtractionService } from '../extraction/extraction.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ReceiptsController],
  providers: [ReceiptsService, ExtractionService, PrismaService],
})
export class ReceiptsModule {}
