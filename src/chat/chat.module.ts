import { Module } from '@nestjs/common';
import { AcessoModule } from 'src/acesso/acesso.module';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { FormModule } from 'src/forms/form.module';
import { PatientsModule } from 'src/patients/patients.module';
import { UserModule } from 'src/user/user.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { TriggerModule } from './triggers/trigger.module';

@Module({
  imports: [DatabaseModule, AuthModule, FormModule, TriggerModule, PatientsModule, UserModule, AcessoModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule { }
