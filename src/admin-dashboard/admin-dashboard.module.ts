import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaService } from 'src/database/prisma.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService, PrismaService],
  exports: [AdminDashboardService],
})
export class AdminDashboardModule {}
