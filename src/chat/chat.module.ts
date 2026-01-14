import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { FormModule } from 'src/forms/form.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [DatabaseModule, AuthModule, FormModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
