import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { PushController } from './push.controller';
import { PushService } from './push.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [PushService],
  controllers: [PushController],
  exports: [PushService],
})
export class PushModule {}