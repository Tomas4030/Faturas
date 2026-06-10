import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReceiptsModule } from './receipts/receipts.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { StatsModule } from './stats/stats.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ReceiptsModule,
    SuppliersModule,
    StatsModule,
    ReportsModule,
  ],
})
export class AppModule {}
