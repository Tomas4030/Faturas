import { Module } from '@nestjs/common';
import { RecurringController } from './recurring.controller';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [RecurringController],
  providers: [PrismaService],
})
export class RecurringModule {}
