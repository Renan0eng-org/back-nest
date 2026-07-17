import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExamRequestsController } from './exam-requests.controller';
import { ExamRequestsService } from './exam-requests.service';

@Module({
  imports: [DatabaseModule, NotificationsModule, AuthModule],
  controllers: [ExamRequestsController],
  providers: [ExamRequestsService],
  exports: [ExamRequestsService],
})
export class ExamRequestsModule {}
