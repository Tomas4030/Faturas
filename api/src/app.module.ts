import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReceiptsModule } from './receipts/receipts.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ReceiptsModule],
})
export class AppModule {}
