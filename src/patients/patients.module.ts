import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { PublicPatientService } from './public-patient.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PatientsController],
  providers: [PatientsService, PublicPatientService],
  exports: [PatientsService, PublicPatientService],
})
export class PatientsModule {}
