import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReceiptsModule } from './receipts/receipts.module';
import { SuppliersModule } from './suppliers/suppliers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ReceiptsModule,
    SuppliersModule,
  ],
})
export class AppModule {}
