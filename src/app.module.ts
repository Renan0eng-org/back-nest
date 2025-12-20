import { Module } from '@nestjs/common';
import { AcessoModule } from './acesso/acesso.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DatabaseModule } from './database/database.module';
import { FormModule } from './forms/form.module';
import { LogsModule } from './logs/logs.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PatientsModule } from './patients/patients.module';
import { PushModule } from './push/push.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [AuthModule, DatabaseModule, FormModule, AcessoModule, UserModule, AppointmentsModule, PatientsModule, LogsModule, NotificationsModule, PushModule],
  providers: [AllExceptionsFilter],
})
export class AppModule {}
