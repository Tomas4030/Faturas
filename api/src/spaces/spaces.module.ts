import { Module } from '@nestjs/common';
import { SpacesController } from './spaces.controller';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SpacesController],
  providers: [PrismaService],
})
export class SpacesModule {}
