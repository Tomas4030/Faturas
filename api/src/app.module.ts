import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { StatsModule } from './stats/stats.module';
import { ReportsModule } from './reports/reports.module';
import { SplitModule } from './split/split.module';
import { RecurringModule } from './recurring/recurring.module';
import { BudgetsModule } from './budgets/budgets.module';
import { ActivityModule } from './activity/activity.module';
import { SpacesModule } from './spaces/spaces.module';
import { KidsModule } from './kids/kids.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 20 }] }),
    AuthModule,
    ReceiptsModule,
    SuppliersModule,
    StatsModule,
    ReportsModule,
    SplitModule,
    RecurringModule,
    BudgetsModule,
    ActivityModule,
    ChatbotModule,
    SubscriptionsModule,
    SpacesModule,
    KidsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
