import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PushService } from './push.service';
import { PushController } from './push.controller';

@Module({
  imports: [DatabaseModule],
  providers: [PushService],
  controllers: [PushController],
  exports: [PushService],
})
export class PushModule {}