import { Module } from '@nestjs/common';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { ExtractionService } from '../extraction/extraction.service';
import { PrismaService } from '../prisma.service';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { AuthModule } from '../auth/auth.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [SuppliersModule, AuthModule, ActivityModule],
  controllers: [ReceiptsController],
  providers: [ReceiptsService, ExtractionService, PrismaService],
})
export class ReceiptsModule {}
