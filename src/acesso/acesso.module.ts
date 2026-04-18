import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { AcessoController } from './acesso.controller';
import { AcessoService } from './acesso.service';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    NotificationsModule,
  ],
  controllers: [AcessoController],
  providers: [AcessoService],
})
export class AcessoModule {}