import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { StatsModule } from './stats/stats.module';
import { ReportsModule } from './reports/reports.module';
import { SplitModule } from './split/split.module';
import { RecurringModule } from './recurring/recurring.module';
import { BudgetsModule } from './budgets/budgets.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ReceiptsModule,
    SuppliersModule,
    StatsModule,
    ReportsModule,
    SplitModule,
    RecurringModule,
    BudgetsModule,
  ],
})
export class AppModule {}
