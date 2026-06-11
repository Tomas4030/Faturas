import { Module } from '@nestjs/common';
import { BudgetsController } from './budgets.controller';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BudgetsController],
  providers: [PrismaService],
})
export class BudgetsModule {}
