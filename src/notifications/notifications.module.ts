import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PushModule } from '../push/push.module';
import { NotificationHelperService } from './notification-helper.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [DatabaseModule, PushModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationHelperService],
  exports: [NotificationsService, NotificationHelperService],
})
export class NotificationsModule {}