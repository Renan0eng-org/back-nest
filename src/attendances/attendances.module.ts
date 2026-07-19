import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AttendanceAiService } from './attendance-ai.service';
import { AttendancesController } from './attendances.controller';
import { AttendancesService } from './attendances.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AttendancesController],
  providers: [AttendancesService, AttendanceAiService],
  exports: [AttendancesService],
})
export class AttendancesModule {}
