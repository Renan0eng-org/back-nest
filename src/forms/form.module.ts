import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { FormController } from './form.controller';
import { FormService } from './form.service';

@Module({
    imports: [
        DatabaseModule,
        AuthModule,
        NotificationsModule,
    ], 
    controllers: [FormController],
    providers: [FormService],
})
export class FormModule { }